import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
);

const Performance = () => {
  const { user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksResponse, attendanceResponse] = await Promise.all([
          api.get('/tasks'),
          api.get('/attendance/me')
        ]);
        setTasks(tasksResponse.data.tasks);
        setAttendance(attendanceResponse.data.attendance);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  // Calculate statistics
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalCheckIns = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'Present').length;

  // Calculate Performance Metrics
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tasksCompletedThisWeek = tasks.filter(t =>
    t.status === 'completed' &&
    t.completionDate &&
    new Date(t.completionDate) > oneWeekAgo
  ).length;

  const completedTasksWithDates = tasks.filter(t => t.status === 'completed' && t.completionDate && t.createdAt);

  const avgCompletionTime = completedTasksWithDates.length > 0
    ? (completedTasksWithDates.reduce((acc, t) => {
      const duration = (new Date(t.completionDate) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
      return acc + duration;
    }, 0) / completedTasksWithDates.length).toFixed(1)
    : 0;

  const onTimeTasks = completedTasksWithDates.filter(t =>
    new Date(t.completionDate) <= new Date(t.deadline)
  ).length;

  const onTimeRate = completedTasksWithDates.length > 0
    ? Math.round((onTimeTasks / completedTasksWithDates.length) * 100)
    : 0;

  // Chart Data for Performance
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const weeklyCompletionData = {
    labels: last7Days.map(date => new Date(date).toLocaleDateString(undefined, { weekday: 'short' })),
    datasets: [
      {
        label: 'Tasks Completed',
        data: last7Days.map(date => {
          return tasks.filter(t =>
            t.status === 'completed' &&
            t.completionDate &&
            new Date(t.completionDate).toISOString().split('T')[0] === date
          ).length;
        }),
        backgroundColor: 'rgba(112, 6, 6, 0.7)',
        borderColor: '#700606',
        borderWidth: 1,
        borderRadius: 5,
      }
    ]
  };

  const priorityDistributionData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          tasks.filter(t => t.priority === 'high').length,
          tasks.filter(t => t.priority === 'medium').length,
          tasks.filter(t => t.priority === 'low').length
        ],
        backgroundColor: ['#F44336', '#FF9800', '#4CAF50'],
        hoverOffset: 4
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#700606]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-full p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 md:p-8 text-white mb-6 md:mb-8 shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Performance Analytics</h1>
        <p className="text-white/80 text-sm md:text-base">Detailed insights into your productivity and task completion efficiency.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Completion Chart */}
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg border border-white/20">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            Weekly Activity Hub
          </h3>
          <div className="h-64 md:h-80 mb-6">
            <Bar
              data={weeklyCompletionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                  }
                }
              }}
            />
          </div>
          <p className="text-sm text-gray-500 text-center italic">Tasks completed over the last 7 days</p>
        </div>

        {/* Priority Distribution Chart */}
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg border border-white/20">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="bg-[#700606]/10 p-2 rounded-full mr-3">
              <svg className="w-5 h-5 text-[#700606]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            Task Priority Distribution
          </h3>
          <div className="h-64 md:h-80 mb-6">
            <Doughnut
              data={priorityDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                  }
                }
              }}
            />
          </div>
          <p className="text-sm text-gray-500 text-center italic">Workload breakdown by priority level</p>
        </div>

        {/* Metrics Section */}
        <div className="lg:col-span-2 bg-gradient-to-r from-[#700606] to-[#a04040] p-6 md:p-10 rounded-2xl shadow-xl text-white">
          <h3 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 flex items-center">
            <svg className="w-6 h-6 md:w-8 md:h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Key Productivity Metrics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <p className="text-white/70 text-xs md:text-sm font-medium uppercase mb-2 tracking-wider">Weekly Completions</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold">{tasksCompletedThisWeek}</span>
                <span className="text-base md:text-lg">tasks</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <p className="text-white/70 text-xs md:text-sm font-medium uppercase mb-2 tracking-wider">Avg. Completion Time</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold">{avgCompletionTime}</span>
                <span className="text-base md:text-lg">days</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <p className="text-white/70 text-xs md:text-sm font-medium uppercase mb-2 tracking-wider">On-time Delivery</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold">{onTimeRate}%</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
              <p className="text-white/70 text-xs md:text-sm font-medium uppercase mb-2 tracking-wider">Attendance Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold">{totalCheckIns > 0 ? Math.round((presentDays / totalCheckIns) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;