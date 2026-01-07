import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from '@heroicons/react/24/solid';
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
import api from '../store/api';
import { toast } from 'react-toastify';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const StaffAttendance = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const auth = useSelector((state) => state.auth);

  // Fetch attendance data
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/me');
      if (response.data.success) {
        const records = response.data.attendance;
        setAttendanceHistory(records);

        // Find today's record
        const today = new Date().toISOString().split('T')[0];
        const todayRec = records.find(r => r.date === today);
        setTodayRecord(todayRec);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  // Check in
  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/attendance/check-in');
      if (response.data.success) {
        toast.success('Checked in successfully');
        fetchAttendance();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Check out
  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/attendance/check-out');
      if (response.data.success) {
        toast.success('Checked out successfully');
        fetchAttendance();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchAttendance();
    }
  }, [auth.isAuthenticated]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusText = () => {
    if (!todayRecord) return "Not Checked In";
    if (!todayRecord.checkOut) return `Checked In at ${formatTime(todayRecord.checkIn)}`;
    return `Checked Out at ${formatTime(todayRecord.checkOut)}`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-600">Track your daily attendance and overtime</p>
      </div>

      {/* Today's Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Today's Status</h2>

        {todayRecord ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Check In</p>
              <p className="text-lg font-medium">{formatTime(todayRecord.checkIn)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Check Out</p>
              <p className="text-lg font-medium">
                {todayRecord.checkOut ? formatTime(todayRecord.checkOut) : 'Not checked out'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-medium">{getStatusText()}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 mb-4">{getStatusText()}</p>
        )}

        {/* Today's Hours & OT */}
        {todayRecord && todayRecord.checkOut && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-lg font-medium">{todayRecord.totalHours}h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Regular Hours</p>
              <p className="text-lg font-medium">{todayRecord.regularHours}h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Overtime Hours</p>
              <p className={`text-lg font-medium ${todayRecord.overtimeHours > 0 ? 'text-green-600' : ''}`}>
                {todayRecord.overtimeHours}h
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {todayRecord && todayRecord.checkOut ? (
          <p className="text-center text-green-600 font-medium">Attendance completed for today</p>
        ) : (
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCheckIn}
              disabled={actionLoading || todayRecord}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Processing...' : 'Check In'}
            </button>
            <button
              onClick={handleCheckOut}
              disabled={actionLoading || !todayRecord || todayRecord.checkOut}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Processing...' : 'Check Out'}
            </button>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-4">Attendance is automatically recorded and cannot be edited</p>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Attendance History</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : attendanceHistory.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No attendance records available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Overtime</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceHistory.map((record) => (
                  <tr key={record._id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {record.checkIn ? formatTime(record.checkIn) : '-'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {record.checkOut ? formatTime(record.checkOut) : '-'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {record.totalHours || '-'}h
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      <span className={record.overtimeHours > 0 ? 'text-green-600 font-medium' : ''}>
                        {record.overtimeHours || 0}h
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800' :
                        record.status === 'Half-day' ? 'bg-yellow-100 text-yellow-800' :
                        record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffAttendance;