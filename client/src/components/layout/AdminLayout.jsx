import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';
import NotificationBell from '@/components/ui/NotificationBell';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user, logout, accessToken } = useAuthStore();
  const { addFromSocket, unreadCount, fetchNotifications } = useNotificationStore();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { to:'/admin',               label: t('admin.dashboard'),    exact:true, icon:'📊' },
    { to:'/admin/products',      label: t('admin.products'),     icon:'💊' },
    { to:'/admin/orders',        label: t('admin.orders'),       icon:'📦' },
    { to:'/admin/users',         label: t('admin.users'),        icon:'👥' },
    { to:'/admin/appointments',  label: t('admin.appointments'), icon:'📅' },
    { to:'/admin/blog',          label: t('admin.blog'),         icon:'📝' },
    { to:'/admin/chat',          label: t('admin.chat'),         icon:'💬' },
    { divider: true },
    { to:'/admin/analytics',     label: t('admin.analytics'),    icon:'📈' },
    { to:'/admin/reports',       label: t('admin.reports'),      icon:'📄' },
    { to:'/admin/inventory',     label: t('admin.inventory'),    icon:'🏪' },
    { to:'/admin/prescriptions', label: t('admin.prescriptions'),icon:'📋' },
    { to:'/admin/returns',       label: t('admin.returns'),      icon:'↩️' },
    { to:'/admin/interactions',  label: t('admin.interactions'), icon:'⚗️' },
    { divider: true },
    { to:'/ai-assistant',        label: t('admin.aiAssistant'),  icon:'🤖' },
    { to:'/admin/barcode-print', label: t('admin.barcodePrint'), icon:'🖨️' },
  ];

  const handleLogout = async () => { await logout(); navigate('/'); };

  useEffect(() => {
    if (!accessToken) return;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const s = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    fetchNotifications();

    s.on('notification:new', (notif) => { addFromSocket(notif); });
    s.on('chat:notification', ({ patient, preview }) => {
      addFromSocket({
        type:    'chat',
        title:   t('admin.newMessage'),
        message: preview,
        link:    '/admin/chat',
      });
    });

    return () => s.disconnect();
  }, [accessToken]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-neutral-100 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shrink-0 shadow-green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" fillOpacity="0.9">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="font-display font-semibold text-neutral-900">
            {isRTL ? 'فارما' : 'Pharma'}<span className="text-primary-600">{isRTL ? 'أدمن' : 'Admin'}</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navItems.map((item, idx) => {
          if (item.divider) return (
            <div key={idx} className={`my-2 border-t border-neutral-100 ${collapsed ? 'mx-2' : 'mx-1'}`}/>
          );
          return (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative
                ${isActive ? 'bg-primary-600 text-white shadow-green' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}
                ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {item.to === '/admin/chat' && unreadCount > 0 && !collapsed && (
                <span className="ms-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-100 p-2 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-700">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <div className={`flex gap-1 ${collapsed ? 'flex-col items-center' : ''}`}>
          <button onClick={handleLogout}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center w-full' : 'flex-1'}`}
            title={collapsed ? t('admin.signOut') : undefined}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {!collapsed && t('admin.signOut')}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 transition-colors"
            title={collapsed ? t('admin.expand') : t('admin.collapse')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`transition-transform ${collapsed ? (isRTL ? '' : 'rotate-180') : (isRTL ? 'rotate-180' : '')}`}>
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 shrink-0 ${collapsed ? 'w-14' : 'w-56'}`}>
        <SidebarContent/>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="overlay" onClick={() => setMobileOpen(false)}/>
          <aside className="absolute start-0 top-0 bottom-0 w-56 bg-white shadow-lifted z-50">
            <SidebarContent/>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="flex items-center gap-2 ms-auto">
            <LanguageSwitcher />
            <NotificationBell/>
            <NavLink to="/" className="btn-ghost text-xs hidden sm:inline-flex">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              {t('admin.viewSite')}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet/>
          </div>
        </main>
      </div>
    </div>
  );
}