import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    loading: false,
    error: null,
    success: null,
    sidebarOpen: false
  },
  reducers: {
    // Reducers will be added as needed
  }
});

export default uiSlice.reducer;