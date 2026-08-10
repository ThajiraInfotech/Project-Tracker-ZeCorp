const mongoose = require('mongoose');

const taskLabelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a label name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Label name cannot exceed 50 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

taskLabelSchema.index({ name: 1 });

module.exports = mongoose.model('TaskLabel', taskLabelSchema);
