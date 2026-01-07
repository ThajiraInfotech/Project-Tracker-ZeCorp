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

    // Get tasks for this project completed this month
    const tasks = await Task.find({
      project: projectId,
      completionDate: { $gte: startDate, $lte: endDate }
    }).populate('assignedTo', 'username fullName');

    // Get tasks for this project overdue this month
    const overdueTasks = await Task.find({
      project: projectId,
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('assignedTo', 'username fullName');

    res.json({
      success: true,
      report: {
        project: project.projectName,
        month: reportMonth + 1,
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
    console.error('Get project monthly report error:', error);
    res.status(500).json({ message: 'Failed to get project monthly report' });
  }
};

// Get user daily report
exports.getUserDailyReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const endDate = new Date(reportDate);
    endDate.setHours(23, 59, 59, 999);

    // Get user's attendance for the day
    const attendance = await Attendance.findOne({
      user: userId,
      date: { $gte: reportDate, $lte: endDate }
    });

    // Get tasks completed by user today
    const tasks = await Task.find({
      assignedTo: userId,
      completionDate: { $gte: reportDate, $lte: endDate }
    }).populate('project', 'projectName');

    // Get tasks overdue for user today
    const overdueTasks = await Task.find({
      assignedTo: userId,
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('project', 'projectName');

    res.json({
      success: true,
      report: {
        user: userId,
        date: reportDate,
        attendance,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        summary: {
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          hoursWorked: attendance?.totalHours || 0,
          overtimeHours: attendance?.overtimeHours || 0
        }
      }
    });
  } catch (error) {
    console.error('Get user daily report error:', error);
    res.status(500).json({ message: 'Failed to get user daily report' });
  }
};

// Get user weekly report
exports.getUserWeeklyReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, week } = req.query;

    // Calculate start and end of week
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);

    const reportYear = year ? parseInt(year) : currentYear;
    const reportWeek = week ? parseInt(week) : currentWeek;

    const { startDate, endDate } = getWeekDateRange(reportYear, reportWeek);

    // Get user's attendance for the week
    const attendance = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Get tasks completed by user this week
    const tasks = await Task.find({
      assignedTo: userId,
      completionDate: { $gte: startDate, $lte: endDate }
    }).populate('project', 'projectName');

    // Get tasks overdue for user this week
    const overdueTasks = await Task.find({
      assignedTo: userId,
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('project', 'projectName');

    // Calculate totals
    const totalHours = attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalOvertime = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);

    res.json({
      success: true,
      report: {
        user: userId,
        week: reportWeek,
        year: reportYear,
        startDate,
        endDate,
        attendance,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        summary: {
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalOvertime: parseFloat(totalOvertime.toFixed(2)),
          daysPresent: attendance.filter(r => r.status === 'present').length,
          daysLate: attendance.filter(r => r.status === 'late').length,
          daysHalf: attendance.filter(r => r.status === 'half-day').length
        }
      }
    });
  } catch (error) {
    console.error('Get user weekly report error:', error);
    res.status(500).json({ message: 'Failed to get user weekly report' });
  }
};

