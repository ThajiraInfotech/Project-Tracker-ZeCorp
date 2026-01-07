
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Async thunk for fetching all system settings
export const fetchSystemSettings = createAsyncThunk(
  'systemSettings/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/system-settings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

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
