const mongoose = require('mongoose');

const siteAttendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['technician'], // Strictly for technicians
        required: true,
        default: 'technician'
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    checkIn: {
        type: Date
    },
    checkOut: {
        type: Date
    },
    totalHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Present', 'Completed', 'In Progress'],
        default: 'In Progress'
    },
    siteLocation: {
        type: String, // Optional: if we want to track where they went
        default: ''
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    serviceReport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceReport'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for one record per user per date? 
// No, a technician might visit multiple sites in a day. 
// But the user asked for "check in and go for site work after completing the work the check out".
// This implies one main site visit or potentially multiple. 
// The user said "keep this separate... structure same like office attendance".
// Office attendance is one per day. 
// "Admin must have one more table for site attendance where he sees the site attendance"
// If it's "like office attendance", let's assume one main record per day for simplicity for now, 
// OR allow multiple if they go to multiple sites. 
// Re-reading: "check in and go for site work after completing the work the check out".
// It sounds like a single session.
// However, unlike office attendance, site work might happen multiple times. 
// But to keep it "structure should be the same like office attendance", I will enforce unique per date for now to avoid complexity unless specified otherwise.
// Actually, a technician might go to Site A, finish, helping at Site B?
// If I make it unique per date, they can't. 
// But "structure same like office attendance" strongly suggests one record per day. 
// I will stick to one record per day to match the request "structure should be the same like office attendance".

// siteAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SiteAttendance', siteAttendanceSchema);
