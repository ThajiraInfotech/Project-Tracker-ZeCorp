const SystemSetting = require('../models/SystemSetting');
const User = require('../models/User');

// Get all system settings
exports.getAllSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find().sort({ category: 1, settingName: 1 });

    res.json({
      success: true,
      settings,
      categorized: categorizeSettings(settings)
    });
  } catch (error) {
    console.error('Get all system settings error:', error);
    res.status(500).json({ message: 'Failed to get system settings' });
  }
};

// Get system setting by key
exports.getSystemSettingByKey = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ settingKey: req.params.key });

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({
      success: true,
      setting
    });
  } catch (error) {
    console.error('Get system setting by key error:', error);
    res.status(500).json({ message: 'Failed to get system setting' });
  }
};

// Create or update system setting
exports.upsertSystemSetting = async (req, res) => {
  try {
    const { settingName, settingKey, settingValue, settingType, description, category } = req.body;

    // Validate required fields
    if (!settingName || !settingKey || settingValue === undefined) {
      return res.status(400).json({ message: 'Setting name, key, and value are required' });
    }

    // Check if setting exists
    const existingSetting = await SystemSetting.findOne({ settingKey });

    const settingData = {
      settingName,
      settingKey,
      settingValue,
      settingType: settingType || 'string',
      description: description || '',
      category: category || 'general',
      isEditable: true,
      updatedBy: req.user._id
    };

    if (existingSetting) {
      // Update existing setting
      const updatedSetting = await SystemSetting.findByIdAndUpdate(
        existingSetting._id,
        settingData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'System setting updated successfully',
        setting: updatedSetting
      });
    } else {
      // Create new setting
      settingData.createdBy = req.user._id;
      const newSetting = new SystemSetting(settingData);
      await newSetting.save();

      res.status(201).json({
        success: true,
        message: 'System setting created successfully',
        setting: newSetting
      });
    }
  } catch (error) {
    console.error('Upsert system setting error:', error);
    res.status(500).json({ message: 'Failed to upsert system setting' });
  }
};

// Delete system setting
exports.deleteSystemSetting = async (req, res) => {
  try {
    const setting = await SystemSetting.findByIdAndDelete(req.params.id);

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({
      success: true,
      message: 'System setting deleted successfully'
    });
  } catch (error) {
    console.error('Delete system setting error:', error);
    res.status(500).json({ message: 'Failed to delete system setting' });
  }
};

// Get system settings by category
exports.getSystemSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({ message: 'Category query parameter is required' });
    }

    const settings = await SystemSetting.find({ category }).sort({ settingName: 1 });

    res.json({
      success: true,
      settings,
      category
    });
  } catch (error) {
    console.error('Get system settings by category error:', error);
    res.status(500).json({ message: 'Failed to get system settings by category' });
  }
};

// Initialize default system settings
exports.initializeDefaultSettings = async (req, res) => {
  try {
    // Check if settings already exist
    const existingSettings = await SystemSetting.find();
    if (existingSettings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'System settings already initialized'
      });
    }

    const defaultSettings = [
      {
        settingName: 'Standard Working Hours',
        settingKey: 'standard_working_hours',
        settingValue: 8,
        settingType: 'number',
        description: 'Standard daily working hours for employees',
        category: 'working-hours',
        createdBy: req.user._id
      },
      {
        settingName: 'Week Start Day',
        settingKey: 'week_start_day',
        settingValue: 'Monday',
        settingType: 'string',
        description: 'Day considered as start of the work week',
        category: 'working-hours',
        createdBy: req.user._id
      },
      {
        settingName: 'Overtime Threshold',
        settingKey: 'overtime_threshold',
        settingValue: 40,
        settingType: 'number',
        description: 'Weekly hours threshold for overtime calculation',
        category: 'working-hours',
        createdBy: req.user._id
      },
      {
        settingName: 'Task Overdue Notification',
        settingKey: 'task_overdue_notification',
        settingValue: true,
        settingType: 'boolean',
        description: 'Enable notifications for overdue tasks',
        category: 'notification-rules',
        createdBy: req.user._id
      },
      {
        settingName: 'Project Delay Alert',
        settingKey: 'project_delay_alert',
        settingValue: true,
        settingType: 'boolean',
        description: 'Enable alerts for delayed projects',
        category: 'notification-rules',
        createdBy: req.user._id
      },
      {
        settingName: 'Attendance Reminder',
        settingKey: 'attendance_reminder',
        settingValue: true,
        settingType: 'boolean',
        description: 'Enable daily attendance reminders',
        category: 'notification-rules',
        createdBy: req.user._id
      },
      {
        settingName: 'Password Minimum Length',
        settingKey: 'password_min_length',
        settingValue: 8,
        settingType: 'number',
        description: 'Minimum password length requirement',
        category: 'security',
        createdBy: req.user._id
      },
      {
        settingName: 'Password Require Special Characters',
        settingKey: 'password_require_special_chars',
        settingValue: true,
        settingType: 'boolean',
        description: 'Require special characters in passwords',
        category: 'security',
        createdBy: req.user._id
      },
      {
        settingName: 'Max Failed Login Attempts',
        settingKey: 'max_failed_login_attempts',
        settingValue: 5,
        settingType: 'number',
        description: 'Maximum allowed failed login attempts before lockout',
        category: 'security',
        createdBy: req.user._id
      },
      {
        settingName: 'Company Name',
        settingKey: 'company_name',
        settingValue: 'Zeecorp Construction',
        settingType: 'string',
        description: 'Official company name',
        category: 'company-rules',
        createdBy: req.user._id
      },
      {
        settingName: 'Default Project Budget Currency',
        settingKey: 'default_currency',
        settingValue: 'USD',
        settingType: 'string',
        description: 'Default currency for project budgets',
        category: 'company-rules',
        createdBy: req.user._id
      }
    ];

    const createdSettings = await SystemSetting.insertMany(defaultSettings);

    res.json({
      success: true,
      message: 'Default system settings initialized successfully',
      settings: createdSettings
    });
  } catch (error) {
    console.error('Initialize default settings error:', error);
    res.status(500).json({ message: 'Failed to initialize default settings' });
  }
};

// Helper function to categorize settings
function categorizeSettings(settings) {
  const categorized = {
    'working-hours': [],
    'company-rules': [],
    'notification-rules': [],
    'security': [],
    'general': []
  };

  settings.forEach(setting => {
    if (categorized[setting.category]) {
      categorized[setting.category].push(setting);
    }
  });

  return categorized;
}