const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalHours: {
    type: Number,
    min: 0,
    max: 24
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number]
  },
  deviceInfo: {
    type: String
  },
  ipAddress: {
    type: String
  },
  tasksWorkedOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  comments: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
attendanceSchema.index({ location: '2dsphere' });
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);