import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    PlayCircleIcon,
    StopCircleIcon,
    ClockIcon,
    MapPinIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import siteAttendanceService from '../services/siteAttendanceService';
import ServiceReportForm from './ServiceReportForm';

const TechnicianSiteAttendance = () => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [todayRecord, setTodayRecord] = useState(null);
    const [timer, setTimer] = useState(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // Report Form Modal State
    const [showReportForm, setShowReportForm] = useState(false);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await siteAttendanceService.getMyHistory();
            if (data.success) {
                setHistory(data.attendance);

                // Find active session (checked in but not checked out)
                const active = data.attendance.find(r => !r.checkOut);

                // We only care about "todayRecord" if it's ACTIVE. 
                // If it's completed, we want to allow a new check-in.
                setTodayRecord(active || null);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to load attendance history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // Timer Logic
    useEffect(() => {
        if (todayRecord && !todayRecord.checkOut && todayRecord.checkIn) {
            const interval = setInterval(() => {
                const start = new Date(todayRecord.checkIn);
                const now = new Date();
                const diff = now - start;

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                );
            }, 1000);
            setTimer(interval);
            return () => clearInterval(interval);
        } else {
            setElapsedTime('00:00:00');
        }
    }, [todayRecord]);

    const handleCheckIn = async () => {
        try {
            setLoading(true);
            const res = await siteAttendanceService.checkIn();
            if (res.success) {
                toast.success('checked in for site work');
                fetchHistory();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Check in failed');
        } finally {
            setLoading(false);
        }
    };

    // Replaced handleCheckOut with opening the form
    const handleEndWork = () => {
        setShowReportForm(true);
    };

    const handleReportSuccess = () => {
        setShowReportForm(false);
        fetchHistory(); // Refresh to show completed status
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-8">
            {/* Status Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 p-8 border border-blue-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 opacity-50" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Site Attendance</h2>
                        <p className="text-gray-500">Track your field work and service reports</p>

                        {todayRecord && !todayRecord.checkOut && (
                            <div className="mt-4 flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg w-fit">
                                <ClockIcon className="w-5 h-5 animate-pulse" />
                                <span className="font-mono font-bold text-xl">{elapsedTime}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        {!todayRecord ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={loading}
                                className="group relative px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 origin-left" />
                                <span className="relative flex items-center gap-2">
                                    <PlayCircleIcon className="w-6 h-6" />
                                    Start Site Work
                                </span>
                            </button>
                        ) : !todayRecord?.checkOut ? (
                            <button
                                onClick={handleEndWork}
                                disabled={loading}
                                className="group relative px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-900/30 hover:shadow-xl hover:shadow-gray-900/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 origin-left" />
                                <span className="relative flex items-center gap-2">
                                    <DocumentTextIcon className="w-6 h-6" />
                                    Complete & Report
                                </span>
                            </button>
                        ) : (
                            // This state (checked in + checked out) should ideally not happen with the new logic as todayRecord becomes null
                            // But if it does, it means we are in a weird state or transitioning.
                            // We'll show the start button again by default if todayRecord is null.
                            null
                        )}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">My Site History</h3>
                    <button onClick={fetchHistory} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check In</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {history.length > 0 ? (
                                history.map((record) => (
                                    <tr key={record._id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                                    <CalendarDaysIcon className="w-5 h-5" />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {formatDate(record.date)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatTime(record.checkIn)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatTime(record.checkOut)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {record.totalHours ? `${record.totalHours}h` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${record.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                record.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        No site attendance records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Service Report Form Modal */}
            {showReportForm && (
                <ServiceReportForm
                    onClose={() => setShowReportForm(false)}
                    onSuccess={handleReportSuccess}
                />
            )}
        </div>
    );
};

export default TechnicianSiteAttendance;
