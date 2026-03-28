import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import useNotificationStore from '@/store/notificationStore';
import useAuthStore from '@/store/authStore';
import { useClickOutside } from '@/hooks/useCommon';

const TYPE_ICONS = {
  order:        '📦',
  prescription: '📋',
  appointment:  '📅',
  stock:        '🏪',
  chat:         '💬',
  system:       'ℹ️',
};

const TYPE_COLORS = {
  order:        'border-l-blue-500',
  prescription: 'border-l-primary-500',
  appointment:  'border-l-purple-500',
  stock:        'border-l-orange-500',
  chat:         'border-l-primary-500',
  system:       'border-l-neutral-400',
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const {
    notifications, unreadCount,
    fetchNotifications, markRead, markAllRead, deleteOne, clearAll, addFromSocket,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useClickOutside(panelRef, () => setOpen(false));

  // Fetch on mount + every 60s
  useEffect(() => {
    if (!accessToken) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleClick = (notif) => {
    markRead(notif._id);
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) fetchNotifications(); // refresh on open
  };

  if (!accessToken) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button onClick={handleOpen} className="relative btn-icon" title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-red-500 text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl
                        shadow-lifted border border-neutral-200 z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-neutral-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-800">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-neutral-400 hover:text-red-500">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm text-neutral-500">No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div key={n._id}
                className={`flex items-start gap-3 px-4 py-3.5 border-l-2 ${TYPE_COLORS[n.type] || 'border-l-neutral-300'}
                  ${n.isRead ? 'bg-white' : 'bg-neutral-50'}
                  hover:bg-neutral-50 transition-colors cursor-pointer group`}
                onClick={() => handleClick(n)}
              >
                <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${n.isRead ? 'text-neutral-600' : 'text-neutral-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full"/>}
                  <button
                    onClick={e => { e.stopPropagation(); deleteOne(n._id); }}
                    className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50">
              <p className="text-xs text-neutral-400 text-center">
                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
