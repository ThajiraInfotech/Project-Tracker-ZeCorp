import React from 'react';

const DiscussionForm = ({
  discussionContent,
  setDiscussionContent,
  addingDiscussion,
  handleAddDiscussion,
  selectedFiles,
  setSelectedFiles,
  entityType,
  entityId,
  entity,
  discussions,
  formatDiscussionContent,
  canAdd = true
}) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 shadow-sm border border-indigo-100">
      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-3 text-xl">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Activity & Discussion
      </h3>

      {/* Add Discussion Form */}
      {canAdd && (
        <div className="mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <textarea
            placeholder="Start a discussion... Type @username to mention team members"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={3}
            value={discussionContent}
            onChange={(e) => setDiscussionContent(e.target.value)}
            style={{ minHeight: '80px', maxHeight: '120px', resize: 'vertical' }}
            onKeyDown={(e) => {
              // Allow Enter to submit if content exists, but don't prevent default
              if (e.key === 'Enter' && !e.shiftKey && discussionContent?.trim()) {
                e.preventDefault();
                handleAddDiscussion();
              }
            }}
          />
            
          {/* File Attachment Section */}
          <div className="mt-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Attach Files</span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="hidden"
                />
              </label>
              {selectedFiles && selectedFiles.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            
            {/* File Preview */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from(selectedFiles).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-gray-500">
              Tip: Type @username to mention team members
            </div>
            <button
              onClick={handleAddDiscussion}
              disabled={!discussionContent.trim() || addingDiscussion}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingDiscussion ? 'Posting...' : 'Post Discussion'}
            </button>
          </div>
        </div>
      </div>

      {/* Discussions List */}
      <div className="space-y-4">
        {discussions && discussions.length > 0 ? (
          discussions.map((discussion, index) => {
            // Get all users for mention highlighting based on entity type
            const allUsers = [];
            if (entityType === 'project') {
              if (entity.manager) allUsers.push(entity.manager);
              if (entity.teamMembers) allUsers.push(...entity.teamMembers);
            } else if (entityType === 'task') {
              if (entity.assignedTo) allUsers.push(entity.assignedTo);
              if (entity.project?.teamMembers) allUsers.push(...entity.project.teamMembers);
              if (entity.project?.manager) allUsers.push(entity.project.manager);
            }

            const formattedContent = formatDiscussionContent(discussion, allUsers);

            return (
              <div key={discussion._id || index} className={`p-4 rounded-lg ${discussion.system ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'} ${discussion.parentDiscussionId ? 'ml-8 border-l-4 border-l-gray-300' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">{discussion.author?.fullName || 'Unknown'}</span>
                  {discussion.system && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">System</span>}
                  {discussion.parentDiscussionId && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Reply</span>}
                  <span className="text-xs text-gray-500">{new Date(discussion.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-gray-700 mb-3">
                  {formattedContent.map((part, partIndex) => {
                    if (part.type === 'mention') {
                      return (
                        <span
                          key={partIndex}
                          className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium cursor-pointer hover:bg-blue-200"
                          title={`@${part.username}`}
                        >
                          {part.content}
                        </span>
                      );
                    }
                    return <span key={partIndex}>{part.content}</span>;
                  })}
                </div>
                
                {/* Attachments */}
                {discussion.attachments && discussion.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Attachments:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {discussion.attachments.map((attachment, attIndex) => (
                        <a
                          key={attIndex}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">{attachment.fileType.toUpperCase()}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 italic">No discussions yet</p>
        )}
      </div>
    </div>
  );
};

export default DiscussionForm;