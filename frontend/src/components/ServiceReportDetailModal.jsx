import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentTextIcon, XMarkIcon, PhotoIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { formatDateTimeDubai } from '../utils/dateUtils';
import PrintableServiceReport from './PrintableServiceReport';

const ServiceReportDetailModal = ({ selectedReport, closeReport }) => {
    if (!selectedReport) return null;

    const formatDate = (dateStr) => {
        return formatDateTimeDubai(dateStr);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-paper-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the report.');
            return;
        }

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML)
            .join('\n');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Service Report - ${selectedReport.clientDetails?.clientName || 'Details'}</title>
                    ${styles}
                </head>
                <body>
                    <div id="print-wrapper">
                        ${printContent.innerHTML}
                    </div>
                    <script>
                         setTimeout(() => {
                             window.print();
                             window.close();
                         }, 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                >
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                            Service Report {selectedReport.reportId ? `#${selectedReport.reportId}` : ''}
                        </h2>
                        <div className="flex gap-4 items-center">
                            <button onClick={handlePrint} className="text-gray-500 hover:text-blue-600 transition-colors" title="Print Report">
                                <PrinterIcon className="w-6 h-6" />
                            </button>
                            <button onClick={closeReport} className="text-gray-400 hover:text-gray-600 transition-colors" title="Close">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div id="printable-report-content" className="p-6 overflow-y-auto space-y-8">
                        {/* Meta Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Technician</p>
                                <p className="font-medium text-gray-900">{selectedReport.technicianId?.fullName || selectedReport.technicianId?.username || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">{selectedReport.technicianId?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Submission Time</p>
                                <p className="font-medium text-gray-900">{formatDate(selectedReport.createdAt)}</p>
                                {selectedReport.siteAttendanceId?.totalHours && (
                                    <p className="text-sm text-gray-500">Site Duration: {selectedReport.siteAttendanceId.totalHours} hrs</p>
                                )}
                            </div>
                            <div>
                                {(selectedReport.associatedTask || selectedReport.taskId) ? (
                                    <>
                                        <p className="text-xs text-indigo-500 uppercase font-semibold">Linked Task</p>
                                        <p className="font-medium text-indigo-900">{(selectedReport.associatedTask || selectedReport.taskId).title}</p>
                                        {(selectedReport.associatedTask || selectedReport.taskId).project?.projectName && (
                                            <p className="text-sm text-indigo-700">{(selectedReport.associatedTask || selectedReport.taskId).project.projectName}</p>
                                        )}
                                        {(selectedReport.associatedTask || selectedReport.taskId).project?.jobOrder && (
                                            <p className="text-sm font-semibold text-indigo-800">Job Order: {(selectedReport.associatedTask || selectedReport.taskId).project.jobOrder}</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Reference</p>
                                        <p className="font-medium text-gray-900 italic text-sm">Independent Visit</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Client Details */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Client Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Client Name</p>
                                    <p className="font-medium">{selectedReport.clientDetails?.clientName || '-'}</p>
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
                                    <p className="font-medium">{selectedReport.clientDetails?.emirates || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Equipments */}
                        {selectedReport.equipments && selectedReport.equipments.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Equipment Service Details</h3>
                                <div className="space-y-4">
                                    {selectedReport.equipments.map((eq, idx) => (
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
                        )}

                        {/* Client Feedback */}
                        {selectedReport.clientFeedback && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Client Feedback</h3>
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedReport.clientFeedback}</p>
                                </div>
                            </div>
                        )}

                        {/* Attached Photos */}
                        {selectedReport.photos && selectedReport.photos.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                                    Attached Photos ({selectedReport.photos.length})
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {selectedReport.photos.map((photo, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                                            <img
                                                src={photo.url}
                                                alt={`Report attachment ${idx + 1}`}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Signatures */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Sign-off</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Client Signature */}
                                <div className="bg-gray-50 p-4 rounded-xl flex flex-col items-center border border-gray-200">
                                    <div className="w-full border bg-white h-40 flex items-center justify-center mb-2 relative shadow-inner rounded-lg p-2">
                                        {selectedReport.clientSignature ? (
                                            <img src={selectedReport.clientSignature} alt="Client Signature" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                        ) : (
                                            <span className="text-gray-400 text-sm">No Signature</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">Authorized by Client</p>
                                    <p className="text-xs text-gray-500">({selectedReport.clientDetails?.attentionPerson || 'Representative'})</p>

                                    {selectedReport.clientRemarks && (
                                        <div className="mt-4 w-full text-center">
                                            <p className="text-sm text-gray-600 italic">"{selectedReport.clientRemarks}"</p>
                                        </div>
                                    )}
                                </div>

                                {/* Technician Signature */}
                                <div className="bg-blue-50 p-4 rounded-xl flex flex-col items-center border border-blue-200">
                                    <div className="w-full border bg-white h-40 flex items-center justify-center mb-2 relative shadow-inner rounded-lg p-2">
                                        {selectedReport.technicianSignature ? (
                                            <img src={selectedReport.technicianSignature} alt="Technician Signature" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                        ) : (
                                            <span className="text-gray-400 text-sm">No Signature</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-blue-900">Technician Sign-off</p>
                                    <p className="text-xs text-blue-700">({selectedReport.technicianId?.fullName || selectedReport.technicianId?.username || 'Technician'})</p>
                                </div>
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

                    {/* Hidden Printable Report */}
                    <div style={{ display: 'none' }}>
                        <div id="printable-paper-content">
                            <PrintableServiceReport report={selectedReport} />
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ServiceReportDetailModal;
