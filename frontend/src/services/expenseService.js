import api from '../store/api';

const createExpense = async (expenseData) => {
    const formData = new FormData();
    for (const key in expenseData) {
        if (expenseData[key] !== null && expenseData[key] !== undefined) {
            formData.append(key, expenseData[key]);
        }
    }

    const response = await api.post('/expenses', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

const getProjectExpenses = async (projectId) => {
    const response = await api.get(`/expenses/project/${projectId}`);
    return response.data;
};

const getTaskExpenses = async (taskId) => {
    const response = await api.get(`/expenses/task/${taskId}`);
    return response.data;
};

const deleteExpense = async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
};

const expenseService = {
    createExpense,
    getProjectExpenses,
    getTaskExpenses,
    deleteExpense,
};

export default expenseService;
