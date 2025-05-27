const mongoose = require('mongoose');

const ScholarshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  fieldOfStudy: {
    type: String,
    trim: true,
    default: '',
    maxlength: [100, 'Field of study cannot exceed 100 characters']
  },
  minCGPA: {
    type: Number,
    min: [0, 'CGPA cannot be negative'],
    max: [4, 'CGPA cannot exceed 4.0'],
    default: null,
    set: v => v === '' ? null : v
  },
  university: {
    type: String,
    required: [true, 'University is required'],
    trim: true,
    maxlength: [150, 'University name cannot exceed 150 characters']
  },
  specialization: {
    type: String,
    trim: true,
    default: '',
    maxlength: [100, 'Specialization cannot exceed 100 characters']
  },
  applicationURL: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: props => `${props.value} is not a valid URL!`
    },
    default: ''
  },
  deadline: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  level: {
    type: String,
    enum: ['Bachelor', 'Master', 'PhD', ''],
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  // Additional fields for better tracking
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

// Text search index with improved weights
ScholarshipSchema.index({
  title: 'text',
  university: 'text',
  description: 'text',
  fieldOfStudy: 'text',
  specialization: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    university: 8,
    fieldOfStudy: 5,
    specialization: 5,
    tags: 3,
    description: 1
  },
  name: 'scholarship_text_search'
});

// Indexes for optimized queries
ScholarshipSchema.index({ applicationURL: 1 });
ScholarshipSchema.index({ university: 1, level: 1, deadline: 1 });
ScholarshipSchema.index({ isActive: 1, deadline: 1 });
ScholarshipSchema.index({ createdAt: -1 });
ScholarshipSchema.index({ lastUpdated: -1 });
ScholarshipSchema.index({ tags: 1 });

// Virtual fields
ScholarshipSchema.virtual('daysRemaining').get(function() {
  if (!this.deadline) return null;
  const diff = this.deadline - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

ScholarshipSchema.virtual('isExpired').get(function() {
  if (!this.deadline) return false;
  return this.deadline < new Date();
});

// Middleware
ScholarshipSchema.pre('save', function(next) {
  // Clean fields
  this.fieldOfStudy = this.fieldOfStudy?.trim() || '';
  this.specialization = this.specialization?.trim() || '';
  this.description = this.description?.trim() || '';
  this.applicationURL = this.applicationURL?.trim().toLowerCase() || '';
  
  // Convert empty strings to null
  if (this.minCGPA === '') this.minCGPA = null;
  if (this.deadline === '') this.deadline = null;
  
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  
  next();
});

// Static methods
ScholarshipSchema.statics.findActive = function() {
  return this.find({ isActive: true, deadline: { $gt: new Date() } });
};

ScholarshipSchema.statics.findByUniversity = function(university) {
  return this.find({ university: new RegExp(university, 'i') });
};

// Instance methods
ScholarshipSchema.methods.getDetails = function() {
  return {
    title: this.title,
    university: this.university,
    deadline: this.deadline,
    daysRemaining: this.daysRemaining,
    isExpired: this.isExpired,
    level: this.level
  };
};

module.exports = mongoose.model('Scholarship', ScholarshipSchema, 'scholarships_v2');