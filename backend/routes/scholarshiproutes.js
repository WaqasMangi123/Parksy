const express = require('express');
const router = express.Router();
const Scholarship = require('../models/scholarshipModel');
const mongoose = require('mongoose');

/**
 * @swagger
 * tags:
 *   name: Scholarships
 *   description: Scholarship management endpoints
 */

// @desc    Get all scholarships with optional filtering
// @route   GET /api/scholarships
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { level, university, minCGPA } = req.query;
    const query = {};
    
    if (level) query.level = level;
    if (university) query.university = new RegExp(university, 'i');
    if (minCGPA) query.minCGPA = { $gte: Number(minCGPA) };

    const scholarships = await Scholarship.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: scholarships.length,
      data: scholarships
    });
  } catch (err) {
    console.error('Error fetching scholarships:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @desc    Get single scholarship by ID
// @route   GET /api/scholarships/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scholarship ID format'
      });
    }

    const scholarship = await Scholarship.findById(req.params.id);
    
    if (!scholarship) {
      return res.status(404).json({
        success: false,
        error: 'Scholarship not found'
      });
    }

    res.json({
      success: true,
      data: scholarship
    });
  } catch (err) {
    console.error(`Error fetching scholarship ${req.params.id}:`, err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @desc    Create a new scholarship
// @route   POST /api/scholarships
// @access  Public
router.post('/', async (req, res) => {
  try {
    if (!req.body.title || !req.body.university) {
      return res.status(400).json({
        success: false,
        error: 'Title and university are required'
      });
    }

    const newScholarship = new Scholarship({
      ...req.body,
      deadline: req.body.deadline ? new Date(req.body.deadline) : null
    });

    const scholarship = await newScholarship.save();
    
    res.status(201).json({
      success: true,
      data: scholarship
    });
  } catch (err) {
    console.error('Error creating scholarship:', err);
    
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate scholarship detected'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @desc    Update a scholarship
// @route   PUT /api/scholarships/:id
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scholarship ID format'
      });
    }

    const updates = {
      ...req.body,
      ...(req.body.deadline && { deadline: new Date(req.body.deadline) })
    };

    const scholarship = await Scholarship.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        error: 'Scholarship not found'
      });
    }
    
    res.json({
      success: true,
      data: scholarship
    });
  } catch (err) {
    console.error(`Error updating scholarship ${req.params.id}:`, err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// @desc    Delete a scholarship
// @route   DELETE /api/scholarships/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scholarship ID format'
      });
    }

    const scholarship = await Scholarship.findByIdAndDelete(req.params.id);

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        error: 'Scholarship not found'
      });
    }
    
    res.json({
      success: true,
      data: { id: req.params.id }
    });
  } catch (err) {
    console.error(`Error deleting scholarship ${req.params.id}:`, err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

module.exports = router;