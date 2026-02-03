import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FaUsers,
  FaUserTie,
  FaUserShield,
  FaCheckCircle,
  FaSearch,
  FaFilter,
  FaEllipsisV,
  FaPhone,
  FaEnvelope,
  FaBuilding,
  FaTrash,
  FaEdit,
  FaLock,
  FaUserSlash,
  FaUserCheck
} from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

import UserAvatar from '../../components/UserAvatar';
import api from '../../store/api';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'staff',
    phone: '',
    role: 'staff',
    phone: '',
    password: '',
    salaryPerHour: ''
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');


  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;


  // Loading states
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);

  const auth = useSelector((state) => state.auth);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/auth/users');

      if (response.data.success && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to fetch users');
      toast.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const response = await api.post('/auth/register', newUser);

      if (response.data.success) {
        toast.success('User created successfully!');
        setShowCreateModal(false);
        setNewUser({
          username: '',
          email: '',
          fullName: '',
          role: 'staff',
          phone: '',
          phone: '',
          password: '',
          salaryPerHour: ''
        });
        fetchUsers(); // Refresh user list
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreatingUser(false);
    }
  };

  // Update user
  const updateUser = async (e) => {
    e.preventDefault();
    setUpdatingUser(true);
    try {
      const response = await api.put(`/auth/users/${selectedUser._id}`, {
        username: selectedUser.username,
        email: selectedUser.email,
        fullName: selectedUser.fullName,
        role: selectedUser.role,
        role: selectedUser.role,
        phone: selectedUser.phone,
        salaryPerHour: selectedUser.salaryPerHour || 0

      });

      if (response.data.success) {
        toast.success('User updated successfully!');
        setShowEditModal(false);
        fetchUsers(); // Refresh user list
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user: ' + (error.response?.data?.message || error.message));
    } finally {
      setUpdatingUser(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/auth/users/${userId}`);

        if (response.data.success) {
          toast.success('User deleted successfully!');
          fetchUsers(); // Refresh user list
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Toggle user status
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await api.post(`/auth/users/${userId}/toggle-status`);

      if (response.data.success) {
        toast.success(`User ${response.data.user.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchUsers(); // Refresh user list
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to toggle user status: ' + (error.response?.data?.message || error.message));
    }
  };

  // Reset user password
  const resetUserPassword = async (userId) => {
    const newPassword = prompt('Enter new password for this user:');
    if (newPassword && newPassword.length >= 8) {
      try {
        const response = await api.post(`/auth/users/${userId}/reset-password`, {
          newPassword: newPassword
        });

        if (response.data.success) {
          toast.success('Password reset successfully!');
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        toast.error('Failed to reset password: ' + (error.response?.data?.message || error.message));
      }
    } else {
      toast.error('Password must be at least 8 characters');
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchUsers();
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchUsers();
    }
  }, [auth.isAuthenticated]);

  // Calculate Stats
  const stats = {
    total: users.length,
    managers: users.filter(u => u.role === 'manager').length,
    staff: users.filter(u => u.role === 'staff').length,
    active: users.filter(u => u.isActive).length
  };

  const tabs = [
    { id: '', label: 'All Users' },
    { id: 'manager', label: 'Managers' },
    { id: 'staff', label: 'Staff' },
    { id: 'admin', label: 'Admins' }
  ];

  // Filtered and paginated users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? user.isActive : !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);



  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Full Name', 'Username', 'Email', 'Role', 'Phone', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredUsers.map(user => [
        `"${user.fullName}"`,
        `"${user.username}"`,
        `"${user.email}"`,
        `"${user.role}"`,
        `"${user.phone || ''}"`,
        `"${user.isActive ? 'Active' : 'Inactive'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'users.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  // Role badge component
  const RoleBadge = ({ role }) => {
    const roleColors = {
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'staff': 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ isActive }) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <div className="w-full px-0 py-4 md:container md:mx-auto md:px-4 md:py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl mx-2 md:mx-0 p-4 md:p-6 mb-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
                <p className="text-red-100 mt-1">Manage system access and user roles</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2.5 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 font-medium backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 bg-white text-[#700606] rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 font-bold shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New User
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mx-2 md:mx-0">
            <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Users</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <FaUsers size={24} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Managers</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.managers}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                <FaUserTie size={24} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Staff Members</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.staff}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                <FaUserShield size={24} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Active Now</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.active}</h3>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                <FaCheckCircle size={24} />
              </div>
            </div>
          </div>

          {/* Controls & Filters */}
          <div className="bg-white rounded-xl mx-2 md:mx-0 shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-100 px-4 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  className={`
                    py-4 px-6 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200
                    ${roleFilter === tab.id
                      ? 'border-[#700606] text-[#700606]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Search */}
              <div className="md:col-span-12 lg:col-span-5 relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all text-sm"
                />
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Filters */}
              <div className="md:col-span-12 lg:col-span-7 flex flex-wrap gap-3 justify-start lg:justify-end">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-100 cursor-pointer min-w-[120px]"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#700606]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mx-2 md:mx-0">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200 mx-2 md:mx-0">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FaUsers className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-[#700606] font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <UserAvatar user={user} size="md" className="mr-4 ring-2 ring-white shadow-sm" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{user.fullName}</div>
                            <div className="text-xs text-gray-500">{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <FaEnvelope className="w-3 h-3 mr-2 text-gray-400" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center text-xs text-gray-500">
                              <FaPhone className="w-3 h-3 mr-2 text-gray-400" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          <RoleBadge role={user.role} />

                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser({ ...user, salaryPerHour: user.salaryPerHour || 0 });
                              setShowEditModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Details"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user._id, user.isActive)}
                            className={`p-2 rounded-lg transition-colors ${user.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? <FaUserSlash /> : <FaUserCheck />}
                          </button>
                          <button
                            onClick={() => resetUserPassword(user._id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <FaLock />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => deleteUser(user._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Desktop */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + usersPerPage, filteredUsers.length)}</span> of <span className="font-medium">{filteredUsers.length}</span> results
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Card Grid View */}
            <div className="grid grid-cols-1 gap-4 md:hidden mx-2">
              {paginatedUsers.map((user) => (
                <div key={user._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} size="md" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{user.fullName}</h4>
                        <p className="text-xs text-gray-500">{user.username}</p>
                      </div>
                    </div>
                    <Menu as="div" className="relative ml-3">
                      <Menu.Button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                        <FaEllipsisV />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => { setSelectedUser({ ...user, salaryPerHour: user.salaryPerHour || 0 }); setShowEditModal(true); }}
                                  className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <FaEdit className="mr-3 h-4 w-4" aria-hidden="true" />
                                  Edit
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => toggleUserStatus(user._id, user.isActive)}
                                  className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  {user.isActive ? <FaUserSlash className="mr-3 h-4 w-4 text-amber-500" /> : <FaUserCheck className="mr-3 h-4 w-4 text-green-500" />}
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => resetUserPassword(user._id)}
                                  className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex w-full items-center px-4 py-2 text-sm`}
                                >
                                  <FaLock className="mr-3 text-gray-500 h-4 w-4" />
                                  Reset Password
                                </button>
                              )}
                            </Menu.Item>
                            {user.role !== 'admin' && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => deleteUser(user._id)}
                                    className={`${active ? 'bg-red-50 text-red-900' : 'text-red-700'} group flex w-full items-center px-4 py-2 text-sm text-red-600`}
                                  >
                                    <FaTrash className="mr-3 h-4 w-4" aria-hidden="true" />
                                    Delete
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <span className="text-xs text-gray-500 block mb-1">Role</span>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <span className="text-xs text-gray-500 block mb-1">Status</span>
                      <StatusBadge isActive={user.isActive} />
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg col-span-2">
                      <div className="flex items-center gap-2">
                        <FaEnvelope className="text-gray-400" />
                        <span className="text-gray-700 text-xs">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Pagination Mobile */}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 font-medium">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={createUser} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors"
                      placeholder="Enter username"
                      required
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors"
                      placeholder="Enter email address"
                      required
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="fullName"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors"
                      placeholder="Enter full name"
                      required
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors"
                      placeholder="Enter password"
                      required
                      minLength={8}
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Minimum 8 characters</p>
                </div>

                <div>
                  <label htmlFor="salaryPerHour" className="block text-sm font-semibold text-gray-700 mb-2">
                    Hourly Salary
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="salaryPerHour"
                      value={newUser.salaryPerHour}
                      onChange={(e) => setNewUser({ ...newUser, salaryPerHour: Number(e.target.value) })}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors"
                      placeholder="0.00"
                      min="0"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                      Role
                    </label>
                    <div className="relative">
                      <select
                        id="role"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors appearance-none bg-white"
                        required
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent transition-colors"
                      pattern="[0-9]{10}"
                      placeholder="10 digit phone number"
                    />
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="px-6 py-3 bg-gradient-to-r from-theme-600 to-theme-700 text-white rounded-lg hover:from-theme-700 hover:to-theme-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
                  >
                    {creatingUser && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={updateUser} className="space-y-4">
                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="edit-username"
                    value={selectedUser.username}
                    onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="edit-email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="edit-fullName"
                    value={selectedUser.fullName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="edit-role"
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>



                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="edit-phone"
                    value={selectedUser.phone}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    pattern="[0-9]{10}"
                    placeholder="10 digit phone number"
                  />
                </div>

                <div>
                  <label htmlFor="edit-salaryPerHour" className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Salary
                  </label>
                  <input
                    type="number"
                    id="edit-salaryPerHour"
                    value={selectedUser.salaryPerHour}
                    onChange={(e) => setSelectedUser({ ...selectedUser, salaryPerHour: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    min="0"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingUser}
                    className="px-4 py-2 bg-theme-600 text-white rounded-md hover:bg-theme-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updatingUser && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {updatingUser ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
        }
      </div >
    </div >
  );
};

export default UserManagement;