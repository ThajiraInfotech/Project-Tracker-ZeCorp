const mongoose = require('mongoose');
const Project = require('./backend/models/Project');
const Task = require('./backend/models/Task');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://arshadhahamed777_db_user:a.r.s.h.a.d.h.7@cluster0.u92ttx1.mongodb.net/?appName=Cluster0');
    console.log('MongoDB connected successfully');
    
    // Check projects
    const projects = await Project.find();
    console.log('Projects found:', projects.length);
    
    // Check tasks
    const tasks = await Task.find();
    console.log('Tasks found:', tasks.length);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

connectDB();