import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
} from '@heroicons/react/24/solid';
import api from '../store/api';
import { socket } from '../App';
import { toast } from 'react-toastify';
import { formatTimeDubai, formatDateDubai, getDubaiToday } from '../utils/dateUtils';
import TechnicianSiteAttendance from '../components/TechnicianSiteAttendance';

const StaffAttendance = () => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [todayStatus, setTodayStatus] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('office'); // 'office' or 'site'
  const [expandedRow, setExpandedRow] = useState(null); // date of expanded row

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

        // Find today's overall status
        const today = getDubaiToday();
        const hasTodayRecord = records.some(r => r.date === today);

        // We only care about "todayRecord" if it's ACTIVE.
        // If it's completed, we want to allow a new Check In.
        setTodayRecord(activeSession || null);
        setTodayStatus(hasTodayRecord ? 'Present' : 'Absent');
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

  // Real-time updates via socket
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const handleUpdate = () => {
      fetchAttendance();
    };
    socket.on('attendance_updated', handleUpdate);
    return () => {
      socket.off('attendance_updated', handleUpdate);
    };
  }, [auth.isAuthenticated]);


  const formatTime = (dateString) => formatTimeDubai(dateString);
  const formatDate = (dateString) => formatDateDubai(dateString);

  // Filter History by Selected Month
  // Calculate stats for the selected month
  const filteredHistory = attendanceHistory.filter(record => {
    if (!record.date) return false;
    // record.date is YYYY-MM-DD
    return record.date.startsWith(selectedMonth);
  });

  // Group history by date for split shifts
  const groupedHistory = Object.values(filteredHistory.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = {
        id: record.date,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
        totalHours: record.totalHours || 0,
        shifts: [record],
        shiftCount: 1
      };
    } else {
      acc[record.date].shifts.push(record);
      acc[record.date].shiftCount += 1;
      acc[record.date].totalHours += (record.totalHours || 0);
      
      // Update first checkIn and last checkOut
      if (new Date(record.checkIn) < new Date(acc[record.date].checkIn)) {
          acc[record.date].checkIn = record.checkIn;
      }
      if (!acc[record.date].checkOut || (record.checkOut && new Date(record.checkOut) > new Date(acc[record.date].checkOut))) {
          acc[record.date].checkOut = record.checkOut;
      }
    }
    return acc;
  }, {})).sort((a, b) => new Date(b.date) - new Date(a.date));

  const isTechnician = auth.user?.role === 'technician';

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

        {/* Tabs for Technician */}
        {isTechnician && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('office')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'office'
                ? 'bg-[#700606] text-white shadow-lg shadow-[#700606]/30'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <BriefcaseIcon className="w-5 h-5" />
              Office Attendance
            </button>
            <button
              onClick={() => setActiveTab('site')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'site'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              <MapPinIcon className="w-5 h-5" />
              Site Attendance
            </button>
          </div>
        )}

        {activeTab === 'office' ? (
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
                    {!todayRecord ? (
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
                    ) : (
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
                    )}
                  </div>
                </div>

                {/* Today's Status Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 relative z-10 max-w-lg mx-auto">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Status</p>
                    <p className={`text-lg font-bold mt-1 ${todayStatus === 'Present' ? 'text-green-600' :
                        todayStatus === 'Absent' ? 'text-red-600' : 'text-gray-400'
                      }`}>
                      {todayStatus}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Shift</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {todayStatus === 'Present' ? 'Started' : 'Not Started'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Monthly Earnings & History Section */}
              <div className="grid grid-cols-1 gap-8">

                {/* History Table Container - Full width */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
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
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {groupedHistory.length > 0 ? (
                          groupedHistory.map((record, index) => {
                            const isExpanded = expandedRow === record.date;
                            const hasMultipleShifts = record.shiftCount > 1;

                            return (
                              <React.Fragment key={record.id}>
                                <motion.tr
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  onClick={() => hasMultipleShifts && setExpandedRow(isExpanded ? null : record.date)}
                                  className={`transition-colors group ${hasMultipleShifts ? 'cursor-pointer hover:bg-gray-100' : 'hover:bg-gray-50'}`}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-[#700606]/10 group-hover:text-[#700606] transition-colors">
                                        <CalendarDaysIcon className="w-5 h-5" />
                                      </div>
                                      <div>
                                          <span className="text-sm font-semibold text-gray-900">
                                            {formatDate(record.date)}
                                          </span>
                                          {hasMultipleShifts && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full">
                                              {record.shiftCount} Shifts
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm">
                                      <p className="font-medium text-gray-900">
                                          {record.checkIn ? formatTime(record.checkIn) : '-'} – {record.checkOut ? formatTime(record.checkOut) : 'Active'}
                                          {hasMultipleShifts && (
                                              <span className="ml-2 text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                          )}
                                      </p>
                                      {record.totalHours > 0 && <p className="text-xs text-gray-500">{record.totalHours.toFixed(2)} hrs total</p>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${record.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' :
                                        record.status === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                                      }`}>
                                      {record.status}
                                    </span>
                                  </td>
                                </motion.tr>

                                {/* Expandable Sub-rows */}
                                {isExpanded && record.shifts.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn)).map((shift, si) => (
                                    <tr key={shift._id} className="bg-gray-50/50 border-l-2 border-gray-300">
                                        <td className="pl-16 py-3 text-xs text-gray-500 font-semibold">Shift {si + 1}</td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm text-gray-600 font-mono">
                                                {formatTime(shift.checkIn)} – {shift.checkOut ? formatTime(shift.checkOut) : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-xs text-gray-500">{shift.totalHours || 0} hrs</span>
                                        </td>
                                    </tr>
                                ))}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-6 py-12 text-center text-gray-400">
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
        ) : (
          <TechnicianSiteAttendance />
        )}

      </div>
    </div>
  );
};

export default StaffAttendance;