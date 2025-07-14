const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'super_admin']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    }
  }],
  sessionTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    ipAddress: String,
    userAgent: String
  }],
  securityLogs: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    success: Boolean
  }]
}, {
  timestamps: true
});

// Index for email lookup
AdminSchema.index({ email: 1 });

// Index for session token cleanup
AdminSchema.index({ "sessionTokens.expiresAt": 1 }, { expireAfterSeconds: 0 });

// Virtual for account lock status
AdminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
AdminSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to increment login attempts
AdminSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If this is the 5th attempt, lock the account for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return await this.updateOne(updates);
};

// Method to reset login attempts
AdminSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to add security log
AdminSchema.methods.addSecurityLog = async function(action, success, ipAddress, userAgent) {
  this.securityLogs.push({
    action,
    success,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
  
  // Keep only last 100 logs
  if (this.securityLogs.length > 100) {
    this.securityLogs = this.securityLogs.slice(-100);
  }
  
  return await this.save();
};

// Method to add session token
AdminSchema.methods.addSessionToken = async function(token, expiresAt, ipAddress, userAgent) {
  this.sessionTokens.push({
    token,
    expiresAt,
    ipAddress,
    userAgent,
    createdAt: new Date()
  });
  
  // Clean up expired tokens
  this.sessionTokens = this.sessionTokens.filter(session => 
    session.expiresAt > new Date()
  );
  
  return await this.save();
};

// Method to remove session token
AdminSchema.methods.removeSessionToken = async function(token) {
  this.sessionTokens = this.sessionTokens.filter(session => 
    session.token !== token
  );
  return await this.save();
};

// Static method to clean up expired tokens
AdminSchema.statics.cleanupExpiredTokens = async function() {
  return await this.updateMany(
    {},
    {
      $pull: {
        sessionTokens: {
          expiresAt: { $lte: new Date() }
        }
      }
    }
  );
};

// Remove password from JSON output
AdminSchema.methods.toJSON = function() {
  const adminObject = this.toObject();
  delete adminObject.password;
  delete adminObject.twoFactorSecret;
  delete adminObject.sessionTokens;
  delete adminObject.backupCodes;
  return adminObject;
};

module.exports = mongoose.model('Admin', AdminSchema);