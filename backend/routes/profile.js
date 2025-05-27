const express = require('express');
const router = express.Router();
const UserProfile = require('../models/userprofile');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper function to format validation errors
const formatValidationErrors = (errors) => {
  return errors.array().reduce((acc, err) => {
    acc[err.param] = err.msg;
    return acc;
  }, {});
};

// @route   POST /api/profile
// @desc    Create/update user profile
// @access  Private
router.post('/', [
  auth,
  [
    check('name', 'Name is required').not().isEmpty().trim().escape(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('objective', 'Objective must be at least 100 characters').isLength({ min: 100 }).trim(),
    check('highestEducation', 'Highest education level is required').not().isEmpty(),
    
    // Education validation
    check('educations').isArray({ min: 1 }).withMessage('At least one education entry is required'),
    check('educations.*.institution', 'Institution is required').not().isEmpty(),
    check('educations.*.degree', 'Degree is required').not().isEmpty(),
    check('educations.*.fieldOfStudy', 'Field of study is required').not().isEmpty(),
    check('educations.*.startDate', 'Start date is required').not().isEmpty(),
    check('educations.*.cgpa', 'CGPA must be a number between 0 and 4').optional().isFloat({ min: 0, max: 4 }),
    
    // Skills and interests
    check('skills', 'Skills must be an array').isArray({ min: 1 }).withMessage('At least one skill is required'),
    check('areasOfInterest', 'Areas of interest must be an array').isArray({ min: 1 }).withMessage('At least one area of interest is required')
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed',
      errors: formatValidationErrors(errors) 
    });
  }

  try {
    const userId = req.user._id;
    let profileData = req.body;

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Ensure email matches authenticated user
    if (profileData.email !== req.user.email) {
      return res.status(403).json({ 
        success: false,
        message: 'You cannot change your email address'
      });
    }

    // Process profile photo if exists
    if (profileData.profilePhoto && profileData.profilePhoto.startsWith('data:image')) {
      profileData.profilePhoto = profileData.profilePhoto;
    }

    // Additional validation for dates and education level
    if (profileData.educations) {
      for (const edu of profileData.educations) {
        if (edu.endDate && !edu.currentlyEnrolled && new Date(edu.endDate) <= new Date(edu.startDate)) {
          return res.status(400).json({
            success: false,
            message: 'End date must be after start date for education entries'
          });
        }

        // Handle Intermediate level CGPA validation
        if (profileData.highestEducation === 'Intermediate' && edu.cgpa !== null && edu.cgpa !== undefined) {
          if (edu.cgpa < 0 || edu.cgpa > 4) {
            return res.status(400).json({
              success: false,
              message: 'For Intermediate level, CGPA must be between 0 and 4'
            });
          }
        }
      }
    }

    // Transaction for atomic update
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const options = { 
        new: true, 
        upsert: true, 
        runValidators: true, 
        session,
        setDefaultsOnInsert: true
      };

      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        { 
          ...profileData, 
          userId,
          updatedAt: new Date() 
        },
        options
      );

      // Calculate completion percentage
      const completionPercentage = calculateCompletionPercentage(profile.toObject());

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        profile,
        completionPercentage,
        message: 'Profile saved successfully'
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error('Profile save error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).reduce((acc, e) => {
        acc[e.path] = e.message;
        return acc;
      }, {});

      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors 
      });
    }

    if (error.name === 'MongoError' && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Profile already exists for this user'
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to calculate completion percentage
function calculateCompletionPercentage(profile) {
  const requiredFields = [
    profile.name,
    profile.email,
    profile.objective?.length >= 100,
    profile.highestEducation,
    profile.educations?.[0]?.institution,
    profile.educations?.[0]?.degree,
    profile.educations?.[0]?.fieldOfStudy,
    profile.skills?.length > 0,
    profile.areasOfInterest?.length > 0
  ];

  const completedFields = requiredFields.filter(Boolean).length;
  return Math.round((completedFields / requiredFields.length) * 100);
}

// @route   GET /api/profile
// @desc    Get user profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const profile = await UserProfile.findOne({ userId })
      .select('-__v -_id -userId') // Exclude unnecessary fields
      .lean(); // Return plain JavaScript object

    if (!profile) {
      return res.status(200).json({ 
        success: true,
        profile: null,
        message: 'Profile not found' 
      });
    }

    // Calculate completion percentage
    const completionPercentage = calculateCompletionPercentage(profile);

    res.status(200).json({
      success: true,
      profile,
      completionPercentage
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/profile/all
// @desc    Get all user profiles (for admin)
// @access  Private
router.get('/all', auth, async (req, res) => {
  try {
    console.log('Fetching all profiles...'); // Debug log
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Debug log the query parameters
    console.log('Query params:', { page, limit, search });

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'skills': { $regex: search, $options: 'i' } }
      ];
    }

    // Debug log the final query
    console.log('Final query:', JSON.stringify(query));

    const [profiles, count] = await Promise.all([
      UserProfile.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      UserProfile.countDocuments(query)
    ]);

    // Debug log the results
    console.log(`Found ${profiles.length} profiles out of ${count}`);

    const profilesWithCompletion = profiles.map(profile => ({
      ...profile,
      completionPercentage: calculateCompletionPercentage(profile)
    }));

    res.status(200).json({
      success: true,
      data: profilesWithCompletion,
      count,
      message: 'Profiles fetched successfully'
    });

  } catch (error) {
    console.error('Error in /all route:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/profile/:userId
// @desc    Get profile by user ID
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const profile = await UserProfile.findOne({ userId })
      .select('-__v -_id -userId')
      .lean();

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    // Calculate completion percentage
    const completionPercentage = calculateCompletionPercentage(profile);

    res.status(200).json({
      success: true,
      profile: {
        ...profile,
        completionPercentage
      },
      message: 'Profile fetched successfully'
    });

  } catch (error) {
    console.error('Profile fetch by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/profile/:userId
// @desc    Delete user profile
// @access  Private
router.delete('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if the user is deleting their own profile or is admin
    if (userId !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized to delete this profile'
      });
    }

    const result = await UserProfile.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Profile not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Profile deletion error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;