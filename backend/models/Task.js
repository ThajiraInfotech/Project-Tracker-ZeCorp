const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign this task to a user']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deadline: {
    type: Date,
    required: [true, 'Please provide a deadline']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'in-progress', 'review', 'completed', 'blocked', 'delayed'],
    default: 'todo'
  },
  label: {
    type: String,
    enum: ['QUOTE', 'Design', 'site visit', 'Installation', 'Invoice', 'Procurement', 'meeting', 'service', 'Delivery'],
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  subtasks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'completed'],
      default: 'todo'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  files: [{
    type: String
  }],
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
      url: String, // Changed from type: String to url: String for clarity, but keeping simple structure is fine too. Let's stick to the plan: type: String which is the URL
      name: String,
      fileType: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for isOverdue
taskSchema.virtual('isOverdue').get(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.status !== 'completed' && this.deadline < today;
});

// Indexes for better query performance
taskSchema.index({ project: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ label: 1 });
taskSchema.index({ deadline: 1 });

module.exports = mongoose.model('Task', taskSchema);