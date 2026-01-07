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

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Date', 'Check In', 'Check Out', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Status'],
      ...attendanceHistory.map(record => [
        formatDate(record.date),
        record.checkIn ? formatTime(record.checkIn) : '-',
        record.checkOut ? formatTime(record.checkOut) : '-',
        record.totalHours || '-',
        record.regularHours || '-',
        record.overtimeHours || 0,
        record.status
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-attendance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter for check-in/out
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!todayRecord) {
          handleCheckIn();
        } else if (!todayRecord.checkOut) {
          handleCheckOut();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [todayRecord]);

  return (
    <div className="container mx-auto px-4 py-6 bg-gradient-to-br from-slate-50 to-[#700606]/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-6 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Attendance</h1>
            <p className="text-green-100 text-sm">Track your daily attendance and work hours</p>
            <p className="text-green-200 text-xs mt-1">Automated check-in/out system</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-lg hover:bg-[#700606]/10 transition-colors font-medium"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export History
            </button>
            <div className="relative">
              <button
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
              >
                <span className="text-sm font-mono">⌨️</span>
                <span className="hidden sm:inline ml-2">Help</span>
              </button>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: showKeyboardHelp ? 1 : 0, scale: showKeyboardHelp ? 1 : 0.95 }}
                className={`absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 ${showKeyboardHelp ? 'block' : 'hidden'}`}
              >
                <h4 className="font-semibold text-gray-900 mb-3">Keyboard Shortcuts</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in/out</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ClockIcon className="w-6 h-6 text-green-600" />
            Today's Status
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${!todayRecord ? 'bg-gray-400' : todayRecord.checkOut ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-gray-600">
              {!todayRecord ? 'Not Checked In' : todayRecord.checkOut ? 'Completed' : 'Active'}
            </span>
          </div>
        </div>

        {todayRecord ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <CheckCircleSolid className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">Check In</p>
              <p className="text-xl font-bold text-green-900">{formatTime(todayRecord.checkIn)}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-center p-4 rounded-lg border ${
                todayRecord.checkOut
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {todayRecord.checkOut ? (
                <CheckCircleSolid className="w-8 h-8 text-red-600 mx-auto mb-2" />
              ) : (
                <ClockIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              )}
              <p className="text-sm text-gray-600 font-medium">Check Out</p>
              <p className={`text-xl font-bold ${todayRecord.checkOut ? 'text-red-900' : 'text-gray-500'}`}>
                {todayRecord.checkOut ? formatTime(todayRecord.checkOut) : 'Not checked out'}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <UserIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">Status</p>
              <p className="text-lg font-bold text-blue-900">{getStatusText()}</p>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
          >
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">Not Checked In Today</p>
            <p className="text-sm text-gray-500">Use the check-in button below to start your workday</p>
          </motion.div>
        )}

        {/* Today's Hours & OT */}
        {todayRecord && todayRecord.checkOut && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
          >
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">Total Hours</p>
              <p className="text-2xl font-bold text-blue-900">{todayRecord.totalHours}h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">Regular Hours</p>
              <p className="text-2xl font-bold text-purple-900">{todayRecord.regularHours}h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">Overtime Hours</p>
              <p className={`text-2xl font-bold ${todayRecord.overtimeHours > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {todayRecord.overtimeHours}h
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {todayRecord && todayRecord.checkOut ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <CheckCircleSolid className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Attendance completed for today</p>
              <p className="text-sm text-green-600 mt-1">Great work! 🎉</p>
            </motion.div>
          ) : (
            <>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleCheckIn}
                disabled={actionLoading || todayRecord}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <CheckCircleIcon className="w-5 h-5" />
                )}
                {actionLoading ? 'Processing...' : 'Check In'}
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={handleCheckOut}
                disabled={actionLoading || !todayRecord || todayRecord.checkOut}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5" />
                )}
                {actionLoading ? 'Processing...' : 'Check Out'}
              </motion.button>
            </>
          )}
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 text-center">
            <span className="font-medium">💡 Tip:</span> Attendance is automatically recorded and cannot be edited.
            Use <kbd className="px-1 py-0.5 bg-white rounded text-xs">Ctrl+Enter</kbd> for quick check-in/out.
          </p>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-green-600" />
            Attendance History
          </h2>
          <p className="text-sm text-gray-600 mt-1">Your complete attendance record</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : attendanceHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-500">Your attendance history will appear here once you start checking in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overtime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceHistory.map((record, index) => (
                  <motion.tr
                    key={record._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {record.checkIn ? formatTime(record.checkIn) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {record.checkOut ? formatTime(record.checkOut) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.totalHours ? `${record.totalHours}h` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${record.overtimeHours > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {record.overtimeHours ? `${record.overtimeHours}h` : '0h'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-green-100 text-green-700 border border-green-200' :
                        record.status === 'Half-day' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        record.status === 'Absent' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {record.status === 'Present' ? <CheckCircleIcon className="w-3 h-3" /> :
                         record.status === 'Half-day' ? <ClockIcon className="w-3 h-3" /> :
                         record.status === 'Absent' ? <ExclamationTriangleIcon className="w-3 h-3" /> :
                         <ClockIcon className="w-3 h-3" />}
                        {record.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Overtime Summary Chart */}
        {!loading && attendanceHistory.length > 0 && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overtime Summary</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: ['This Month'],
                  datasets: [{
                    label: 'Total Overtime Hours',
                    data: [attendanceHistory.reduce((sum, r) => sum + (r.overtimeHours || 0), 0)],
                    backgroundColor: ['#10b981'],
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            All attendance records are system-generated and cannot be modified.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;