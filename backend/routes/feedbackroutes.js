const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Feedback = require('../models/feedback'); // Add this line to import your Feedback model

// Rate limiting configuration
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many feedback submissions from this IP, please try again later'
});

// Email transporter setup (unchanged)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'waqasahmedd78676@gmail.com',
    pass: process.env.EMAIL_PASS
  }
});

// Validation rules (unchanged)
const feedbackValidationRules = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('university').optional().trim().escape(),
  body('program').optional().trim().escape(),
  body('feedback').trim().notEmpty().withMessage('Feedback is required').escape(),
  body('contactPermission').isBoolean().withMessage('Contact permission must be a boolean')
];

// POST route - updated to save to database
router.post('/', submitLimiter, feedbackValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { name, email, rating, university, program, feedback, contactPermission } = req.body;

    // Save to database
    const newFeedback = new Feedback({
      name,
      email,
      rating,
      university,
      program,
      feedback,
      contactPermission
    });
    
    const savedFeedback = await newFeedback.save();

    // Prepare email templates (unchanged)
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Feedback Received</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</p>
          ${university ? `<p><strong>University:</strong> ${university}</p>` : ''}
          ${program ? `<p><strong>Program:</strong> ${program}</p>` : ''}
          <p><strong>Feedback:</strong></p>
          <p style="white-space: pre-wrap;">${feedback}</p>
          <p><strong>Contact Permission:</strong> ${contactPermission ? '✅ Yes' : '❌ No'}</p>
        </div>
        <p style="font-size: 0.9em; color: #64748b;">
          Submitted at: ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    const userHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Thank You, ${name}!</h2>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>We sincerely appreciate you taking the time to share your feedback with us.</p>
          <p>Your ${rating}-star rating and comments help us improve our services.</p>
          
          ${contactPermission ? `
          <div style="background-color: #e0f2fe; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; border-radius: 4px;">
            <p><strong>You've opted in to be contacted:</strong></p>
            <ul style="margin-top: 5px;">
              <li>For follow-up questions about your experience</li>
              <li>Potential feature in our success stories</li>
              <li>Exclusive offers and updates</li>
            </ul>
          </div>
          ` : ''}
        </div>
        
        <p>If you have any additional thoughts, feel free to reply to this email.</p>
        <p style="margin-top: 30px;">Best regards,</p>
        <p><strong>The ${process.env.APP_NAME || 'Scholarship Finder'} Team</strong></p>
        
        <div style="margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    `;

    // Send emails (unchanged)
    await Promise.all([
      transporter.sendMail({
        from: `"Feedback System" <waqasahmedd78676@gmail.com>`,
        to: 'waqasahmedd78676@gmail.com',
        subject: 'New Feedback Submission',
        html: adminHtml
      }),
      transporter.sendMail({
        from: `"Customer Support" <waqasahmedd78676@gmail.com>`,
        to: email,
        subject: 'Thank You for Your Feedback',
        html: userHtml
      })
    ]);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: savedFeedback._id,
        name: savedFeedback.name,
        email: savedFeedback.email,
        rating: savedFeedback.rating
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET all feedback - updated to query database
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { feedback: { $regex: search, $options: 'i' } }
      ];
    }

    const feedbacks = await Feedback.find(query)
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Feedback.countDocuments(query);

    res.json({
      success: true,
      count,
      data: feedbacks
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback'
    });
  }
});

// GET single feedback - updated to query database
router.get('/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback'
    });
  }
});

// DELETE feedback - updated to delete from database
router.delete('/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting feedback'
    });
  }
});

module.exports = router;