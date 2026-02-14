const User = require('../models/User');
const Project = require('../models/Project');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../utils/emailService');
const SystemSetting = require('../models/SystemSetting');
const { publishEvent } = require('../infrastructure/queue');

// Helper: Validate password against system settings
const validatePassword = async (password) => {
  let minLength = 8;
  let requireSpecial = true;

  try {
    const minLenSetting = await SystemSetting.findOne({ settingKey: 'password_min_length' });
    if (minLenSetting) minLength = Number(minLenSetting.settingValue);

    const specialCharSetting = await SystemSetting.findOne({ settingKey: 'password_require_special_chars' });
    if (specialCharSetting) requireSpecial = specialCharSetting.settingValue === true || specialCharSetting.settingValue === 'true';
  } catch (err) {
    console.error('Failed to fetch password settings:', err);
  }

  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long`;
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  return null;
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, role, phone, department, salaryPerHour } = req.body;

    // Validate password
    const passwordError = await validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      fullName,
      role: role || 'staff',
      phone,
      phone,
      department,
      salaryPerHour: salaryPerHour || 0
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // EMIT EVENT: User Created
    // This allows the notification service to handle the "Welcome Email" logic
    await publishEvent('USER_CREATED', {
      user: user,
      username: username,
      password: password // Note: Only for initial welcome email, handled securely
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        department: user.department,
        salaryPerHour: user.salaryPerHour
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Account is locked until ${user.lockUntil.toLocaleTimeString()}`
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Handle failed attempt
      let maxAttempts = 5;
      try {
        const setting = await SystemSetting.findOne({ settingKey: 'max_failed_login_attempts' });
        if (setting) maxAttempts = Number(setting.settingValue);
      } catch (err) { console.error(err); }

      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= maxAttempts) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        user.failedLoginAttempts = 0; // Reset so they can try again after lock expires
        await user.save();
        return res.status(403).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 30 minutes.'
        });
      }

      await user.save();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Successful login - reset counters
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profileImage: user.profileImage,
        phone: user.phone,
        department: user.department,
        salaryPerHour: user.salaryPerHour,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        profileImage: req.user.profileImage,
        phone: req.user.phone,
        department: req.user.department,
        isActive: req.user.isActive,
        salaryPerHour: req.user.salaryPerHour
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Failed to get current user' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // In JWT, logout is typically handled client-side by removing the token
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Generate new token
    const newToken = generateToken(decoded.id);

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};


// Admin: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
};

// Admin: Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
};

// Admin: Update user
exports.updateUser = async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username', 'email', 'fullName', 'role', 'phone', 'department', 'isActive', 'salaryPerHour'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

// Admin: Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Admin: Block/Activate user
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
};

// Admin: Reset user password
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    // Validate password
    const passwordError = await validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Send notification email
    if (user.email) {
      await emailService.sendEmail(
        user.email,
        'Your Password Has Been Reset',
        `<p>Your password has been reset by an administrator.</p>
         <p>If you did not request this change, please contact support immediately.</p>`
      );
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ message: 'Failed to reset user password' });
  }
};

// Admin: Assign user to project
exports.assignUserToProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is already in the project
    if (project.teamMembers.includes(user._id)) {
      return res.status(400).json({ message: 'User is already assigned to this project' });
    }

    project.teamMembers.push(user._id);
    await project.save();

    res.json({
      success: true,
      message: 'User assigned to project successfully',
      project: {
        id: project._id,
        name: project.projectName
      },
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Assign user to project error:', error);
    res.status(500).json({ message: 'Failed to assign user to project' });
  }
};

// Admin: Remove user from project
exports.removeUserFromProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is in the project
    if (!project.teamMembers.includes(user._id)) {
      return res.status(400).json({ message: 'User is not assigned to this project' });
    }

    project.teamMembers = project.teamMembers.filter(
      member => member.toString() !== user._id.toString()
    );
    await project.save();

    res.json({
      success: true,
      message: 'User removed from project successfully',
      project: {
        id: project._id,
        name: project.projectName
      },
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Remove user from project error:', error);
    res.status(500).json({ message: 'Failed to remove user from project' });
  }
};

// Admin: Get users by role
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};

    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select('-password');

    res.json({
      success: true,
      users,
      counts: {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        managers: users.filter(u => u.role === 'manager').length,
        staff: users.filter(u => u.role === 'staff').length,
        technicians: users.filter(u => u.role === 'technician').length,
        finance: users.filter(u => u.role === 'finance').length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length
      }
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ message: 'Failed to get users by role' });
  }
};

// Manager: Get all staff for task assignment
exports.getStaffForManager = async (req, res) => {
  try {
    // Get all active staff and manager users
    const staff = await User.find({
      role: { $in: ['staff', 'technician', 'finance', 'manager', 'admin'] },
      isActive: true
    }).select('-password');

    res.json({
      success: true,
      users: staff
    });
  } catch (error) {
    console.error('Get staff for manager error:', error);
    res.status(500).json({ message: 'Failed to get staff for manager' });
  }
};

// Get all admins for mentions (accessible to all authenticated users)
exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({
      role: 'admin',
      isActive: true
    }).select('username fullName email profileImage role');

    res.json({
      success: true,
      users: admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Failed to get admins' });
  }
};