// routes/bachelorscholarship.js

const express = require('express');
const router = express.Router();
const BachelorScholarship = require('../models/bachelorscholorship'); // Import the BachelorScholarship model

// Route to get all Bachelor scholarships
router.get('/', async (req, res) => {
  try {
    const scholarships = await BachelorScholarship.find();
    res.json(scholarships);
  } catch (error) {
    console.error('Error fetching bachelor scholarships:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route to get a specific Bachelor scholarship by ID
router.get('/:id', async (req, res) => {
  try {
    const scholarship = await BachelorScholarship.findById(req.params.id);
    if (!scholarship) return res.status(404).json({ error: 'Scholarship not found' });
    res.json(scholarship);
  } catch (error) {
    console.error('Error fetching bachelor scholarship:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Route to add a new Bachelor scholarship (for manual entries)
router.post('/', async (req, res) => {
  try {
    const newScholarship = new BachelorScholarship(req.body);
    await newScholarship.save();
    res.status(201).json(newScholarship);
  } catch (error) {
    console.error('Error creating bachelor scholarship:', error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

// Route to update a Bachelor scholarship by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedScholarship = await BachelorScholarship.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedScholarship) return res.status(404).json({ error: 'Scholarship not found' });
    res.json(updatedScholarship);
  } catch (error) {
    console.error('Error updating bachelor scholarship:', error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

// Route to delete a Bachelor scholarship by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedScholarship = await BachelorScholarship.findByIdAndDelete(req.params.id);
    if (!deletedScholarship) return res.status(404).json({ error: 'Scholarship not found' });
    res.json({ message: 'Scholarship deleted successfully' });
  } catch (error) {
    console.error('Error deleting bachelor scholarship:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
