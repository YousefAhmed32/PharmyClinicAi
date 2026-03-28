import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import NotificationBell from '@/components/ui/NotificationBell';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import { BoltIcon } from '@heroicons/react/24/outline'


// ─── Tools dropdown items ───────────────────────────────────────────────────
import {
  FileText,
  Pill,
  Bot,
  Info,
  MessageCircle
} from 'lucide-react';

// ─── Tools dropdown items ───────────────────────────────────────────────────
function ToolsDropdown({ isRTL, t, closeMenu }) {
    const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const tools = [
    {
      to: '/prescription',
      icon: <FileText size={16} strokeWidth={1.8} />,
      label: t('nav.uploadRx'),
      sub: isRTL ? 'ارفع روشتتك واحصل على إرشادات' : 'Upload & get advice',
    },
    {
      to: '/drug-interactions',
      icon: <Pill size={16} strokeWidth={1.8} />,
      label: t('nav.drugCheck'),
      sub: isRTL ? 'تحقق من التفاعلات الدوائية' : 'Check drug combinations',
    },
    {
      to: '/ai-assistant',
      icon: <Bot size={16} strokeWidth={1.8} />,
      label: t('nav.aiAssistant'),
      sub: isRTL ? 'اسأل مساعدنا الذكي' : 'Ask our health AI',
    },
  ];

  const secondary = [
    {
      to: '/about',
      icon: <Info size={16} strokeWidth={1.8} />,
      label: t('nav.about'),
      sub: isRTL ? 'من نحن' : 'About us',
    },
    {
      to: '/contact',
      icon: <MessageCircle size={16} strokeWidth={1.8} />,
      label: t('nav.contact'),
      sub: isRTL ? 'تواصل معنا' : 'Get in touch',
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
          open
            ? 'text-neutral-900 bg-neutral-100'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
        }`}
      >
        
        <BoltIcon className="w-4 h-4" />
        {isRTL ? 'الأدوات' : 'Tools'}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div
          className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-full mt-2 w-64 card shadow-lifted py-1.5 z-50 animate-slide-down`}
        >
          {/* Primary tools */}
          {tools.map(({ to, icon, label, sub }) => (
            <Link
              key={to}
              to={to}
              onClick={() => { setOpen(false); closeMenu?.(); }}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-all mx-1.5"
            >
              <span className="w-8 h-8 rounded-lg bg-primary-100/70 flex items-center justify-center text-primary-700 group-hover:bg-primary-600 group-hover:text-white transition-all flex-shrink-0">
                {icon}
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-neutral-800 leading-tight">
                  {label}
                </span>
                <span className="text-xs text-neutral-400 leading-tight mt-0.5 truncate">
                  {sub}
                </span>
              </span>
            </Link>
          ))}

          {/* Divider */}
          <div className="divider my-1.5" />

          {/* Secondary links */}
          {secondary.map(({ to, icon, label, sub }) => (
            <Link
              key={to}
              to={to}
              onClick={() => { setOpen(false); closeMenu?.(); }}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-all mx-1.5"
            >
              <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-primary-600 group-hover:text-white transition-all flex-shrink-0">
                {icon}
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-neutral-700 leading-tight">
                  {label}
                </span>
                <span className="text-xs text-neutral-400 leading-tight mt-0.5">
                  {sub}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Navbar ─────────────────────────────────────────────────────────────────
function Navbar() {
  useSocketNotifications();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user, accessToken, logout } = useAuthStore();
  const { totalItems, fetchCart, resetCart } = useCartStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (accessToken) fetchCart();
    else resetCart();
  }, [accessToken]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Primary nav — only high-frequency destinations
  const primaryLinks = [
    { to: '/store',    label: t('nav.store') },
    { to: '/booking',  label: t('nav.appointments') },
    { to: '/blog',     label: t('nav.blog') },
  ];

  // All links flattened for mobile drawer
  const allMobileLinks = [
    { to: '/store',             label: t('nav.store') },
    { to: '/booking',           label: t('nav.appointments') },
    { to: '/blog',              label: t('nav.blog') },
    { to: '/prescription',      label: `💊 ${t('nav.uploadRx')}` },
    { to: '/drug-interactions', label: `⚗️ ${t('nav.drugCheck')}` },
    { to: '/ai-assistant',      label: `🤖 ${t('nav.aiAssistant')}` },
    { to: '/about',             label: t('nav.about') },
    { to: '/contact',           label: t('nav.contact') },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-soft'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="container-app">
        <div className="flex items-center justify-between h-16 lg:h-18">

          {/* ── Logo ────────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                  fill="white"
                  fillOpacity="0.9"
                />
                <path d="M9 12h6M12 9v6" stroke="#339966" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-neutral-900 text-lg">
              {isRTL ? 'فارما' : 'Pharma'}
              <span className="text-primary-600">{isRTL ? 'كلينك' : 'Clinic'}</span>
            </span>
          </Link>

          {/* ── Desktop nav ─────────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-1">
            {primaryLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* Tools dropdown */}
            <ToolsDropdown isRTL={isRTL} t={t} />
          </div>

          {/* ── Right side ──────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            {/* Thin vertical divider between lang and utility icons */}
            {accessToken && (
              <div className="hidden sm:block w-px h-5 bg-neutral-200 mx-1" />
            )}

            {accessToken && <NotificationBell />}

            {accessToken && (
              <Link to="/cart" className="relative btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {totalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {totalItems() > 9 ? '9+' : totalItems()}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-700">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-neutral-700 max-w-[100px] truncate">
                    {user.name?.split(' ')[0]}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                <div
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1.5 w-48 card shadow-lifted py-1.5
                              opacity-0 invisible group-hover:opacity-100 group-hover:visible
                              translate-y-1 group-hover:translate-y-0 transition-all duration-200`}
                >
                  {user.role === 'admin' && (
                    <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      </svg>
                      {t('common.dashboard')}
                    </Link>
                  )}
                  <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                    {t('nav.profile')}
                  </Link>
                  <Link to="/orders" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    {t('nav.orders')}
                  </Link>
                  <Link to="/appointments" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {t('nav.myAppointments')}
                  </Link>
                  <Link to="/chat" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    {t('nav.supportChat')}
                  </Link>
                  <div className="divider my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    {t('common.signOut')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost hidden sm:inline-flex">{t('common.signIn')}</Link>
                <Link to="/register" className="btn-primary">{t('common.getStarted')}</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden btn-icon ml-1"
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-neutral-100 shadow-soft animate-slide-down">
          <div className="container-app py-4 flex flex-col gap-1">
            {allMobileLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {!user && (
              <div className="flex gap-2 pt-2">
                <Link to="/login"    className="btn-secondary flex-1 justify-center">{t('common.signIn')}</Link>
                <Link to="/register" className="btn-primary  flex-1 justify-center">{t('auth.register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-neutral-900 text-neutral-400 pt-16 pb-8 mt-20">
      <div className="container-app">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" fillOpacity="0.9">
                  <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
                </svg>
              </div>
              <span className="font-display font-semibold text-white text-lg">
                {t('common.appName')}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-500">{t('footer.tagline')}</p>
          </div>

          {[
            {
              title: t('footer.quickLinks'),
              links: [
                [t('nav.store'),              '/store'],
                [t('footer.bookAppointment'), '/booking'],
                [t('footer.healthBlog'),      '/blog'],
                [t('footer.aboutUs'),         '/about'],
              ],
            },
            {
              title: t('footer.account'),
              links: [
                [t('common.signIn'),    '/login'],
                [t('auth.register'),    '/register'],
                [t('footer.myOrders'), '/orders'],
                [t('footer.myAppointments'), '/appointments'],
              ],
            },
            {
              title: t('footer.support'),
              links: [
                [t('footer.contactUs'),    '/contact'],
                [t('footer.liveChat'),     '/chat'],
                [t('footer.faq'),          '/about'],
                [t('footer.privacyPolicy'),'/about'],
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-sm hover:text-primary-400 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} {t('common.appName')}. {t('footer.rights')}
          </p>
          <p className="text-xs text-neutral-600">{t('footer.builtWith')}</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────
export default function MainLayout() {
  const location = useLocation();
  const isAIChat = location.pathname === '/ai-assistant';

  return (
    <div className={isAIChat ? 'h-screen flex flex-col overflow-hidden' : 'page-wrapper'}>
      <Navbar />
      <main
        className={
          isAIChat
            ? 'flex-1 overflow-hidden pt-16 lg:pt-[4.5rem]'
            : 'pt-16 lg:pt-18'
        }
      >
        <Outlet />
      </main>
      {!isAIChat && <Footer />}
    </div>
  );
}