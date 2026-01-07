import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStaffProductivityReport } from '../../store/reportSlice';

const ProductivityReport = () => {
  const dispatch = useDispatch();
  const { staffProductivity, loading, error } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(getStaffProductivityReport());
  }, [dispatch]);

  const report = staffProductivity?.report || [];
  const summary = staffProductivity?.summary || {};

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Productivity Report</h1>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Average Productivity</h3>
              <p className="text-2xl font-bold text-blue-600">{summary.averageProductivity?.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">High Performers</h3>
              <p className="text-2xl font-bold text-green-600">{summary.highPerformers || 0}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500">Needs Improvement</h3>
              <p className="text-2xl font-bold text-red-600">{summary.lowPerformers || 0}</p>
            </div>
          </div>

          {/* Staff Productivity Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tasks Completed</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task Completion Rate</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Daily Hours</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Productivity Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.map((staff) => (
                    <tr key={staff.staffId}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staff.staffName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {staff.department || 'N/A'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {staff.tasksCompleted}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {staff.taskCompletionRate}%
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {staff.totalHours}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {staff.averageDailyHours}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          staff.productivityScore >= 85 ? 'bg-green-100 text-green-800' :
                          staff.productivityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {staff.productivityScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductivityReport;