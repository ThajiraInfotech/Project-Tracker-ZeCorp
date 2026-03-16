import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
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
    const [filterClient, setFilterClient] = useState('');

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterDate) params.date = filterDate;
            if (filterClient) params.clientName = filterClient;

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
    }, []);

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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Service Reports</h1>
                    <p className="text-gray-500">View and manage field service reports</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <input
                        type="text"
                        placeholder="Filter by Client..."
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value)}
                        className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                        onClick={fetchReports}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <MagnifyingGlassIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setFilterDate(''); setFilterClient(''); fetchReports(); }}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
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
                            ) : reports.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No reports found</td></tr>
                            ) : (
                                reports.map(report => (
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
                                                    {report.taskId.project?.projectName && (
                                                        <span className="text-xs text-gray-500">{report.taskId.project.projectName}</span>
                                                    )}
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
