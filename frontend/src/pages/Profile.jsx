import React from 'react';
import { useSelector } from 'react-redux';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import UserAvatar from '../components/UserAvatar';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#700606]"></div>
      </div>
    );
  }

  // Ensure contact number is displayed if available, else placeholder text (but user asked for no fake details, so we display what's there or 'Not set')
  const contactNumber = user.phone || 'Not provided';
  // Ensure salary is displayed
  const hourlyPay = user.salaryPerHour ? `AED ${user.salaryPerHour}/hr` : 'Not set';

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Profile Card Container */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

          {/* Header Banner */}
          <div className="h-48 bg-gradient-to-r from-[#700606] to-[#900808] relative">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            {/* Decorative Circles */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
          </div>

          {/* Profile Content */}
          <div className="relative px-8 sm:px-12 pb-12">

            {/* Avatar & Main Info (Overlapping Banner) */}
            <div className="-mt-20 flex flex-col items-center mb-8">
              <div className="relative p-1.5 bg-white rounded-full shadow-lg">
                <UserAvatar user={user} size="xl" className="w-32 h-32 text-4xl border-4 border-white" />
                <div className="absolute bottom-2 right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                  <span className="sr-only">Active</span>
                </div>
              </div>

              <div className="text-center mt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.fullName}</h1>
                <p className="text-gray-500 font-medium">@{user.username}</p>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold bg-[#700606]/5 text-[#700606] mt-3 border border-[#700606]/10 capitalize">
                  <BriefcaseIcon className="w-4 h-4" />
                  {user.role} Account
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-100 mb-8"></div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

              {/* Contact Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  Contact Information
                </h3>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-sm shrink-0">
                    <EnvelopeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Email Address</p>
                    <p className="text-sm font-bold text-gray-900 break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shadow-sm shrink-0">
                    <PhoneIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Contact Number</p>
                    <p className="text-sm font-bold text-gray-900">{contactNumber}</p>
                  </div>
                </div>
              </div>

              {/* Employment Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  Employment Details
                </h3>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#700606]/5 to-transparent border border-[#700606]/10 hover:border-[#700606]/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#700606] flex items-center justify-center text-white shadow-md shadow-[#700606]/20 shrink-0">
                    <CurrencyDollarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#700606] font-medium mb-0.5">Hourly Salary</p>
                    <p className="text-lg font-bold text-gray-900">{hourlyPay}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                    <CheckBadgeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium mb-0.5">Account Status</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      Verified & Active
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Note */}
            <div className="mt-12 text-center">
              <p className="text-xs text-gray-400">
                Need to update these details? Please contact the Admin.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;