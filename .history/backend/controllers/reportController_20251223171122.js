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

    let attendanceQuery = { date: { $gte: reportDate, $lte: endDate } };
    let taskQuery = { completionDate: { $gte: reportDate, $lte: endDate } };
    let overdueTaskQuery = { deadline: { $lte: endDate }, status: { $ne: 'completed' } };

    // Filter by user role for managers
    if (req.user.role === 'manager') {
      const managedProjects = await Project.find({ manager: req.user._id });
      const projectIds = managedProjects.map(project => project._id);
      const teamMemberIds = managedProjects.flatMap(project => [project.manager, ...project.teamMembers]);

      attendanceQuery.user = { $in: teamMemberIds };
      taskQuery.project = { $in: projectIds };
      overdueTaskQuery.project = { $in: projectIds };
    }

    // Get attendance for the day
    const attendance = await Attendance.find(attendanceQuery)
      .populate('user', 'username fullName email');

    // Get tasks completed today
    const tasks = await Task.find(taskQuery)
      .populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Get tasks overdue today
    const overdueTasks = await Task.find(overdueTaskQuery)
      .populate('project', 'projectName')
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

    let attendanceQuery = { date: { $gte: startDate, $lte: endDate } };
    let taskQuery = { completionDate: { $gte: startDate, $lte: endDate } };
    let overdueTaskQuery = { deadline: { $lte: endDate }, status: { $ne: 'completed' } };

    // Filter by user role for managers
    if (req.user.role === 'manager') {
      const managedProjects = await Project.find({ manager: req.user._id });
      const projectIds = managedProjects.map(project => project._id);
      const teamMemberIds = managedProjects.flatMap(project => [project.manager, ...project.teamMembers]);

      attendanceQuery.user = { $in: teamMemberIds };
      taskQuery.project = { $in: projectIds };
      overdueTaskQuery.project = { $in: projectIds };
    }

    // Get attendance for the week
    const attendance = await Attendance.find(attendanceQuery)
      .populate('user', 'username fullName email');

    // Get tasks completed this week
    const tasks = await Task.find(taskQuery)
      .populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Get tasks overdue this week
    const overdueTasks = await Task.find(overdueTaskQuery)
      .populate('project', 'projectName')
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

    let attendanceQuery = { date: { $gte: startDate, $lte: endDate } };
    let taskQuery = { completionDate: { $gte: startDate, $lte: endDate } };
    let overdueTaskQuery = { deadline: { $lte: endDate }, status: { $ne: 'completed' } };

    // Filter by user role for managers
    if (req.user.role === 'manager') {
      const managedProjects = await Project.find({ manager: req.user._id });
      const projectIds = managedProjects.map(project => project._id);
      const teamMemberIds = managedProjects.flatMap(project => [project.manager, ...project.teamMembers]);

      attendanceQuery.user = { $in: teamMemberIds };
      taskQuery.project = { $in: projectIds };
      overdueTaskQuery.project = { $in: projectIds };
    }

    // Get attendance for the month
    const attendance = await Attendance.find(attendanceQuery)
      .populate('user', 'username fullName email');

    // Get tasks completed this month
    const tasks = await Task.find(taskQuery)
      .populate('project', 'projectName')
      .populate('assignedTo', 'username fullName');

    // Get tasks overdue this month
    const overdueTasks = await Task.find(overdueTaskQuery)
      .populate('project', 'projectName')
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

    // Managers can only access reports for their assigned projects
    if (req.user.role === 'manager' && project.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Managers can only access reports for their assigned projects
    if (req.user.role === 'manager' && project.manager.toString() !== req.user._id.toString()) {
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
      date: { $gte: startDate, $lte: endDate }
    });

    // Get all users for staff count
    const users = await User.find({ role: { $ne: 'admin' } });

    // Get tasks data
    const tasks = await Task.find({
      $or: [
        { deadline: { $gte: startDate, $lte: endDate } },
        { completionDate: { $gte: startDate, $lte: endDate } }
      ]
    }).populate('project', 'projectName');

    // Get projects data
    const projects = await Project.find();

    // Calculate statistics
    const totalPresent = attendance.length;
    const totalTasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const totalTasksOverdue = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < today).length;
    const totalProjects = projects.length;
    const totalProjectsInProgress = projects.filter(p => p.status === 'in-progress').length;
    const totalProjectsCompleted = projects.filter(p => p.status === 'completed').length;
    const totalProjectsDelayed = projects.filter(p => p.status === 'on-hold' || (p.endDate < today && p.status !== 'completed')).length;

    // Calculate productivity (tasks completed vs total tasks)
    const allTasks = await Task.find();
    const productivityPercentage = allTasks.length > 0 ?
      Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100) : 0;

    // Calculate overtime hours
    const totalOvertimeHours = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);

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
          tasksDueToday: tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) >= startDate && new Date(t.deadline) <= endDate).length
        },
        projects: {
          totalProjects,
          totalProjectsInProgress,
          totalProjectsCompleted,
          totalProjectsDelayed,
          averageProgress: projects.length > 0 ?
            projects.reduce((sum, project) => sum + project.progress, 0) / projects.length : 0
        },
        staff: {
          totalStaffCount: users.length,
          activeStaffCount: users.filter(u => u.isActive).length
        },
        productivity: {
          productivityPercentage,
          totalOvertimeHours
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

// Get admin dashboard data with enhanced metrics
exports.getAdminDashboardData = async (req, res) => {
  try {
    // Calculate date range for today
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const today = new Date();

    // Get attendance data
    const attendance = await Attendance.find({
      date: { $gte: today, $lte: endDate }
    });

    // Get all users for staff count
    const users = await User.find({ role: { $ne: 'admin' } });

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
    const totalProjectsDelayed = projects.filter(p => p.status === 'on-hold' || (p.endDate < today && p.status !== 'completed')).length;

    // Calculate productivity (tasks completed vs total tasks)
    const allTasks = await Task.find();
    const productivityPercentage = allTasks.length > 0 ?
      Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100) : 0;

    // Calculate overtime hours
    const totalOvertimeHours = attendance.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);

    // Calculate revenue metrics (basic implementation)
    const totalRevenue = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
    const completedProjectsRevenue = projects
      .filter(p => p.status === 'completed')
      .reduce((sum, project) => sum + (project.budget || 0), 0);

    // Get delayed projects
    const delayedProjects = projects.filter(p =>
      p.status === 'on-hold' ||
      (p.endDate < today && p.status !== 'completed') ||
      p.status === 'delayed'
    );

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
          totalProjectsDelayed,
          averageProgress: projects.length > 0 ?
            projects.reduce((sum, project) => sum + project.progress, 0) / projects.length : 0
        },
        staff: {
          totalStaffCount: users.length,
          activeStaffCount: users.filter(u => u.isActive).length
        },
        productivity: {
          productivityPercentage,
          totalOvertimeHours
        },
        revenue: {
          totalRevenue,
          completedProjectsRevenue,
          pendingRevenue: totalRevenue - completedProjectsRevenue
        },
        delayedProjects: delayedProjects.map(p => ({
          id: p._id,
          name: p.projectName,
          status: p.status,
          delayReason: p.endDate < today ? 'Past deadline' : 'On hold',
          daysDelayed: p.endDate < today ? Math.floor((today - p.endDate) / (1000 * 60 * 60 * 24)) : 0
        }))
      }
    });
  } catch (error) {
    console.error('Get admin dashboard data error:', error);
    res.status(500).json({ message: 'Failed to get admin dashboard data' });
  }
};

