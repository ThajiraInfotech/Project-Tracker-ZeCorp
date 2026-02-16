
import React, { useState, useEffect } from 'react';
import api from '../store/api';
import { toast } from 'react-toastify';
import {
    CalendarDaysIcon,
    UserGroupIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    LockClosedIcon,
    PlusIcon,
    TrashIcon,
    PencilIcon,
    UserIcon,
    CalendarIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import ChatInterface from './ChatInterface';
import UserAvatar from './UserAvatar';
import ExpenseModal from './ExpenseModal';
import expenseService from '../services/expenseService';
import { BanknotesIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

const StatusBadge = ({ status }) => {
    const statusConfig = {
        'todo': {
            color: 'bg-slate-100 text-slate-700 border-slate-200',
            icon: <ClockIcon className="w-3 h-3" />,
            label: 'To Do'
        },
        'in-progress': {
            color: 'bg-[#700606]/10 text-[#700606] border-[#700606]/20',
            icon: <ClockIcon className="w-3 h-3" />,
            label: 'In Progress'
        },
        'completed': {
            color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            icon: <CheckCircleSolid className="w-3 h-3" />,
            label: 'Completed'
        },
        'delayed': {
            color: 'bg-red-100 text-red-700 border-red-200',
            icon: <ExclamationTriangleIcon className="w-3 h-3" />,
            label: 'Delayed'
        }
    };

    const config = statusConfig[status] || statusConfig['todo'];

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

const TaskDetailsModal = ({
    taskId,
    onClose,
    onEditTask,
    currentUserRole,
    currentUserId,
    onTaskUpdated
}) => {
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);

    const [updateForm, setUpdateForm] = useState({
        status: ''
    });

    // Subtask Form State
    const [newSubtask, setNewSubtask] = useState({
        title: '',
        assignedTo: '',
        startDate: '',
        endDate: ''
    });
    const [subtaskStartDateType, setSubtaskStartDateType] = useState('text');
    const [subtaskEndDateType, setSubtaskEndDateType] = useState('text');

    // Expenses State
    const [taskExpenses, setTaskExpenses] = useState([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    const [updating, setUpdating] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    // Fetch all users for assignment (only for managers/admins)


    // Determine if subtasks exist (controls logic)
    const hasSubtasks = task?.subtasks && task.subtasks.length > 0;
    const hasIncompleteSubtasks = hasSubtasks && task.subtasks.some(st => st.status !== 'completed');

    // Determine if user can edit task/subtasks
    const isAssignedToSubtask = task?.subtasks?.some(st => {
        const assignedId = st.assignedTo?._id || st.assignedTo;
        return assignedId?.toString() === currentUserId;
    });
    const isAssignedStaff = (currentUserRole === 'staff' || currentUserRole === 'technician' || currentUserRole === 'finance') && (task?.assignedTo?._id === currentUserId || isAssignedToSubtask);
    const canManageSubtasks = currentUserRole === 'admin' || currentUserRole === 'manager' || ((currentUserRole === 'staff' || currentUserRole === 'technician' || currentUserRole === 'finance') && task?.assignedTo?._id === currentUserId);
    const canUpdateParent = isAssignedStaff || canManageSubtasks;

    // Fetch all users for assignment (only for managers/admins)
    useEffect(() => {
        const fetchAllUsers = async () => {
            if (canManageSubtasks) {
                try {
                    // accessible to staff as well (per authRoutes)
                    const response = await api.get('/auth/staff-for-manager');
                    if (response.data.success && response.data.users) {
                        setAllUsers(response.data.users);
                    }
                } catch (error) {
                    console.error('Error fetching users:', error);
                }
            }
        };
        fetchAllUsers();
    }, [canManageSubtasks]);

    const fetchTaskDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/tasks/${taskId}`);
            if (response.data.success && response.data.task) {
                setTask(response.data.task);
                setUpdateForm({
                    status: response.data.task.status
                });
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
            toast.error('Failed to fetch task details');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const fetchTaskExpenses = async () => {
        try {
            const data = await expenseService.getTaskExpenses(taskId);
            if (data.success) {
                setTaskExpenses(data.expenses);
            }
        } catch (error) {
            console.error('Error fetching task expenses:', error);
        }
    };

    useEffect(() => {
        if (taskId) {
            fetchTaskDetails();
            fetchTaskExpenses();
        }
    }, [taskId]);

    const handleUpdateTask = async () => {
        setUpdating(true);
        try {
            const payload = {};

            if (!hasSubtasks || !hasIncompleteSubtasks) {
                payload.status = updateForm.status;
            }

            if (!hasSubtasks || !hasIncompleteSubtasks) {
                const response = await api.patch(`/tasks/${taskId}/status`, payload);
                if (response.data.success) {
                    setTask(response.data.task);
                    if (onTaskUpdated) onTaskUpdated(response.data.task);
                    toast.success('Task updated successfully!');
                    onClose(); // Close the modal
                }
            }
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        } finally {
            setUpdating(false);
        }
    };

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        if (!newSubtask.title.trim()) return;

        try {
            const subtaskPayload = {
                title: newSubtask.title,
                status: 'todo',
                assignedTo: newSubtask.assignedTo || task.assignedTo._id, // Default to task assignee
                startDate: newSubtask.startDate || undefined,
                endDate: newSubtask.endDate || undefined
            };

            const updatedSubtasks = [
                ...(task.subtasks || []),
                subtaskPayload
            ];

            const response = await api.put(`/tasks/${taskId}`, {
                subtasks: updatedSubtasks
            });

            if (response.data.success) {
                setTask(response.data.task);
                if (onTaskUpdated) onTaskUpdated(response.data.task);
                setNewSubtask({ title: '', assignedTo: '', startDate: '', endDate: '' });
                toast.success('Subtask added');
            }
        } catch (error) {
            console.error('Error adding subtask:', error);
            toast.error('Failed to add subtask');
        }
    };

    const handleToggleSubtask = async (subtaskId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';

            // Use specific endpoint for status toggle to handle permissions correctly
            const response = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}/status`, {
                status: newStatus
            });

            if (response.data.success) {
                setTask(response.data.task);
                if (onTaskUpdated) onTaskUpdated(response.data.task);
            }
        } catch (error) {
            console.error('Error updating subtask:', error);
            toast.error(error.response?.data?.message || 'Failed to update subtask');
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        if (!window.confirm('Delete this subtask?')) return;
        try {
            const updatedSubtasks = task.subtasks.filter(st => st._id !== subtaskId);
            const response = await api.put(`/tasks/${taskId}`, {
                subtasks: updatedSubtasks
            });

            if (response.data.success) {
                setTask(response.data.task);
                if (onTaskUpdated) onTaskUpdated(response.data.task);
                toast.success('Subtask deleted');
            }
        } catch (error) {
            console.error('Error deleting subtask:', error);
            toast.error('Failed to delete subtask');
        }
    };



    // Helper to get assignee name
    const getAssigneeName = (userId) => {
        if (!userId) return 'Unassigned';
        // Check task assignedTo
        if (task.assignedTo?._id === userId) return task.assignedTo.username;

        // Check if in allUsers (preferred for reliability)
        const user = allUsers.find(u => u._id === userId);
        if (user) return user.username;

        // Check project team
        const member = task.project?.teamMembers?.find(m => m._id === userId);
        if (member) return member.username;
        // Check manager
        if (task.project?.manager?._id === userId) return task.project.manager.username;
        return 'Unknown User';
    };

    if (loading || !task) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 bg-theme-50 border-b border-theme-100 flex justify-between items-start shrink-0">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {task.project?.projectName && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                                        <UserGroupIcon className="w-4 h-4" />
                                        {task.project.projectName}
                                        {task.project.jobOrder && (
                                            <span className="text-blue-600 font-medium ml-1 opacity-90">
                                                #{task.project.jobOrder}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {task.label && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                        {task.label}
                                    </span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${task.status !== 'completed' && new Date(task.deadline) < new Date() ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100' : 'text-gray-500'}`}>
                                    <CalendarDaysIcon className="w-3 h-3" />
                                    {task.deadline ? formatDateDDMMYYYY(task.deadline) : 'No Deadline'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-theme-900 leading-tight">{task.title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-theme-400 hover:text-theme-700 transition-colors p-1 rounded-full hover:bg-theme-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                                <p className="text-gray-600">{task.description}</p>
                            </div>

                            {/* Read Only Banner (Hide if Supervisor, as they have their own banner) */}
                            {task.readOnly && (!task.cc || (currentUserId !== task.cc._id && currentUserId !== task.cc)) && (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-yellow-800">
                                        You can view this task because you are assigned to a subtask.
                                    </p>
                                </div>
                            )}

                            {/* Supervisor Banner (Visible to CC even if readOnly) */}
                            {task.cc && (currentUserId === task.cc._id || currentUserId === task.cc) && (
                                <div className="bg-purple-50 border border-purple-100 rounded-md p-3 mb-4 flex items-center gap-2">
                                    <EyeIcon className="w-5 h-5 text-purple-500" />
                                    <p className="text-sm text-purple-700">You can view this task because you are assigned as a Supervisor (CC).</p>
                                </div>
                            )}

                            {/* Subtasks Section */}
                            <div>
                                <h4 className="text-xs font-bold text-theme-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-theme-100 pb-2">
                                    <span className="text-theme-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    </span>
                                    Subtasks
                                    {hasSubtasks && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{task.subtasks.length}</span>}
                                </h4>

                                {/* List Subtasks */}
                                <div className="space-y-3 mb-4">
                                    {task.subtasks && task.subtasks.map(subtask => {
                                        const assignedId = subtask.assignedTo?._id ? subtask.assignedTo._id.toString() : subtask.assignedTo?.toString();
                                        const isSubtaskAssignedToMe = assignedId === currentUserId?.toString();
                                        const canToggle = canManageSubtasks || isSubtaskAssignedToMe;

                                        return (
                                            <div key={subtask._id} className="flex flex-col bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-gray-200 transition-colors">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <div className="pt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={subtask.status === 'completed'}
                                                                onChange={() => canToggle && handleToggleSubtask(subtask._id, subtask.status)}
                                                                disabled={!canToggle}
                                                                className={`w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-medium ${subtask.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                                {subtask.title}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                                                <div className="flex items-center gap-1.5">
                                                                    <UserAvatar
                                                                        user={subtask.assignedTo || { username: getAssigneeName(subtask.assignedTo) }}
                                                                        size="xs"
                                                                        className="w-4 h-4 text-[10px]"
                                                                    />
                                                                    {subtask.assignedTo?.username || getAssigneeName(subtask.assignedTo)}
                                                                </div>
                                                                {(subtask.startDate || subtask.endDate) && (
                                                                    <div className="flex items-center gap-1">
                                                                        <CalendarIcon className="w-3 h-3" />
                                                                        {subtask.startDate ? formatDateDDMMYYYY(subtask.startDate) : 'Start'}
                                                                        {' - '}
                                                                        {subtask.endDate ? formatDateDDMMYYYY(subtask.endDate) : 'End'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {canManageSubtasks && !task.readOnly && (
                                                        <button
                                                            onClick={() => handleDeleteSubtask(subtask._id)}
                                                            className="text-gray-400 hover:text-red-600 p-1"
                                                            title="Delete subtask"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {!hasSubtasks && (
                                        <p className="text-sm text-gray-400 italic">No subtasks yet.</p>
                                    )}
                                </div>

                                {/* Add Subtask Form (Manager/Admin only) */}
                                {canManageSubtasks && !task.readOnly && (
                                    <form onSubmit={handleAddSubtask} className="border border-gray-200 rounded-lg p-3 bg-white">
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Add New Subtask</h5>
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={newSubtask.title}
                                                onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                                                placeholder="Subtask title..."
                                                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent highlight-white/50"
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <select
                                                    value={newSubtask.assignedTo}
                                                    onChange={(e) => setNewSubtask({ ...newSubtask, assignedTo: e.target.value })}
                                                    className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Assign to (Default: Parent Task Owner)</option>
                                                    <optgroup label="All Users">
                                                        {allUsers.length > 0 ? (
                                                            allUsers.map(user => (
                                                                <option key={user._id} value={user._id}>
                                                                    {user.username} ({user.role})
                                                                </option>
                                                            ))
                                                        ) : (
                                                            <>
                                                                {task.project?.teamMembers?.map(member => (
                                                                    <option key={member._id} value={member._id}>
                                                                        {member.username} ({member.email})
                                                                    </option>
                                                                ))}
                                                                {task.project?.manager && (
                                                                    <option value={task.project.manager._id}>
                                                                        {task.project.manager.username} (Manager)
                                                                    </option>
                                                                )}
                                                            </>
                                                        )}
                                                    </optgroup>
                                                </select>
                                                <div className="flex gap-2">
                                                    <input
                                                        type={subtaskStartDateType}
                                                        value={subtaskStartDateType === 'date' ? newSubtask.startDate : formatDateDDMMYYYY(newSubtask.startDate)}
                                                        onChange={(e) => setNewSubtask({ ...newSubtask, startDate: e.target.value })}
                                                        onFocus={() => setSubtaskStartDateType('date')}
                                                        onBlur={() => setSubtaskStartDateType('text')}
                                                        placeholder="Start Date"
                                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 text-gray-500"
                                                        title="Start Date"
                                                    />
                                                    <input
                                                        type={subtaskEndDateType}
                                                        value={subtaskEndDateType === 'date' ? newSubtask.endDate : formatDateDDMMYYYY(newSubtask.endDate)}
                                                        onChange={(e) => setNewSubtask({ ...newSubtask, endDate: e.target.value })}
                                                        onFocus={() => setSubtaskEndDateType('date')}
                                                        onBlur={() => setSubtaskEndDateType('text')}
                                                        placeholder="End Date"
                                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 text-gray-500"
                                                        title="End Date"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!newSubtask.title.trim()}
                                                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <PlusIcon className="w-4 h-4" /> Add Subtask
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Staff hint if they can't add */}
                                {(!canManageSubtasks || task.readOnly) && !hasSubtasks && (
                                    <p className="text-xs text-gray-400 mt-1">Only managers can add subtasks.</p>
                                )}
                            </div>

                            <div className="border-t border-gray-100"></div>

                            {/* Execution Section */}
                            <div>
                                <h4 className="text-xs font-bold text-theme-800 uppercase tracking-widest mb-4 border-b border-theme-100 pb-2 flex items-center gap-2">
                                    <span className="text-theme-500"><ClockIcon className="w-4 h-4" /></span>
                                    Execution Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-medium text-gray-700">Status</h3>
                                            {hasIncompleteSubtasks && (
                                                <div className="group relative">
                                                    <LockClosedIcon className="w-4 h-4 text-gray-400" />
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-gray-800 text-white text-xs rounded p-2 z-10">
                                                        Status is locked until all subtasks are completed
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="scale-110 transform origin-left">
                                            <StatusBadge status={task.status} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-1">Assigned To</h3>
                                        <div className="flex items-center gap-2">
                                            <UserAvatar
                                                user={task.assignedTo}
                                                size="sm"
                                            />
                                            <p className="text-gray-600">{task.assignedTo?.username || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-1">Timeline</h3>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Start:</span> {task.startDate ? formatDateDDMMYYYY(task.startDate) : 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">{task.status === 'completed' ? 'Done:' : 'Due:'}</span> {task.status === 'completed'
                                                ? (task.completionDate ? formatDateDDMMYYYY(task.completionDate) : 'N/A')
                                                : formatDateDDMMYYYY(task.deadline)
                                            }
                                            {task.status !== 'completed' && task.isOverdue && <span className="text-red-600"> • Overdue</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            {/* Progress Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 border-b border-theme-100 pb-2">
                                    <h4 className="text-xs font-bold text-theme-800 uppercase tracking-widest flex items-center gap-2">
                                        <span className="text-theme-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></span>
                                        Progress
                                    </h4>
                                    {hasSubtasks && (
                                        <div className="group relative">
                                            <LockClosedIcon className="w-4 h-4 text-gray-400" />
                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-gray-800 text-white text-xs rounded p-2 z-10">
                                                Calculated automatically from subtasks
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-700">Completion</h3>
                                        <span className="text-lg font-semibold text-gray-900">{task.progress || 0}%</span>
                                    </div>
                                    <div className="w-full h-4 bg-gray-200 rounded-full mb-2">
                                        <div
                                            className="h-4 bg-primary-600 rounded-full transition-all duration-300"
                                            style={{ width: `${task.progress || 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {hasSubtasks ? 'Progress updated automatically' : 'Progress updated by staff'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-gray-100"></div>

                            {/* Context Section */}
                            <div>
                                <h4 className="text-xs font-bold text-theme-800 uppercase tracking-widest mb-4 border-b border-theme-100 pb-2 flex items-center gap-2">
                                    <span className="text-theme-500"><UserGroupIcon className="w-4 h-4" /></span>
                                    Context
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-1">Project</h3>
                                        <p className="text-gray-600">{task.project?.projectName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-1">Supervisor (CC)</h3>
                                        <div className="flex items-center gap-2">
                                            {task.cc ? (
                                                <>
                                                    <UserAvatar
                                                        user={task.cc}
                                                        size="sm"
                                                    />
                                                    <p className="text-gray-600">{task.cc.username}</p>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 text-sm">None</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-1">Priority</h3>
                                        <span className="text-sm text-gray-500">{task.priority} priority</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-700 mb-1">Created By</h3>
                                        <div className="flex items-center gap-2">
                                            <UserAvatar
                                                user={task.createdBy}
                                                size="sm"
                                            />
                                            <p className="text-gray-600">{task.createdBy?.username || 'Unknown'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100"></div>

                        {/* Expenses Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3 border-b border-theme-100 pb-2">
                                <h4 className="text-xs font-bold text-theme-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-theme-500"><BanknotesIcon className="w-4 h-4" /></span>
                                    Expenses
                                </h4>
                                {(isAssignedStaff || canManageSubtasks) && (
                                    <button
                                        onClick={() => setShowExpenseModal(true)}
                                        className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        <PlusIcon className="w-3 h-3" /> Add Expense
                                    </button>
                                )}
                            </div>

                            {taskExpenses.length > 0 ? (
                                <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                    {taskExpenses.map(expense => (
                                        <div key={expense._id} className="p-3 border-b border-gray-100 last:border-0 flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-medium text-gray-900">{expense.title}</p>
                                                <p className="text-xs text-gray-500">{formatDateDDMMYYYY(expense.date)} • {expense.vendor}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900">AED {expense.amount.toLocaleString()}</p>
                                                {expense.receipt && (
                                                    <a href={expense.receipt} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Receipt</a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-2 bg-gray-100 text-right text-xs font-bold text-gray-700">
                                        Total: AED {taskExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No expenses recorded for this task.</p>
                            )}
                        </div>

                        {/* Update form for staff (Hidden/Disabled controls if subtasks exist or readOnly) */}
                        {canUpdateParent && !task.readOnly && (
                            <div className="border-t pt-4">
                                <h3 className="font-medium text-gray-700 mb-4">Task Updates</h3>

                                {/* Supervisor Banner */}
                                {/* Supervisor Banner */}
                                {task.cc && (currentUserId === task.cc._id || currentUserId === task.cc) && (
                                    <div className="bg-purple-50 border border-purple-100 rounded-md p-3 mb-4 flex items-center gap-2">
                                        <EyeIcon className="w-5 h-5 text-purple-500" />
                                        <p className="text-sm text-purple-700">You can view this task because you are assigned as a Supervisor (CC).</p>
                                    </div>
                                )}
                                {!hasIncompleteSubtasks && (
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select
                                                value={updateForm.status}
                                                onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-theme-500 transition-shadow"
                                            >
                                                <option value="todo">To Do</option>
                                                <option value="in-progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="delayed">Delayed</option>
                                            </select>
                                        </div>
                                        <div>
                                            {/* Progress is automated based on status */}
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
                                            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 text-sm">
                                                {updateForm.status === 'completed' ? '100%' : updateForm.status === 'in-progress' ? '10%' : '0%'} (Automated)
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {hasIncompleteSubtasks && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 flex items-center gap-2">
                                        <LockClosedIcon className="w-5 h-5 text-blue-500" />
                                        <p className="text-sm text-blue-700">Status is defined by subtasks. Complete all subtasks to unlock parent task status.</p>
                                    </div>
                                )}



                                {!hasIncompleteSubtasks && (
                                    <button
                                        onClick={handleUpdateTask}
                                        disabled={updating}
                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {updating ? 'Updating...' : 'Update Task'}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="border-t border-gray-100"></div>

                        {/* Discussion Section */}
                        <div className="flex flex-col h-[500px]">
                            <div className="flex items-center gap-2 mb-3 border-b border-theme-100 pb-2 pt-4">
                                <h4 className="text-xs font-bold text-theme-800 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-theme-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </span>
                                    Discussion
                                </h4>
                            </div>
                            <ChatInterface
                                entityType="task"
                                entityId={taskId}
                                entityTitle={task.title}
                                entityData={task}
                                className="border border-gray-200 rounded-lg overflow-hidden flex-1"
                            />
                        </div>
                        {/* Footer / Actions */}
                    </div>
                    {/* Footer / Actions */}
                    <div className="px-6 py-4 bg-theme-50 border-t border-theme-100 shrink-0 flex justify-end gap-3 rounded-b-xl">


                        {canManageSubtasks && (
                            <button
                                onClick={() => onEditTask(task)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
                            >
                                Edit Details
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>



            {/* Expense Modal */}
            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                projectId={task.project?._id || task.project}
                taskId={taskId}
                onExpenseAdded={() => {
                    fetchTaskExpenses();
                    if (onTaskUpdated) onTaskUpdated(task);
                }}
            />
        </>
    );
};

export default TaskDetailsModal;
