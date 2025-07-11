const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Basic phone validation - allows various formats
        return /^[\+]?[1-9][\d]{0,15}$/.test(v.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid phone number'
    }
  },
  inquiryType: {
    type: String,
    required: true,
    enum: [
      'Not Finding Parking Spot',
      'Double Booking Issue',
      'Cancel Booking Request',
      'Payment Related Issue',
      'Technical Problem',
      'Parking Spot Quality Issue',
      'Refund Request',
      'Account Related Issue',
      'Other Emergency'
    ]
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000
  },
  priority: {
    type: String,
    enum: ['HIGH', 'NORMAL'],
    default: 'NORMAL'
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  adminResponse: {
    type: String,
    trim: true
  },
  responseDate: {
    type: Date
  },
  assignedTo: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  },
  emailSent: {
    admin: {
      type: Boolean,
      default: false
    },
    user: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
emergencyContactSchema.index({ createdAt: -1 });
emergencyContactSchema.index({ status: 1 });
emergencyContactSchema.index({ priority: 1 });
emergencyContactSchema.index({ email: 1 });
emergencyContactSchema.index({ inquiryType: 1 });

// Virtual for calculating response time
emergencyContactSchema.virtual('responseTime').get(function() {
  if (this.responseDate && this.createdAt) {
    return Math.round((this.responseDate - this.createdAt) / (1000 * 60 * 60)); // in hours
  }
  return null;
});

// Method to check if ticket is overdue
emergencyContactSchema.methods.isOverdue = function() {
  const now = new Date();
  const hoursElapsed = (now - this.createdAt) / (1000 * 60 * 60);
  
  if (this.priority === 'HIGH' && hoursElapsed > 2) {
    return true;
  }
  if (this.priority === 'NORMAL' && hoursElapsed > 24) {
    return true;
  }
  return false;
};

// Pre-save middleware to update the updatedAt field
emergencyContactSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get dashboard statistics
emergencyContactSchema.statics.getDashboardStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        openTickets: {
          $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] }
        },
        highPriorityTickets: {
          $sum: { $cond: [{ $eq: ['$priority', 'HIGH'] }, 1, 0] }
        },
        resolvedTickets: {
          $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalTickets: 0,
    openTickets: 0,
    highPriorityTickets: 0,
    resolvedTickets: 0
  };
};

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);