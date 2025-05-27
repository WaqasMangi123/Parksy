const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    maxlength: [100, 'Email cannot be more than 100 characters']
  },
  rating: { 
    type: Number, 
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  university: {
    type: String,
    trim: true,
    maxlength: [150, 'University name cannot be more than 150 characters']
  },
  program: {
    type: String,
    trim: true,
    maxlength: [150, 'Program name cannot be more than 150 characters']
  },
  feedback: { 
    type: String, 
    required: [true, 'Feedback is required'],
    trim: true,
    minlength: [10, 'Feedback should be at least 10 characters long'],
    maxlength: [2000, 'Feedback cannot be more than 2000 characters']
  },
  contactPermission: { 
    type: Boolean, 
    default: false 
  },
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'featured', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
feedbackSchema.index({ email: 1 });
feedbackSchema.index({ rating: -1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ submittedAt: -1 });

// Virtual for formatted date
feedbackSchema.virtual('formattedDate').get(function() {
  return this.submittedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;