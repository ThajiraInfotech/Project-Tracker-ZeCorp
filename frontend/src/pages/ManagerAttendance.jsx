import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  UserIcon,
  BriefcaseIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleSolid,
} from '@heroicons/react/24/solid';
import api from '../store/api';
import { toast } from 'react-toastify';
import { formatTimeDubai, formatDateDubai, getDubaiToday } from '../utils/dateUtils';
import AdminSiteAttendance from '../components/AdminSiteAttendance';

const getCurrentMonth = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${yyyy}-${mm}`;
};

const ManagerAttendance = () => {
  // Personal Attendance State
  const [myAttendanceHistory, setMyAttendanceHistory] = useState([]);
  const [myTodayRecord, setMyTodayRecord] = useState(null);
  const [myLoading, setMyLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'site' ? 'site' : 'office';
  const [activeTab, setActiveTab] = useState(initialTab); // 'office' or 'site'

  // Update tab if URL changes while component is mounted
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'site' || tabParam === 'office') {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Personal History Filter
  const [mySelectedMonth, setMySelectedMonth] = useState(getCurrentMonth());

  const auth = useSelector((state) => state.auth);

  // --- Clock Logic ---
  useEffect(() => {
    // Update time immediately
    const updateTime = () => {
      const timeString = new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Dubai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setCurrentTime(timeString);
    };
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyAttendance = async () => {
    try {
      setMyLoading(true);
      const response = await api.get('/attendance/me');
      if (response.data.success) {
        const records = response.data.attendance;
        setMyAttendanceHistory(records);

        // Find active sessionLogic
        const activeSession = records
          .filter(r => !r.checkOut)
          .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))[0];

        // Find today's record
        const today = getDubaiToday();
        const todayRec = records.find(r => r.date === today);

        setMyTodayRecord(activeSession || todayRec);
      }
    } catch (error) {
      console.error('Error fetching my attendance:', error);
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.role === 'manager') {
      fetchMyAttendance();
    }
  }, [auth.isAuthenticated, auth.user]);

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

  // --- Helpers ---

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return formatTimeDubai(dateString);
  };

  const formatDate = (dateString) => {
    return formatDateDubai(dateString);
  };

  // --- Filtering (Personal History) ---
  const myFilteredHistory = myAttendanceHistory.filter(record => {
    if (!record.date) return false;
    return record.date.startsWith(mySelectedMonth);
  });

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl p-6 mb-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Attendance Management
              </h1>
              <p className="text-white/80 mt-1">Manage personal attendance and monitor team performance</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { fetchMyAttendance(); }}
                disabled={myLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#700606] rounded-xl hover:bg-white/90 font-medium shadow-sm transition-all"
                title="Refresh Data"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
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

        {activeTab === 'office' ? (
          <>
            {/* =========================================================================
                1. MY ATTENDANCE SECTION
               ========================================================================= */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 relative overflow-hidden group mb-12">
              <div className="absolute top-0 right-0 p-32 bg-[#700606]/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 ease-out" />

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[#700606]/10 flex items-center justify-center text-[#700606]">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">My Attendance</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between relative z-10">
                {/* Timer Display */}
                <div className="text-center sm:text-left mr-0 sm:mr-8 mb-6 sm:mb-0">
                  <p className="text-sm text-gray-500 font-medium tracking-wide uppercase mb-1">Dubai Time</p>
                  <p className="text-5xl font-extrabold text-[#700606] font-mono tracking-tight">
                    {currentTime || '--:--'}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4">
                  {!myTodayRecord?.checkIn ? (
                    <button
                      onClick={handleCheckIn}
                      disabled={myLoading || actionLoading}
                      className="group relative px-8 py-4 bg-[#700606] text-white rounded-2xl font-bold shadow-lg shadow-[#700606]/30 hover:shadow-xl hover:shadow-[#700606]/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 origin-left" />
                      <span className="relative flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6" />
                        Check In Now
                      </span>
                    </button>
                  ) : !myTodayRecord?.checkOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={myLoading || actionLoading}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 relative z-10 max-w-lg mx-auto">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Status</p>
                  <p className={`text-lg font-bold mt-1 ${myTodayRecord?.status === 'Present' ? 'text-green-600' :
                    myTodayRecord?.status === 'Half-day' ? 'text-yellow-600' :
                      myTodayRecord?.status === 'Absent' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                    {myTodayRecord?.status || 'Pending'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Shift</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {myTodayRecord?.checkIn ? 'Started' : 'Not Started'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. MY ATTENDANCE HISTORY (Collapsible/Separate Table) */}
            <div className="mb-12">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-900">My Attendance History</h3>
                  </div>

                  {/* Month Filter */}
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 min-w-[180px]">
                    <input
                      type="month"
                      value={mySelectedMonth}
                      onChange={(e) => setMySelectedMonth(e.target.value)}
                      className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer w-full"
                    />
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myFilteredHistory.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">{formatDate(record.date)}</td>
                          <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                            {record.checkIn ? formatTime(record.checkIn) : '-'} - {record.checkOut ? formatTime(record.checkOut) : '-'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${record.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {myFilteredHistory.length === 0 && (
                        <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No records found for {mySelectedMonth}.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <AdminSiteAttendance />
        )}

      </div>
    </div>
  );
};

export default ManagerAttendance;