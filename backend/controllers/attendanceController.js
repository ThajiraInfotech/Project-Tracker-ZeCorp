const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const SystemSetting = require('../models/SystemSetting');
const calculatePayroll = require('../utils/payrollCalculator');
const { getDubaiDate } = require('../utils/time-zone-util');

// Check in
exports.checkIn = async (req, res) => {
  try {
    const today = getDubaiDate(); // YYYY-MM-DD (Dubai Time)

    // Check if already checked in today
    // Check if duplicate active session (already checked in and not checked out)
    const activeSession = await Attendance.findOne({
      userId: req.user._id,
      checkOut: null
    });

    if (activeSession) {
      return res.status(400).json({ message: 'You are already checked in. Please check out first.' });
    }

    // Create attendance record
    const attendance = new Attendance({
      userId: req.user._id,
      role: req.user.role,
      date: today,
      checkIn: new Date() // Stored as UTC (Standard)
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: 'Checked in successfully',
      attendance
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({ message: 'Failed to check in', error: error.message });
  }
};

// Check out
exports.checkOut = async (req, res) => {
  try {
    console.log('[DEBUG] CheckOut Request Received. User:', req.user ? req.user._id : 'No User', 'Body:', req.body);

    // Find active check-in (where checkOut is null)
    console.log(`[DEBUG] Attempting check-out for user ${req.user._id}`);

    // allowing for overnight shifts
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      checkOut: null
    }).sort({ checkIn: -1 }); // Get latest open session

    if (!attendance) {
      console.log(`[DEBUG] No active check-in found for user ${req.user._id}`);
      return res.status(400).json({ message: 'No active check-in found' });
    }

    console.log(`[DEBUG] Found active attendance: ${attendance._id}`);

    if (attendance.checkOut) {
      console.log(`[DEBUG] Attendance ${attendance._id} already checked out`);
      return res.status(400).json({ message: 'Already checked out today' });
    }

    // Get standard working hours setting
    let standardHours = 8; // Default
    try {
      const setting = await SystemSetting.findOne({ settingKey: 'standard_working_hours' });
      if (setting && setting.settingValue) {
        standardHours = Number(setting.settingValue);
      }
    } catch (err) {
      console.error('Failed to fetch standard working hours setting:', err);
    }

    // Calculate hours
    let checkOut = new Date();

    // TEST MODE: Time Simulation
    if (process.env.ENABLE_TIME_SIMULATION === 'true' && req.body.testCheckOutTime) {
      checkOut = new Date(req.body.testCheckOutTime);
      console.log('⚠️ TEST MODE: Simulating checkout at', checkOut.toISOString());
    }

    const totalHours = (checkOut - attendance.checkIn) / (1000 * 60 * 60);
    const regularHours = Math.min(totalHours, standardHours);
    const overtimeHours = totalHours > standardHours ? totalHours - standardHours : 0;

    // Determine status
    let status = 'Present';
    if (totalHours < 4) {
      status = 'Half-day';
    }

    // Update record
    attendance.checkOut = checkOut;
    attendance.totalHours = parseFloat(totalHours.toFixed(2));
    attendance.regularHours = regularHours;
    attendance.overtimeHours = parseFloat(overtimeHours.toFixed(2));
    attendance.status = status;

    // Payroll Calculation
    if (process.env.ENABLE_PAYROLL === 'true') {
      try {
        console.log(`[DEBUG] Calculating payroll. CheckIn: ${attendance.checkIn}, CheckOut: ${checkOut}, Salary: ${req.user.salaryPerHour}`);
        const payroll = calculatePayroll({
          checkIn: attendance.checkIn,
          checkOut: checkOut,
          salaryPerHour: req.user.salaryPerHour || 0
        });

        attendance.dailyRegularPay = payroll.regularPay;
        attendance.dailyOvertimePay = payroll.overtimePay;
        attendance.dailyTotalPay = payroll.totalPay;
      } catch (payrollError) {
        console.error('[ERROR] Payroll calculation failed:', payrollError);
        // Do not fail the checkout, just log it
      }
    }

    console.log('[DEBUG] Saving attendance record...');
    await attendance.save();
    console.log('[DEBUG] Attendance saved successfully');

    res.json({
      success: true,
      message: 'Checked out successfully',
      attendance
    });
  } catch (error) {
    console.error('[CRITICAL ERROR] Check out failed:', error);
    // Explicitly log the validation error details if available
    if (error.errors) {
      console.error('[CRITICAL ERROR] Validation Errors:', JSON.stringify(error.errors, null, 2));
    }
    res.status(500).json({ message: 'Failed to check out', error: error.message });
  }
};

