import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAttendanceReport } from '../../store/reportSlice';
import { toast } from 'react-toastify';

const AttendanceExceptions = () => {
  const dispatch = useDispatch();
  const { attendanceReport, loading, error } = useSelector((state) => state.reports);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    dispatch(getAttendanceReport({ month: selectedMonth, year: selectedYear }));
  }, [dispatch, selectedMonth, selectedYear]);

  const exceptions = attendanceReport?.report || [];

  // Filter for exceptions
  const lateCheckIns = exceptions.filter(record => record.daysLate > 0);
  const missingCheckOuts = exceptions.filter(record => record.daysHalf > 0);
  const overtimeAnomalies = exceptions.filter(record => record.overtimeHours > 8); // Assuming 8 hours max

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Exceptions</h1>
        <div className="flex gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Late Check-ins */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Late Check-ins</h3>
            {lateCheckIns.length === 0 ? (
              <p className="text-gray-500">No late check-ins found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days Late</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lateCheckIns.map((record) => (
                      <tr key={record.userId}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.userName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                          {record.daysLate}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {record.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Missing Check-outs */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Missing Check-outs</h3>
            {missingCheckOuts.length === 0 ? (
              <p className="text-gray-500">No missing check-outs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Half Days</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {missingCheckOuts.map((record) => (
                      <tr key={record.userId}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.userName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-orange-600">
                          {record.daysHalf}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {record.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Overtime Anomalies */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overtime Anomalies</h3>
            {overtimeAnomalies.length === 0 ? (
              <p className="text-gray-500">No overtime anomalies found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Overtime Hours</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overtimeAnomalies.map((record) => (
                      <tr key={record.userId}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.userName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-600">
                          {record.overtimeHours}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {record.totalHours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceExceptions;