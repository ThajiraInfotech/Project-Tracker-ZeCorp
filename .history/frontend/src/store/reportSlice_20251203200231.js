import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for getting dashboard data
export const getDashboardData = createAsyncThunk(
  'reports/getDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/reports/dashboard');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get dashboard data');
    }
  }
);

const reportSlice = createSlice({
  name: 'reports',
  initialState: {
    reports: [],
    dashboardData: null,
    loading: false,
    error: null
  },
  reducers: {
    // Reducers will be added as needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(getDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
      })
      .addCase(getDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default reportSlice.reducer;