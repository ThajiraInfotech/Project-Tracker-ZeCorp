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
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => dispatch(clearError())}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSettings.map((setting) => (
            <div key={setting._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {setting.settingName}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">
                      {setting.settingKey}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedSetting(setting);
                        setShowEditModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 p-1"
                      title="Edit setting"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {setting.isEditable && (
                      <button
                        onClick={() => handleDeleteSetting(setting._id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete setting"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Value
                    </label>
                    <div className="mt-1">
                      {renderSettingValue(setting)}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Type
                    </label>
                    <div className="mt-1">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {setting.settingType}
                      </span>
                    </div>
                  </div>

                  {setting.description && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Description
                      </label>
                      <p className="mt-1 text-sm text-gray-600">
                        {setting.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSettings.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No settings found' : 'No settings configured'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by initializing default settings or adding a new one'
            }
          </p>
          {!searchTerm && (
            <div className="space-x-3">
              <button
                onClick={handleInitializeDefaults}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Initialize Defaults
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Add Setting
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Setting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Create New Setting</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetNewSetting();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSetting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setting Name *
                </label>
                <input
                  type="text"
                  value={newSetting.settingName}
                  onChange={(e) => setNewSetting({...newSetting, settingName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setting Key *
                </label>
                <input
                  type="text"
                  value={newSetting.settingKey}
                  onChange={(e) => setNewSetting({...newSetting, settingKey: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Used programmatically, lowercase with underscores</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={newSetting.settingType}
                  onChange={(e) => setNewSetting({...newSetting, settingType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value *
                </label>
                {renderValueInput(newSetting, setNewSetting)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newSetting.category}
                  onChange={(e) => setNewSetting({...newSetting, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="general">General</option>
                  <option value="working-hours">Working Hours</option>
                  <option value="company-rules">Company Rules</option>
                  <option value="notification-rules">Notification Rules</option>
                  <option value="security">Security</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description of this setting"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetNewSetting();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Setting Modal */}
      {showEditModal && selectedSetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Edit Setting</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSetting(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSetting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setting Name *
                </label>
                <input
                  type="text"
                  value={selectedSetting.settingName}
                  onChange={(e) => setSelectedSetting({...selectedSetting, settingName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setting Key *
                </label>
                <input
                  type="text"
                  value={selectedSetting.settingKey}
                  onChange={(e) => setSelectedSetting({...selectedSetting, settingKey: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={selectedSetting.settingType}
                  onChange={(e) => setSelectedSetting({...selectedSetting, settingType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value *
                </label>
                {renderValueInput(selectedSetting, setSelectedSetting)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={selectedSetting.category}
                  onChange={(e) => setSelectedSetting({...selectedSetting, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="general">General</option>
                  <option value="working-hours">Working Hours</option>
                  <option value="company-rules">Company Rules</option>
                  <option value="notification-rules">Notification Rules</option>
                  <option value="security">Security</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedSetting.description}
                  onChange={(e) => setSelectedSetting({...selectedSetting, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description of this setting"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSetting(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Update Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;