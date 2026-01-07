
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
