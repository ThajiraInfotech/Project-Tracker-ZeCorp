import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import siteAttendanceService from '../../services/siteAttendanceService';
import {
    DocumentTextIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

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
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
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
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Technician</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Equipments</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                        ) : reports.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-8 text-gray-500">No reports found</td></tr>
                        ) : (
                            reports.map(report => (
                                <tr key={report._id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatDate(report.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                {report.technicianId?.fullName?.[0] || 'T'}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{report.technicianId?.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {report.clientDetails?.clientName}
                                        <div className="text-xs text-gray-500">{report.clientDetails?.outlet}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {report.equipments?.length || 0} items
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewReport(report)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Report Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
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
                                    <p className="font-medium text-gray-900">{selectedReport.technicianId?.fullName}</p>
                                    <p className="text-sm text-gray-500">{selectedReport.technicianId?.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Submission Time</p>
                                    <p className="font-medium text-gray-900">{formatDate(selectedReport.createdAt)}</p>
                                    <p className="text-sm text-gray-500">Site Duration: {selectedReport.siteAttendanceId?.totalHours || 0} hrs</p>
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
                                    {selectedReport.clientRemarks && (
                                        <p className="mt-4 text-sm text-gray-600 italic">" {selectedReport.clientRemarks} "</p>
                                    )}
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminServiceReports;
