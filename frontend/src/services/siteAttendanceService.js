import api from '../store/api';

const API_URL = '/site-attendance'; // Base URL is handled by api instance

// Check in
const checkIn = async (data = {}) => {
    const response = await api.post(`${API_URL}/check-in`, data);
    return response.data;
};

// Check out
const checkOut = async (data) => {
    const response = await api.post(`${API_URL}/check-out`, data);
    return response.data;
};

// Get my history (Technician)
const getMyHistory = async () => {
    const response = await api.get(`${API_URL}/my-history`);
    return response.data;
};

// Get all (Admin)
const getAllAttendance = async (params) => {
    // If params is a string (date), wrap it in an object
    const config = typeof params === 'string' ? { params: { date: params } } : { params };
    const response = await api.get(`${API_URL}/all`, config);
    return response.data;
};

// Submit Service Report
const submitServiceReport = async (data) => {
    const config = data instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};
    const response = await api.post('/service-reports/submit', data, config);
    return response.data;
};

// Get all service reports (Admin)
const getAllReports = async (params) => {
    const response = await api.get('/service-reports', { params });
    return response.data;
};

// Get report details
const getReportById = async (id) => {
    const response = await api.get(`/service-reports/${id}`);
    return response.data;
};

// Get Task Attendance
const getTaskAttendance = async (taskId) => {
    const response = await api.get(`${API_URL}/task/${taskId}`);
    return response.data;
};

const siteAttendanceService = {
    checkIn,
    checkOut,
    getMyHistory,
    getAllAttendance,
    submitServiceReport,
    getAllReports,
    getReportById,
    getTaskAttendance
};

export default siteAttendanceService;
