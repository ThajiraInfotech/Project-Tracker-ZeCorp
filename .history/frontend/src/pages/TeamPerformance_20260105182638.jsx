import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const TeamPerformance = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all tasks - backend will filter appropriately
        const tasksResponse = await api.get('/tasks');
        const tasksData = tasksResponse.data.tasks || tasksResponse.data || [];
        setTasks(Array.isArray(tasksData) ? tasksData : []);

        // Fetch staff for assignment (only staff assigned to manager's projects)
        const staffResponse = await api.get('/auth/staff-for-manager');
        const staffData = staffResponse.data.users || staffResponse.data || [];
        setStaff(Array.isArray(staffData) ? staffData : []);

        setError(null);
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load data');
        toast.error('Failed to load team performance data');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.id) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#700606]/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#700606] mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Team Performance...</h2>
          <p className="text-gray-600">Fetching your team data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">Error loading team performance: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#700606]/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-6 text-white mx-4 mt-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Team Performance Monitoring</h1>
          <p className="text-white/80 text-sm">Monitor and analyze your team's productivity and task completion</p>
          <p className="text-white/60 text-xs mt-1">Real-time performance tracking and insights</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Team Performance Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Completion Rates</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: staff.map(member => member.fullName.split(' ')[0]),
                  datasets: [{
                    label: 'Completion Rate (%)',
                    data: staff.map(member => {
                      const memberTasks = tasks.filter(task => task.assignedTo?._id === member._id);
                      const completedTasks = memberTasks.filter(task => task.status === 'completed').length;
                      const totalMemberTasks = memberTasks.length;
                      return totalMemberTasks > 0 ? Math.round((completedTasks / totalMemberTasks) * 100) : 0;
                    }),
                    backgroundColor: '#700606',
                    borderColor: '#700606',
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => {
              const memberTasks = tasks.filter(task => task.assignedTo?._id === member._id);
              const completedTasks = memberTasks.filter(task => task.status === 'completed').length;
              const totalMemberTasks = memberTasks.length;
              const completionRate = totalMemberTasks > 0 ? Math.round((completedTasks / totalMemberTasks) * 100) : 0;
              const inProgressTasks = memberTasks.filter(task => task.status === 'in-progress').length;
              const overdueTasks = memberTasks.filter(task => task.isOverdue).length;

              return (
                <div key={member._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white font-semibold">
                        {member.fullName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{member.fullName}</h3>
                      <p className="text-sm text-gray-500">{member.username}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tasks Completed</span>
                      <span className="font-medium">{completedTasks}/{totalMemberTasks}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 text-center">{completionRate}% completion rate</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-blue-600 font-medium">{inProgressTasks}</p>
                        <p className="text-gray-500">In Progress</p>
                      </div>
                      <div className="text-center">
                        <p className="text-red-600 font-medium">{overdueTasks}</p>
                        <p className="text-gray-500">Overdue</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformance;