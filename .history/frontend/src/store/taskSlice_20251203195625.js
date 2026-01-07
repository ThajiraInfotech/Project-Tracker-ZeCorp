import { createSlice } from '@reduxjs/toolkit';

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
    currentTask: null,
    loading: false,
    error: null
  },
  reducers: {
    // Reducers will be added as needed
  }
});

export default taskSlice.reducer;