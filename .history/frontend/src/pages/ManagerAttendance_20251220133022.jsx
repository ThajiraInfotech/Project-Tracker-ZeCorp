import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';

const ManagerAttendance = () => {
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const auth = useSelector((state) => state.auth);

  // Fetch team attendance
  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/team');
      if (response.data.success) {
        setTeamAttendance(response.data.attendance);
      }
    } catch (error) {
      console.error('Error fetching team attendance:', error);
      toast.error('Failed to fetch team attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.role === 'manager') {
      fetchTeamAttendance();
    }
  }, [auth.isAuthenticated, auth.user]);

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Attendance</h1>
        <p className="text-gray-600">View today's attendance for your team members</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Today's Team Attendance</h2>
          <button
            onClick={fetchTeamAttendance}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : teamAttendance.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No team attendance records for today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Overtime Hours</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamAttendance.map((record) => (
                  <tr key={record._id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.userId?.fullName || record.userId?.username || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.checkIn)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.checkOut)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {record.totalHours ? `${record.totalHours}h` : '-'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <span className={record.overtimeHours > 0 ? 'text-green-600 font-medium' : ''}>
                        {record.overtimeHours ? `${record.overtimeHours}h` : '0h'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800' :
                        record.status === 'Half-day' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {!loading && teamAttendance.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Today's Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Staff</p>
                <p className="font-medium">{teamAttendance.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Present</p>
                <p className="font-medium text-green-600">
                  {teamAttendance.filter(r => r.status === 'Present').length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Half-day</p>
                <p className="font-medium text-yellow-600">
                  {teamAttendance.filter(r => r.status === 'Half-day').length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Total OT Hours</p>
                <p className="font-medium text-blue-600">
                  {teamAttendance.reduce((sum, r) => sum + (r.overtimeHours || 0), 0)}h
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerAttendance;