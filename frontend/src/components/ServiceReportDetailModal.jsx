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
                        {/* Standardized Printable Layout View */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm overflow-x-auto w-full">
                            <PrintableServiceReport report={selectedReport} />
                        </div>

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
