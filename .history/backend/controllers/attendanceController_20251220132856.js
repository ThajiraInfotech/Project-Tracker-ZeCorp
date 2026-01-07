const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Project = require('../models/Project');

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

    // Calculate hours
    const checkOut = new Date();
    const totalHours = (checkOut - attendance.checkIn) / (1000 * 60 * 60);
    const regularHours = Math.min(totalHours, 8);
    const overtimeHours = totalHours > 8 ? totalHours - 8 : 0;

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

// Get today's attendance
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today }
    });

    res.json({
      success: true,
      attendance: attendance || null
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ message: 'Failed to get today attendance' });
  }
};

// Get team attendance (manager only)
exports.getTeamAttendance = async (req, res) => {
  try {
    // Get projects managed by this manager
    const projects = await Project.find({ manager: req.user._id });
    const projectIds = projects.map(p => p._id);

    // Get staff from these projects
    const tasks = await Task.find({ project: { $in: projectIds } }).distinct('assignedTo');
    const staffIds = [...new Set(tasks)];

    // Get today's attendance for team members
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.find({
      userId: { $in: staffIds },
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

// Get user attendance
exports.getUserAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { user: userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('tasksWorkedOn', 'title project')
      .sort({ date: -1 });

    res.json({
      success: true,
      attendance
    });
  } catch (error) {
    console.error('Get user attendance error:', error);
    res.status(500).json({ message: 'Failed to get user attendance' });
  }
};

// Get user timesheet
exports.getUserTimesheet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { user: userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('tasksWorkedOn', 'title project')
      .sort({ date: 1 });

    // Calculate totals
    const totalHours = attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalOvertime = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const presentDays = attendance.filter(r => r.status === 'present').length;
    const lateDays = attendance.filter(r => r.status === 'late').length;
    const halfDays = attendance.filter(r => r.status === 'half-day').length;

    res.json({
      success: true,
      timesheet: {
        attendance,
        summary: {
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalOvertime: parseFloat(totalOvertime.toFixed(2)),
          presentDays,
          lateDays,
          halfDays,
          absentDays: 0 // Would need to calculate based on work schedule
        }
      }
    });
  } catch (error) {
    console.error('Get user timesheet error:', error);
    res.status(500).json({ message: 'Failed to get user timesheet' });
  }
};

// Get daily report
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;

    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    // Get all attendance for the day
    const attendance = await Attendance.find({
      date: { $gte: reportDate, $lte: endDate }
    }).populate('user', 'username fullName email');

    // Get tasks completed today
    const tasks = await Task.find({
      completionDate: { $gte: reportDate, $lte: endDate }
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Get tasks overdue today
    const overdueTasks = await Task.find({
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    res.json({
      success: true,
      report: {
        date: reportDate,
        attendance,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        summary: {
          totalPresent: attendance.length,
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length
        }
      }
    });
  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({ message: 'Failed to get daily report' });
  }
};

// Get weekly report
exports.getWeeklyReport = async (req, res) => {
  try {
    const { year, week } = req.query;

    // Calculate start and end of week
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);

    const reportYear = year ? parseInt(year) : currentYear;
    const reportWeek = week ? parseInt(week) : currentWeek;

    const { startDate, endDate } = getWeekDateRange(reportYear, reportWeek);

    // Get attendance for the week
    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('user', 'username fullName email');

    // Get tasks completed this week
    const tasks = await Task.find({
      completionDate: { $gte: startDate, $lte: endDate }
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Get tasks overdue this week
    const overdueTasks = await Task.find({
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Calculate user statistics
    const userStats = attendance.reduce((acc, record) => {
      const userId = record.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: record.user,
          totalHours: 0,
          overtimeHours: 0,
          daysPresent: 0,
          daysLate: 0,
          daysHalf: 0
        };
      }

      acc[userId].totalHours += record.totalHours || 0;
      acc[userId].overtimeHours += record.overtimeHours || 0;

      if (record.status === 'present') acc[userId].daysPresent++;
      if (record.status === 'late') acc[userId].daysLate++;
      if (record.status === 'half-day') acc[userId].daysHalf++;

      return acc;
    }, {});

    res.json({
      success: true,
      report: {
        week: reportWeek,
        year: reportYear,
        startDate,
        endDate,
        attendance,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        userStatistics: Object.values(userStats),
        summary: {
          totalPresent: attendance.length,
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          averageHours: attendance.length > 0 ?
            attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / attendance.length : 0
        }
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({ message: 'Failed to get weekly report' });
  }
};

// Get monthly report
exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-indexed

    const startDate = new Date(reportYear, reportMonth, 1);
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999);

    // Get attendance for the month
    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('user', 'username fullName email');

    // Get tasks completed this month
    const tasks = await Task.find({
      completionDate: { $gte: startDate, $lte: endDate }
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Get tasks overdue this month
    const overdueTasks = await Task.find({
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Calculate user statistics
    const userStats = attendance.reduce((acc, record) => {
      const userId = record.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: record.user,
          totalHours: 0,
          overtimeHours: 0,
          daysPresent: 0,
          daysLate: 0,
          daysHalf: 0,
          daysAbsent: 0
        };
      }

      acc[userId].totalHours += record.totalHours || 0;
      acc[userId].overtimeHours += record.overtimeHours || 0;

      if (record.status === 'present') acc[userId].daysPresent++;
      if (record.status === 'late') acc[userId].daysLate++;
      if (record.status === 'half-day') acc[userId].daysHalf++;

      return acc;
    }, {});

    res.json({
      success: true,
      report: {
        month: reportMonth + 1,
        year: reportYear,
        startDate,
        endDate,
        attendance,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        userStatistics: Object.values(userStats),
        summary: {
          totalPresent: attendance.length,
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          averageHours: attendance.length > 0 ?
            attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / attendance.length : 0,
          totalOvertime: attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ message: 'Failed to get monthly report' });
  }
};

// Export daily report
exports.exportDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    // Get report data
    const report = await this.getDailyReport(req, res);

    // Generate PDF (would use a library like pdfkit in a real implementation)
    // For now, just return the data
    res.json({
      success: true,
      report: report.report
    });
  } catch (error) {
    console.error('Export daily report error:', error);
    res.status(500).json({ message: 'Failed to export daily report' });
  }
};

// Export weekly report
exports.exportWeeklyReport = async (req, res) => {
  try {
    const { year, week } = req.query;

    // Get report data
    const report = await this.getWeeklyReport(req, res);

    // Generate PDF (would use a library like pdfkit in a real implementation)
    // For now, just return the data
    res.json({
      success: true,
      report: report.report
    });
  } catch (error) {
    console.error('Export weekly report error:', error);
    res.status(500).json({ message: 'Failed to export weekly report' });
  }
};

// Export monthly report
exports.exportMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    // Get report data
    const report = await this.getMonthlyReport(req, res);

    // Generate PDF (would use a library like pdfkit in a real implementation)
    // For now, just return the data
    res.json({
      success: true,
      report: report.report
    });
  } catch (error) {
    console.error('Export monthly report error:', error);
    res.status(500).json({ message: 'Failed to export monthly report' });
  }
};

// Helper function to get week number
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to get week date range
function getWeekDateRange(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

  const startDate = new Date(ISOweekStart);
  const endDate = new Date(ISOweekStart);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}