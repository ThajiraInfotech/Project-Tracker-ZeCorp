import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';
import { toast } from 'react-toastify';

// Async thunk for fetching all system settings
export const fetchSystemSettings = createAsyncThunk(
  'systemSettings/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/system-settings');

      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch system settings');
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch system settings');
    }
  }
);

// Async thunk for fetching settings by category
export const fetchSettingsByCategory = createAsyncThunk(
  'systemSettings/fetchByCategory',
  async (category, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/system-settings/by-category?category=${category}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch settings by category');
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings by category');
    }
  }
);

// Async thunk for creating/updating a system setting
export const upsertSystemSetting = createAsyncThunk(
  'systemSettings/upsert',
  async (settingData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`${API_URL}/system-settings`, settingData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success(response.data.message || 'System setting saved successfully');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save system setting');
      return rejectWithValue(error.response?.data?.message || 'Failed to save system setting');
    }
  }
);

// Async thunk for deleting a system setting
export const deleteSystemSetting = createAsyncThunk(
  'systemSettings/delete',
  async (settingId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.delete(`${API_URL}/system-settings/${settingId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success(response.data.message || 'System setting deleted successfully');
      return { id: settingId };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete system setting');
      return rejectWithValue(error.response?.data?.message || 'Failed to delete system setting');
    }
  }
);

// Async thunk for initializing default settings
export const initializeDefaultSettings = createAsyncThunk(
  'systemSettings/initializeDefaults',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`${API_URL}/system-settings/initialize`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success(response.data.message || 'Default settings initialized successfully');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initialize default settings');
      return rejectWithValue(error.response?.data?.message || 'Failed to initialize default settings');
    }
  }
);

const systemSettingSlice = createSlice({
  name: 'systemSettings',
  initialState: {
    settings: [],
    categorized: {
      'working-hours': [],
      'company-rules': [],
      'notification-rules': [],
      'security': [],
      'general': []
    },
    loading: false,
    error: null,
    currentCategory: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCategory: (state, action) => {
      state.currentCategory = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all settings cases
      .addCase(fetchSystemSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.settings || [];
        state.categorized = action.payload.categorized || state.categorized;
      })
      .addCase(fetchSystemSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch by category cases
      .addCase(fetchSettingsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettingsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = action.payload.category;
        // Update the specific category in categorized object
        if (action.payload.category && state.categorized[action.payload.category]) {
          state.categorized[action.payload.category] = action.payload.settings || [];
        }
      })
      .addCase(fetchSettingsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Upsert setting cases
      .addCase(upsertSystemSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upsertSystemSetting.fulfilled, (state, action) => {
        state.loading = false;
        // Update or add the setting in the settings array
        const updatedSetting = action.payload.setting;
        const existingIndex = state.settings.findIndex(s => s._id === updatedSetting._id);

        if (existingIndex >= 0) {
          state.settings[existingIndex] = updatedSetting;
        } else {
          state.settings.push(updatedSetting);
        }

        // Update categorized settings
        if (updatedSetting.category && state.categorized[updatedSetting.category]) {
          const catIndex = state.categorized[updatedSetting.category].findIndex(s => s._id === updatedSetting._id);
          if (catIndex >= 0) {
            state.categorized[updatedSetting.category][catIndex] = updatedSetting;
          } else {
            state.categorized[updatedSetting.category].push(updatedSetting);
          }
        }
      })
      .addCase(upsertSystemSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete setting cases
      .addCase(deleteSystemSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSystemSetting.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload.id;

        // Remove from settings array
        state.settings = state.settings.filter(s => s._id !== deletedId);

        // Remove from categorized settings
        Object.keys(state.categorized).forEach(category => {
          state.categorized[category] = state.categorized[category].filter(s => s._id !== deletedId);
        });
      })
      .addCase(deleteSystemSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Initialize defaults cases
      .addCase(initializeDefaultSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeDefaultSettings.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh settings after initialization
        state.settings = action.payload.settings || [];
      })
      .addCase(initializeDefaultSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setCurrentCategory } = systemSettingSlice.actions;
export default systemSettingSlice.reducer;