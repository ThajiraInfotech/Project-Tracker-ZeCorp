import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { socket } from '../../App';
import siteAttendanceService from '../../services/siteAttendanceService';
import {
    DocumentTextIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    XMarkIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import { formatDateTimeDubai } from '../../utils/dateUtils';
import ServiceReportDetailModal from '../../components/ServiceReportDetailModal';
const AdminServiceReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterDate) params.date = filterDate;

            const data = await siteAttendanceService.getAllReports(params);
            if (data.success) {
                setReports(data.reports);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filterDate]);

    // Real-time updates via socket
    useEffect(() => {
        const handleUpdate = () => {
            fetchReports();
        };
        socket.on('service_report_created', handleUpdate);
        return () => {
            socket.off('service_report_created', handleUpdate);
        };
    }, [filterDate]);

    const filteredReports = reports.filter(report => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        
        const clientMatch = report.clientDetails?.clientName?.toLowerCase().includes(query) || false;
        const taskMatch = report.taskId?.title?.toLowerCase().includes(query) || false;
        const jobOrderMatch = report.taskId?.jobOrder?.toLowerCase().includes(query) || report.taskId?.project?.jobOrder?.toLowerCase().includes(query) || false;
        const technicianMatch = report.technicianId?.username?.toLowerCase().includes(query) || report.technicianId?.fullName?.toLowerCase().includes(query) || false;
        const projectMatch = report.taskId?.project?.projectName?.toLowerCase().includes(query) || false;

        return clientMatch || taskMatch || jobOrderMatch || technicianMatch || projectMatch;
    });

    const handleViewReport = (report) => {
        setSelectedReport(report);
    };

    const closeReport = () => {
        setSelectedReport(null);
    };

    const formatDate = (dateStr) => {
        return formatDateTimeDubai(dateStr);
    };

    return (
        <div className="p-4 md:p-6 w-full space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Reports</h1>
                    <p className="text-gray-500 text-sm">View and manage field service reports</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:min-w-[400px]">
                    <div className="relative flex-1 group">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search client, task, JO, or tech..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="w-full sm:w-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm p-2 shadow-sm outline-none transition-all text-gray-700"
                        />
                        <button
                            onClick={() => { setFilterDate(''); setSearchQuery(''); }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition flex items-center justify-center shadow-sm"
                            title="Reset Filters"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Technician</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-44">Reference</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-44">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-28">Equipments</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                            ) : filteredReports.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No reports found</td></tr>
                            ) : (
                                filteredReports.map(report => (
                                    <tr 
                                        key={report._id} 
                                        onClick={() => handleViewReport(report)}
                                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatDate(report.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                    {report.technicianId?.username?.[0] || 'T'}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{report.technicianId?.username || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {report.taskId ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-indigo-700">{report.taskId.title}</span>
                                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                        {report.taskId.project?.projectName && (
                                                            <span className="text-xs text-gray-500">{report.taskId.project.projectName}</span>
                                                        )}
                                                        {(report.taskId.jobOrder || report.taskId.project?.jobOrder) && (
                                                            <>
                                                                <span className="text-gray-300 mx-1">•</span>
                                                                <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-wide">
                                                                    JO: {report.taskId.jobOrder || report.taskId.project?.jobOrder}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Independent</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {report.clientDetails?.clientName ? (
                                                <>
                                                    {report.clientDetails.clientName}
                                                    <div className="text-xs text-gray-400 font-normal">{report.clientDetails?.outlet}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {report.equipments?.length || 0} items
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200">
                                                {report.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Report Detail Modal */}
            <ServiceReportDetailModal selectedReport={selectedReport} closeReport={closeReport} />
        </div>
    );
};

export default AdminServiceReports;
