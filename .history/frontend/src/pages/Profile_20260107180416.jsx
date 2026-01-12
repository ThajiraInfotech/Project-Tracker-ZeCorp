import React from 'react';
import { useSelector } from 'react-redux';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
            <p className="text-slate-600 mt-1">View your complete account information</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-slate-500">
              Role: <span className="font-medium capitalize text-slate-700">{user?.role}</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Account Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <div className="relative">
              <IdentificationIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={user?.username || ''}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={user?.fullName || ''}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={user?.email || ''}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="tel"
                value={user?.phone || ''}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                disabled
                placeholder="Not provided"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;