// Get project performance report
exports.getProjectPerformanceReport = async (req, res) => {
  try {
    let query = {};

    // Filter by user role
    if (req.user.role === 'manager') {
      query.manager = req.user._id;
    }

    const projects = await Project.find(query)
      .populate('manager', 'username fullName')
      .populate('teamMembers', 'username fullName');

    const projectPerformance = await Promise.all(projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });

      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length;
      const onTimeCompletion = completedTasks > 0 ?
        Math.round((completedTasks / (completedTasks + overdueTasks)) * 100) : 0;

      return {
        projectId: project._id,
        projectName: project.projectName,
        manager: project.manager?.fullName || 'Unassigned',
        status: project.status,
        progress: project.progress,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        teamSize: project.teamMembers.length,
        tasksCompleted: completedTasks,
        tasksOverdue: overdueTasks,
        onTimeCompletion,
        performanceScore: calculateProjectPerformanceScore(project, tasks)
      };
    }));

    res.json({
      success: true,
      report: projectPerformance,
      summary: {
        totalProjects: projectPerformance.length,
        averagePerformance: projectPerformance.length > 0 ?
          projectPerformance.reduce((sum, p) => sum + p.performanceScore, 0) / projectPerformance.length : 0,
        highPerformingProjects: projectPerformance.filter(p => p.performanceScore >= 80).length,
        lowPerformingProjects: projectPerformance.filter(p => p.performanceScore < 50).length
      }
    });
  } catch (error) {
    console.error('Get project performance report error:', error);
    res.status(500).json({ message: 'Failed to get project performance report' });
  }
};

