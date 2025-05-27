const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/userprofile');
const { generatePDF } = require('../services/pdfGenerator');

// Get available templates
router.get('/', auth, async (req, res) => {
  try {
    const templates = [
      { id: 1, name: 'Professional', previewImage: '/templates/professional.jpg' },
      { id: 2, name: 'Modern', previewImage: '/templates/modern.jpg' },
      { id: 3, name: 'Academic', previewImage: '/templates/academic.jpg' }
    ];
    
    res.status(200).json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate CV with selected template
router.post('/generate', auth, async (req, res) => {
  try {
    const { userId } = req.user;
    const { templateId } = req.body;

    // Get user profile data
    const profile = await User.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(profile, templateId);

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${profile.name}_CV.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;