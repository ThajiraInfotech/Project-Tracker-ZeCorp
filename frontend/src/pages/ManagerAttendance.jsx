import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  EyeIcon,
  XMarkIcon,
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
import { Doughnut, Bar } from 'react-chartjs-2';
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

const ManagerAttendance = () => {
  // Team Data State
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateChanging, setDateChanging] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Personal Attendance State
  const [myTodayRecord, setMyTodayRecord] = useState(null);
  const [myLoading, setMyLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Staff Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffHistory, setStaffHistory] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const auth = useSelector((state) => state.auth);

  // --- Fetch Data ---

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      // Pass selectedDate to get Daily View allowing backend to merge absent users
      const response = await api.get(`/attendance/team?date=${selectedDate}`);
      if (response.data.success) {
        setTeamAttendance(response.data.attendance);
      }
    } catch (error) {
      console.error('Error fetching team attendance:', error);
      toast.error('Failed to fetch team attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      setMyLoading(true);
      const response = await api.get('/attendance/me');
      if (response.data.success) {
        const records = response.data.attendance;
        const today = new Date().toISOString().split('T')[0];
        const todayRec = records.find(r => r.date === today);
        setMyTodayRecord(todayRec);
      }
    } catch (error) {
      console.error('Error fetching my attendance:', error);
    } finally {
      setMyLoading(false);
    }
  };

  const fetchStaffDetails = async (userId) => {
    setStaffLoading(true);
    try {
      const response = await api.get(`/attendance/team?userId=${userId}`);
      if (response.data.success) {
        setStaffHistory(response.data.attendance);
      }
    } catch (error) {
      toast.error('Failed to load staff history');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.role === 'manager') {
      fetchTeamAttendance();
      fetchMyAttendance();
    }
  }, [auth.isAuthenticated, auth.user, selectedDate]);

  // --- Actions ---

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/attendance/check-in');
      if (response.data.success) {
        toast.success('Checked in successfully');
        fetchMyAttendance();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/attendance/check-out');
      if (response.data.success) {
        toast.success('Checked out successfully');
        fetchMyAttendance();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openStaffModal = (staffRecord) => {
    setSelectedStaff(staffRecord.userId);
    setShowDetailModal(true);
    fetchStaffDetails(staffRecord.userId._id);
  };

  // --- Helpers ---

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // --- Filtering ---

  const filteredRecords = teamAttendance
    .filter(record => record.date === selectedDate)
    .filter(record => {
      if (!searchQuery.trim()) return true;
      const staffName = record.userId?.fullName || record.userId?.username || '';
      return staffName.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Calculate totals
  const totalRecords = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.status === 'Present').length;
  const halfDayCount = filteredRecords.filter(r => r.status === 'Half-day').length;
  const absentCount = filteredRecords.filter(r => r.status === 'Absent').length;
  const totalOvertime = filteredRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
  const totalPayroll = filteredRecords.reduce((sum, r) => sum + (r.dailyTotalPay || 0), 0);

  // Export
  const handleExport = () => {
    const csvContent = [
      ['Staff Name', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Regular Hours', 'Overtime Hours', 'Regular Pay', 'Overtime Pay', 'Total Pay', 'Status'],
      ...filteredRecords.map(record => [
        record.userId?.fullName || record.userId?.username || 'Unknown',
        formatDate(record.date),
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        record.totalHours || '-',
        record.regularHours || '-',
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
    a.download = `team-attendance-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Manager Dashboard
              </h1>
              <p className="text-white/80 mt-1">Manage personal attendance and monitor team performance</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 font-medium shadow-sm transition-all"
              >
                <span className="text-sm font-mono">⌨️</span>
              </button>
              <button
                onClick={fetchTeamAttendance}
                disabled={loading || dateChanging}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-xl hover:bg-white/90 font-medium shadow-sm transition-all"
                title="Refresh Data"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 1. MY ATTENDANCE SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100 relative">
            <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-[#700606]/5 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#700606]/10 flex items-center justify-center text-[#700606]">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">My Attendance</h2>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium uppercase mb-1">Current Status</p>
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${!myTodayRecord ? 'bg-gray-400' : myTodayRecord.checkOut ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-2xl font-bold text-gray-900">
                      {!myTodayRecord ? 'Not Checked In' : myTodayRecord.checkOut ? 'Shift Completed' : 'Working'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  {!myTodayRecord?.checkIn ? (
                    <button onClick={handleCheckIn} disabled={myLoading || actionLoading} className="px-6 py-3 bg-[#700606] text-white rounded-xl font-bold hover:bg-[#8B0000] shadow-lg shadow-[#700606]/20 transition-all">
                      Check In
                    </button>
                  ) : !myTodayRecord?.checkOut ? (
                    <button onClick={handleCheckOut} disabled={myLoading || actionLoading} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 shadow-lg shadow-gray-900/20 transition-all">
                      Check Out
                    </button>
                  ) : (
                    <div className="px-6 py-3 bg-green-50 text-green-700 rounded-xl font-bold border border-green-200 flex items-center gap-2">
                      <CheckCircleSolid className="w-5 h-5" /> Done
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#700606] to-[#500404] rounded-3xl p-6 text-white shadow-xl shadow-[#700606]/20 flex flex-col justify-center">
            <h3 className="text-lg font-semibold mb-2 opacity-90">My Today's Pay</h3>
            <p className="text-4xl font-bold tracking-tight mb-4">AED {myTodayRecord?.dailyTotalPay || 0}</p>
            <div className="flex gap-4 text-sm text-white/70">
              <div>
                <span className="block text-xs uppercase">Regular</span>
                <span className="font-semibold text-white">AED {myTodayRecord?.dailyRegularPay || 0}</span>
              </div>
              <div>
                <span className="block text-xs uppercase">OT</span>
                <span className="font-semibold text-green-300">+AED {myTodayRecord?.dailyOvertimePay || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. TEAM MONITORING SECTION */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="w-7 h-7 text-[#700606]" />
            Team Monitoring
          </h2>

          <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Team</p>
            <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
            <p className="text-xs text-green-600 uppercase font-semibold">Present</p>
            <p className="text-2xl font-bold text-green-900">{presentCount}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
            <p className="text-xs text-red-600 uppercase font-semibold">Absent</p>
            <p className="text-2xl font-bold text-red-900">{absentCount}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
            <p className="text-xs text-purple-600 uppercase font-semibold">Total OT</p>
            <p className="text-2xl font-bold text-purple-900">{totalOvertime}h</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm col-span-2 md:col-span-1">
            <p className="text-xs text-indigo-600 uppercase font-semibold">Daily Payroll</p>
            <p className="text-2xl font-bold text-indigo-900">AED {totalPayroll.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent outline-none transition-all"
              />
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
              <ArrowDownTrayIcon className="w-5 h-5" /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check In/Out</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pay</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record, index) => (
                  <motion.tr
                    key={record._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs">
                          {record.userId?.fullName?.charAt(0) || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{record.userId?.fullName || record.userId?.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-mono text-gray-900">{formatTime(record.checkIn)}</span>
                        <span className="text-gray-400 mx-1">-</span>
                        <span className="font-mono text-gray-900">{formatTime(record.checkOut)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${record.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' :
                        record.status === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.totalHours || 0}h
                      {record.overtimeHours > 0 && <span className="ml-1 text-xs text-purple-600 font-medium">(+{record.overtimeHours} OT)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      AED {record.dailyTotalPay || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openStaffModal(record)}
                        className="text-gray-400 hover:text-[#700606] transition-colors p-2 hover:bg-gray-100 rounded-lg"
                        title="View Details"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filteredRecords.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No attendance records found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STAFF DETAIL MODAL */}
        <AnimatePresence>
          {showDetailModal && selectedStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#700606] text-white flex items-center justify-center text-xl font-bold">
                      {selectedStaff.fullName?.charAt(0) || selectedStaff.username.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedStaff.fullName || selectedStaff.username}</h3>
                      <p className="text-sm text-gray-500">{selectedStaff.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                  {staffLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#700606] border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Total Pay (Month)</p>
                          <p className="text-2xl font-bold text-gray-900">
                            AED {staffHistory
                              .filter(r => new Date(r.date).getMonth() === new Date().getMonth())
                              .reduce((sum, r) => sum + (r.dailyTotalPay || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Total Overtime</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {staffHistory
                              .filter(r => new Date(r.date).getMonth() === new Date().getMonth())
                              .reduce((sum, r) => sum + (r.overtimeHours || 0), 0)} hrs
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Days Present</p>
                          <p className="text-2xl font-bold text-green-600">
                            {staffHistory.filter(r => r.status === 'Present').length}
                          </p>
                        </div>
                      </div>

                      {/* History Table */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Pay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {staffHistory.map((record) => (
                              <tr key={record._id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm font-medium text-gray-900">{formatDate(record.date)}</td>
                                <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                                  {record.checkIn ? formatTime(record.checkIn) : '-'} - {record.checkOut ? formatTime(record.checkOut) : '-'}
                                </td>
                                <td className="px-6 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800`}>
                                    {record.status}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">AED {record.dailyTotalPay || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default ManagerAttendance;