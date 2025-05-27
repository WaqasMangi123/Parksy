const mongoose = require('mongoose');
const { Schema } = mongoose;

// Education Sub-Schema
const educationSchema = new Schema({
  institution: { 
    type: String, 
    required: [true, 'Institution name is required'],
    trim: true,
    maxlength: [100, 'Institution name cannot exceed 100 characters']
  },
  degree: { 
    type: String, 
    required: [true, 'Degree is required'],
    trim: true,
    maxlength: [100, 'Degree name cannot exceed 100 characters']
  },
  fieldOfStudy: { 
    type: String, 
    required: [true, 'Field of study is required'],
    trim: true,
    maxlength: [100, 'Field of study cannot exceed 100 characters']
  },
  cgpa: { 
    type: Number,
    min: [0, 'CGPA cannot be negative'],
    max: [4, 'CGPA cannot be more than 4'],
    set: v => v === '' ? undefined : v // Handle empty strings
  },
  startDate: { 
    type: Date, 
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value) {
        return value instanceof Date && !isNaN(value);
      },
      message: 'Invalid start date'
    }
  },
  endDate: { 
    type: Date,
    validate: [
      {
        validator: function(value) {
          if (!value) return true; // End date is optional
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid end date'
      },
      {
        validator: function(value) {
          // End date must be after start date if not currently enrolled
          return !this.currentlyEnrolled ? !value || value > this.startDate : true;
        },
        message: 'End date must be after start date'
      }
    ]
  },
  currentlyEnrolled: { 
    type: Boolean, 
    default: false 
  }
}, { _id: false, timestamps: false });

// Project Sub-Schema
const projectSchema = new Schema({
  title: { 
    type: String, 
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [100, 'Project title cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [1000, 'Project description cannot exceed 1000 characters']
  },
  startDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true; // Start date is optional
        return value instanceof Date && !isNaN(value);
      },
      message: 'Invalid start date'
    }
  },
  endDate: { 
    type: Date,
    validate: [
      {
        validator: function(value) {
          if (!value) return true; // End date is optional
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid end date'
      },
      {
        validator: function(value) {
          // End date must be after start date if not currently working
          return !this.currentlyWorking ? !value || !this.startDate || value > this.startDate : true;
        },
        message: 'End date must be after start date'
      }
    ]
  },
  currentlyWorking: { 
    type: Boolean, 
    default: false 
  },
  projectUrl: { 
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(value);
      },
      message: 'Invalid URL format'
    },
    maxlength: [500, 'Project URL cannot exceed 500 characters']
  }
}, { _id: false, timestamps: false });

// Experience Sub-Schema
const experienceSchema = new Schema({
  company: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  position: { 
    type: String, 
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  department: { 
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  startDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true; // Start date is optional
        return value instanceof Date && !isNaN(value);
      },
      message: 'Invalid start date'
    }
  },
  endDate: { 
    type: Date,
    validate: [
      {
        validator: function(value) {
          if (!value) return true; // End date is optional
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid end date'
      },
      {
        validator: function(value) {
          // End date must be after start date if not currently working
          return !this.currentlyWorking ? !value || !this.startDate || value > this.startDate : true;
        },
        message: 'End date must be after start date'
      }
    ]
  },
  currentlyWorking: { 
    type: Boolean, 
    default: false 
  }
}, { _id: false, timestamps: false });

