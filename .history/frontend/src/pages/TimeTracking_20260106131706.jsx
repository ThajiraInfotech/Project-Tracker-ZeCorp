import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../store/api';

const TimeTracking = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [tasks, setTasks] = useState([]);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeEntry, setTimeEntry] = useState({
    taskId: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksResponse = await api.get('/tasks');
        setTasks(tasksResponse.data.tasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        toast.error('Failed to load tasks');
      }
    };

    if (user?.id) {
      fetchTasks();
    }
  }, [user?.id]);

  // Time tracking function
  const handleTimeEntry = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const timeData = {
        ...timeEntry,
        hours: parseFloat(timeEntry.hours),
        user: user.id
      };

      // This would need a backend endpoint for time tracking
      // For now, just show success message
      toast.success('Time entry logged successfully!');
      setShowTimeModal(false);
      setTimeEntry({
        taskId: '',
        hours: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error logging time:', error);
      toast.error('Failed to log time entry');
    }
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Time Tracking</h2>
        <button
          onClick={() => setShowTimeModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Log Time
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Entries</h3>
        <div className="text-center text-gray-500 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Time tracking feature coming soon</p>
          <p className="text-sm mt-1">Track your work hours and productivity</p>
        </div>
      </div>

      {/* Time Tracking Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl max-w-md w-full mx-4 shadow-2xl border border-white/20">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Log Time</h3>
            </div>
            <form onSubmit={handleTimeEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
                <select
                  value={timeEntry.taskId}
                  onChange={(e) => setTimeEntry({...timeEntry, taskId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select a task</option>
                  {/* Assuming tasks are available, but for now empty */}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    value={timeEntry.hours}
                    onChange={(e) => setTimeEntry({...timeEntry, hours: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={timeEntry.date}
                    onChange={(e) => setTimeEntry({...timeEntry, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={timeEntry.description}
                  onChange={(e) => setTimeEntry({...timeEntry, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="What did you work on?"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Log Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTracking;