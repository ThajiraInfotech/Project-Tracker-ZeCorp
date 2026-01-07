import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

// Async thunk for getting dashboard data
export const getDashboardData = createAsyncThunk(
  'reports/getDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/reports/dashboard');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get dashboard data');
    }
  }
);

// Async thunk for getting manager dashboard data
export const getManagerDashboardData = createAsyncThunk(
  'reports/getManagerDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/dashboard/manager`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get manager dashboard data');
    }
  }
);

// Async thunk for getting admin dashboard data
export const getAdminDashboardData = createAsyncThunk(
  'reports/getAdminDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/dashboard/admin`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get admin dashboard data');
    }
  }
);

// Async thunk for getting project performance report
export const getProjectPerformanceReport = createAsyncThunk(
  'reports/getProjectPerformanceReport',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/admin/project-performance`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get project performance report');
    }
  }
);

// Async thunk for getting manager performance report
export const getManagerPerformanceReport = createAsyncThunk(
  'reports/getManagerPerformanceReport',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/admin/manager-performance`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get manager performance report');
    }
  }
);

// Async thunk for getting staff productivity report
export const getStaffProductivityReport = createAsyncThunk(
  'reports/getStaffProductivityReport',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/admin/staff-productivity`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get staff productivity report');
    }
  }
);

// Async thunk for getting attendance report
export const getAttendanceReport = createAsyncThunk(
  'reports/getAttendanceReport',
  async (params, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/admin/attendance`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get attendance report');
    }
  }
);

// Async thunk for getting delay and risk analysis report
export const getDelayRiskAnalysisReport = createAsyncThunk(
  'reports/getDelayRiskAnalysisReport',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/admin/delay-risk`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get delay risk analysis report');
    }
  }
);

const reportSlice = createSlice({
  name: 'reports',
  initialState: {
    reports: [],
    dashboardData: null,
    managerDashboardData: null,
    adminDashboardData: null,
    projectPerformance: null,
    managerPerformance: null,
    staffProductivity: null,
    attendanceReport: null,
    delayRiskAnalysis: null,
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
      })
      .addCase(getManagerDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getManagerDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.managerDashboardData = action.payload;
      })
      .addCase(getManagerDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getAdminDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAdminDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.adminDashboardData = action.payload;
      })
      .addCase(getAdminDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getProjectPerformanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProjectPerformanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.projectPerformance = action.payload;
      })
      .addCase(getProjectPerformanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getManagerPerformanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getManagerPerformanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.managerPerformance = action.payload;
      })
      .addCase(getManagerPerformanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getStaffProductivityReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStaffProductivityReport.fulfilled, (state, action) => {
        state.loading = false;
        state.staffProductivity = action.payload;
      })
      .addCase(getStaffProductivityReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getAttendanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceReport = action.payload;
      })
      .addCase(getAttendanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getDelayRiskAnalysisReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDelayRiskAnalysisReport.fulfilled, (state, action) => {
        state.loading = false;
        state.delayRiskAnalysis = action.payload;
      })
      .addCase(getDelayRiskAnalysisReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default reportSlice.reducer;