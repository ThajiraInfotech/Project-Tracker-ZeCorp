import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import siteAttendanceService from '../services/siteAttendanceService';
import {
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    MapPinIcon,
    ClockIcon,
    EyeIcon,
    XMarkIcon,
    DocumentTextIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import { formatTimeDubai, formatDateDubai, getDubaiToday } from '../utils/dateUtils';
import { toast } from 'react-toastify';
import ServiceReportDetailModal from './ServiceReportDetailModal';

const AdminSiteAttendance = () => {
    const [allAttendance, setAllAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateChanging, setDateChanging] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getDubaiToday());
    const [selectedReport, setSelectedReport] = useState(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');

    const auth = useSelector((state) => state.auth);

    const fetchAllAttendance = async () => {
        try {
            setLoading(true);
            const data = await siteAttendanceService.getAllAttendance(selectedDate);
            if (data.success) {
                setAllAttendance(data.attendance);
            }
        } catch (error) {
            console.error('Error fetching site attendance:', error);
            toast.error('Failed to fetch site attendance records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (auth.isAuthenticated && auth.user?.role === 'admin') {
            fetchAllAttendance();
        }
    }, [auth.isAuthenticated, auth.user, selectedDate]);

    // Helpers
    const formatTime = (dateString) => {
        if (!dateString) return '-';
        return formatTimeDubai(dateString);
    };

    const formatDate = (dateString) => {
        return formatDateDubai(dateString);
    };

    // Filtering
    const filteredRecords = allAttendance.filter(record => {
        if (!searchQuery.trim()) return true;
        const staffName = record.userId?.username || record.userId?.fullName || '';
        return staffName.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Stats
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.filter(r => r.status === 'Completed' || r.status === 'In Progress').length;
    const activeCount = filteredRecords.filter(r => r.status === 'In Progress').length;
    const completedCount = filteredRecords.filter(r => r.status === 'Completed').length;
    const totalHours = filteredRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(1);

    // Export
    const handleExport = () => {
        const csvContent = [
            ['Technician Name', 'Reference', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Has Report'],
            ...filteredRecords.map(record => [
                record.userId?.username || record.userId?.fullName || 'Unknown',
                record.taskId ? `${record.taskId.title} (${record.taskId.project?.projectName || 'No Proj'})` : 'Independent',
                formatDate(record.date),
                formatTime(record.checkIn),
                formatTime(record.checkOut),
                record.totalHours ? `${record.totalHours}h` : '-',
                record.status,
                record.serviceReport ? 'Yes' : 'No'
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `site-attendance-${selectedDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleViewReport = (report, record) => {
        setSelectedReport({ ...report, associatedTask: record.taskId });
    };

    const closeReport = () => {
        setSelectedReport(null);
    };

    return (
        <div className="w-full">
            {/* Header Section with Date Picker matching AdminAttendance */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div></div> {/* Spacer to push Date Picker to right if needed, or remove */}
                <div className="flex items-center gap-3 w-full md:w-auto md:ml-auto">
                    <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => { setSelectedDate(e.target.value); setDateChanging(true); setTimeout(() => setDateChanging(false), 500); }}
                            className="border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
                        />
                    </div>
                    <button
                        onClick={fetchAllAttendance}
                        disabled={loading || dateChanging}
                        className="flex items-center gap-2 px-4 py-2 bg-[#700606] text-white rounded-xl hover:bg-[#5a0505] font-medium shadow-sm transition-all"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span className="hidden md:inline">Request Data</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Visits</p>
                    <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <p className="text-xs text-blue-600 uppercase font-semibold">Active Now</p>
                    <p className="text-2xl font-bold text-blue-900">{activeCount}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                    <p className="text-xs text-green-600 uppercase font-semibold">Completed</p>
                    <p className="text-2xl font-bold text-green-900">{completedCount}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                    <p className="text-xs text-purple-600 uppercase font-semibold">Total Site Hours</p>
                    <p className="text-2xl font-bold text-purple-900">{totalHours}h</p>
                </div>
            </div>

            {/* Search & Export */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search technician..."
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
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Site Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
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
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {record.userId?.username?.charAt(0) || 'T'}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{record.userId?.username || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {record.taskId ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-indigo-700">{record.taskId.title}</span>
                                                {record.taskId.project?.projectName && (
                                                    <span className="text-xs text-gray-500">{record.taskId.project.projectName}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">Independent</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm">
                                            <span className="font-mono text-gray-900">{formatTime(record.checkIn)}</span>
                                            <span className="text-gray-400 mx-1">-</span>
                                            <span className="font-mono text-gray-900">{formatTime(record.checkOut)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${record.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                            record.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                        {record.totalHours ? `${record.totalHours}h` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {record.serviceReport ? (
                                            <button
                                                onClick={() => handleViewReport(record.serviceReport, record)}
                                                className="text-blue-600 hover:text-blue-900 font-medium text-xs flex items-center justify-end gap-1"
                                            >
                                                <DocumentTextIcon className="w-4 h-4" /> View Report
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">No Report</span>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                            {filteredRecords.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No site visits found for this date.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Report Detail Modal */}
            <ServiceReportDetailModal selectedReport={selectedReport} closeReport={closeReport} />
        </div >
    );
};

export default AdminSiteAttendance;
