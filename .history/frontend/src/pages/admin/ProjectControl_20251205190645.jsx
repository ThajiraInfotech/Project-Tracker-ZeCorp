import React from 'react';

const ProjectControl = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Control Center</h1>
          <p className="text-gray-600 mt-1">Enterprise-level project management and oversight</p>
        </div>
        <button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Add New Project
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Projects</h2>
          <p className="text-gray-600 text-sm">Manage and monitor all projects in the system</p>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">Project control functionality is now available!</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectControl;