// Get manager performance report
exports.getManagerPerformanceReport = async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' });

    const managerPerformance = await Promise.all(managers.map(async (manager) => {
      const projects = await Project.find({ manager: manager._id });
      const tasks = await Task.find({ assignedTo: manager._id });

      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const onTimeProjects = projects.filter(p =>
        p.status === 'completed' && p.endDate >= new Date(p.actualCompletionDate || new Date())
      ).length;

      const projectCompletionRate = projects.length > 0 ?
        Math.round((completedProjects / projects.length) * 100) : 0;

      const onTimeRate = completedProjects > 0 ?
        Math.round((onTimeProjects / completedProjects) * 100) : 0;

      return {
        managerId: manager._id,
        managerName: manager.fullName,
        projectsManaged: projects.length,
        completedProjects,
        projectCompletionRate,
        onTimeRate,
        averageProjectProgress: projects.length > 0 ?
          Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0,
        performanceScore: calculateManagerPerformanceScore(projects, tasks)
      };
    }));

    res.json({
      success: true,
      report: managerPerformance,
      summary: {
        totalManagers: managerPerformance.length,
        averagePerformance: managerPerformance.length > 0 ?
          managerPerformance.reduce((sum, m) => sum + m.performanceScore, 0) / managerPerformance.length : 0,
        topPerformers: managerPerformance.filter(m => m.performanceScore >= 85).length,
        needsImprovement: managerPerformance.filter(m => m.performanceScore < 60).length
      }
    });
  } catch (error) {
    console.error('Get manager performance report error:', error);
    res.status(500).json({ message: 'Failed to get manager performance report' });
  }
};

// Get staff productivity report
exports.getStaffProductivityReport = async (req, res) => {
  try {
    const staffMembers = await User.find({ role: 'staff' });

    const staffProductivity = await Promise.all(staffMembers.map(async (staff) => {
      const tasks = await Task.find({ assignedTo: staff._id });
      const attendanceRecords = await Attendance.find({ user: staff._id });

      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.deadline) < new Date()).length;

      const taskCompletionRate = tasks.length > 0 ?
        Math.round((completedTasks / tasks.length) * 100) : 0;

      const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
      const averageDailyHours = attendanceRecords.length > 0 ?
        totalHours / attendanceRecords.length : 0;

      return {
        staffId: staff._id,
        staffName: staff.fullName,
        department: staff.department,
        tasksAssigned: tasks.length,
        tasksCompleted: completedTasks,
        taskCompletionRate,
        overdueTasks,
        totalHours: parseFloat(totalHours.toFixed(2)),
        averageDailyHours: parseFloat(averageDailyHours.toFixed(2)),
        productivityScore: calculateStaffProductivityScore(tasks, attendanceRecords)
      };
    }));

    res.json({
      success: true,
      report: staffProductivity,
      summary: {
        totalStaff: staffProductivity.length,
        averageProductivity: staffProductivity.length > 0 ?
          staffProductivity.reduce((sum, s) => sum + s.productivityScore, 0) / staffProductivity.length : 0,
        highPerformers: staffProductivity.filter(s => s.productivityScore >= 85).length,
        lowPerformers: staffProductivity.filter(s => s.productivityScore < 60).length
      }
    });
  } catch (error) {
    console.error('Get staff productivity report error:', error);
    res.status(500).json({ message: 'Failed to get staff productivity report' });
  }
};

// Get attendance report
exports.getAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const reportMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const startDate = new Date(reportYear, reportMonth, 1);
    const endDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('user', 'username fullName department');

    const users = await User.find({ role: { $ne: 'admin' } });

    const attendanceSummary = users.map(user => {
      const userRecords = attendanceRecords.filter(r => r.user._id.toString() === user._id.toString());

      return {
        userId: user._id,
        userName: user.fullName,
        department: user.department,
        daysPresent: userRecords.filter(r => r.status === 'present').length,
        daysLate: userRecords.filter(r => r.status === 'late').length,
        daysHalf: userRecords.filter(r => r.status === 'half-day').length,
        daysAbsent: 0, // Would need to calculate based on work schedule
        totalHours: userRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0),
        overtimeHours: userRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
        attendanceRate: userRecords.length > 0 ?
          Math.round((userRecords.filter(r => r.status === 'present').length / userRecords.length) * 100) : 0
      };
    });

    res.json({
      success: true,
      report: attendanceSummary,
      summary: {
        month: reportMonth + 1,
        year: reportYear,
        totalStaff: attendanceSummary.length,
        averageAttendanceRate: attendanceSummary.length > 0 ?
          attendanceSummary.reduce((sum, a) => sum + a.attendanceRate, 0) / attendanceSummary.length : 0,
        totalOvertimeHours: attendanceSummary.reduce((sum, a) => sum + a.overtimeHours, 0),
        perfectAttendance: attendanceSummary.filter(a => a.attendanceRate === 100).length
      }
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ message: 'Failed to get attendance report' });
  }
};

