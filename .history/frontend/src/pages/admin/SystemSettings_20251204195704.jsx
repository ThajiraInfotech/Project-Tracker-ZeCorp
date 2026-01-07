
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSystemSettings,
  upsertSystemSetting,
  deleteSystemSetting,
  initializeDefaultSettings,
  clearError
} from '../../store/systemSettingSlice';
import { toast } from 'react-toastify';

const SystemSettings = () => {
  const dispatch = useDispatch();
  const { settings, categorized, loading, error } = useSelector((state) => state.systemSettings);

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [newSetting, setNewSetting] = useState({
    settingName: '',
    settingKey: '',
    settingValue: '',
    settingType: 'string',
    description: '',
    category: 'general'
  });

  const categories = [
    { key: 'all', label: 'All Settings', icon: '⚙️' },
    { key: 'working-hours', label: 'Working Hours', icon: '🕒' },
    { key: 'company-rules', label: 'Company Rules', icon: '🏢' },
    { key: 'notification-rules', label: 'Notifications', icon: '🔔' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'general', label: 'General', icon: '📋' }
  ];

  useEffect(() => {
    dispatch(fetchSystemSettings());
  }, [dispatch]);

  // Filter settings based on active tab and search term
  const getFilteredSettings = () => {
    let filtered = settings;

    if (activeTab !== 'all') {
      filtered = categorized[activeTab] || [];
    }

    if (searchTerm) {
      filtered = filtered.filter(setting =>
        setting.settingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        setting.settingKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        setting.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const handleCreateSetting = async (e) => {
    e.preventDefault();
    try {
      // Convert settingValue based on type
      let processedValue = newSetting.settingValue;
      if (newSetting.settingType === 'number') {
        processedValue = parseFloat(processedValue);
      } else if (newSetting.settingType === 'boolean') {
        processedValue = processedValue === 'true' || processedValue === true;
      }

      await dispatch(upsertSystemSetting({
        ...newSetting,
        settingValue: processedValue
      })).unwrap();

      setShowCreateModal(false);
      resetNewSetting();
    } catch (error) {
      console.error('Failed to create setting:', error);
    }
  };

  const handleEditSetting = async (e) => {
    e.preventDefault();
    try {
      let processedValue = selectedSetting.settingValue;
      if (selectedSetting.settingType === 'number') {
        processedValue = parseFloat(processedValue);
      } else if (selectedSetting.settingType === 'boolean') {
        processedValue = processedValue === 'true' || processedValue === true;
      }

      await dispatch(upsertSystemSetting({
        ...selectedSetting,
        settingValue: processedValue
      })).unwrap();

      setShowEditModal(false);
      setSelectedSetting(null);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleDeleteSetting = async (settingId) => {
    if (window.confirm('Are you sure you want to delete this setting? This action cannot be undone.')) {
      try {
        await dispatch(deleteSystemSetting(settingId)).unwrap();
      } catch (error) {
        console.error('Failed to delete setting:', error);
      }
    }
  };

  const handleInitializeDefaults = async () => {
    if (window.confirm('This will initialize default system settings. Continue?')) {
      try {
        await dispatch(initializeDefaultSettings()).unwrap();
        dispatch(fetchSystemSettings());
      } catch (error) {
        console.error('Failed to initialize defaults:', error);
      }
    }
  };

  const resetNewSetting = () => {
    setNewSetting({
      settingName: '',
      settingKey: '',
      settingValue: '',
      settingType: 'string',
      description: '',
      category: 'general'
    });
  };

  const renderSettingValue = (setting) => {
    switch (setting.settingType) {
      case 'boolean':
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            setting.settingValue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {setting.settingValue ? 'Enabled' : 'Disabled'}
          </span>
        );
      case 'number':
        return <span className="text-gray-900 font-mono">{setting.settingValue}</span>;
      default:
        return <span className="text-gray-900">{String(setting.settingValue)}</span>;
    }
  };

  const renderValueInput = (setting, onChange) => {
    switch (setting.settingType) {
      case 'boolean':
        return (
          <select
            value={setting.settingValue}
            onChange={(e) => onChange({...setting, settingValue: e.target.value === 'true'})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={true}>Enabled</option>
            <option value={false}>Disabled</option>
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={setting.settingValue}
            onChange={(e) => onChange({...setting, settingValue: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter number"
          />
        );
      default:
        return (
          <input
            type="text"
            value={setting.settingValue}
            onChange={(e) => onChange({...setting, settingValue: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter value"
          />
        );
    }
  };

  const filteredSettings = getFilteredSettings();

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Enterprise-level configuration management</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleInitializeDefaults}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Initialize Defaults
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            + Add Setting
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveTab(category.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === category.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                {category.key !== 'all' && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
                    {(categorized[category.key] || []).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
