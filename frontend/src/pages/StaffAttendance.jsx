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
  UserIcon,
  CurrencyDollarIcon,
  BanknotesIcon
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

        // Find active session
        const activeSession = records
          .filter(r => !r.checkOut)
          .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))[0];

        // Find today's record
        const today = new Date().toISOString().split('T')[0];
        const todayRec = records.find(r => r.date === today);

        // Prioritize active session
        setTodayRecord(activeSession || todayRec);
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
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusText = () => {
    if (!todayRecord) return "Not Checked In";
    if (!todayRecord.checkOut) return `Checked In at ${formatTime(todayRecord.checkIn)}`;
    return "Shift Completed";
  };

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Date', 'Check In', 'Check Out', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Regular Pay', 'Overtime Pay', 'Total Pay', 'Status'],
      ...attendanceHistory.map(record => [
        formatDate(record.date),
        record.checkIn ? formatTime(record.checkIn) : '-',
        record.checkOut ? formatTime(record.checkOut) : '-',
        record.totalHours || '-',
        record.regularHours || '-',
        record.overtimeHours || 0,
        record.dailyRegularPay ? `AED ${record.dailyRegularPay}` : 'AED 0',
        record.dailyOvertimePay ? `AED ${record.dailyOvertimePay}` : 'AED 0',
        record.dailyTotalPay ? `AED ${record.dailyTotalPay}` : 'AED 0',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                My Attendance
              </h1>
              <p className="text-white/80 mt-1 flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all shadow-sm font-medium"
                >
                  <span className="text-sm font-mono">⌨️</span>
                  <span className="hidden sm:inline">Help</span>
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

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#700606] rounded-xl hover:bg-white/90 transition-all shadow-sm font-medium"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action & Status Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Action Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 relative">
            <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-[#700606]/5 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#700606]/10 flex items-center justify-center text-[#700606]">
                  <ClockIcon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Time Clock</h2>
                  <p className="text-gray-500 text-sm">Manage your daily attendance</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center py-8">
                {/* Timer Display */}
                <div className="text-center sm:text-left mr-0 sm:mr-8 mb-6 sm:mb-0">
                  <p className="text-sm text-gray-500 font-medium tracking-wide uppercase mb-1">Current Time</p>
                  <p className="text-5xl font-extrabold text-[#700606] font-mono tracking-tight">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="text-xl text-gray-400 font-normal ml-1">
                      {new Date().toLocaleTimeString([], { second: '2-digit' })}
                    </span>
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4">
                  {!todayRecord?.checkIn ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={loading || actionLoading}
                      className="group relative px-8 py-4 bg-[#700606] text-white rounded-2xl font-bold shadow-lg shadow-[#700606]/30 hover:shadow-xl hover:shadow-[#700606]/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 origin-left" />
                      <span className="relative flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6" />
                        Check In Now
                      </span>
                    </button>
                  ) : !todayRecord?.checkOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={loading || actionLoading}
                      className="group relative px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-900/30 hover:shadow-xl hover:shadow-gray-900/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 origin-left" />
                      <span className="relative flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-6 h-6 rotate-180" />
                        Check Out
                      </span>
                    </button>
                  ) : (
                    <div className="px-8 py-4 bg-green-50 text-green-700 rounded-2xl font-bold border border-green-200 flex items-center gap-2">
                      <CheckCircleSolid className="w-6 h-6" />
                      Shift Completed
                    </div>
                  )}
                </div>
              </div>

              {/* Today's Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Status</p>
                  <p className={`text-lg font-bold mt-1 ${todayRecord?.status === 'Present' ? 'text-green-600' :
                    todayRecord?.status === 'Half-day' ? 'text-yellow-600' :
                      todayRecord?.status === 'Absent' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                    {todayRecord?.status || 'Pending'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Total Hours</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{todayRecord?.totalHours || '0'}h</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Overtime</p>
                  <p className={`text-lg font-bold mt-1 ${todayRecord?.overtimeHours > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {todayRecord?.overtimeHours || '0'}h
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-600 font-semibold uppercase">Today's Pay</p>
                  <p className="text-lg font-bold text-indigo-900 mt-1">AED {todayRecord?.dailyTotalPay || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Quick Stats (Side Panel) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-[#700606] to-[#500404] rounded-3xl p-6 text-white shadow-xl shadow-[#700606]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-black/20 rounded-full blur-2xl" />

              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 opacity-90">
                <BanknotesIcon className="w-5 h-5" /> Earnings Forecast
              </h3>

              <div className="space-y-6 relative z-10">
                <div>
                  <p className="text-white/60 text-sm mb-1">This Month</p>
                  <p className="text-4xl font-bold tracking-tight">
                    AED {attendanceHistory
                      .filter(r => {
                        const today = new Date();
                        const recordDate = new Date(r.date);
                        return recordDate.getMonth() === today.getMonth() &&
                          recordDate.getFullYear() === today.getFullYear();
                      })
                      .reduce((sum, r) => sum + (r.dailyTotalPay || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Overtime Pay</p>
                    <p className="text-lg font-semibold text-green-300">
                      +AED {attendanceHistory
                        .filter(r => {
                          const today = new Date();
                          const recordDate = new Date(r.date);
                          return recordDate.getMonth() === today.getMonth() &&
                            recordDate.getFullYear() === today.getFullYear();
                        })
                        .reduce((sum, r) => sum + (r.dailyOvertimePay || 0), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-1">OT Hours</p>
                    <p className="text-lg font-semibold text-yellow-300">
                      {attendanceHistory
                        .filter(r => {
                          const today = new Date();
                          const recordDate = new Date(r.date);
                          return recordDate.getMonth() === today.getMonth() &&
                            recordDate.getFullYear() === today.getFullYear();
                        })
                        .reduce((sum, r) => sum + (r.overtimeHours || 0), 0)}h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircleSolid className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Present</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {attendanceHistory.filter(r => r.status === 'Present').length} Days
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Absent</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {attendanceHistory.filter(r => r.status === 'Absent').length} Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-gray-900">Attendance History</h3>

            {/* Filter Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-gray-900 transition-all">All History</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Daily Pay</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {attendanceHistory.map((record, index) => (
                  <motion.tr
                    key={record._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-[#700606]/10 group-hover:text-[#700606] transition-colors">
                          <CalendarDaysIcon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDate(record.date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{record.checkIn ? formatTime(record.checkIn) : '-'}</p>
                        <p className="text-xs text-gray-500">{record.checkOut ? formatTime(record.checkOut) : 'Active'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {record.totalHours || 0} hrs
                      </span>
                      {record.overtimeHours > 0 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          +{record.overtimeHours} OT
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${record.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' :
                        record.status === 'Half-day' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          record.status === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">AED {record.dailyTotalPay || 0}</span>
                        {record.dailyOvertimePay > 0 && (
                          <span className="text-xs text-green-600">+AED {record.dailyOvertimePay} OT</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Summary Chart Section */}
        {!loading && attendanceHistory.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Overtime Trend</h3>
              <div className="h-64">
                <Bar
                  data={{
                    labels: ['This Month'],
                    datasets: [{
                      label: 'Total Overtime Hours',
                      data: [attendanceHistory.reduce((sum, r) => sum + (r.overtimeHours || 0), 0)],
                      backgroundColor: ['#700606'],
                      borderRadius: 4,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                  }}
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <h3 className="text-xl font-bold mb-4 relative z-10">Attendance Guidelines</h3>
              <ul className="space-y-4 text-gray-300 relative z-10">
                <li className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-400 shrink-0" />
                  <span>Ensure you check-in immediately upon arrival to accurately track your hours.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ClockIcon className="w-6 h-6 text-yellow-400 shrink-0" />
                  <span>Overtime is calculated automatically for any work beyond 10 hours/day.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-400 shrink-0" />
                  <span>Missed check-outs may result in system flagging. Contact manager for manual correction.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Zeecorp Attendance System • Enterprise Edition
          </p>
        </div>

      </div>
    </div>
  );
};

export default StaffAttendance;