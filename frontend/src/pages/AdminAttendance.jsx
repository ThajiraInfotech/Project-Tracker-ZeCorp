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
import { formatTimeDubai, formatDateDubai, getDubaiToday } from '../utils/dateUtils';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const getCurrentMonth = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${yyyy}-${mm}`;
};

const AdminAttendance = () => {
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateChanging, setDateChanging] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getDubaiToday());

  // Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffHistory, setStaffHistory] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [historySelectedMonth, setHistorySelectedMonth] = useState(getCurrentMonth());

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const auth = useSelector((state) => state.auth);

  // --- Data Fetching ---

  const fetchAllAttendance = async () => {
    try {
      setLoading(true);
      // Pass selectedDate to get Daily View allowing backend to merge absent users
      const response = await api.get(`/attendance/all?date=${selectedDate}`);
      if (response.data.success) {
        setAllAttendance(response.data.attendance);
      }
    } catch (error) {
      console.error('Error fetching all attendance:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDetails = async (userId) => {
    setStaffLoading(true);
    try {
      // Use the updated endpoint that supports userId for history
      const response = await api.get(`/attendance/all?userId=${userId}`);
      if (response.data.success) {
        setStaffHistory(response.data.attendance);
      }
    } catch (error) {
      toast.error('Failed to load user history');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.role === 'admin') {
      fetchAllAttendance();
    }
  }, [auth.isAuthenticated, auth.user, selectedDate]);

  // --- Actions ---

  const openStaffModal = (record) => {
    if (!record.userId) return;
    setSelectedStaff(record.userId);
    setShowDetailModal(true);
    // Reset to current month on open
    setHistorySelectedMonth(getCurrentMonth());
    fetchStaffDetails(record.userId._id);
  };

  // --- Helpers ---

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return formatTimeDubai(dateString);
  };

  const formatDate = (dateString) => {
    return formatDateDubai(dateString);
  };

  // -- Filtering ---

  const filteredRecords = allAttendance
    .filter(record => record.date === selectedDate)
    .filter(record => {
      if (!searchQuery.trim()) return true;
      const staffName = record.userId?.fullName || record.userId?.username || '';
      return staffName.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // --- Filtering (Modal History) ---
  const staffFilteredHistory = staffHistory.filter(record => {
    if (!record.date) return false;
    return record.date.startsWith(historySelectedMonth);
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
        record.totalHours ? `${record.totalHours}h` : '-',
        record.regularHours ? `${record.regularHours}h` : '-',
        record.overtimeHours ? `${record.overtimeHours}h` : '0h',
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
    a.download = `attendance-${selectedDate}.csv`;
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
                Attendance Monitoring
              </h1>
              <p className="text-white/80 mt-1">Admin Dashboard for organization-wide attendance</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setDateChanging(true); setTimeout(() => setDateChanging(false), 500); }}
                  className="border-none bg-transparent focus:ring-0 text-sm font-medium text-white placeholder-white/50 [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <button
                onClick={fetchAllAttendance}
                disabled={loading || dateChanging}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-xl hover:bg-white/90 font-medium shadow-sm transition-all"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Records</p>
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

        {/* Search & Export */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#700606] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">

              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                <ArrowDownTrayIcon className="w-5 h-5" /> Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
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
                        title="View History"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filteredRecords.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No records found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAILS MODAL */}
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
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-xl bg-[#700606] text-white flex items-center justify-center text-xl font-bold shrink-0">
                      {selectedStaff.fullName?.charAt(0) || selectedStaff.username.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 break-all">{selectedStaff.fullName || selectedStaff.username}</h3>
                      <p className="text-sm text-gray-500 break-all">{selectedStaff.email} • {selectedStaff.role}</p>
                    </div>
                  </div>

                  {/* Modal Close & Month Filter */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 flex-1 sm:flex-none">
                      <input
                        type="month"
                        value={historySelectedMonth}
                        onChange={(e) => setHistorySelectedMonth(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer w-full"
                      />
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0"
                    >
                      <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                  {staffLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#700606] border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Stats Cards - Updated with Filter Logic */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-[#700606] to-[#500404] p-4 rounded-xl text-white shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                          <p className="text-xs text-white/70 uppercase relative z-10">Total Pay ({historySelectedMonth})</p>
                          <p className="text-2xl font-bold text-white relative z-10">
                            AED {staffFilteredHistory
                              .reduce((sum, r) => sum + (r.dailyTotalPay || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Total Overtime</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {staffFilteredHistory
                              .reduce((sum, r) => sum + (r.overtimeHours || 0), 0)} hrs
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Days Present</p>
                          <p className="text-2xl font-bold text-green-600">
                            {staffFilteredHistory.filter(r => r.status === 'Present').length}
                          </p>
                        </div>
                      </div>

                      {/* History Table */}
                      {/* Desktop Table View */}
                      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                            {staffFilteredHistory.map((record) => (
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
                            {staffFilteredHistory.length === 0 && (
                              <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No records found for {historySelectedMonth}.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-4">
                        {staffFilteredHistory.map((record) => (
                          <div key={record._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-gray-900">{formatDate(record.date)}</h4>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 bg-gray-100 text-gray-800`}>
                                  {record.status}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-bold">Total Pay</p>
                                <p className="text-lg font-bold text-[#700606]">AED {record.dailyTotalPay || 0}</p>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                <span className="font-mono text-gray-700">{record.checkIn ? formatTime(record.checkIn) : '--:--'}</span>
                              </div>
                              <span className="text-gray-300">→</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-gray-700">{record.checkOut ? formatTime(record.checkOut) : '--:--'}</span>
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {staffFilteredHistory.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 text-gray-500">
                            No records found for {historySelectedMonth}.
                          </div>
                        )}
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

export default AdminAttendance;