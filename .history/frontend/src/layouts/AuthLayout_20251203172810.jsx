import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link to="/" className="flex justify-center">
            <img
              className="mx-auto h-12 w-auto"
              src="/logo.svg"
              alt="Thajira WorkFlow"
            />
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Thajira WorkFlow
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Simple Project & Task Management for Zeecorp
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Zeecorp. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;