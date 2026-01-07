import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import projectReducer from './projectSlice';
import taskReducer from './taskSlice';
import attendanceReducer from './attendanceSlice';
import reportReducer from './reportSlice';
import uiReducer from './uiSlice';
import systemSettingReducer from './systemSettingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectReducer,
    tasks: taskReducer,
    attendance: attendanceReducer,
    reports: reportReducer,
    ui: uiReducer,
    systemSettings: systemSettingReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});