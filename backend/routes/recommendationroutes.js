const express = require('express');
const router = express.Router();
const Scholarship = require('../models/scholarshipModel');
const UserProfile = require('../models/userprofile');
const auth = require('../middleware/auth');
const natural = require('natural'); // For text similarity comparison
const _ = require('lodash');

// Configure natural language processing
const { WordTokenizer } = natural;
const tokenizer = new WordTokenizer();

// @route   GET /api/recommendations
// @desc    Get personalized scholarship recommendations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // 1. Get user profile
    const userProfile = await UserProfile.findOne({ userId: req.user._id });
    if (!userProfile) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    // 2. Get active scholarships (not expired)
    const currentDate = new Date();
    const scholarships = await Scholarship.find({ 
      deadline: { $gte: currentDate },
      isActive: true 
    });

    // 3. Extract user data for matching
    const userData = {
      highestEducation: userProfile.highestEducation,
      educationFields: userProfile.educations.map(edu => edu.fieldOfStudy.toLowerCase()),
      interests: userProfile.areasOfInterest.map(i => i.toLowerCase()),
      skills: userProfile.skills.map(s => s.toLowerCase()),
      cgpa: userProfile.educations.reduce((max, edu) => Math.max(max, edu.cgpa || 0), 0),
      objective: userProfile.objective.toLowerCase()
    };

    // 4. Enhanced scoring algorithm
    const scoredScholarships = scholarships.map(scholarship => {
      let score = 0;
      const matchReasons = [];
      
      // A. Education Level Match (20%)
      const targetLevels = getTargetEducationLevels(userData.highestEducation);
      if (targetLevels.includes(scholarship.level)) {
        score += 20;
        matchReasons.push('Education level match');
      } else {
        score -= 10; // Penalize for mismatched education level
        matchReasons.push('Education level mismatch');
      }

      // B. CGPA Requirement (20%)
      if (!scholarship.minCGPA || userData.cgpa >= scholarship.minCGPA) {
        score += 20;
        matchReasons.push('CGPA requirement met');
      } else {
        score -= 10;
        matchReasons.push('CGPA requirement not met');
      }

      // C. Field of Study Match (25%)
      const fieldMatch = calculateFieldMatch(userData.educationFields, scholarship.fieldOfStudy);
      score += fieldMatch.score;
      if (fieldMatch.score > 0) {
        matchReasons.push(fieldMatch.reason);
      }

      // D. Interests Match (20%)
      const interestMatch = calculateInterestMatch(userData.interests, scholarship.tags || []);
      score += interestMatch.score;
      if (interestMatch.score > 0) {
        matchReasons.push(interestMatch.reason);
      }

      // E. Skills Match (15%)
      const skillMatch = calculateSkillMatch(userData.skills, scholarship.tags || []);
      score += skillMatch.score;
      if (skillMatch.score > 0) {
        matchReasons.push(skillMatch.reason);
      }

      // F. Objective/Description Similarity (Bonus 0-10%)
      const descSimilarity = calculateTextSimilarity(
        userData.objective, 
        `${scholarship.title} ${scholarship.description} ${scholarship.fieldOfStudy}`
      );
      const bonusScore = Math.round(descSimilarity * 10);
      score += bonusScore;
      if (bonusScore > 0) {
        matchReasons.push(`Profile aligns with scholarship (${bonusScore}% bonus)`);
      }

      // Ensure score is between 0-100
      const finalScore = Math.max(0, Math.min(100, Math.round(score)));

      return {
        ...scholarship.toObject(),
        matchScore: finalScore,
        matchReasons: _.uniq(matchReasons) // Remove duplicate reasons
      };
    });

    // 5. Sort by match score and return top recommendations
    const recommendations = scoredScholarships
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 15); // Return top 15 instead of 10

    res.json({ 
      success: true, 
      data: recommendations,
      userProfile: _.pick(userProfile, ['highestEducation', 'educations', 'areasOfInterest', 'skills'])
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Helper function to determine target education levels based on user's highest education
function getTargetEducationLevels(highestEducation) {
  switch (highestEducation) {
    case 'High School':
      return ['Bachelor', 'Undergraduate'];
    case 'Bachelor\'s Degree':
    case 'Undergraduate':
      return ['Bachelor', 'Master', 'Undergraduate', 'Graduate'];
    case 'Master\'s Degree':
    case 'Graduate':
      return ['Master', 'PhD', 'Graduate', 'Postgraduate'];
    case 'PhD':
    case 'Postgraduate':
      return ['PhD', 'Postgraduate'];
    default:
      return ['Bachelor', 'Master', 'PhD', 'Undergraduate', 'Graduate', 'Postgraduate'];
  }
}

// Helper function to calculate field of study match
function calculateFieldMatch(userFields, scholarshipField) {
  if (!scholarshipField) return { score: 0, reason: '' };
  
  const scholarshipFields = scholarshipField.toLowerCase().split(/,\s*/);
  let bestMatch = { score: 0, reason: '' };

  for (const userField of userFields) {
    for (const scholarshipField of scholarshipFields) {
      // Exact match
      if (userField === scholarshipField) {
        return { score: 25, reason: `Exact field match: ${scholarshipField}` };
      }
      
      // Partial match (contains)
      if (userField.includes(scholarshipField) || scholarshipField.includes(userField)) {
        bestMatch = { score: 20, reason: `Partial field match: ${scholarshipField}` };
      }
      
      // Token-based similarity
      const similarity = calculateTextSimilarity(userField, scholarshipField);
      if (similarity > 0.6 && similarity * 20 > bestMatch.score) {
        bestMatch = { 
          score: Math.round(similarity * 20),
          reason: `Related field: ${scholarshipField} (${Math.round(similarity * 100)}% similar)`
        };
      }
    }
  }
  
  return bestMatch;
}

// Helper function to calculate interests match
function calculateInterestMatch(userInterests, scholarshipTags) {
  if (!scholarshipTags || scholarshipTags.length === 0) return { score: 0, reason: '' };
  
  let matchedInterests = [];
  scholarshipTags.forEach(tag => {
    const lowerTag = tag.toLowerCase();
    if (userInterests.includes(lowerTag)) {
      matchedInterests.push(tag);
    }
  });
  
  if (matchedInterests.length > 0) {
    const score = Math.min(20, matchedInterests.length * 5); // Max 20% for interests
    return { 
      score, 
      reason: `Interest match: ${matchedInterests.join(', ')}` 
    };
  }
  
  return { score: 0, reason: '' };
}

// Helper function to calculate skills match
function calculateSkillMatch(userSkills, scholarshipTags) {
  if (!scholarshipTags || scholarshipTags.length === 0) return { score: 0, reason: '' };
  
  let matchedSkills = [];
  scholarshipTags.forEach(tag => {
    const lowerTag = tag.toLowerCase();
    if (userSkills.includes(lowerTag)) {
      matchedSkills.push(tag);
    }
  });
  
  if (matchedSkills.length > 0) {
    const score = Math.min(15, matchedSkills.length * 3); // Max 15% for skills
    return { 
      score, 
      reason: `Skill match: ${matchedSkills.join(', ')}` 
    };
  }
  
  return { score: 0, reason: '' };
}

// Helper function to calculate text similarity
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const tokens1 = tokenizer.tokenize(text1.toLowerCase());
  const tokens2 = tokenizer.tokenize(text2.toLowerCase());
  
  if (!tokens1 || !tokens2 || tokens1.length === 0 || tokens2.length === 0) {
    return 0;
  }
  
  const intersection = _.intersection(tokens1, tokens2).length;
  const union = _.union(tokens1, tokens2).length;
  
  return union > 0 ? intersection / union : 0;
}

module.exports = router;