import React from 'react';

const PrintableServiceReport = ({ report }) => {
    if (!report) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const taskLabel = (report.associatedTask || report.taskId) ?
        `${(report.associatedTask || report.taskId).title}${(report.associatedTask || report.taskId).project?.projectName ? ` (${(report.associatedTask || report.taskId).project.projectName})` : ''}` :
        'Independent Visit';

    return (
        <div className="printable-service-report" style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            width: '100%',
            maxWidth: '800px',
            minWidth: '700px',
            margin: '0 auto',
            color: '#000',
            backgroundColor: '#fff',
            lineHeight: '1.4'
        }}>
            {/* Header (Exact Design) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ width: '250px' }}>
                    <img src="/zecorp_logo.png" alt="ZECORP Solutions" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                <div style={{ flex: 1, marginLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: 'auto', fontSize: '11px', fontWeight: 'bold' }}>
                        {report.associatedTask?.project?.jobOrder && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: '5px' }}>Job Order :</span>
                                <div style={{ minWidth: '40px', height: '15px', border: '1px solid #000', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                                    {report.associatedTask.project.jobOrder}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ fontSize: '14px', marginBottom: '2px', borderBottom: '1px solid #000' }}>
                Project | Trade | Consultancy
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                <tbody>
                    <tr>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', width: '60%' }}>
                            SERVICE REPORT
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px', width: '15%' }}>Report ID :</td>
                        <td style={{ border: '1px solid #000', padding: '5px', width: '25%', color: 'red', fontWeight: 'bold', textAlign: 'center' }}>
                            {report.reportId ? `#${report.reportId}` : (report._id ? report._id.substring(report._id.length - 4).toUpperCase() : 'DRAFT')}
                        </td>
                    </tr>

                    {/* Meta Info mapped to the boxed design */}
                    <tr>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '5px' }}>
                            <div style={{ display: 'flex' }}>
                                <span style={{ width: '120px' }}>Technician :</span>
                                <span style={{ borderBottom: '1px dotted #000', flex: 1 }}>{report.technicianId?.fullName || report.technicianId?.username || ' '}</span>
                            </div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>Submission Time :</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{formatDate(report.createdAt)}</td>
                    </tr>
                    <tr>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '5px' }}>
                            <div style={{ display: 'flex' }}>
                                <span style={{ width: '120px' }}>Linked Task :</span>
                                <span style={{ borderBottom: '1px dotted #000', flex: 1 }}>{taskLabel}</span>
                            </div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>Site Duration :</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{report.siteAttendanceId?.totalHours ? `${report.siteAttendanceId.totalHours} hrs` : '-'}</td>
                    </tr>

                    <tr>
                        <td colSpan="4" style={{ backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '5px', fontWeight: 'bold', textAlign: 'center' }}>
                            CLIENT INFORMATION
                        </td>
                    </tr>
                    <tr>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '5px' }}>
                            <div style={{ display: 'flex' }}>
                                <span style={{ width: '120px' }}>Client Name :</span>
                                <span style={{ borderBottom: '1px dotted #000', flex: 1 }}>{report.clientDetails?.clientName || ' '}</span>
                            </div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>Attention Person :</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{report.clientDetails?.attentionPerson || ' '}</td>
                    </tr>
                    <tr>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '5px' }}>
                            <div style={{ display: 'flex' }}>
                                <span style={{ width: '120px' }}>Outlet / Branch :</span>
                                <span style={{ borderBottom: '1px dotted #000', flex: 1 }}>{report.clientDetails?.outlet} {report.clientDetails?.branch ? ` - ${report.clientDetails.branch}` : ''}</span>
                            </div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>Emirates :</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{report.clientDetails?.emirates || ' '}</td>
                    </tr>
                </tbody>
            </table>

            {/* Equipments Section */}
            {(report.equipments || []).map((eq, idx) => (
                <div key={idx} style={{ pageBreakInside: 'avoid', marginTop: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                        <tbody>
                            <tr>
                                <td colSpan="4" style={{ backgroundColor: '#f0f0f0', border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>
                                    EQUIPMENT DETAILS: {eq.equipmentName} {eq.category ? `(${eq.category})` : ''} - {eq.serviceRequired ? 'Service Required' : 'Operational'}
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="4" style={{ border: '1px solid #000', padding: '10px 5px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: '14px' }}>
                                        <div><span style={{ fontSize: '11px', color: '#555', display: 'block' }}>Model</span><strong>{eq.modelNumber || '-'}</strong></div>
                                        <div><span style={{ fontSize: '11px', color: '#555', display: 'block' }}>Serial</span><strong>{eq.serialNumber || '-'}</strong></div>
                                        <div><span style={{ fontSize: '11px', color: '#555', display: 'block' }}>PNC</span><strong>{eq.pncNumber || '-'}</strong></div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="4" style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '11px' }}>
                                    <span style={{ marginRight: '15px' }}><strong>Job Status:</strong> {eq.jobCompleted ? 'Completed' : 'Pending'}</span>
                                    <span style={{ marginRight: '15px' }}><strong>Fault:</strong> {eq.fault ? 'Yes' : 'No'}</span>
                                    <span style={{ marginRight: '15px' }}><strong>Rectified:</strong> {eq.faultRectified ? 'Yes' : 'No'}</span>
                                    <span style={{ marginRight: '15px' }}><strong>Parts Replaced:</strong> {eq.partsReplacement ? 'Yes' : 'No'}</span>
                                    <span><strong>Repairable:</strong> {eq.repairable ? 'Yes' : 'No'}</span>
                                </td>
                            </tr>
                            {eq.partsUsedInstalled && (
                                <tr>
                                    <td colSpan="4" style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>
                                        PARTS USED / INSTALLED
                                        <div style={{ minHeight: '30px', fontWeight: 'normal', marginTop: '5px', fontSize: '12px' }}>
                                            {eq.partsUsedRemarks || ' '}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!eq.jobCompleted && (
                                <tr>
                                    <td colSpan="4" style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>
                                        REASON FOR INCOMPLETE JOB
                                        <div style={{ minHeight: '30px', fontWeight: 'normal', marginTop: '5px', fontSize: '12px' }}>
                                            {eq.jobCompletedRemarks || ' '}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {eq.technicianRemarks && (
                                <tr>
                                    <td colSpan="4" style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>
                                        TECHNICIAN REMARKS
                                        <div style={{ minHeight: '40px', fontWeight: 'normal', marginTop: '5px', fontSize: '12px' }}>
                                            {eq.technicianRemarks || ' '}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ))}

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: '10px' }}>
                <tbody>
                    {/* Client Feedback */}
                    <tr>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>
                            CLIENT FEEDBACK
                            <div style={{ minHeight: '50px', fontWeight: 'normal', marginTop: '5px', fontSize: '12px' }}>
                                {report.clientFeedback || ' '}
                            </div>
                        </td>
                    </tr>
                    {/* Client Remarks */}
                    {report.clientRemarks && (
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>
                                CUSTOMER COMMENTS
                                <div style={{ minHeight: '50px', fontWeight: 'normal', marginTop: '5px', fontSize: '12px' }}>
                                    {report.clientRemarks || ' '}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Signatures */}
            <div style={{ pageBreakInside: 'avoid' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '5px', width: '50%', verticalAlign: 'top' }}>
                                <div style={{ marginBottom: '10px' }}>Authorized by Client : <span style={{ fontWeight: 'bold' }}>{report.clientDetails?.attentionPerson || ' '}</span></div>
                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                                    <span style={{ width: '130px' }}>Customer Signature :</span>
                                    <div style={{ height: '70px', width: '200px', overflow: 'hidden' }}>
                                        {report.clientSignature ? (
                                            <img src={report.clientSignature} alt="Client Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                        ) : ''}
                                    </div>
                                </div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px', width: '50%', verticalAlign: 'top' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    Technician's Name : <span style={{ fontWeight: 'bold' }}>{report.technicianId?.fullName || report.technicianId?.username || ' '}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '10px' }}>
                                    <span style={{ width: '70px' }}>Signature :</span>
                                    <div style={{ height: '70px', width: '200px', overflow: 'hidden' }}>
                                        {report.technicianSignature ? (
                                            <img src={report.technicianSignature} alt="Technician Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                        ) : ''}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer */}
                <div style={{ border: '1px solid #000', borderTop: 'none', padding: '5px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                    ZECORP SOLUTIONS
                    <div style={{ fontWeight: 'normal', marginTop: '2px' }}>
                        Office # 2003, Burjuman Business Tower, Khalid Bin Walid Street, Bur Dubai, Dubai, U.A.E. Tel - 00971 4 255 9793, Mob - 00971 56 55 44 580
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PrintableServiceReport;
