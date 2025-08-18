const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Booking References
  our_reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  magr_reference: {
    type: String,
    required: true,
    index: true
  },
  booking_id: {
    type: String,
    required: false // Sometimes MAGR API doesn't return this
  },

  // User Information (for now, just email since no auth)
  user_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for now since booking works without login
  },

  // Service Details
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
    uppercase: true
  },
  parking_type: {
    type: String,
    required: true
  },

  // Financial Details
  booking_amount: {
    type: Number,
    required: true,
    min: 0
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
    default: 'GBP'
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
    customer_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone_number: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Travel Details
  travel_details: {
    dropoff_date: {
      type: String,
      required: true // Format: YYYY-MM-DD
    },
    dropoff_time: {
      type: String,
      required: true // Format: HH:MM
    },
    pickup_date: {
      type: String,
      required: true // Format: YYYY-MM-DD
    },
    pickup_time: {
      type: String,
      required: true // Format: HH:MM
    },
    departure_flight_number: {
      type: String,
      default: 'TBA'
    },
    arrival_flight_number: {
      type: String,
      default: 'TBA'
    },
    departure_terminal: {
      type: String,
      default: 'Terminal 1'
    },
    arrival_terminal: {
      type: String,
      default: 'Terminal 1'
    },
    passenger_count: {
      type: Number,
      default: 1,
      min: 1,
      max: 8
    }
  },

  // Vehicle Details
  vehicle_details: {
    car_registration_number: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    car_make: {
      type: String,
      required: true,
      trim: true
    },
    car_model: {
      type: String,
      required: true,
      trim: true
    },
    car_color: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Booking Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'amended', 'completed'],
    default: 'confirmed'
  },

  // Payment Details
  payment_details: {
    payment_method: {
      type: String,
      enum: ['Invoice', 'Card', 'PayPal', 'Cash'],
      default: 'Invoice'
    },
    payment_token: {
      type: String,
      required: false
    },
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    }
  },

  // Service Features
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
      type: String
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
  
  // MAGR API Response Data (for debugging)
  magr_response: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  // Notes
  notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Indexes for better performance
bookingSchema.index({ our_reference: 1 });
bookingSchema.index({ magr_reference: 1 });
bookingSchema.index({ user_email: 1 });
bookingSchema.index({ airport_code: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ created_at: -1 });
bookingSchema.index({ 'travel_details.dropoff_date': 1 });

// Pre-save middleware to update timestamps and calculate commission
bookingSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  // Calculate commission amount if not already set
  if (this.commission_percentage && this.booking_amount && !this.commission_amount) {
    this.commission_amount = (this.booking_amount * this.commission_percentage / 100).toFixed(2);
  }
  
  next();
});

// Virtual for full customer name
bookingSchema.virtual('customer_full_name').get(function() {
  return `${this.customer_details.title} ${this.customer_details.first_name} ${this.customer_details.last_name}`;
});

// Virtual for booking duration
bookingSchema.virtual('duration_days').get(function() {
  const dropoff = new Date(this.travel_details.dropoff_date);
  const pickup = new Date(this.travel_details.pickup_date);
  const diffTime = Math.abs(pickup - dropoff);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const dropoffDateTime = new Date(`${this.travel_details.dropoff_date}T${this.travel_details.dropoff_time}`);
  const hoursUntilDropoff = (dropoffDateTime - now) / (1000 * 60 * 60);
  
  return this.service_features.is_cancelable && 
         this.status === 'confirmed' && 
         hoursUntilDropoff > 48; // Can cancel if more than 48 hours before dropoff
};

// Instance method to format booking for display
bookingSchema.methods.toDisplayFormat = function() {
  return {
    id: this._id,
    reference: this.our_reference,
    magr_reference: this.magr_reference,
    customer_name: this.customer_full_name,
    airport: this.airport_code,
    service: this.product_name,
    dropoff: `${this.travel_details.dropoff_date} ${this.travel_details.dropoff_time}`,
    pickup: `${this.travel_details.pickup_date} ${this.travel_details.pickup_time}`,
    amount: this.booking_amount,
    status: this.status,
    created: this.created_at
  };
};

// Static method to find bookings by email
bookingSchema.statics.findByEmail = function(email) {
  return this.find({ user_email: email.toLowerCase() }).sort({ created_at: -1 });
};

// Static method to find recent bookings
bookingSchema.statics.findRecent = function(limit = 10) {
  return this.find().sort({ created_at: -1 }).limit(limit);
};

module.exports = mongoose.model('Booking', bookingSchema);