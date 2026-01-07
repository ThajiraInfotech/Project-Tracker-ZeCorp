const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  settingName: {
    type: String,
    required: [true, 'Please provide a setting name'],
    unique: true,
    trim: true
  },
  settingKey: {
    type: String,
    required: [true, 'Please provide a setting key'],
    unique: true,
    trim: true
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Please provide a setting value']
  },
  settingType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['working-hours', 'company-rules', 'notification-rules', 'security', 'general'],
    default: 'general'
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
systemSettingSchema.index({ settingKey: 1 });
systemSettingSchema.index({ category: 1 });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);