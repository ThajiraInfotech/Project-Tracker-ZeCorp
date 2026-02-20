const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['KITCHEN', 'LAUNDRY'],
        required: true
    },
    subCategory: {
        type: String,
        enum: ['COOK_LINE', 'REF_LINE', 'PREP_LINE', null],
        default: null
    },
    equipmentName: { type: String, required: true },
    fuelType: { type: String },

    modelNumber: String,
    serialNumber: String,
    pncNumber: String,

    fault: { type: Boolean, default: false },
    faultRectified: { type: Boolean, default: false },
    repairable: { type: Boolean, default: true },
    partsReplacement: { type: Boolean, default: false },

    partsUsedInstalled: { type: Boolean, default: false },
    partsUsedRemarks: String,

    jobCompleted: { type: Boolean, default: true },
    jobCompletedRemarks: String,

    serviceRequired: { type: Boolean, default: false },

    technicianRemarks: String
});

const serviceReportSchema = new mongoose.Schema({
    technicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // CHANGED: Attendance -> SiteAttendance to match existing model
    siteAttendanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SiteAttendance',
        required: true,
        unique: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },

    clientDetails: {
        clientName: { type: String, required: true },
        outlet: String,
        branch: String,
        emirates: {
            type: String,
            enum: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'],
            default: 'Dubai'
        },
        attentionPerson: String
    },

    equipments: {
        type: [equipmentSchema],
        validate: v => v.length > 0
    },

    photos: [{
        url: String,
        publicId: String
    }],

    clientRemarks: String,
    clientFeedback: String,
    clientSignature: { type: String, required: true },

    status: {
        type: String,
        enum: ['SUBMITTED', 'LOCKED'],
        default: 'SUBMITTED'
    },

    audit: {
        ipAddress: String,
        deviceInfo: String,
        submittedAt: { type: Date, default: Date.now }
    }

}, { timestamps: true });

serviceReportSchema.pre('save', function (next) {

    for (const eq of this.equipments) {
        if (eq.partsUsedInstalled && !eq.partsUsedRemarks?.trim()) {
            return next(new Error(`Parts Used Remarks required for ${eq.equipmentName}`));
        }

        if (eq.jobCompleted === false && !eq.jobCompletedRemarks?.trim()) {
            return next(new Error(`Job Completed Remarks required for ${eq.equipmentName}`));
        }
    }

    next();
});

module.exports = mongoose.model('ServiceReport', serviceReportSchema);
