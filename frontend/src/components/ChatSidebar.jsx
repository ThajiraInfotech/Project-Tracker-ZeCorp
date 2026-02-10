import React, { useRef } from 'react';
import ChatInterface from './ChatInterface';

const ChatSidebar = ({ isOpen, onClose, entityType, entityId, entityTitle, entityData }) => {
  const sidebarRef = useRef(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full w-full max-w-[450px] bg-white shadow-2xl z-[70] transform flex flex-col slide-in-right font-sans"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#700606] to-[#4a0404] px-6 py-5 shadow-md z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-inner">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                {/* Online Indicator Status Dot (Optional Visual) */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#700606] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white tracking-wide">Discussion</h2>
                <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
                  <span className="opacity-75">Topic:</span>
                  <span className="bg-black/20 px-2 py-0.5 rounded text-white truncate max-w-[220px]" title={entityTitle}>
                    {entityTitle}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 transform hover:rotate-90"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <ChatInterface
          entityType={entityType}
          entityId={entityId}
          entityTitle={entityTitle}
          entityData={entityData}
          className="flex-1"
        />
      </div>
    </>
  );
};

export default ChatSidebar;