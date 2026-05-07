const SiteAttendance = require('../models/SiteAttendance');
const User = require('../models/User');
const { getDubaiDate } = require('../utils/time-zone-util');

// Check In (Site)
exports.checkIn = async (req, res) => {
    try {
        const today = getDubaiDate(); // YYYY-MM-DD (Dubai Time)

        // Check if there is an ACTIVE site visit (checked in but not checked out)
        const activeSiteVisit = await SiteAttendance.findOne({
            userId: req.user._id,
            checkOut: null
        });

        if (activeSiteVisit) {
            return res.status(400).json({ message: 'You have an ongoing site visit. Please complete it first.' });
        }

        // Create site attendance record
        const siteAttendance = new SiteAttendance({
            userId: req.user._id,
            role: 'technician', // Force role
            date: today,
            checkIn: new Date(),
            status: 'In Progress',
            taskId: req.body.taskId || undefined
        });

        await siteAttendance.save();

        // Broadcast real-time update to all connected clients
        if (req.io) {
            req.io.to('global').emit('site_attendance_updated', { userId: req.user._id });
        }

        res.status(201).json({
            success: true,
            message: 'Checked in for site work successfully',
            attendance: siteAttendance
        });
    } catch (error) {
        console.error('Site Check in error:', error);
        res.status(500).json({ message: 'Failed to check in', error: error.message });
    }
};

// Check Out (Site)
exports.checkOut = async (req, res) => {
    try {
        // Find active check-in (where checkOut is null)
        const attendance = await SiteAttendance.findOne({
            userId: req.user._id,
            checkOut: null
        }).sort({ checkIn: -1 });

        if (!attendance) {
            return res.status(400).json({ message: 'No active site check-in found' });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ message: 'Already checked out from site work today' });
        }

        // Calculate hours
        let checkOut = new Date();
        // Test mode support if needed (copying mainly for consistency, though maybe not strictly required)
        if (process.env.ENABLE_TIME_SIMULATION === 'true' && req.body.testCheckOutTime) {
            checkOut = new Date(req.body.testCheckOutTime);
        }

        const totalHours = (checkOut - attendance.checkIn) / (1000 * 60 * 60);

        // Update record
        attendance.checkOut = checkOut;
        attendance.totalHours = parseFloat(totalHours.toFixed(2));
        attendance.status = 'Completed';

        await attendance.save();

        // Broadcast real-time update to all connected clients
        if (req.io) {
            req.io.to('global').emit('site_attendance_updated', { userId: req.user._id });
        }

        res.json({
            success: true,
            message: 'Checked out from site work successfully',
            attendance
        });
    } catch (error) {
        console.error('Site Check out error:', error);
        res.status(500).json({ message: 'Failed to check out', error: error.message });
    }
};

// Get My Site Attendance (For Technician)
exports.getMyAttendance = async (req, res) => {
    try {
        const history = await SiteAttendance.find({ userId: req.user._id })
            .populate({
                path: 'taskId',
                select: 'title project jobOrder',
                populate: { path: 'project', select: 'projectName jobOrder' }
            })
            .populate({
                path: 'serviceReport',
                populate: {
                    path: 'technicianId',
                    select: 'username fullName email profileImage'
                }
            })
            .sort({ date: -1 });

        res.json({
            success: true,
            attendance: history
        });
    } catch (error) {
        console.error('Get my site attendance error:', error);
        res.status(500).json({ message: 'Failed to get site attendance' });
    }
};

// Get Site Attendance for a specific Task
exports.getTaskAttendance = async (req, res) => {
    try {
        const { taskId } = req.params;
        const history = await SiteAttendance.find({ taskId })
            .populate('userId', 'username fullName email profileImage')
            .populate({
                path: 'serviceReport',
                populate: {
                    path: 'technicianId',
                    select: 'username fullName email profileImage'
                }
            })
            .sort({ checkIn: -1 });

        res.json({
            success: true,
            attendance: history
        });
    } catch (error) {
        console.error('Get task site attendance error:', error);
        res.status(500).json({ message: 'Failed to get task site attendance' });
    }
};

// Get All Site Attendance (For Admin)
exports.getAllAttendance = async (req, res) => {
    try {
        const { date, month, userId } = req.query;
        let query = {};

        if (date) {
            query.date = date;
        } else if (month) {
            query.date = { $regex: `^${month}` };
        }

        if (userId) {
            query.userId = userId;
        }

        const attendanceRecords = await SiteAttendance.find(query)
            .populate('userId', 'username fullName email role profileImage')
            .populate({
                path: 'taskId',
                select: 'title project jobOrder',
                populate: { path: 'project', select: 'projectName jobOrder' }
            })
            .populate({
                path: 'serviceReport',
                populate: {
                    path: 'technicianId',
                    select: 'username fullName email profileImage'
                }
            })
            .sort({ date: -1 });

        res.json({
            success: true,
            attendance: attendanceRecords
        });
    } catch (error) {
        console.error('Get all site attendance error:', error);
        res.status(500).json({ message: 'Failed to get all site attendance' });
    }
};
