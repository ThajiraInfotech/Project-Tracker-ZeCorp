const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * Auto-calculates project progress based on task progress percentages
 * @param {string} projectId - Project ID
 * @returns {number} Progress percentage (0-100)
 */
async function calculateProjectProgress(projectId) {
  try {
    const tasks = await Task.find({ project: projectId });

    if (tasks.length === 0) {
      return 0;
    }

    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.round(totalProgress / tasks.length);
  } catch (error) {
    console.error('Error calculating project progress:', error);
    return 0;
  }
}

/**
 * Auto-derives project status based on task states and deadlines
 * Priority order: Delayed > At Risk > Completed > In Progress > Planning
 * @param {string} projectId - Project ID
 * @returns {string} Project status
 */
async function deriveProjectStatus(projectId) {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return 'in-progress';
    }

    const tasks = await Task.find({ project: projectId });

    // No tasks = In Progress (per "Complete and Inprocess" simplification)
    if (tasks.length === 0) {
      return 'in-progress';
    }

    // Check if all tasks are completed
    const allCompleted = tasks.every(task => task.status === 'completed');

    if (allCompleted) {
      return 'completed';
    }

    // Default to in-progress for everything else
    return 'in-progress';
  } catch (error) {
    console.error('Error deriving project status:', error);
    return 'in-progress';
  }
}

/**
 * Updates project progress and status automatically
 * @param {string} projectId - Project ID
 */
async function updateProjectProgressAndStatus(projectId) {
  try {
    const [progress, status] = await Promise.all([
      calculateProjectProgress(projectId),
      deriveProjectStatus(projectId)
    ]);

    await Project.findByIdAndUpdate(projectId, {
      progress,
      status
    });

    console.log(`Updated project ${projectId}: progress=${progress}%, status=${status}`);
  } catch (error) {
    console.error('Error updating project progress and status:', error);
  }
}

module.exports = {
  calculateProjectProgress,
  deriveProjectStatus,
  updateProjectProgressAndStatus
};