const Scholarship = require('../models/scholarshipModel');
const UserProfile = require('../models/userprofile');
const mongoose = require('mongoose');

const MATCH_WEIGHTS = {
  FIELD_OF_STUDY: 0.25,
  SPECIALIZATION: 0.2,
  EDUCATION_LEVEL: 0.2,
  UNIVERSITY: 0.15,
  CGPA: 0.1,
  SKILLS: 0.05,
  INTERESTS: 0.05
};

const EDUCATION_LEVEL_MAPPING = {
  'High School': ['High School'],
  'Associate Degree': ['Associate'],
  "Bachelor's Degree": ['Bachelor', 'Undergraduate'],
  "Master's Degree": ['Master', 'Graduate'],
  'PhD': ['PhD', 'Doctorate'],
  'Diploma': ['Diploma', 'Certificate']
};

const calculateMatchScore = (user, scholarship) => {
  try {
    let score = 0;
    
    // Field of study match
    const userFieldOfStudy = user.educations?.[0]?.fieldOfStudy || '';
    if (scholarship.fieldOfStudy && 
        (userFieldOfStudy.toLowerCase().includes(scholarship.fieldOfStudy.toLowerCase()) || 
         user.interests?.some(i => i.toLowerCase().includes(scholarship.fieldOfStudy.toLowerCase())))) {
      score += MATCH_WEIGHTS.FIELD_OF_STUDY * 100;
    }
    
    // Specialization match
    if (scholarship.specialization && 
        userFieldOfStudy.toLowerCase().includes(scholarship.specialization.toLowerCase())) {
      score += MATCH_WEIGHTS.SPECIALIZATION * 100;
    }
    
    // Education level match
    if (scholarship.level) {
      const userLevel = user.highestEducation || '';
      const mappedLevels = EDUCATION_LEVEL_MAPPING[userLevel] || [];
      if (mappedLevels.some(l => scholarship.level.toLowerCase().includes(l.toLowerCase()))) {
        score += MATCH_WEIGHTS.EDUCATION_LEVEL * 100;
      }
    }
    
    // University preference
    if (scholarship.university && 
        user.educations?.some(e => e.institution.toLowerCase().includes(scholarship.university.toLowerCase()))) {
      score += MATCH_WEIGHTS.UNIVERSITY * 100;
    }
    
    // CGPA requirement
    if (scholarship.minCGPA) {
      const userCGPA = user.educations?.[0]?.cgpa || 0;
      if (userCGPA >= scholarship.minCGPA) {
        score += MATCH_WEIGHTS.CGPA * 100;
      } else if (userCGPA > 0) {
        const closeness = Math.max(0, (userCGPA / scholarship.minCGPA) * 0.5);
        score += MATCH_WEIGHTS.CGPA * 100 * closeness;
      }
    }
    
    // Skills match
    const skillMatches = scholarship.tags?.filter(tag => 
      user.skills?.some(skill => skill.toLowerCase().includes(tag.toLowerCase()))
    ).length || 0;
    score += Math.min(MATCH_WEIGHTS.SKILLS * 100, skillMatches * 5);
    
    // Interests match
    const interestMatches = scholarship.tags?.filter(tag => 
      user.interests?.some(interest => interest.toLowerCase().includes(tag.toLowerCase()))
    ).length || 0;
    score += Math.min(MATCH_WEIGHTS.INTERESTS * 100, interestMatches * 5);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  } catch (err) {
    console.error('Error calculating match score:', err);
    return 0;
  }
};

exports.recommendScholarships = async (userId) => {
  try {
    // First check if userId exists
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Convert to string if it's an ObjectId
    const userIdStr = userId.toString ? userId.toString() : userId;

    // Validate format if it looks like an ObjectId
    if (mongoose.Types.ObjectId.isValid(userIdStr)) {
      if (!mongoose.Types.ObjectId.isValid(userIdStr)) {
        throw new Error('Invalid user ID format');
      }
    }

    const userProfile = await UserProfile.findOne({ userId: userIdStr })
      .select('highestEducation educations skills areasOfInterest')
      .lean();
    
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const user = {
      highestEducation: userProfile.highestEducation,
      educations: userProfile.educations || [],
      skills: userProfile.skills || [],
      interests: userProfile.areasOfInterest || []
    };

    const baseQuery = {
      isActive: true,
      deadline: { $gt: new Date() }
    };

    if (user.highestEducation) {
      const mappedLevels = EDUCATION_LEVEL_MAPPING[user.highestEducation] || [];
      if (mappedLevels.length > 0) {
        baseQuery.level = { 
          $in: mappedLevels,
          $options: 'i'
        };
      }
    }

    if (user.educations.length > 0 && user.educations[0].fieldOfStudy) {
      const fieldOfStudy = user.educations[0].fieldOfStudy;
      baseQuery.$or = [
        { fieldOfStudy: new RegExp(fieldOfStudy, 'i') },
        { specialization: new RegExp(fieldOfStudy, 'i') },
        { tags: new RegExp(fieldOfStudy, 'i') }
      ];
    }

    const scholarships = await Scholarship.find(baseQuery).lean();

    const recommendations = scholarships.map(scholarship => {
      const matchScore = calculateMatchScore(user, scholarship);
      const daysRemaining = Math.ceil((scholarship.deadline - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        ...scholarship,
        matchScore,
        daysRemaining,
        matchPercentage: `${matchScore}%`
      };
    });

    return recommendations
      .filter(r => r.matchScore >= 30)
      .sort((a, b) => b.matchScore - a.matchScore || a.daysRemaining - b.daysRemaining);
    
  } catch (error) {
    console.error('Recommendation service error:', error);
    throw error;
  }
};