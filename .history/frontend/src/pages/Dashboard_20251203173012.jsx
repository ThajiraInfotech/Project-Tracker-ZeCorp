import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDashboardData } from '../store/reportSlice';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
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
  Title
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { dashboardData, loading, error } = useSelector((state) => state.reports);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getDashboardData());
  }, [dispatch]);

  // Sample data for charts (would be replaced with real data)
  const projectStatusData = {
    labels: ['Planning', 'In Progress', 'Completed', 'On Hold'],
    datasets: [
      {
        data: [12, 19, 8, 3],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0'
        ],
        hoverBackgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0'
        ]
      }
    ]
  };

  const taskStatusData = {
    labels: ['To Do', 'In Progress', 'Completed', 'Overdue'],
    datasets: [
      {
        label: 'Tasks',
        data: [15, 8, 12, 5],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#4BC0C0',
          '#FF6384'
        ]
      }
    ]
  };

  const attendanceData = {
    labels: ['Present', 'Late', 'Half Day', 'Absent'],
    datasets: [
      {
        label: 'Attendance',
        data: [22, 2, 1, 0],
        backgroundColor: [
          '#4BC0C0',
          '#FFCE56',
          '#FF9F40',
          '#FF6384'
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">Welcome back, {user?.fullName}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.projects?.totalProjects || 0}</p>
            </div>
            <div className="bg-primary-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.projects?.totalProjectsInProgress || 0}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Tasks Completed</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.tasks?.totalTasksCompleted || 0}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Overdue Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.tasks?.totalTasksOverdue || 0}</p>
            </div>
            <div className="bg-red-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Project Status</h3>
          <div className="h-64">
            <Doughnut data={projectStatusData} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Status</h3>
          <div className="h-64">
            <Bar data={taskStatusData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Attendance Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Overview</h3>
        <div className="h-64">
          <Doughnut data={attendanceData} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <img className="h-10 w-10 rounded-full" src="https://via.placeholder.com/150" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">John Doe completed task "Site Inspection"</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <img className="h-10 w-10 rounded-full" src="https://via.placeholder.com/150" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">New project "Villa Renovation" created</p>
              <p className="text-xs text-gray-500">5 hours ago</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <img className="h-10 w-10 rounded-full" src="https://via.placeholder.com/150" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Task "Electrical Setup" is now overdue</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;