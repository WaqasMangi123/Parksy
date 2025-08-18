const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Booking References - MATCHES your route implementation
  our_reference: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    uppercase: true
  },
  magr_reference: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  booking_id: {
    type: String,
    required: false,
    trim: true
  },

  // User Information - MATCHES your authentication system
  user_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional to allow flexibility
  },
  
  // Service Details - MATCHES your route field names exactly
  company_code: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  product_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  product_code: {
    type: String,
    required: false,
    trim: true
  },
  airport_code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(code) {
        return /^[A-Z]{3}$/.test(code);
      },
      message: 'Airport code must be 3 uppercase letters'
    }
  },
  parking_type: {
    type: String,
    required: true,
    trim: true,
    default: 'Meet & Greet'
  },

  // Financial Details - MATCHES your calculation logic
  booking_amount: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(amount) {
        return Number.isFinite(amount) && amount >= 0;
      },
      message: 'Booking amount must be a valid positive number'
    }
  },
  commission_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  commission_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'GBP',
    uppercase: true
  },

  // Customer Details - EXACT MATCH to your form fields
  customer_details: {
    title: {
      type: String,
      required: true,
      enum: ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    customer_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Invalid customer email format'
      }
    },
    phone_number: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Travel Details - EXACT MATCH to your MAGR API format
  travel_details: {
    dropoff_date: {
      type: String,
      required: true,
      validate: {
        validator: function(date) {
          return /^\d{4}-\d{2}-\d{2}$/.test(date);
        },
        message: 'Date must be in YYYY-MM-DD format'
      }
    },
    dropoff_time: {
      type: String,
      required: true,
      validate: {
        validator: function(time) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
        },
        message: 'Time must be in HH:MM format'
      }
    },
    pickup_date: {
      type: String,
      required: true,
      validate: {
        validator: function(date) {
          return /^\d{4}-\d{2}-\d{2}$/.test(date);
        },
        message: 'Date must be in YYYY-MM-DD format'
      }
    },
    pickup_time: {
      type: String,
      required: true,
      validate: {
        validator: function(time) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
        },
        message: 'Time must be in HH:MM format'
      }
    },
    departure_flight_number: {
      type: String,
      default: 'TBA',
      trim: true,
      maxlength: 20
    },
    arrival_flight_number: {
      type: String,
      default: 'TBA',
      trim: true,
      maxlength: 20
    },
    departure_terminal: {
      type: String,
      default: 'Terminal 1',
      trim: true
    },
    arrival_terminal: {
      type: String,
      default: 'Terminal 1',
      trim: true
    },
    passenger_count: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    }
  },

  // Vehicle Details - EXACT MATCH to your form fields
  vehicle_details: {
    car_registration_number: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 15
    },
    car_make: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    car_model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    car_color: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    }
  },

  // Booking Status - SIMPLIFIED for no payment processing
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'active',
      'completed',
      'cancelled',
      'expired',
      'amended',
      'no_show'
    ],
    default: 'confirmed',
    index: true
  },

  // Payment Details - SIMPLIFIED (no payment processing)
  payment_details: {
    payment_method: {
      type: String,
      enum: ['Invoice', 'Card', 'PayPal', 'Cash', 'Bank_Transfer', 'Stripe', 'None'],
      default: 'Invoice'
    },
    payment_token: {
      type: String,
      required: false,
      trim: true
    },
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'not_required', 'confirmed'],
      default: 'confirmed',
      index: true
    }
  },

  // Service Features - MATCHES your route logic
  service_features: {
    is_cancelable: {
      type: Boolean,
      default: false
    },
    is_editable: {
      type: Boolean,
      default: false
    },
    special_features: [{
      type: String,
      trim: true
    }]
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  
  // MAGR API Response Data - for debugging
  magr_response: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  // Notes
  notes: {
    type: String,
    required: false,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt automatically
  versionKey: false // Remove __v field
});

// Indexes for performance
bookingSchema.index({ our_reference: 1 }, { unique: true });
bookingSchema.index({ magr_reference: 1 });
bookingSchema.index({ user_email: 1 });
bookingSchema.index({ user_id: 1 });
bookingSchema.index({ airport_code: 1 });
bookingSchema.index({ company_code: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ created_at: -1 });
bookingSchema.index({ 'travel_details.dropoff_date': 1 });

// Compound indexes for common queries
bookingSchema.index({ user_email: 1, status: 1 });
bookingSchema.index({ airport_code: 1, 'travel_details.dropoff_date': 1 });

// Pre-save middleware
bookingSchema.pre('save', function(next) {
  // Update timestamp
  this.updated_at = new Date();
  
  // Calculate commission amount if not already set
  if (this.commission_percentage && this.booking_amount && !this.commission_amount) {
    this.commission_amount = parseFloat((this.booking_amount * this.commission_percentage / 100).toFixed(2));
  }
  
  // Ensure user_email matches customer_details.customer_email
  if (this.customer_details && this.customer_details.customer_email) {
    this.user_email = this.customer_details.customer_email.toLowerCase();
  }
  
  next();
});

// Virtual properties
bookingSchema.virtual('customer_full_name').get(function() {
  if (!this.customer_details) return 'Unknown Customer';
  return `${this.customer_details.title} ${this.customer_details.first_name} ${this.customer_details.last_name}`;
});

bookingSchema.virtual('duration_days').get(function() {
  if (!this.travel_details) return 0;
  const dropoff = new Date(this.travel_details.dropoff_date);
  const pickup = new Date(this.travel_details.pickup_date);
  const diffTime = Math.abs(pickup - dropoff);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const dropoffDateTime = new Date(`${this.travel_details.dropoff_date}T${this.travel_details.dropoff_time}`);
  const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
  
  return this.service_features.is_cancelable && 
         ['confirmed', 'active'].includes(this.status) && 
         hoursUntilDropoff > 48;
};

bookingSchema.methods.canBeAmended = function() {
  const now = new Date();
  const dropoffDateTime = new Date(`${this.travel_details.dropoff_date}T${this.travel_details.dropoff_time}`);
  const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
  
  return this.service_features.is_editable && 
         ['confirmed', 'active'].includes(this.status) && 
         hoursUntilDropoff > 48;
};

// Method to format booking for display - MATCHES your route response format
bookingSchema.methods.toDisplayFormat = function() {
  return {
    id: this._id,
    reference: this.our_reference,
    magr_reference: this.magr_reference,
    customer_name: this.customer_full_name,
    customer_email: this.customer_details.customer_email,
    airport: this.airport_code,
    service: this.product_name,
    parking_type: this.parking_type,
    dropoff: `${this.travel_details.dropoff_date} ${this.travel_details.dropoff_time}`,
    pickup: `${this.travel_details.pickup_date} ${this.travel_details.pickup_time}`,
    duration: this.duration_days,
    amount: this.booking_amount,
    commission: this.commission_amount,
    currency: this.currency,
    status: this.status,
    payment_status: this.payment_details.payment_status,
    can_cancel: this.canBeCancelled(),
    can_amend: this.canBeAmended(),
    created: this.created_at,
    vehicle: {
      registration: this.vehicle_details.car_registration_number,
      make: this.vehicle_details.car_make,
      model: this.vehicle_details.car_model,
      color: this.vehicle_details.car_color
    }
  };
};

// Static methods - MATCHES your route usage
bookingSchema.statics.findByEmail = function(email) {
  return this.find({ user_email: email.toLowerCase() }).sort({ created_at: -1 });
};

bookingSchema.statics.findRecent = function(limit = 10) {
  return this.find().sort({ created_at: -1 }).limit(limit);
};

bookingSchema.statics.findByStatus = function(status, limit = 50) {
  return this.find({ status }).sort({ created_at: -1 }).limit(limit);
};

// Better error handling
bookingSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    // Handle duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    const message = `A booking with this ${field} already exists`;
    next(new Error(message));
  } else if (error.name === 'ValidationError') {
    // Handle validation errors
    const messages = Object.values(error.errors).map(err => err.message);
    next(new Error(`Validation failed: ${messages.join(', ')}`));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('Booking', bookingSchema);