// Get my attendance
exports.getMyAttendance = async (req, res) => {
  try {
    let attendance = await Attendance.find({ userId: req.user._id })
      .sort({ date: -1 });

    // If not admin, sanitize sensitive fields
    if (req.user.role !== 'admin') {
      attendance = attendance.map(record => {
        const doc = record.toObject ? record.toObject() : record;
        // Remove pay and hours info
        const {
          dailyRegularPay, dailyOvertimePay, dailyTotalPay,
          totalHours, regularHours, overtimeHours,
          ...safeRecord
        } = doc;
        return safeRecord;
      });
    }

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ message: 'Failed to get attendance' });
  }
};

// Get team attendance (Deprecated for Managers, effectively Admin-only via route)
exports.getTeamAttendance = async (req, res) => {
  try {
    // Get projects managed by this manager
    const projects = await Project.find({ manager: req.user._id });
    const projectIds = projects.map(p => p._id);

    // Get staff from tasks assigned to these projects
    const tasks = await Task.find({ project: { $in: projectIds } });
    const staffIds = [...new Set(tasks.map(task => task.assignedTo))];

    // Also include teamMembers from projects
    const teamMembers = projects.flatMap(p => p.teamMembers || []);
    const allStaffIds = [...new Set([...staffIds, ...teamMembers])];

    // Check if fetching specific user history
    if (req.query.userId) {
      if (!allStaffIds.find(id => id.toString() === req.query.userId)) {
        return res.status(403).json({ message: 'User is not in your team' });
      }

      const history = await Attendance.find({ userId: req.query.userId }).sort({ date: -1 });
      return res.json({
        success: true,
        attendance: history
      });
    }

    // Daily View with "Not Checked In" (Absent) logic
    const dateParam = req.query.date || getDubaiDate();

    // 1. Get all team users
    const teamUsers = await User.find({
      _id: { $in: allStaffIds },
      isActive: true
    }).select('username fullName email role profileImage');

    // 2. Get attendance for this date
    const attendanceRecords = await Attendance.find({
      userId: { $in: allStaffIds },
      date: dateParam
    }).populate('userId', 'username fullName email');

    // 3. Merge: Create placeholders for missing users
    const mergedAttendance = teamUsers.map(user => {
      const record = attendanceRecords.find(r => r.userId && r.userId._id.toString() === user._id.toString());
      if (record) return record;

      // Create dummy "Absent" record
      return {
        _id: 'temp-' + user._id, // temp ID for key prop
        userId: user,
        date: dateParam,
        status: 'Absent',
        checkIn: null,
        checkOut: null,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        dailyTotalPay: 0,
        isTemp: true // Flag for frontend if needed
      };
    });

    res.json({
      success: true,
      attendance: mergedAttendance
    });
  } catch (error) {
    console.error('Get team attendance error:', error);
    res.status(500).json({ message: 'Failed to get team attendance' });
  }
};

// Get all attendance (admin only)
exports.getAllAttendance = async (req, res) => {
  try {
    // Check if fetching specific user history
    if (req.query.userId) {
      const history = await Attendance.find({ userId: req.query.userId }).sort({ date: -1 });
      return res.json({
        success: true,
        attendance: history
      });
    }

    // Daily View with "Not Checked In" (Absent) logic
    // If date is provided OR just default to viewing "today's status" for everyone
    // Ideally Admin Dashboard sends ?date=...
    const dateParam = req.query.date || getDubaiDate();

    // 1. Get all non-admin users (staff/managers/technicians/finance)
    const allUsers = await User.find({
      role: { $in: ['staff', 'manager', 'technician', 'finance'] },
      isActive: true
    }).select('username fullName email role profileImage');

    // 2. Get attendance for this date
    const attendanceRecords = await Attendance.find({
      date: dateParam
    }).populate('userId', 'username fullName email');

    // 3. Merge
    const mergedAttendance = allUsers.map(user => {
      const record = attendanceRecords.find(r => r.userId && r.userId._id.toString() === user._id.toString());
      if (record) return record;

      return {
        _id: 'temp-' + user._id,
        userId: user,
        date: dateParam,
        status: 'Absent',
        checkIn: null,
        checkOut: null,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        dailyTotalPay: 0,
        isTemp: true
      };
    });

    res.json({
      success: true,
      attendance: mergedAttendance
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ message: 'Failed to get attendance' });
  }
};

// Get monthly export for office attendance
exports.getMonthlyExport = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $regex: `^${month}` }
    }).populate('userId', 'username fullName email role')
      .sort({ date: 1 });

    res.json({
      success: true,
      attendance: attendanceRecords
    });
  } catch (error) {
    console.error('Get monthly export error:', error);
    res.status(500).json({ message: 'Failed to get monthly export' });
  }
};
