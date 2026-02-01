import React, { useState } from 'react';
import { X, Upload, Loader2, Calendar, Tag, FileText, ShoppingBag } from 'lucide-react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import expenseService from '../services/expenseService';
import { toast } from 'react-toastify';

const ExpenseModal = ({ isOpen, onClose, projectId, taskId, onExpenseAdded }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Other',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        receipt: null
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({
                ...prev,
                receipt: e.target.files[0]
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSubmit = {
                ...formData,
                projectId,
                taskId: taskId || undefined // Only send if exists
            };

            await expenseService.createExpense(dataToSubmit);
            toast.success('Expense added successfully');
            onExpenseAdded(); // Refresh parent
            onClose();
            // Reset form
            setFormData({
                title: '',
                amount: '',
                category: 'Other',
                vendor: '',
                date: new Date().toISOString().split('T')[0],
                notes: '',
                receipt: null
            });
        } catch (error) {
            console.error('Error adding expense:', error);
            toast.error(error.response?.data?.message || 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 ring-1 ring-black/5">
                    {/* Header with gradient */}
                    <div className="px-4 py-4 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-xl leading-6 font-bold text-gray-900 flex items-center gap-2" id="modal-title">
                            <div className="p-1.5 bg-theme-500/10 rounded-lg">
                                <CurrencyDollarIcon className="w-5 h-5 text-theme-600" />
                            </div>
                            <span>Add Expense {taskId ? 'for Task' : 'for Project'}</span>
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200/50 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-6">

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Title</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileText size={16} className="text-gray-500" />
                                    </div>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-theme-500 block w-full pl-10 p-2.5 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                                        placeholder="e.g. Server Cost, Material Purchase"
                                    />

                                </div>
                            </div>

                            {/* Amount & Date Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-bold text-xs">
                                            AED
                                        </div>
                                        <input
                                            type="number"
                                            name="amount"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-theme-500 block w-full pl-10 p-2.5 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            value={formData.date}
                                            onChange={handleChange}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-theme-500 block w-full pl-10 p-2.5 placeholder-gray-400 transition-all duration-200 hover:border-gray-400 text-right"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Vendor & Category Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ShoppingBag size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            type="text"
                                            name="vendor"
                                            required
                                            value={formData.vendor}
                                            onChange={handleChange}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-theme-500 block w-full pl-10 p-2.5 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                                            placeholder="e.g. AWS, Hardware Store"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Tag size={16} className="text-gray-500" />
                                        </div>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-theme-500 block w-full pl-10 p-2.5 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                                        >
                                            <option value="Material">Material</option>
                                            <option value="Labor">Labor</option>
                                            <option value="Software">Software</option>
                                            <option value="Equipment">Equipment</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    rows="2"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-theme-500 focus:border-theme-500 block w-full p-2.5 placeholder-gray-400 transition-all duration-200 hover:border-gray-400"
                                    placeholder="Additional details..."
                                />
                            </div>

                            {/* Receipt Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (Optional)</label>
                                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-all duration-200 ${formData.receipt ? 'border-theme-500 bg-theme-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}>
                                    <div className="space-y-1 text-center">
                                        <Upload className={`mx-auto h-12 w-12 ${formData.receipt ? 'text-theme-600' : 'text-gray-400'}`} />
                                        <div className="flex text-sm text-gray-500">
                                            <label htmlFor="receipt-upload" className="relative cursor-pointer rounded-md font-medium text-theme-600 hover:text-theme-700 focus-within:outline-none transition-colors">
                                                <span>Upload a file</span>
                                                <input id="receipt-upload" name="receipt" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                                        {formData.receipt && (
                                            <div className="flex items-center justify-center gap-2 text-sm text-theme-700 mt-2 font-medium bg-theme-100 py-1 px-3 rounded-full mx-auto w-max">
                                                <FileText size={14} />
                                                {formData.receipt.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 sm:mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium border border-gray-300 shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-gradient-to-r from-theme-700 to-theme-600 text-white rounded-lg hover:from-theme-800 hover:to-theme-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-theme-500/20"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    {loading ? 'Adding...' : 'Add Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseModal;