// Get user monthly report
exports.getUserMonthlyReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-indexed

    const startDate = new Date(reportYear, reportMonth, 1);
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999);

    // Get user's attendance for the month
    const attendance = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    });

    // Get tasks completed by user this month
    const tasks = await Task.find({
      assignedTo: userId,
      completionDate: { $gte: startDate, $lte: endDate }
    }).populate('project', 'projectName');

    // Get tasks overdue for user this month
    const overdueTasks = await Task.find({
      assignedTo: userId,
      deadline: { $lte: endDate },
      status: { $ne: 'completed' }
    }).populate('project', 'projectName');

    // Calculate totals
    const totalHours = attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalOvertime = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);

    res.json({
      success: true,
      report: {
        user: userId,
        month: reportMonth + 1,
        year: reportYear,
        startDate,
        endDate,
        attendance,
        tasksCompleted: tasks,
        tasksOverdue: overdueTasks,
        summary: {
          totalTasksCompleted: tasks.length,
          totalTasksOverdue: overdueTasks.length,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalOvertime: parseFloat(totalOvertime.toFixed(2)),
          daysPresent: attendance.filter(r => r.status === 'present').length,
          daysLate: attendance.filter(r => r.status === 'late').length,
          daysHalf: attendance.filter(r => r.status === 'half-day').length,
          daysAbsent: 0 // Would need to calculate based on work schedule
        }
      }
    });
  } catch (error) {
    console.error('Get user monthly report error:', error);
    res.status(500).json({ message: 'Failed to get user monthly report' });
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

// Get dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Get attendance data
    const attendance = await Attendance.find({
      date: { $gte: today, $lte: endDate }
    });

    // Get tasks data
    const tasks = await Task.find({
      $or: [
        { deadline: { $gte: today, $lte: endDate } },
        { completionDate: { $gte: today, $lte: endDate } }
      ]
    }).populate('project', 'projectName');

    // Get projects data
    const projects = await Project.find();

    // Calculate statistics
    const totalPresent = attendance.length;
    const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const totalTasksOverdue = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < endDate).length;
    const totalProjects = projects.length;
    const totalProjectsInProgress = projects.filter(p => p.status === 'in-progress').length;
    const totalProjectsCompleted = projects.filter(p => p.status === 'completed').length;

    res.json({
      success: true,
      dashboard: {
        attendance: {
          totalPresent,
          presentToday: totalPresent,
          averageHours: attendance.length > 0 ?
            attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / attendance.length : 0
        },
        tasks: {
          totalTasksCompleted,
          totalTasksOverdue,
          tasksDueToday: tasks.filter(t => t.status !== 'completed' && new Date(t.deadline).toDateString() === today.toDateString()).length
        },
        projects: {
          totalProjects,
          totalProjectsInProgress,
          totalProjectsCompleted,
          averageProgress: projects.length > 0 ?
            projects.reduce((sum, project) => sum + project.progress, 0) / projects.length : 0
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({ message: 'Failed to get dashboard data' });
  }
};

// Get manager dashboard data
exports.getManagerDashboardData = async (req, res) => {
  try {
    // Get projects managed by this user
    const managedProjects = await Project.find({ manager: req.user._id });
    const projectIds = managedProjects.map(project => project._id);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Get attendance data for team members
    const attendance = await Attendance.find({
      user: { $in: managedProjects.flatMap(p => [p.manager, ...p.teamMembers]) },
      date: { $gte: today, $lte: endDate }
    }).populate('user', 'username fullName');

    // Get tasks data for managed projects
    const tasks = await Task.find({
      project: { $in: projectIds },
      $or: [
        { deadline: { $gte: today, $lte: endDate } },
        { completionDate: { $gte: today, $lte: endDate } }
      ]
    }).populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Calculate statistics
    const totalPresent = attendance.length;
    const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const totalTasksOverdue = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < endDate).length;

    res.json({
      success: true,
      dashboard: {
        team: {
          totalMembers: [...new Set(managedProjects.flatMap(p => [p.manager, ...p.teamMembers]))].length,
          totalPresent,
          averageHours: attendance.length > 0 ?
            attendance.reduce((sum, record) => sum + (record.totalHours || 0), 0) / attendance.length : 0
        },
        projects: {
          totalProjects: managedProjects.length,
          totalProjectsInProgress: managedProjects.filter(p => p.status === 'in-progress').length,
          totalProjectsCompleted: managedProjects.filter(p => p.status === 'completed').length,
          averageProgress: managedProjects.length > 0 ?
            managedProjects.reduce((sum, project) => sum + project.progress, 0) / managedProjects.length : 0
        },
        tasks: {
          totalTasksCompleted,
          totalTasksOverdue,
          tasksDueToday: tasks.filter(t => t.status !== 'completed' && new Date(t.deadline).toDateString() === today.toDateString()).length
        }
      }
    });
  } catch (error) {
    console.error('Get manager dashboard data error:', error);
    res.status(500).json({ message: 'Failed to get manager dashboard data' });
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