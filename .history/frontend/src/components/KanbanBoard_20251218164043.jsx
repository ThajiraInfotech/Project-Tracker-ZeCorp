import React from 'react';
import { DndContext, useDroppable, useDraggable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const Droppable = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
};

const Draggable = ({ id, children, data }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab ${isDragging ? 'opacity-50' : ''}`}
    >
      {children}
    </div>
  );
};

const TaskCard = ({ task, onClick }) => {
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
  return (
    <div
      onClick={() => onClick(task)}
      className="bg-white p-40 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
          task.priority === 'high' ? 'bg-red-100 text-red-800' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
          Due: {new Date(task.deadline).toLocaleDateString()}
        </span>
        {task.assignedTo && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
            {task.assignedTo.fullName || task.assignedTo.name || 'Assigned'}
          </span>
        )}
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
      {task.comments && task.comments.length > 0 && (
        <div className="mt-2 flex items-center text-xs text-gray-500">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

const KanbanBoard = ({ tasks, onUpdateTaskStatus, onTaskClick }) => {
  const statuses = [
    { id: 'backlog', name: 'Backlog', color: 'bg-gray-100' },
    { id: 'todo', name: 'To Do', color: 'bg-blue-50' },
    { id: 'in-progress', name: 'In Progress', color: 'bg-yellow-50' },
    { id: 'review', name: 'Review', color: 'bg-purple-50' },
    { id: 'completed', name: 'Completed', color: 'bg-green-50' },
    { id: 'blocked', name: 'Blocked', color: 'bg-red-50' },
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
            <div key={status.id} className="flex-shrink-0 w-72 md:w-80">
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
                      <Draggable key={task._id} id={task._id} data={{ status: task.status }}>
                        <TaskCard task={task} onClick={onTaskClick} />
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