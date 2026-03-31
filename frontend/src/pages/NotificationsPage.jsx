import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../store/api';
import { toast } from 'react-toastify';
import UserAvatar from '../components/UserAvatar';

/* ── Helpers ──────────────────────────────────────────────────────── */
const formatDate = (ds) => {
  if (!ds) return '';
  const d = new Date(ds), now = new Date(), diff = now - d;
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (m < 1)    return 'Just now';
  if (m < 60)   return `${m}m ago`;
  if (h < 24)   return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getMessage = (n) => {
  const name  = n.mentionedBy?.fullName || n.mentionedBy?.username || 'System';
  const title = n.entityTitle || '';
  switch ((n.type || '').toUpperCase()) {
    case 'TASK_ASSIGNED':          return `${name} assigned you to task "${title}"`;
    case 'TASK_SUPERVISOR_ADDED':  return `${name} added you as Supervisor to task "${title}"`;
    case 'PROJECT_ASSIGNED':       return `${name} assigned you to project "${title}"`;
    case 'ADDED_TO_TEAM':          return `${name} added you to the team of "${title}"`;
    case 'MENTION':
    case 'COMMENT':                return `${name} mentioned you in "${title}"`;
    case 'USER_CREATED':           return 'Welcome to ZeCorp! Your account has been created.';
    case 'TASK_OVERDUE':           return `Task "${title}" is now overdue`;
    case 'TASK_DUE_SOON':          return `Task "${title}" is due soon`;
    case 'TASK_DUE_TODAY':         return `Task "${title}" is due today`;
    case 'PROJECT_DELAYED':        return `Project "${title}" has been delayed`;
    default:                       return n.messageSnippet || 'New notification';
  }
};

const getTypeChip = (type) => {
  switch ((type || '').toUpperCase()) {
    case 'TASK_ASSIGNED':         return { label: 'Task',      cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'TASK_SUPERVISOR_ADDED': return { label: 'Supervisor', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'PROJECT_ASSIGNED':      return { label: 'Project',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'ADDED_TO_TEAM':         return { label: 'Team',      cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'MENTION':
    case 'COMMENT':               return { label: 'Mention',   cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'USER_CREATED':          return { label: 'Welcome',   cls: 'bg-green-50 text-green-700 border-green-200' };
    case 'TASK_OVERDUE':          return { label: 'Overdue',   cls: 'bg-red-50 text-red-700 border-red-200' };
    case 'TASK_DUE_SOON':         return { label: 'Due Soon',  cls: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'TASK_DUE_TODAY':        return { label: 'Due Today', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    case 'PROJECT_DELAYED':       return { label: 'Delayed',   cls: 'bg-red-50 text-red-700 border-red-200' };
    default:                      return { label: 'Alert',     cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
};

/* ── Icon Component ───────────────────────────────────────────────── */
const Icon = ({ d, size = 20, stroke = 1.5, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  bell:    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  check:   'M5 13l4 4L19 7',
  trash:   'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  ext:     'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
  chevL:   'M15 19l-7-7 7-7',
  chevR:   'M9 5l7 7-7 7',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

const PAGE_SIZE = 15;

/* ── Main Component ──────────────────────────────────────────────── */
export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [pagination,    setPagination]    = useState({ page: 1, pages: 1, total: 0 });
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('all'); // 'all' | 'unread' | 'read'
  const [currentPage,   setCurrentPage]   = useState(1);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);

  /* ────────────────────────────────────────────────────────────────
     DATA FETCHING
     Single useEffect that reads filter + currentPage directly from
     state — zero stale-closure issues. Fires on every change.
  ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page',  String(currentPage));
        params.set('limit', String(PAGE_SIZE));
        if (filter === 'unread') params.set('filter', 'unread');
        if (filter === 'read')   params.set('filter', 'read');

        const res = await api.get(`/notifications?${params.toString()}`);
        if (!cancelled && res.data.success) {
          setNotifications(res.data.notifications || []);
          setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
          setUnreadCount(res.data.unreadCount ?? 0);
          setSelectedIds(new Set());
        }
      } catch {
        if (!cancelled) toast.error('Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [filter, currentPage]); // ← explicit, no hidden deps

  /* ── Filter tabs ── */
  const handleFilterChange = (f) => {
    setFilter(f);       // triggers useEffect
    setCurrentPage(1);  // back to page 1
  };

  /* ── Pagination ── */
  const goToPage = (pg) => setCurrentPage(pg); // triggers useEffect

  /* ── Actions ── */
  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { toast.error('Failed to mark as read'); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
  };

  const deleteOne = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setPagination(p => ({ ...p, total: Math.max(0, p.total - 1) }));
      toast.success('Notification deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await Promise.all(ids.map(id => api.delete(`/notifications/${id}`)));
      setNotifications(prev => prev.filter(n => !selectedIds.has(n._id)));
      setPagination(p => ({ ...p, total: Math.max(0, p.total - ids.length) }));
      setSelectedIds(new Set());
      toast.success(`${ids.length} notification(s) deleted`);
    } catch { toast.error('Failed to delete selected'); }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications/delete-all');
      setNotifications([]);
      setPagination({ page: 1, pages: 1, total: 0 });
      setUnreadCount(0);
      setConfirmClear(false);
      toast.success('All notifications cleared');
    } catch { toast.error('Failed to clear all'); }
  };

  const handleClick = (n) => {
    if (!n.isRead) markRead(n._id);
    if (n.relatedLink) navigate(n.relatedLink);
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === notifications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(notifications.map(n => n._id)));
  };

  /* ── Page numbers with ellipsis ── */
  const pageNumbers = () => {
    const pages = pagination.pages;
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const nums = new Set([1, pages, currentPage]);
    if (currentPage > 2)          nums.add(currentPage - 1);
    if (currentPage < pages - 1)  nums.add(currentPage + 1);
    return [...nums].sort((a, b) => a - b);
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 font-sans">

      {/* ════ Hero Banner ════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #700606 0%, #520404 60%, #350202 100%)' }}
      >
        {/* Decorative glows */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f2a9a9 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f2a9a9 0%, transparent 70%)' }} />

        <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Top row: title + action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            {/* Left — title */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Icon d={ICONS.bell} size={26} stroke={1.5} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Notifications</h1>
                <p className="text-sm mt-0.5" style={{ color: '#f2a9a9' }}>
                  {loading ? 'Loading…' : (
                    <>
                      <span className="font-semibold text-white">{pagination.total}</span> total
                      {unreadCount > 0
                        ? <> · <span className="font-semibold text-white">{unreadCount} unread</span></>
                        : <> · <span style={{ color: '#f2a9a9' }}>all caught up ✓</span></>
                      }
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                >
                  <Icon d={ICONS.check} size={15} stroke={2.5} />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Mark read</span>
                </button>
              )}
              <button
                onClick={() => notifications.length > 0 && setConfirmClear(true)}
                disabled={notifications.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <Icon d={ICONS.trash} size={15} stroke={1.5} />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            {[
              { key: 'all',    label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'read',   label: 'Read' },
            ].map(({ key, label }) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 select-none"
                  style={isActive
                    ? { background: '#fff', color: '#700606', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }
                    : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }
                  }
                >
                  {label}
                  {key === 'unread' && unreadCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold"
                      style={isActive
                        ? { background: '#700606', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      }
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════ Content ════════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border"
            style={{ background: '#fdf2f2', borderColor: '#f2a9a9' }}>
            <span className="text-sm font-semibold" style={{ color: '#700606' }}>
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const unread = notifications.filter(n => selectedIds.has(n._id) && !n.isRead);
                  Promise.all(unread.map(n => markRead(n._id)));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Icon d={ICONS.check} size={13} stroke={2.5} /> Mark read
              </button>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white transition-colors"
                style={{ borderColor: '#f2a9a9', color: '#700606' }}
              >
                <Icon d={ICONS.trash} size={13} stroke={1.5} /> Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main list card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Card sub-header */}
          {!loading && notifications.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded cursor-pointer"
                  style={{ accentColor: '#700606' }}
                  checked={selectedIds.size === notifications.length && notifications.length > 0}
                  onChange={toggleAll}
                />
                <span className="text-xs font-medium text-slate-500">Select all on page</span>
              </label>
              <span className="text-xs text-slate-400">
                {pagination.total} notification{pagination.total !== 1 ? 's' : ''}
                {filter !== 'all' && <span className="ml-1 text-theme-500 font-semibold"
                  style={{ color: '#700606' }}>({filter})</span>}
              </span>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-4 h-4 rounded bg-slate-200 animate-pulse flex-shrink-0" />
                  <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded-full animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-full animate-pulse w-1/3" />
                  </div>
                  <div className="w-14 h-5 bg-slate-100 rounded-full animate-pulse hidden sm:block" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: '#fdf2f2' }}>
                <Icon d={ICONS.bell} size={36} stroke={1} style={{ color: '#f2a9a9' }} />
              </div>
              <p className="text-lg font-semibold text-slate-800 mb-1">
                {filter === 'unread' ? 'No unread notifications'
                  : filter === 'read' ? 'No read notifications'
                  : 'No notifications yet'}
              </p>
              <p className="text-sm text-slate-400 mb-5">
                {filter !== 'all' ? 'Switch to "All" to see everything'
                  : "You're all caught up! 🎉"}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => handleFilterChange('all')}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#700606' }}
                >
                  View all notifications
                </button>
              )}
            </div>
          )}

          {/* Notification rows */}
          {!loading && notifications.map((n, idx) => {
            const chip       = getTypeChip(n.type);
            const msg        = getMessage(n);
            const isSelected = selectedIds.has(n._id);
            const isDeleting = deletingId === n._id;
            const isLast     = idx === notifications.length - 1;

            return (
              <div
                key={n._id}
                onClick={() => handleClick(n)}
                className={[
                  'group relative flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 cursor-pointer transition-colors duration-150',
                  !n.isRead ? '' : 'hover:bg-slate-50',
                  !isLast ? 'border-b border-slate-100' : '',
                  isDeleting ? 'opacity-40 pointer-events-none' : '',
                ].join(' ')}
                style={{
                  background: isSelected
                    ? '#fdf2f2'
                    : !n.isRead ? 'rgba(253,242,242,0.45)' : undefined,
                  outline: isSelected ? '2px solid #700606' : undefined,
                  outlineOffset: isSelected ? '-2px' : undefined,
                }}
              >
                {/* Unread left accent bar */}
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm"
                    style={{ background: '#700606' }} />
                )}

                {/* Checkbox */}
                <div className="flex-shrink-0 pt-0.5" onClick={e => toggleSelect(n._id, e)}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: '#700606' }}
                    checked={isSelected}
                    onChange={() => {}}
                  />
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  <UserAvatar user={n.mentionedBy} size="md" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm leading-relaxed text-slate-700 flex-1 min-w-0 pr-1">
                      {msg}
                    </p>
                    {/* Type chip — desktop */}
                    <span className={`hidden sm:inline-flex flex-shrink-0 items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${chip.cls}`}>
                      {chip.label}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                    {/* Type chip — mobile */}
                    <span className={`sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chip.cls}`}>
                      {chip.label}
                    </span>
                    {!n.isRead && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#700606' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#700606' }} />
                        Unread
                      </span>
                    )}
                  </div>
                </div>

                {/* Row actions — always on mobile, hover on desktop */}
                <div
                  className="flex-shrink-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
                  onClick={e => e.stopPropagation()}
                >
                  {n.relatedLink && (
                    <button title="Open" onClick={() => handleClick(n)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
                      <Icon d={ICONS.ext} size={14} stroke={1.5} />
                    </button>
                  )}
                  {!n.isRead && (
                    <button title="Mark as read" onClick={() => markRead(n._id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-400 hover:text-green-600 hover:border-green-200 transition-all">
                      <Icon d={ICONS.check} size={14} stroke={2.5} />
                    </button>
                  )}
                  <button title="Delete" onClick={() => deleteOne(n._id)} disabled={isDeleting}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50">
                    <Icon d={ICONS.trash} size={14} stroke={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
            <button
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icon d={ICONS.chevL} size={16} stroke={2} />
            </button>

            {pageNumbers().map((pg, i, arr) => {
              const prev = arr[i - 1];
              return (
                <React.Fragment key={pg}>
                  {prev && pg - prev > 1 && (
                    <span className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">…</span>
                  )}
                  <button
                    onClick={() => goToPage(pg)}
                    className="w-9 h-9 rounded-lg border text-sm font-semibold flex items-center justify-center transition-all"
                    style={pg === currentPage
                      ? { background: '#700606', color: '#fff', borderColor: '#700606', boxShadow: '0 2px 8px rgba(112,6,6,0.3)' }
                      : { borderColor: '#e2e8f0', background: '#fff', color: '#374151' }
                    }
                  >
                    {pg}
                  </button>
                </React.Fragment>
              );
            })}

            <button
              disabled={currentPage >= pagination.pages}
              onClick={() => goToPage(currentPage + 1)}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Icon d={ICONS.chevR} size={16} stroke={2} />
            </button>

            <span className="text-xs text-slate-400 ml-2 hidden sm:block">
              Page {currentPage} / {pagination.pages} · {pagination.total} total
            </span>
          </div>
        )}
      </div>

      {/* ════ Confirm Clear Modal ══════════════════════════════════ */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: '#fdf2f2', border: '2px solid #f2a9a9' }}>
              <Icon d={ICONS.warning} size={30} stroke={1.5} style={{ color: '#700606' }} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Clear all notifications?</h3>
            <p className="text-sm text-slate-500 mb-7 leading-relaxed">
              This will permanently delete all{' '}
              <strong>{pagination.total}</strong> notification{pagination.total !== 1 ? 's' : ''}.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                style={{ background: '#700606' }}
              >
                Yes, clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
