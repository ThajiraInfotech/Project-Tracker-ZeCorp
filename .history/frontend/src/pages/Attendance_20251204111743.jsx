
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
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

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = 'http://localhost:5000/api/attendance';
      const params = new URLSearchParams();

      // Add date filter based on selection
      const today = new Date();
      if (dateFilter === 'today') {
        params.append('date', today.toISOString().split('T')[0]);
      } else if (dateFilter === 'this_week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        params.append('startDate', startOfWeek.toISOString().split('T')[0]);
        params.append('endDate', today.toISOString().split('T')[0]);
      } else if (dateFilter === 'this_month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        params.append('startDate', startOfMonth.toISOString().split('T')[0]);
        params.append('endDate', today.toISOString().split('T')[0]);
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.attendance) {
        setAttendanceRecords(response.data.attendance);
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
