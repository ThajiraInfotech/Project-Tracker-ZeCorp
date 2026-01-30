
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
    CalendarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import ChatSidebar from './ChatSidebar';
import UserAvatar from './UserAvatar';
import ExpenseModal from './ExpenseModal';
import expenseService from '../services/expenseService';
import { BanknotesIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';

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
    const [showChatSidebar, setShowChatSidebar] = useState(false);
    const [updateForm, setUpdateForm] = useState({
        status: '',
        progress: 0,
        comment: ''
    });

    // Subtask Form State
    const [newSubtask, setNewSubtask] = useState({
        title: '',
        assignedTo: '',
        startDate: '',
        endDate: ''
    });

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
    const isAssignedStaff = currentUserRole === 'staff' && (task?.assignedTo?._id === currentUserId || isAssignedToSubtask);
    const canManageSubtasks = currentUserRole === 'admin' || currentUserRole === 'manager';
    const canUpdateParent = isAssignedStaff || canManageSubtasks;

    // Fetch all users for assignment (only for managers/admins)
    useEffect(() => {
        const fetchAllUsers = async () => {
            if (canManageSubtasks) {
                try {
                    const response = await api.get('/auth/users');
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
                    status: response.data.task.status,
                    progress: response.data.task.progress || 0,
                    comment: ''
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
                if (updateForm.status !== 'completed') {
                    payload.progress = updateForm.progress;
                }
            }

            if (updateForm.comment.trim()) {
                await api.post(`/tasks/${taskId}/comments`, {
                    text: updateForm.comment
                });
            }

            if (!hasSubtasks || !hasIncompleteSubtasks) {
                const response = await api.patch(`/tasks/${taskId}/status`, payload);
                if (response.data.success) {
                    setTask(response.data.task);
                    if (onTaskUpdated) onTaskUpdated(response.data.task);
                    toast.success('Task updated successfully!');
                }
            } else {
                if (updateForm.comment.trim()) {
                    toast.success('Comment added!');
                    fetchTaskDetails();
                }
            }
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        } finally {
            setUpdating(false);
            setUpdateForm(prev => ({ ...prev, comment: '' }));
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

    const handleAddCommentOnly = async () => {
        if (!updateForm.comment.trim()) return;
        try {
            await api.post(`/tasks/${taskId}/comments`, {
                text: updateForm.comment
            });
            toast.success('Comment added!');
            setUpdateForm(prev => ({ ...prev, comment: '' }));
            fetchTaskDetails();
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    // Helper to get assignee name
    const getAssigneeName = (userId) => {
        if (!userId) return 'Unassigned';
        // Check task assignedTo
        if (task.assignedTo?._id === userId) return task.assignedTo.fullName;

        // Check if in allUsers (preferred for reliability)
        const user = allUsers.find(u => u._id === userId);
        if (user) return user.fullName;

        // Check project team
        const member = task.project?.teamMembers?.find(m => m._id === userId);
        if (member) return member.fullName;
        // Check manager
        if (task.project?.manager?._id === userId) return task.project.manager.fullName;
        return 'Unknown User';
    };

    if (loading || !task) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2">Tasks › {task.title}</p>
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                            <p className="text-gray-600">{task.description}</p>
                        </div>

                        {/* Read Only Banner */}
                        {task.readOnly && (
                            <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-sm text-yellow-800">
                                    You can view this task because you are assigned to a subtask.
                                </p>
                            </div>
                        )}

                        {/* Subtasks Section */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                                                                    user={subtask.assignedTo || { fullName: getAssigneeName(subtask.assignedTo) }}
                                                                    size="xs"
                                                                    className="w-4 h-4 text-[10px]"
                                                                />
                                                                {subtask.assignedTo?.fullName || getAssigneeName(subtask.assignedTo)}
                                                            </div>
                                                            {(subtask.startDate || subtask.endDate) && (
                                                                <div className="flex items-center gap-1">
                                                                    <CalendarIcon className="w-3 h-3" />
                                                                    {subtask.startDate ? new Date(subtask.startDate).toLocaleDateString() : 'Start'}
                                                                    {' - '}
                                                                    {subtask.endDate ? new Date(subtask.endDate).toLocaleDateString() : 'End'}
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
                                                                {user.fullName} ({user.role})
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <>
                                                            {task.project?.teamMembers?.map(member => (
                                                                <option key={member._id} value={member._id}>
                                                                    {member.fullName} ({member.email})
                                                                </option>
                                                            ))}
                                                            {task.project?.manager && (
                                                                <option value={task.project.manager._id}>
                                                                    {task.project.manager.fullName} (Manager)
                                                                </option>
                                                            )}
                                                        </>
                                                    )}
                                                </optgroup>
                                            </select>
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    value={newSubtask.startDate}
                                                    onChange={(e) => setNewSubtask({ ...newSubtask, startDate: e.target.value })}
                                                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 text-gray-500"
                                                    title="Start Date"
                                                />
                                                <input
                                                    type="date"
                                                    value={newSubtask.endDate}
                                                    onChange={(e) => setNewSubtask({ ...newSubtask, endDate: e.target.value })}
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
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Execution</h4>
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
                                        <p className="text-gray-600">{task.assignedTo?.fullName || 'Unassigned'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-700 mb-1">
                                        {task.status === 'completed' ? 'Completed on' : 'Due'}
                                    </h3>
                                    <p className="text-gray-600">
                                        {task.status === 'completed'
                                            ? (task.completionDate ? new Date(task.completionDate).toLocaleDateString() : 'N/A')
                                            : new Date(task.deadline).toLocaleDateString()
                                        }
                                        {task.status !== 'completed' && task.isOverdue && <span className="text-red-600"> • Overdue</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100"></div>

                        {/* Progress Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Progress</h4>
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
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Context</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <h3 className="font-medium text-gray-700 mb-1">Project</h3>
                                    <p className="text-gray-600">{task.project?.projectName || 'N/A'}</p>
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
                                        <p className="text-gray-600">{task.createdBy?.fullName || 'Unknown'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100"></div>

                    {/* Expenses Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Expenses</h4>
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
                                            <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()} • {expense.vendor}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">₹{expense.amount.toLocaleString()}</p>
                                            {expense.receipt && (
                                                <a href={expense.receipt} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Receipt</a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="p-2 bg-gray-100 text-right text-xs font-bold text-gray-700">
                                    Total: ₹{taskExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
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

                            {!hasIncompleteSubtasks && (
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={updateForm.status}
                                            onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="todo">To Do</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="delayed">Delayed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={updateForm.progress}
                                            onChange={(e) => setUpdateForm({ ...updateForm, progress: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {hasIncompleteSubtasks && (
                                <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 flex items-center gap-2">
                                    <LockClosedIcon className="w-5 h-5 text-blue-500" />
                                    <p className="text-sm text-blue-700">Status is defined by subtasks. Complete all subtasks to unlock parent task status.</p>
                                </div>
                            )}

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    placeholder="Add a comment (optional)"
                                    value={updateForm.comment}
                                    onChange={(e) => setUpdateForm({ ...updateForm, comment: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                                />
                                {hasIncompleteSubtasks ? (
                                    <button
                                        onClick={handleAddCommentOnly}
                                        disabled={!updateForm.comment.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Add Comment
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAddCommentOnly}
                                        disabled={!updateForm.comment.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Add Comment
                                    </button>
                                )}
                            </div>

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
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowChatSidebar(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                    </button>

                    {(canManageSubtasks || (isAssignedStaff && !hasSubtasks)) && (
                        <button
                            onClick={() => onEditTask(task)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Edit Task Details
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>


            {/* Chat Sidebar */}
            {showChatSidebar && (
                <ChatSidebar
                    isOpen={showChatSidebar}
                    onClose={() => setShowChatSidebar(false)}
                    entityType="task"
                    entityId={taskId}
                    entityTitle={task.title}
                    entityData={task}
                />
            )}

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
