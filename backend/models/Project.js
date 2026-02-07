const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Please provide a project name'],
    trim: true,
    unique: true
  },
  projectType: {
    type: String,
    enum: ['Retail', 'Spare Parts', 'Service', 'Project', 'Design', 'Project Management', 'Administration', 'Operation'],
    required: [true, 'Please specify Scope of Work']
  },
  category: {
    type: String,
    enum: ['Zecorp Kitchen', 'Zecorp Solutions'],
    required: [true, 'Please select a category']
  },
  jobOrder: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide project description'],
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  clientEmail: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true; // Allow empty
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  clientPhone: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true; // Allow empty
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide end date']
  },
  status: {
    type: String,
    enum: ['planning', 'in-progress', 'on-hold', 'completed'],
    default: 'planning'
  },
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative']
  },
  location: {
    type: String,
    trim: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // Manager is now optional - can be assigned later
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  files: [{
    type: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String
    },
    attachments: [{
      url: String,
      name: String,
      fileType: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);