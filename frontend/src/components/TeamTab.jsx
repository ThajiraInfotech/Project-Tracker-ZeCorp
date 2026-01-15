import React from 'react';
import DiscussionForm from './DiscussionForm';
import UserAvatar from './UserAvatar';

const TeamTab = ({
  project,
  discussionContent,
  setDiscussionContent,
  addingDiscussion,
  handleAddDiscussion,
  selectedFiles,
  setSelectedFiles,
  formatDiscussionContent
}) => {
  // Combine manager and team members
  const teamList = [];
  if (project?.manager) {
    teamList.push({ ...project.manager, role: 'Project Manager' });
  }
  if (project?.teamMembers && project.teamMembers.length > 0) {
    project.teamMembers.forEach(member => {
      teamList.push({ ...member, role: 'Team Member' });
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Project Team
        </h3>
        {teamList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamList.map((member, index) => (
              <div key={member._id || index} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <UserAvatar
                    user={member}
                    size="xl"
                    className="bg-gradient-to-br from-primary-100 to-primary-200 shadow-sm"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{member.fullName || `Member ${index + 1}`}</h4>
                    <p className="text-sm text-gray-500 font-medium">{member.role}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Email:</span> {member.email || 'Not provided'}
                  </p>
                  <p className="text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium">Phone:</span> {member.phone || 'Not provided'}
                  </p>
                  <p className="text-gray-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">Role:</span> {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No Team Assigned</h3>
            <p className="text-gray-600 text-lg">No manager or team members have been assigned to this project yet.</p>
          </div>
        )}
      </div>

      {/* Discussion Section */}
      <DiscussionForm
        discussionContent={discussionContent}
        setDiscussionContent={setDiscussionContent}
        addingDiscussion={addingDiscussion}
        handleAddDiscussion={handleAddDiscussion}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        project={project}
        formatDiscussionContent={formatDiscussionContent}
      />
    </div>
  );
};

export default TeamTab;