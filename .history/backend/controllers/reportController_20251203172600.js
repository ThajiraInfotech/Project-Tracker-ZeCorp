
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const emailService = require('../utils/emailService');

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

// Get project daily report
exports.getProjectDailyReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' &&
        project.manager.toString() !== req.user._id.toString() &&
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get tasks for this project completed today
    const tasks = await Task.find({
      project: projectId,
      completionDate: { $gte: reportDate, $lte: endDate }
    }).populate('assignedTo', 'username fullName');

    // Get tasks for this project overdue today
    const overdueTasks = await Task.find({
      project: projectId,
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('assignedTo', 'username fullName');

    res.json({
      success: true,
      report: {
        project: project.projectName,
        date: reportDate,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        summary: {
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          projectProgress: project.progress
        }
      }
    });
  } catch (error) {
    console.error('Get project daily report error:', error);
    res.status(500).json({ message: 'Failed to get project daily report' });
  }
};

// Get project weekly report
exports.getProjectWeeklyReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { year, week } = req.query;

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' &&
        project.manager.toString() !== req.user._id.toString() &&
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate start and end of week
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);

    const reportYear = year ? parseInt(year) : currentYear;
    const reportWeek = week ? parseInt(week) : currentWeek;

    const { startDate, endDate } = getWeekDateRange(reportYear, reportWeek);

    // Get tasks for this project completed this week
    const tasks = await Task.find({
      project: projectId,
      completionDate: { $gte: startDate, $lte: endDate }
    }).populate('assignedTo', 'username fullName');

    // Get tasks for this project overdue this week
    const overdueTasks = await Task.find({
      project: projectId,
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('assignedTo', 'username fullName');

    res.json({
      success: true,
      report: {
        project: project.projectName,
        week: reportWeek,
        year: reportYear,
        startDate,
        endDate,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        summary: {
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          projectProgress: project.progress
        }
      }
    });
  } catch (error) {
    console.error('Get project weekly report error:', error);
    res.status(500).json({ message: 'Failed to get project weekly report' });
  }
};

// Get project monthly report
exports.getProjectMonthlyReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { year, month } = req.query;

    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    if (req.user.role === 'staff' &&
        project.manager.toString() !== req.user._id.toString() &&
        !project.teamMembers.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-indexed

    const startDate = new Date(reportYear, reportMonth, 1);
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999);

