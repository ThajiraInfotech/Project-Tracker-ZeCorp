import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import Tasks from './Tasks';
import Projects from './Projects';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const Archives = () => {
    return (
        <div className="w-full px-0 py-4 md:container md:mx-auto md:px-4 md:py-6 bg-gradient-to-br from-slate-50 to-[#700606]/5 min-h-screen">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#700606] to-[#a04040] rounded-xl mx-2 md:mx-0 p-6 mb-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 shadow-inner">
                            <ArchiveBoxIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">
                                Archives
                            </h1>
                            <p className="text-white/80 text-sm mt-1">
                                Access and manage completed projects and tasks history
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Tab.Group>
                <div className="flex flex-col space-y-6">
                    {/* Tab Navigation */}
                    <div className="mx-2 md:mx-0">
                        <Tab.List className="flex space-x-2 rounded-xl bg-white p-1.5 shadow-sm border border-gray-100 max-w-md">
                            <Tab
                                className={({ selected }) =>
                                    classNames(
                                        'w-full rounded-lg py-3 text-sm font-semibold leading-5 transition-all duration-200 ease-out',
                                        'focus:outline-none focus:ring-2 ring-offset-2 ring-[#700606]/50',
                                        selected
                                            ? 'bg-gradient-to-r from-[#700606] to-[#900808] text-white shadow-md transform scale-[1.02]'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-[#700606]'
                                    )
                                }
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span>Archived Tasks</span>
                                </div>
                            </Tab>
                            <Tab
                                className={({ selected }) =>
                                    classNames(
                                        'w-full rounded-lg py-3 text-sm font-semibold leading-5 transition-all duration-200 ease-out',
                                        'focus:outline-none focus:ring-2 ring-offset-2 ring-[#700606]/50',
                                        selected
                                            ? 'bg-gradient-to-r from-[#700606] to-[#900808] text-white shadow-md transform scale-[1.02]'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-[#700606]'
                                    )
                                }
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span>Archived Projects</span>
                                </div>
                            </Tab>
                        </Tab.List>
                    </div>

                    {/* Content Panels */}
                    <Tab.Panels className="focus:outline-none">
                        <Tab.Panel className="focus:outline-none ring-offset-0">
                            <div className="bg-transparent rounded-2xl focus:outline-none">
                                <Tasks isArchivedView={true} isEmbedded={true} />
                            </div>
                        </Tab.Panel>

                        <Tab.Panel className="focus:outline-none ring-offset-0">
                            <div className="bg-transparent rounded-2xl focus:outline-none">
                                <Projects isArchivedView={true} isEmbedded={true} />
                            </div>
                        </Tab.Panel>
                    </Tab.Panels>
                </div>
            </Tab.Group>
        </div>
    );
};

export default Archives;
