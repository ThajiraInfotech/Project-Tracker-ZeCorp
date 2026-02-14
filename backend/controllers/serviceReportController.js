const mongoose = require('mongoose');
const ServiceReport = require('../models/ServiceReport');
const SiteAttendance = require('../models/SiteAttendance'); // CHANGED: Attendance -> SiteAttendance
const { getDubaiDateTime } = require('../utils/time-zone-util'); // CHANGED: getDubaiNow -> getDubaiDateTime

exports.submitServiceReport = async (req, res) => {
    // Check if we are in a replica set environment for transactions
    // If not, fall back to standard atomic ops sequence for standalone
    // However, user specifically asked for transactions. I will try to use session if possible.

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const userId = req.user._id;

        if (req.user.role !== 'technician') { // CHANGED: TECHNICIAN -> technician (case sensitive check in existing system)
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Find active site attendance
        const activeSite = await SiteAttendance.findOne({
            userId,
            checkOut: null // Existing logic for open session
            // type: 'SITE', // Removed as SiteAttendance model is specific to site anyway
            // siteStatus: 'OPEN' // Removed as we use checkOut: null
        }).session(session);

        if (!activeSite) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'No active site session' });
        }

        const report = new ServiceReport({
            technicianId: userId,
            siteAttendanceId: activeSite._id,
            ...req.body,
            audit: {
                ipAddress: req.ip,
                deviceInfo: req.headers['user-agent'],
                submittedAt: getDubaiDateTime().toDate() // CHANGED: Use existing util
            }
        });

        await report.save({ session });

        // Update Site Attendance closure
        activeSite.status = 'Completed'; // CHANGED: siteStatus -> status
        activeSite.checkOut = getDubaiDateTime().toDate();

        // Calculate hours (simple diff for now, consistent with existing logic)
        const hours = (activeSite.checkOut - activeSite.checkIn) / (1000 * 60 * 60);
        activeSite.totalHours = parseFloat(hours.toFixed(2));

        // Link service report to attendance
        activeSite.serviceReport = report._id;

        await activeSite.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: 'Service Report submitted & site closed'
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error('Service Report Submission Error:', error);

        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Report already exists for this session' });
        }

        // Handle generic errors (like "Parts remarks required")
        res.status(400).json({ success: false, message: error.message });
    }
};

// Admin Endpoints from previous implementation (kept for compatibility)
exports.getAllReports = async (req, res) => {
    try {
        const { date, technicianId, clientName } = req.query;
        let query = {};

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        if (technicianId) {
            query.technicianId = technicianId;
        }

        if (clientName) {
            query['clientDetails.clientName'] = { $regex: clientName, $options: 'i' };
        }

        const reports = await ServiceReport.find(query)
            .populate('technicianId', 'fullName username email profileImage')
            .populate('siteAttendanceId', 'checkIn checkOut totalHours')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: reports.length,
            reports
        });
    } catch (error) {
        console.error('Get All Reports Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const report = await ServiceReport.findById(req.params.id)
            .populate('technicianId', 'fullName username email')
            .populate('siteAttendanceId');

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.json({ success: true, report });
    } catch (error) {
        console.error('Get Report Detail Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch report details' });
    }
};
