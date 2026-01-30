const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const SystemSetting = require('../models/SystemSetting');

// Check in
exports.checkIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      userId: req.user._id,
      date: today
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Create attendance record
    const attendance = new Attendance({
      userId: req.user._id,
      role: req.user.role,
      date: today,
      checkIn: new Date()
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
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: today
    });

    if (!attendance) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (attendance.checkOut) {
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
    const checkOut = new Date();
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

    await attendance.save();

    res.json({
      success: true,
      message: 'Checked out successfully',
      attendance
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({ message: 'Failed to check out', error: error.message });
  }
};

// Get my attendance
exports.getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.user._id })
      .sort({ date: -1 });

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ message: 'Failed to get attendance' });
  }
};

// Get team attendance (manager only)
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

    // Get today's attendance for team members
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.find({
      userId: { $in: allStaffIds },
      date: today
    }).populate('userId', 'username fullName email');

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('Get team attendance error:', error);
    res.status(500).json({ message: 'Failed to get team attendance' });
  }
};

// Get all attendance (admin only)
exports.getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({})
      .populate('userId', 'username fullName email')
      .sort({ date: -1 });

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ message: 'Failed to get attendance' });
  }
};
