import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex bg-gradient-to-br from-[#700606] to-[#a1a1a1] flex-col justify-center items-center px-12 text-white">
          <div className="text-center">
            <Link to="/" className="flex justify-center mb-8">
              <img
                className="h-24 w-auto"
                src="/zecorp_logo.png"
                alt="Thajira WorkFlow"
              />
            </Link>
            
            <p className="text-xl mb-4 ">
              Simple Project & Task Management for Zeecorp
            </p>
            <p className>
             Streamline your projects, tasks, and team productivity with a single platform.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="flex justify-center">
                <img
                  className="mx-auto h-16 w-auto"
                  src="/zecorp_logo.png"
                  alt="Thajira WorkFlow"
                />
              </Link>
           
              <p className="mt-4 text-center text-md  text-gray-900">
                Simple Project & Task Management for Zeecorp
              </p>
            </div>

            <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
              <Outlet />
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>© {new Date().getFullYear()} Zeecorp. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;