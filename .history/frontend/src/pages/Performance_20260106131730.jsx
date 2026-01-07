import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';

const Performance = () => {
  const { user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksResponse, attendanceResponse] = await Promise.all([
          api.get('/tasks'),
          api.get('/attendance/me')
        ]);
        setTasks(tasksResponse.data.tasks);
        setAttendance(attendanceResponse.data.attendance);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load performance data');
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalCheckIns = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'Present').length;

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            Task Completion Trend
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Performance charts coming soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Productivity Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200/50">
              <span className="text-sm text-gray-600">Tasks Completed This Week</span>
              <span className="text-sm font-bold text-blue-600">{completedTasks}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200/50">
              <span className="text-sm text-gray-600">Average Completion Time</span>
              <span className="text-sm font-bold text-green-600">2.3 days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200/50">
              <span className="text-sm text-gray-600">On-time Delivery Rate</span>
              <span className="text-sm font-bold text-yellow-600">87%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200/50">
              <span className="text-sm text-gray-600">Attendance Rate</span>
              <span className="text-sm font-bold text-purple-600">{totalCheckIns > 0 ? Math.round((presentDays / totalCheckIns) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;
