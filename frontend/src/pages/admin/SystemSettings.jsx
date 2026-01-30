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
  const { settings, loading, error } = useSelector((state) => state.systemSettings);

  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);

  // Filter settings based on search term
  const filteredSettings = settings.filter(setting =>
    setting.settingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    setting.description.toLowerCase().includes(searchTerm.toLowerCase())
  );



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



  const renderSettingValue = (setting) => {
    switch (setting.settingType) {
      case 'boolean':
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${setting.settingValue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
            onChange={(e) => onChange({ ...setting, settingValue: e.target.value === 'true' })}
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
            onChange={(e) => onChange({ ...setting, settingValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter number"
          />
        );
      default:
        return (
          <input
            type="text"
            value={setting.settingValue}
            onChange={(e) => onChange({ ...setting, settingValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter value"
          />
        );
    }
  };



  return (

    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      {/* Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">System Settings</h1>
            <p className="text-white/80 text-lg">
              Manage your enterprise configuration and security preferences.
            </p>
          </div>

          <button
            onClick={handleInitializeDefaults}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-semibold flex items-center gap-2 backdrop-blur-sm border border-white/20"
            title="Reset to default settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.25a1 1 0 11-2 0V13.04a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reset Defaults
          </button>
        </div>

        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search settings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border-none rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 sm:text-sm shadow-md transition-shadow"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg">
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
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSettings.map((setting) => (
            <div
              key={setting._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-theme-50 rounded-xl group-hover:bg-theme-100 transition-colors">
                    {setting.settingKey.includes('password') || setting.settingKey.includes('login') ? (
                      <span className="text-2xl text-theme-600">🔒</span>
                    ) : (
                      <span className="text-2xl text-theme-600">🕒</span>
                    )}
                  </div>
                  {setting.isEditable && (
                    <button
                      onClick={() => {
                        setSelectedSetting(setting);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-theme-600 hover:bg-theme-50 rounded-lg transition-all"
                      title="Edit Setting"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-theme-600 transition-colors">
                  {setting.settingName}
                </h3>

                <p className="text-sm text-gray-500 mb-6 line-clamp-2 min-h-[40px]">
                  {setting.description}
                </p>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Current Value
                  </p>
                  <div className="text-lg font-medium text-gray-900">
                    {renderSettingValue(setting)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSettings.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No settings found
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            We couldn't find any settings matching "{searchTerm}". Try checking for typos or clear the search.
          </p>
        </div>
      )}

      {/* Simplified Edit Setting Modal */}
      {showEditModal && selectedSetting && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl transform transition-all scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Configuration</h2>
                <p className="text-sm text-gray-500 mt-1">Update system value</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSetting(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSetting}>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {selectedSetting.settingName}
                  </label>
                  <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed border border-gray-100">
                    {selectedSetting.description}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Value
                  </label>
                  {renderValueInput(selectedSetting, setSelectedSetting)}
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSetting(null);
                  }}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-theme-600 text-white rounded-xl hover:bg-theme-700 font-medium shadow-lg shadow-theme-200 transition-all transform hover:-translate-y-0.5 focus:ring-2 focus:ring-theme-500 focus:ring-offset-2"
                >
                  Save Changes
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