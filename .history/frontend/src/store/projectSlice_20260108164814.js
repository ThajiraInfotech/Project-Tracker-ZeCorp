import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from './api';

// Async thunk for fetching projects
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/projects');
      return response.data.projects;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch projects');
    }
  }
);

// Async thunk for creating a project
export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data.project;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create project');
    }
  }
);

// Async thunk for adding project discussion
export const addProjectDiscussion = createAsyncThunk(
  'projects/addProjectDiscussion',
  async ({ projectId, content, system }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/projects/${projectId}/discussions`, { content, system });
      return { projectId, discussion: response.data.project.discussions[response.data.project.discussions.length - 1] };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Async thunk for fetching project discussions
export const fetchProjectDiscussions = createAsyncThunk(
  'projects/fetchProjectDiscussions',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${projectId}/discussions`);
      return { projectId, discussions: response.data.discussions };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    projects: [],
    currentProject: null,
    projectDiscussions: {},
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create project
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add project discussion
      .addCase(addProjectDiscussion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProjectDiscussion.fulfilled, (state, action) => {
        state.loading = false;
        const { projectId, discussion } = action.payload;
        if (!state.projectDiscussions[projectId]) {
          state.projectDiscussions[projectId] = [];
        }
        state.projectDiscussions[projectId].push(discussion);
      })
      .addCase(addProjectDiscussion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch project discussions
      .addCase(fetchProjectDiscussions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectDiscussions.fulfilled, (state, action) => {
        state.loading = false;
        const { projectId, discussions } = action.payload;
        state.projectDiscussions[projectId] = discussions;
      })
      .addCase(fetchProjectDiscussions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, setCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;