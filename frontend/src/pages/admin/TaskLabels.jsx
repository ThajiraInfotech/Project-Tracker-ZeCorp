import React, { useEffect, useState } from 'react';
import api from '../../store/api';
import { toast } from 'react-toastify';
import LabelBadge from '../../components/LabelBadge';
import { PlusIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

const TaskLabels = () => {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const response = await api.get('/task-labels');
      setLabels(response.data.labels || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newLabel.trim();
    if (!name) {
      toast.error('Enter a label name');
      return;
    }

    try {
      setCreating(true);
      await api.post('/task-labels', { name });
      toast.success('Label created');
      setNewLabel('');
      fetchLabels();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create label');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (label) => {
    if (!window.confirm(`Delete label "${label.name}"? Existing tasks keep this label; it will no longer appear when creating new tasks.`)) {
      return;
    }

    try {
      setDeletingId(label._id);
      const response = await api.delete(`/task-labels/${label._id}`);
      toast.success(response.data.message || 'Label deleted');
      fetchLabels();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete label');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TagIcon className="h-7 w-7 text-slate-600" />
          Task Labels
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Create and remove labels used when assigning tasks. Deleting a label does not change existing tasks.
        </p>
      </div>

      <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New label name (e.g. ADMIN)"
          maxLength={50}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
          {creating ? 'Adding...' : 'Add Label'}
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : labels.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">No labels yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {labels.map((label) => (
              <li key={label._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <LabelBadge label={label.name} />
                <button
                  type="button"
                  onClick={() => handleDelete(label)}
                  disabled={deletingId === label._id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                  title="Delete label"
                >
                  <TrashIcon className="h-4 w-4" />
                  {deletingId === label._id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaskLabels;
