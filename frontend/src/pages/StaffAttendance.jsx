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

const StaffAttendance = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Date state for filtering
  const getCurrentMonth = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const auth = useSelector((state) => state.auth);

  // Fetch attendance data
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      // Fetches ALL history
      const response = await api.get('/attendance/me');
      if (response.data.success) {
        const records = response.data.attendance;
        setAttendanceHistory(records);

        // Find active session
        const activeSession = records
          .filter(r => !r.checkOut)
          .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))[0];

        // Find today's record
        const today = getDubaiToday();
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


  const formatTime = (dateString) => formatTimeDubai(dateString);
  const formatDate = (dateString) => formatDateDubai(dateString);

  // Filter History by Selected Month
  const filteredHistory = attendanceHistory.filter(record => {
    if (!record.date) return false;
    // record.date is YYYY-MM-DD
    return record.date.startsWith(selectedMonth);
  });

  // Calculate stats for the selected month
  const totalPayMonth = filteredHistory.reduce((sum, r) => sum + (r.dailyTotalPay || 0), 0);
  const totalOtPayMonth = filteredHistory.reduce((sum, r) => sum + (r.dailyOvertimePay || 0), 0);
  const totalOtHoursMonth = filteredHistory.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {auth.user?.fullName?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your attendance overview for today.</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Content Area - Full Width now */}
          <div className="space-y-8">

            {/* CLOCK IN/OUT CARD */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-[#700606]/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 ease-out" />

              <div className="flex flex-col sm:flex-row items-center justify-between relative z-10">
                {/* Timer Display */}
                <div className="text-center sm:text-left mr-0 sm:mr-8 mb-6 sm:mb-0">
                  <p className="text-sm text-gray-500 font-medium tracking-wide uppercase mb-1">Dubai Time</p>
                  <p className="text-5xl font-extrabold text-[#700606] font-mono tracking-tight">
                    {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })}
                    <span className="text-xl text-gray-400 font-normal ml-1">
                      {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', second: '2-digit' })}
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

            {/* Monthly Earnings & History Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Earnings Forecast Card */}
              <div className="bg-gradient-to-br from-[#700606] to-[#500404] rounded-3xl p-8 text-white shadow-xl shadow-[#700606]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-black/20 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 opacity-90">
                    <BanknotesIcon className="w-5 h-5" /> Earnings ({selectedMonth})
                  </h3>

                  <div>
                    <p className="text-white/60 text-sm mb-1">Total Estimated Pay</p>
                    <p className="text-4xl font-bold tracking-tight">
                      AED {totalPayMonth.toFixed(2)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-white/10">
                    <div>
                      <p className="text-white/60 text-xs mb-1">Overtime Pay</p>
                      <p className="text-lg font-semibold text-green-300">
                        +AED {totalOtPayMonth.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs mb-1">OT Hours</p>
                      <p className="text-lg font-semibold text-yellow-300">
                        {totalOtHoursMonth}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* History Table Container - Spans 2 columns */}
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-bold text-gray-900">History</h3>

                  {/* Month Filter */}
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pay</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredHistory.length > 0 ? (
                        filteredHistory.map((record, index) => (
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
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                            No attendance records found for {selectedMonth}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} Zeecorp Attendance System • Enterprise Edition
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffAttendance;