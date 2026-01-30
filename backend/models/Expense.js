const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide an expense title'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Please provide an amount'],
        min: [0, 'Amount cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Please provide a category'],
        enum: ['Material', 'Labor', 'Software', 'Equipment', 'Travel', 'Other'],
        default: 'Other'
    },
    vendor: {
        type: String,
        required: [true, 'Please provide a vendor name'],
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Expense must be linked to a project']
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
        // Optional: Expense can be specific to a task or general for the project
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receipt: {
        type: String, // URL to the receipt image/pdf
        default: null
    },
    notes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved' // Auto-approve for now as requested (manager adds it, or staff adds to task)
    }
}, {
    timestamps: true
});

// Index for faster queries
expenseSchema.index({ project: 1 });
expenseSchema.index({ task: 1 });
expenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
