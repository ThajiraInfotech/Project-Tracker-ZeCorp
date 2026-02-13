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
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { formatTimeDubai, formatDateDubai, getDubaiToday } from '../utils/dateUtils';
import { toast } from 'react-toastify';

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
        const staffName = record.userId?.fullName || record.userId?.username || '';
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
            ['Technician Name', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Has Report'],
            ...filteredRecords.map(record => [
                record.userId?.fullName || record.userId?.username || 'Unknown',
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

    const handleViewReport = (report) => {
        setSelectedReport(report);
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
                                                {record.userId?.fullName?.charAt(0) || 'T'}
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
                                                onClick={() => handleViewReport(record.serviceReport)}
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
            <AnimatePresence>
                {selectedReport && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                                    Service Report Details
                                </h2>
                                <button onClick={closeReport} className="text-gray-400 hover:text-gray-600">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-8">
                                {/* Meta Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Technician</p>
                                        <p className="font-medium text-gray-900">{selectedReport.technicianId?.fullName || 'Unknown'}</p>
                                        <p className="text-sm text-gray-500">{selectedReport.technicianId?.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Submission Time</p>
                                        <p className="font-medium text-gray-900">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Client Details */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Client Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Client Name</p>
                                            <p className="font-medium">{selectedReport.clientDetails?.clientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Outlet / Branch</p>
                                            <p className="font-medium">{selectedReport.clientDetails?.outlet} - {selectedReport.clientDetails?.branch}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Attention Person</p>
                                            <p className="font-medium">{selectedReport.clientDetails?.attentionPerson || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Emirates</p>
                                            <p className="font-medium">{selectedReport.clientDetails?.emirates}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipments */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Equipment Service Details</h3>
                                    <div className="space-y-4">
                                        {selectedReport.equipments?.map((eq, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-bold text-blue-900">{eq.equipmentName}</h4>
                                                        <p className="text-xs text-gray-500">
                                                            {eq.category}
                                                            {eq.subCategory && ` > ${eq.subCategory}`}
                                                            {eq.fuelType && ` • ${eq.fuelType}`}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${eq.serviceRequired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {eq.serviceRequired ? 'Service Required' : 'Operational'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                                                    <div className="bg-white p-2 rounded border">
                                                        <span className="text-xs text-gray-500 block">Model</span>
                                                        {eq.modelNumber || '-'}
                                                    </div>
                                                    <div className="bg-white p-2 rounded border">
                                                        <span className="text-xs text-gray-500 block">Serial</span>
                                                        {eq.serialNumber || '-'}
                                                    </div>
                                                    <div className="bg-white p-2 rounded border">
                                                        <span className="text-xs text-gray-500 block">PNC</span>
                                                        {eq.pncNumber || '-'}
                                                    </div>
                                                    <div className={`p-2 rounded border ${eq.jobCompleted ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                                        <span className="text-xs text-gray-500 block">Job Status</span>
                                                        <span className={eq.jobCompleted ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                                            {eq.jobCompleted ? 'Completed' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                                                    <div className={`p-1 rounded text-center border ${eq.fault ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        Fault: {eq.fault ? 'Yes' : 'No'}
                                                    </div>
                                                    <div className={`p-1 rounded text-center border ${eq.faultRectified ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        Rectified: {eq.faultRectified ? 'Yes' : 'No'}
                                                    </div>
                                                    <div className={`p-1 rounded text-center border ${eq.partsReplacement ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        Parts Replaced: {eq.partsReplacement ? 'Yes' : 'No'}
                                                    </div>
                                                    <div className={`p-1 rounded text-center border ${!eq.repairable ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                                        Repairable: {eq.repairable ? 'Yes' : 'No'}
                                                    </div>
                                                </div>

                                                {eq.partsUsedInstalled && (
                                                    <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                        <p className="text-xs font-bold text-blue-800 mb-1">Parts Used / Installed:</p>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{eq.partsUsedRemarks}</p>
                                                    </div>
                                                )}

                                                {!eq.jobCompleted && (
                                                    <div className="mt-2 bg-red-50 p-3 rounded-lg border border-red-100">
                                                        <p className="text-xs font-bold text-red-800 mb-1">Reason for Incomplete Job:</p>
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{eq.jobCompletedRemarks}</p>
                                                    </div>
                                                )}

                                                {eq.technicianRemarks && (
                                                    <div className="mt-3 text-sm text-gray-600 border-t border-gray-200 pt-2">
                                                        <span className="font-semibold text-gray-700">Technician Remarks:</span> {eq.technicianRemarks}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>




                                {/* Client Feedback */}
                                {selectedReport.clientFeedback && (
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Client Feedback</h3>
                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedReport.clientFeedback}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Signature */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Sign-off</h3>
                                    <div className="bg-gray-50 p-4 rounded-xl flex flex-col items-center">
                                        <div className="w-full max-w-md border bg-white h-40 flex items-center justify-center mb-2">
                                            {selectedReport.clientSignature ? (
                                                <img src={selectedReport.clientSignature} alt="Client Signature" className="h-full object-contain" />
                                            ) : (
                                                <span className="text-gray-400">No Signature</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">Authorized by Client</p>
                                    </div>
                                </div>

                            </div>

                            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end">
                                <button
                                    onClick={closeReport}
                                    className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default AdminSiteAttendance;
