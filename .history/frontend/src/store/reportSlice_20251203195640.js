import { createSlice } from '@reduxjs/toolkit';

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
  }
});

export default reportSlice.reducer;