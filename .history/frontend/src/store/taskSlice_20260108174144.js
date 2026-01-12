import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

// Async thunks
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status, progress }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/status`, { status, progress });
      return response.data.task;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/tasks');
      return response.data.tasks;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const addTaskDiscussion = createAsyncThunk(
  'tasks/addTaskDiscussion',
  async ({ taskId, content, system, parentDiscussionId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/tasks/${taskId}/discussions`, { content, system, parentDiscussionId });
      return { taskId, discussion: response.data.task.discussions[response.data.task.discussions.length - 1] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Async thunk for replying to a task discussion
export const replyToTaskDiscussion = createAsyncThunk(
  'tasks/replyToTaskDiscussion',
  async ({ taskId, parentDiscussionId, content, system }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/tasks/${taskId}/discussions`, {
        content,
        system: system || false,
        parentDiscussionId
      });
      return { taskId, discussion: response.data.task.discussions[response.data.task.discussions.length - 1] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchTaskDiscussions = createAsyncThunk(
  'tasks/fetchTaskDiscussions',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/tasks/${taskId}/discussions`);
      return { taskId, discussions: response.data.discussions };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
    currentTask: null,
    taskDiscussions: {},
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTask: (state, action) => {
      state.currentTask = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.push(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTaskStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tasks.findIndex(task => task._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTaskStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addTaskDiscussion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTaskDiscussion.fulfilled, (state, action) => {
        state.loading = false;
        const { taskId, discussion } = action.payload;
        if (!state.taskDiscussions[taskId]) {
          state.taskDiscussions[taskId] = [];
        }
        state.taskDiscussions[taskId].push(discussion);
      })
      .addCase(addTaskDiscussion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Reply to task discussion
      .addCase(replyToTaskDiscussion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(replyToTaskDiscussion.fulfilled, (state, action) => {
        state.loading = false;
        const { taskId, discussion } = action.payload;
        if (!state.taskDiscussions[taskId]) {
          state.taskDiscussions[taskId] = [];
        }
        state.taskDiscussions[taskId].push(discussion);
      })
      .addCase(replyToTaskDiscussion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTaskDiscussions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskDiscussions.fulfilled, (state, action) => {
        state.loading = false;
        const { taskId, discussions } = action.payload;
        state.taskDiscussions[taskId] = discussions;
      })
      .addCase(fetchTaskDiscussions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setCurrentTask } = taskSlice.actions;
export default taskSlice.reducer;