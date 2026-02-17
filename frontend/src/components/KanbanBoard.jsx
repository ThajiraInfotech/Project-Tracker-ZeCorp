import React from 'react';
import { DndContext, useDroppable, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import LabelBadge from './LabelBadge';

const Droppable = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
};

const Draggable = ({ id, children, data, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled // Pass disabled prop to useDraggable
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!disabled ? listeners : {})} // Only apply listeners if not disabled
      {...attributes}
      className={`${!disabled ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
};

const TaskCard = ({ task, onClick, onChatClick, onDelete, currentUser }) => {
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
  return (
    <div
      onClick={() => onClick && onClick(task)}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-grab relative group"
    >
      {/* Delete button for admins */}
      {currentUser?.role === 'admin' && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          title="Delete Task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      )}

      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-tight pr-5">{task.title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
          {task.priority}
        </span>
        {task.subtasks && task.subtasks.length > 0 && (
          <span className="text-gray-400 ml-2" title="This task is controlled by subtasks">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      {/* Project name and Job Order - only show if exists */}
      {task.project?.projectName && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
            </svg>
            {task.project.projectName}
            {task.project.jobOrder && (
              <span className="text-blue-600 opacity-80 ml-1 border-l border-blue-200 pl-1">
                #{task.project.jobOrder}
              </span>
            )}
          </span>
        </div>
      )}
      {/* Label - only show if exists */}
      {task.label && (
        <div className="mb-2">
          <LabelBadge label={task.label} />
        </div>
      )}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
          Due: {formatDateDDMMYYYY(task.deadline)}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>{task.progress || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${task.progress || 0}%` }}
          ></div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-xs text-blue-600 hover:text-blue-800 underline focus:outline-none"
        >
          View Details
        </button>
        {onChatClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChatClick(task, e);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#700606]/10 text-[#700606] hover:bg-[#700606]/20 rounded-lg transition-colors font-medium text-xs shadow-sm"
            title="Open Chat"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            Chat
          </button>
        )}
      </div>
      {
        task.comments && task.comments.length > 0 && (
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
          </div>
        )
      }
    </div >
  );
};

const KanbanBoard = ({ tasks, onUpdateTaskStatus, onTaskClick, onChatClick, onDelete, currentUser }) => {
  const statuses = [
    { id: 'todo', name: 'To Do', color: 'bg-blue-50' },
    { id: 'in-progress', name: 'In Progress', color: 'bg-yellow-50' },
    { id: 'completed', name: 'Completed', color: 'bg-green-50' },
    { id: 'delayed', name: 'Delayed', color: 'bg-orange-50' }
  ];

  const sensors = useSensors(useSensor(PointerSensor));

  const getTasksByStatus = (status) => tasks.filter(task => task.status === status);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;
    const task = tasks.find(t => t._id === taskId);

    if (newStatus !== task.status) {
      onUpdateTaskStatus(taskId, newStatus, task.progress || 0);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 max-h-[70vh] overflow-y-auto">
        {statuses.map(status => {
          const statusTasks = getTasksByStatus(status.id);
          return (
            <div key={status.id} className="flex-shrink-0 w-56">
              <div className={`${status.color} rounded-lg p-3 border border-gray-200 h-full`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                    {status.name}
                  </h3>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>
                <Droppable id={status.id}>
                  <div className="space-y-2 min-h-[300px] max-h-[60vh] overflow-y-auto">
                    {statusTasks.map(task => (
                      <Draggable
                        key={task._id}
                        id={task._id}
                        data={{ status: task.status }}
                        disabled={(task.subtasks && task.subtasks.some(st => st.status !== 'completed')) || task.readOnly}
                      >
                        <TaskCard
                          task={task}
                          onClick={onTaskClick}
                          onChatClick={onChatClick}
                          onDelete={onDelete}
                          currentUser={currentUser}
                        />
                      </Draggable>
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-6">
                        No tasks in {status.name.toLowerCase()}
                      </div>
                    )}
                  </div>
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;