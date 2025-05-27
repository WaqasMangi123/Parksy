const express = require('express');
const router = express.Router();
const Profile = require('../models/userprofile');
const { generateCV } = require('../services/cvGenerator');
const { validateObjectId } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Rate limiting for CV generation (5 requests per minute)
const cvGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many CV generation requests',
      suggestion: 'Please wait a minute before trying again'
    });
  }
});

// Template configurations with required fields
const TEMPLATE_CONFIG = {
  modern: {
    name: 'Modern Professional',
    description: 'Clean contemporary design with emphasis on typography',
    requiredFields: ['name', 'educations', 'skills', 'objective']
  },
  classic: {
    name: 'Classic Academic',
    description: 'Traditional professional layout',
    requiredFields: ['name', 'educations', 'experiences']
  },
  colorful: {
    name: 'Creative Portfolio',
    description: 'Modern design with colors and visual elements',
    requiredFields: ['name', 'educations', 'projects']
  },
  ats: {
    name: 'ATS Friendly',
    description: 'Simple format optimized for applicant tracking systems',
    requiredFields: ['name', 'educations', 'skills', 'experiences']
  }
};

/**
 * @route POST /api/cv/:userId/generate-cv
 * @desc Generate a CV PDF for the user
 * @access Private
 */
router.post(
  '/:userId/generate-cv',
  validateObjectId,
  cvGenerationLimiter,
  async (req, res) => {
    try {
      const { templateType = 'colorful' } = req.body;
      const { userId } = req.params;

      // Validate template type
      if (!TEMPLATE_CONFIG[templateType]) {
        return res.status(400).json({
          success: false,
          message: 'Invalid template type specified',
          validTemplates: Object.keys(TEMPLATE_CONFIG),
          suggestion: 'Please select from the available template types'
        });
      }

      // Validate MongoDB ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format',
          suggestion: 'Please provide a valid user ID'
        });
      }

      // Find profile by user ID
      const profile = await Profile.findOne({ userId })
        .populate('userId', 'username email')
        .lean();

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found',
          suggestion: 'Please complete your profile before generating a CV'
        });
      }

      // Template-specific validation
      const { requiredFields } = TEMPLATE_CONFIG[templateType];
      const missingFields = requiredFields.filter(field => {
        const value = profile[field];
        return !value || (Array.isArray(value) && value.length === 0);
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Profile incomplete for selected template',
          missingFields,
          requiredFields,
          suggestion: `Please complete the following sections: ${missingFields.join(', ')}`
        });
      }

      // Generate CV with timeout protection
      const generationTimeout = 20000; // 20 seconds
      const cvBuffer = await Promise.race([
        generateCV(profile, templateType),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('CV generation timeout')), generationTimeout)
        )
      ]);

      // Validate generated PDF
      if (!cvBuffer || !(cvBuffer instanceof Buffer)) {
        throw new Error('Invalid CV generation output');
      }

      // Set response headers
      const sanitizedName = profile.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const sanitizedTemplate = TEMPLATE_CONFIG[templateType].name.replace(/\s+/g, '_');
      const filename = `${sanitizedName}_${sanitizedTemplate}_CV.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': cvBuffer.length,
        'X-CV-Template': templateType,
        'X-CV-Filename': filename
      });

      return res.send(cvBuffer);

    } catch (error) {
      console.error('CV Generation Error:', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId,
        templateType: req.body.templateType,
        timestamp: new Date().toISOString()
      });

      const errorResponse = {
        success: false,
        message: 'Failed to generate CV',
        suggestion: 'Please try again later'
      };

      if (error.message.includes('timeout')) {
        errorResponse.message = 'CV generation took too long';
        errorResponse.suggestion = 'Try again with a simpler template or less data';
        return res.status(504).json(errorResponse);
      }

      if (error.message.includes('profile photo')) {
        errorResponse.message = 'Profile image processing failed';
        errorResponse.suggestion = 'Try uploading a different image or remove the profile photo';
        return res.status(422).json(errorResponse);
      }

      if (error.message.includes('template')) {
        errorResponse.message = 'Template processing error';
        errorResponse.suggestion = 'Please select a different template';
        return res.status(400).json(errorResponse);
      }

      if (process.env.NODE_ENV === 'development') {
        errorResponse.error = error.message;
        errorResponse.stack = error.stack;
      }

      return res.status(500).json(errorResponse);
    }
  }
);

/**
 * @route GET /api/cv/templates
 * @desc Get available CV templates
 * @access Public
 */
router.get('/templates', (req, res) => {
  try {
    const templates = Object.entries(TEMPLATE_CONFIG).map(([value, config]) => ({
      value,
      name: config.name,
      description: config.description,
      requiredFields: config.requiredFields
    }));

    return res.json({
      success: true,
      count: templates.length,
      templates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Template List Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve template list'
    });
  }
});

module.exports = router;