// Main User Profile Schema
const userProfileSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',  // Changed from 'Auth' to 'User' to match your user model
    required: [true, 'User ID is required'],
    unique: true,
    immutable: true // Prevent changing the user ID after creation
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
      message: 'Invalid email format'
    },
    maxlength: [100, 'Email cannot exceed 100 characters']
  },
  profilePhoto: { 
    type: String,
    validate: {
      validator: function(value) {
        if (!value) return true;
        // Basic URL validation or base64 validation
        return /^(data:image\/(png|jpeg|jpg);base64,|https?:\/\/).+/.test(value);
      },
      message: 'Invalid image format'
    },
    maxlength: [5000000, 'Profile photo URL/data too long']
  },
  objective: { 
    type: String, 
    required: [true, 'Objective is required'],
    trim: true,
    minlength: [100, 'Objective should be at least 100 characters long'],
    maxlength: [2000, 'Objective cannot exceed 2000 characters']
  },
  highestEducation: { 
    type: String, 
    required: [true, 'Highest education level is required'],
    enum: {
      values: ['High School', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'Diploma'],
      message: 'Invalid education level'
    }
  },
  educations: {
    type: [educationSchema],
    validate: {
      validator: function(v) {
        return v.length <= 10; // Limit to 10 education entries
      },
      message: 'Cannot have more than 10 education entries'
    }
  },
  projects: {
    type: [projectSchema],
    validate: {
      validator: function(v) {
        return v.length <= 20; // Limit to 20 project entries
      },
      message: 'Cannot have more than 20 project entries'
    }
  },
  experiences: {
    type: [experienceSchema],
    validate: {
      validator: function(v) {
        return v.length <= 20; // Limit to 20 experience entries
      },
      message: 'Cannot have more than 20 experience entries'
    }
  },
  skills: {
    type: [{
      type: String,
      trim: true,
      maxlength: [50, 'Skill cannot exceed 50 characters']
    }],
    validate: {
      validator: function(v) {
        return v.length <= 50; // Limit to 50 skills
      },
      message: 'Cannot have more than 50 skills'
    }
  },
  areasOfInterest: {
    type: [{
      type: String,
      trim: true,
      maxlength: [50, 'Area of interest cannot exceed 50 characters']
    }],
    validate: {
      validator: function(v) {
        return v.length <= 20; // Limit to 20 interests
      },
      message: 'Cannot have more than 20 areas of interest'
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true // Prevent changing creation date
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update the updatedAt field before saving or updating
userProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

userProfileSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Add text indexes for search functionality
userProfileSchema.index({
  name: 'text',
  email: 'text',
  'educations.institution': 'text',
  'educations.fieldOfStudy': 'text',
  'projects.title': 'text',
  'projects.description': 'text',
  'experiences.company': 'text',
  'experiences.position': 'text',
  skills: 'text',
  areasOfInterest: 'text'
});

// Virtual for formatted profile (optional)
userProfileSchema.virtual('formattedProfile').get(function() {
  return {
    name: this.name,
    email: this.email,
    highestEducation: this.highestEducation,
    skills: this.skills.join(', '),
    interests: this.areasOfInterest.join(', ')
  };
});

// Static method for finding profiles by skill
userProfileSchema.statics.findBySkill = function(skill) {
  return this.find({ 
    skills: { $regex: new RegExp(skill, 'i') }
  });
};

// Static method for finding profiles by interest
userProfileSchema.statics.findByInterest = function(interest) {
  return this.find({ 
    areasOfInterest: { $regex: new RegExp(interest, 'i') }
  });
};

// Improved completion percentage calculation
userProfileSchema.methods.calculateCompletion = function() {
  const weights = {
    name: 10,
    email: 10,
    profilePhoto: 5,
    objective: 15,
    highestEducation: 10,
    educations: 15,
    projects: 10,
    experiences: 10,
    skills: 10,
    areasOfInterest: 5
  };

  let completion = 0;

  // Basic fields
  if (this.name) completion += weights.name;
  if (this.email) completion += weights.email;
  if (this.profilePhoto) completion += weights.profilePhoto;
  if (this.objective && this.objective.length >= 100) completion += weights.objective;
  if (this.highestEducation) completion += weights.highestEducation;

  // Array fields (partial credit)
  if (this.educations.length > 0) {
    completion += Math.min(weights.educations, this.educations.length * 3);
  }
  if (this.projects.length > 0) {
    completion += Math.min(weights.projects, this.projects.length * 2);
  }
  if (this.experiences.length > 0) {
    completion += Math.min(weights.experiences, this.experiences.length * 2);
  }
  if (this.skills.length > 0) {
    completion += Math.min(weights.skills, this.skills.length * 0.5);
  }
  if (this.areasOfInterest.length > 0) {
    completion += Math.min(weights.areasOfInterest, this.areasOfInterest.length * 0.5);
  }

  return Math.min(100, Math.round(completion));
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

module.exports = UserProfile;