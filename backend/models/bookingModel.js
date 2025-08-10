// models/bookingModel.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // References
  magr_reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  our_reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Booking Details
  company_code: {
    type: String,
    required: true
  },
  
  product_name: {
    type: String,
    required: true
  },
  
  airport_code: {
    type: String,
    required: true,
    enum: ['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'BHX', 'EDI', 'GLA']
  },
  
  // Dates and Times
  dropoff_date: {
    type: Date,
    required: true
  },
  
  dropoff_time: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  pickup_date: {
    type: Date,
    required: true
  },
  
  pickup_time: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  // Customer Details
  customer_details: {
    title: {
      type: String,
      required: true,
      enum: ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']
    },
    first_name: {
      type: String,
      required: true,
      trim: true
    },
    last_name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Travel Details
  travel_details: {
    departure_flight: {
      type: String,
      trim: true,
      default: 'TBA'
    },
    arrival_flight: {
      type: String,
      trim: true,
      default: 'TBA'
    },
    departure_terminal: {
      type: String,
      required: true
    },
    arrival_terminal: {
      type: String,
      required: true
    },
    passengers: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      default: 1
    }
  },
  
  // Vehicle Details
  vehicle_details: {
    registration: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    make: {
      type: String,
      required: true,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Payment Details
  booking_amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  payment_gateway: {
    type: String,
    required: true,
    enum: ['Invoice', 'Card', 'PayPal'],
    default: 'Invoice'
  },
  
  payment_token: {
    type: String,
    required: true
  },
  
  commission_percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  
  commission_amount: {
    type: Number,
    min: 0
  },
  
  // Service Details
  parking_type: {
    type: String,
    required: true
  },
  
  special_features: [{
    type: String,
    trim: true
  }],
  
  is_cancelable: {
    type: Boolean,
    default: false
  },
  
  is_editable: {
    type: Boolean,
    default: false
  },
  
  // Status and Metadata
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
    index: true
  },
  
  refund_amount: {
    type: Number,
    min: 0
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  last_modified: {
    type: Date,
    default: Date.now
  },
  
  cancelled_at: {
    type: Date
  },
  
  completed_at: {
    type: Date
  },
  
  // Additional metadata
  booking_source: {
    type: String,
    default: 'web'
  },
  
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ user_id: 1, created_at: -1 });
bookingSchema.index({ airport_code: 1, dropoff_date: 1 });
bookingSchema.index({ status: 1, dropoff_date: 1 });
bookingSchema.index({ magr_reference: 1 });
bookingSchema.index({ our_reference: 1 });

// Virtual for full customer name
bookingSchema.virtual('customer_details.full_name').get(function() {
  return `${this.customer_details.title} ${this.customer_details.first_name} ${this.customer_details.last_name}`;
});

// Virtual for booking duration in days
bookingSchema.virtual('duration_days').get(function() {
  const diffTime = Math.abs(this.pickup_date - this.dropoff_date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for dropoff datetime
bookingSchema.virtual('dropoff_datetime').get(function() {
  return new Date(`${this.dropoff_date.toISOString().split('T')[0]}T${this.dropoff_time}`);
});

// Virtual for pickup datetime
bookingSchema.virtual('pickup_datetime').get(function() {
  return new Date(`${this.pickup_date.toISOString().split('T')[0]}T${this.pickup_time}`);
});

// Instance method to check if booking can be amended/cancelled
bookingSchema.methods.canBeModified = function() {
  if (this.status === 'cancelled' || this.status === 'completed' || this.status === 'no-show') {
    return false;
  }
  
  const now = new Date();
  const dropoffDateTime = this.dropoff_datetime;
  const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
  
  return hoursUntilDropoff >= 48;
};

// Instance method to calculate refund amount based on cancellation policy
bookingSchema.methods.calculateRefundAmount = function() {
  const now = new Date();
  const dropoffDateTime = this.dropoff_datetime;
  const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilDropoff < 48) {
    return 0; // No refund within 48 hours
  } else if (hoursUntilDropoff < 168) { // Less than 7 days
    return this.booking_amount * 0.5; // 50% refund
  } else {
    return this.booking_amount * 0.9; // 90% refund (10% admin fee)
  }
};

// Static method to find bookings by airport and date range
bookingSchema.statics.findByAirportAndDateRange = function(airportCode, startDate, endDate) {
  return this.find({
    airport_code: airportCode,
    dropoff_date: {
      $gte: startDate,
      $lte: endDate
    }
  });
};

// Static method to get booking statistics
bookingSchema.statics.getBookingStats = async function(userId = null) {
  const matchStage = userId ? { user_id: new mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$booking_amount' }
      }
    }
  ]);
};

// Pre-save middleware to update last_modified
bookingSchema.pre('save', function(next) {
  this.last_modified = new Date();
  next();
});

// Pre-save middleware to calculate commission
bookingSchema.pre('save', function(next) {
  if (this.commission_percentage && this.booking_amount) {
    this.commission_amount = (this.booking_amount * this.commission_percentage / 100);
  }
  next();
});

// Pre-save middleware to validate dates
bookingSchema.pre('save', function(next) {
  const dropoffDateTime = new Date(`${this.dropoff_date.toISOString().split('T')[0]}T${this.dropoff_time}`);
  const pickupDateTime = new Date(`${this.pickup_date.toISOString().split('T')[0]}T${this.pickup_time}`);
  
  if (pickupDateTime <= dropoffDateTime) {
    return next(new Error('Pickup date/time must be after dropoff date/time'));
  }
  
  if (dropoffDateTime <= new Date()) {
    return next(new Error('Dropoff date/time must be in the future'));
  }
  
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);