// Get delay and risk analysis report
exports.getDelayRiskAnalysisReport = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let projectQuery = {};
    let taskQuery = {};

    // Filter by user role
    if (req.user.role === 'manager') {
      const managedProjects = await Project.find({ manager: req.user._id });
      const projectIds = managedProjects.map(project => project._id);
      projectQuery = { _id: { $in: projectIds } };
      taskQuery = { project: { $in: projectIds } };
    }

    const projects = await Project.find(projectQuery);
    const tasks = await Task.find(taskQuery);

    const delayedProjects = projects.filter(p =>
      p.status === 'on-hold' ||
      (p.endDate < today && p.status !== 'completed') ||
      p.status === 'delayed'
    );

    const atRiskProjects = projects.filter(p =>
      p.status === 'in-progress' &&
      p.progress < 50 &&
      new Date(p.endDate) < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Within 1 week of deadline
    );

    const overdueTasks = tasks.filter(t =>
      t.status !== 'completed' &&
      new Date(t.deadline) < today
    );

    const highRiskTasks = tasks.filter(t =>
      t.status !== 'completed' &&
      t.priority === 'high' &&
      new Date(t.deadline) < new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) // Within 3 days of deadline
    );

    res.json({
      success: true,
      report: {
        delayedProjects: delayedProjects.map(p => ({
          projectId: p._id,
          projectName: p.projectName,
          manager: p.manager,
          originalDeadline: p.endDate,
          currentStatus: p.status,
          daysDelayed: Math.floor((today - new Date(p.endDate)) / (1000 * 60 * 60 * 24)),
          impact: p.budget || 'Unknown'
        })),
        atRiskProjects: atRiskProjects.map(p => ({
          projectId: p._id,
          projectName: p.projectName,
          manager: p.manager,
          deadline: p.endDate,
          currentProgress: p.progress,
          daysUntilDeadline: Math.floor((new Date(p.endDate) - today) / (1000 * 60 * 60 * 24)),
          riskLevel: p.progress < 30 ? 'High' : 'Medium'
        })),
        overdueTasks: overdueTasks.map(t => ({
          taskId: t._id,
          taskTitle: t.title,
          project: t.project,
          assignedTo: t.assignedTo,
          deadline: t.deadline,
          daysOverdue: Math.floor((today - new Date(t.deadline)) / (1000 * 60 * 60 * 24)),
          priority: t.priority
        })),
        highRiskTasks: highRiskTasks.map(t => ({
          taskId: t._id,
          taskTitle: t.title,
          project: t.project,
          assignedTo: t.assignedTo,
          deadline: t.deadline,
          daysUntilDeadline: Math.floor((new Date(t.deadline) - today) / (1000 * 60 * 60 * 24)),
          priority: t.priority
        }))
      },
      summary: {
        totalDelayedProjects: delayedProjects.length,
        totalAtRiskProjects: atRiskProjects.length,
        totalOverdueTasks: overdueTasks.length,
        totalHighRiskTasks: highRiskTasks.length,
        potentialRevenueAtRisk: delayedProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get delay risk analysis report error:', error);
    res.status(500).json({ message: 'Failed to get delay risk analysis report' });
  }
};

// Helper function to calculate project performance score
function calculateProjectPerformanceScore(project, tasks) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const onTimeTasks = tasks.filter(t =>
    t.status === 'completed' &&
    (t.completionDate <= t.deadline || !t.completionDate)
  ).length;

  if (totalTasks === 0) return 0;

  const taskCompletionScore = (completedTasks / totalTasks) * 50;
  const onTimeScore = completedTasks > 0 ? (onTimeTasks / completedTasks) * 30 : 0;
  const progressScore = (project.progress / 100) * 20;

  return Math.round(taskCompletionScore + onTimeScore + progressScore);
}

// Helper function to calculate manager performance score
function calculateManagerPerformanceScore(projects, tasks) {
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const totalProjects = projects.length;

  const onTimeProjects = projects.filter(p =>
    p.status === 'completed' &&
    p.endDate >= new Date(p.actualCompletionDate || new Date())
  ).length;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;

  if (totalProjects === 0) return 0;

  const projectCompletionScore = (completedProjects / totalProjects) * 40;
  const onTimeScore = completedProjects > 0 ? (onTimeProjects / completedProjects) * 30 : 0;
  const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 20 : 0;
  const progressScore = projects.length > 0 ?
    (projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) * 0.1 : 0;

  return Math.round(projectCompletionScore + onTimeScore + taskScore + progressScore);
}

// Helper function to calculate staff productivity score
function calculateStaffProductivityScore(tasks, attendanceRecords) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;

  const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
  const expectedHours = attendanceRecords.length * 8; // Assuming 8 hours per day

  if (totalTasks === 0) return 0;

  const taskCompletionScore = (completedTasks / totalTasks) * 50;
  const attendanceScore = expectedHours > 0 ? Math.min((totalHours / expectedHours) * 30, 30) : 0;
  const overtimeScore = Math.min(
    (attendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0) / 20) * 20,
    20
  );

  return Math.round(taskCompletionScore + attendanceScore + overtimeScore);
}

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