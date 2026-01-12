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
    enum: ['turnkey-project', 'commercial-kitchen', 'mep-hvac', 'civil-interior', 'maintenance-amc', 'equipment-supply', 'other'],
    required: [true, 'Please specify project type']
  },
  description: {
    type: String,
    required: [true, 'Please provide project description'],
    trim: true
  },
  clientName: {
    type: String,
    required: [true, 'Please provide client name'],
    trim: true
  },
  clientEmail: {
    type: String,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  clientPhone: {
    type: String,
    validate: {
      validator: function(v) {
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
    enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'],
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
  discussions: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    parentDiscussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'discussions'
    },
    messageType: {
      type: String,
      enum: ['user', 'system'],
      default: 'user'
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    attachments: [{
      type: String
    }]
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);