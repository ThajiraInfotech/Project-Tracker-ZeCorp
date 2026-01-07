import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../store/api';
import { toast } from 'react-toastify';

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const auth = useSelector((state) => state.auth);

  // Fetch attendance data
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};

      // Add date filter based on selection
      const today = new Date();
      if (dateFilter === 'today') {
        params.date = today.toISOString().split('T')[0];
      } else if (dateFilter === 'this_week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        params.startDate = startOfWeek.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      } else if (dateFilter === 'this_month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        params.startDate = startOfMonth.toISOString().split('T')[0];
        params.endDate = today.toISOString().split('T')[0];
      }

      const response = await api.get('/attendance', { params });

      if (response.data.success && response.data.attendance) {
        const allAttendance = response.data.attendance;
        const { user } = auth;

        // Apply role-based filtering
        if (user?.role === 'admin') {
          // Admin sees all attendance records
          setAttendanceRecords(allAttendance);
        } else if (user?.role === 'manager') {
          // Manager sees attendance of staff in their projects
          // This would require additional logic to get team members from projects
          // For now, we'll show all records (would need backend enhancement)
          setAttendanceRecords(allAttendance);
        } else if (user?.role === 'staff') {
          // Staff sees only their own attendance records
          const staffAttendance = allAttendance.filter(record =>
            record.user?._id === user._id || record.user === user._id
          );
          setAttendanceRecords(staffAttendance);
        } else {
          // Default: show all attendance if role is not recognized
          setAttendanceRecords(allAttendance);
        }
      } else {
        throw new Error('No attendance data received');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError(error.message || 'Failed to fetch attendance');
      toast.error('Failed to fetch attendance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance record details
  const fetchAttendanceDetails = async (recordId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`http://localhost:5000/api/attendance/${recordId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.attendance) {
        setSelectedRecord(response.data.attendance);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching attendance details:', error);
      toast.error('Failed to fetch attendance details: ' + error.message);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchAttendance();
    }
  }, [auth.isAuthenticated, dateFilter]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      'present': 'bg-green-100 text-green-800',
      'absent': 'bg-red-100 text-red-800',
      'late': 'bg-yellow-100 text-yellow-800',
      'half-day': 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  // Attendance card component
  const AttendanceCard = ({ record }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {record.user?.fullName || 'Unknown User'}
          </h3>
          <p className="text-sm text-gray-500">{record.user?.email}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Date</p>
          <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Check In</p>
          <p className="font-medium">
            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Check Out</p>
          <p className="font-medium">
            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Total Hours</p>
          <p className="font-medium">{record.totalHours || 'N/A'} hours</p>
        </div>
      </div>

      {record.location && (
        <div className="mb-4">
          <p className="text-gray-500 text-sm mb-1">Location</p>
          <p className="text-sm text-gray-600">{record.location}</p>
        </div>
      )}

      <button
        onClick={() => fetchAttendanceDetails(record._id)}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
      >
        View Details
      </button>
    </div>
  );

  // Attendance details modal
  const AttendanceDetailsModal = () => {
    if (!selectedRecord || !showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Attendance Details</h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Employee Information</h3>
              <p className="text-gray-600">{selectedRecord.user?.fullName}</p>
              <p className="text-gray-600">{selectedRecord.user?.email}</p>
              <p className="text-gray-600">{selectedRecord.user?.phone}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Date</h3>
                <p className="text-gray-600">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                <p className="text-gray-600">{new Date(selectedRecord.date).toLocaleTimeString()}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Status</h3>
                <StatusBadge status={selectedRecord.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Check In</h3>
                <p className="text-gray-600">
                  {selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime).toLocaleTimeString() : 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Check Out</h3>
                <p className="text-gray-600">
                  {selectedRecord.checkOutTime ? new Date(selectedRecord.checkOutTime).toLocaleTimeString() : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-1">Time Summary</h3>
              <p className="text-gray-600">Total Hours: {selectedRecord.totalHours || 0} hours</p>
              <p className="text-gray-600">Overtime: {selectedRecord.overtimeHours || 0} hours</p>
            </div>

            {selectedRecord.location && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Location</h3>
                <p className="text-gray-600">{selectedRecord.location}</p>
              </div>
            )}

            {selectedRecord.deviceInfo && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Device Information</h3>
                <p className="text-gray-600">{selectedRecord.deviceInfo}</p>
              </div>
            )}

            {selectedRecord.ipAddress && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">IP Address</h3>
                <p className="text-gray-600">{selectedRecord.ipAddress}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600 text-sm">Track and manage employee attendance</p>
        </div>

        {auth.user?.role !== 'staff' && (
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
            + Add Attendance
          </button>
        )}
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-4 py-2 rounded-md ${dateFilter === 'today' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('this_week')}
            className={`px-4 py-2 rounded-md ${dateFilter === 'this_week' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateFilter('this_month')}
            className={`px-4 py-2 rounded-md ${dateFilter === 'this_month' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && attendanceRecords.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
          <p className="text-gray-500">There are no attendance records available.</p>
        </div>
      )}

      {/* Attendance grid */}
      {!loading && !error && attendanceRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attendanceRecords.map((record) => (
            <AttendanceCard key={record._id} record={record} />
          ))}
        </div>
      )}

      {/* Summary section */}
      {!loading && !error && attendanceRecords.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceRecords.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {attendanceRecords.filter(r => r.status === 'present').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Late</p>
              <p className="text-2xl font-bold text-yellow-600">
                {attendanceRecords.filter(r => r.status === 'late').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-gray-500 text-sm">Absent</p>
              <p className="text-2xl font-bold text-red-600">
                {attendanceRecords.filter(r => r.status === 'absent').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance details modal */}
      <AttendanceDetailsModal />
    </div>
  );
};

export default Attendance;
                {attendanceRecords.filter(r => r.status === 'absent').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance details modal */}
      <AttendanceDetailsModal />
    </div>
  );
};

export default Attendance;