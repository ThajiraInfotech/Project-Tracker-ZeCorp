import { createSlice } from '@reduxjs/toolkit';

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    attendance: [],
    currentAttendance: null,
    loading: false,
    error: null
  },
  reducers: {
    // Reducers will be added as needed
  }
});

export default attendanceSlice.reducer;