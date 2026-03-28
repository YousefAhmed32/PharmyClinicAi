import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout     from '@/components/layout/MainLayout';
import AdminLayout    from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute     from '@/components/auth/AdminRoute';
import PageLoader     from '@/components/ui/PageLoader';
import ErrorBoundary  from '@/components/ui/ErrorBoundary';

function S({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader/>}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// Public
const HomePage               = lazy(() => import('@/pages/HomePage'));
const StorePage              = lazy(() => import('@/pages/StorePage'));
const ProductDetailPage      = lazy(() => import('@/pages/ProductDetailPage'));
const BlogPage               = lazy(() => import('@/pages/BlogPage'));
const ArticlePage            = lazy(() => import('@/pages/ArticlePage'));
const BookingPage            = lazy(() => import('@/pages/BookingPage'));
const AboutPage              = lazy(() => import('@/pages/AboutPage'));
const ContactPage            = lazy(() => import('@/pages/ContactPage'));
const LoginPage              = lazy(() => import('@/pages/LoginPage'));
const RegisterPage           = lazy(() => import('@/pages/RegisterPage'));
const NotFoundPage           = lazy(() => import('@/pages/NotFoundPage'));
const PrescriptionPage       = lazy(() => import('@/pages/PrescriptionPage'));
const InteractionCheckerPage = lazy(() => import('@/pages/InteractionCheckerPage'));

// Protected
const CartPage         = lazy(() => import('@/pages/CartPage'));
const CheckoutPage     = lazy(() => import('@/pages/CheckoutPage'));
const OrdersPage       = lazy(() => import('@/pages/OrdersPage'));
const OrderDetailPage  = lazy(() => import('@/pages/OrderDetailPage'));
const ProfilePage      = lazy(() => import('@/pages/ProfilePage'));
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'));
const ChatPage         = lazy(() => import('@/pages/ChatPage'));
const InvoicePage      = lazy(() => import('@/pages/InvoicePage'));
const AIChatPage       = lazy(() => import('@/pages/AIChatPage'));
const ReturnsPage      = lazy(() => import('@/pages/ReturnsPage'));

// Admin
const AdminDashboard     = lazy(() => import('@/pages/admin/DashboardPage'));
const AdminProducts      = lazy(() => import('@/pages/admin/ProductsPage'));
const AdminOrders        = lazy(() => import('@/pages/admin/OrdersPage'));
const AdminUsers         = lazy(() => import('@/pages/admin/UsersPage'));
const AdminAppointments  = lazy(() => import('@/pages/admin/AppointmentsPage'));
const AdminBlog          = lazy(() => import('@/pages/admin/BlogPage'));
const AdminChat          = lazy(() => import('@/pages/admin/ChatPage'));
const AdminAnalytics     = lazy(() => import('@/pages/admin/AnalyticsPage'));
const AdminReports       = lazy(() => import('@/pages/admin/ReportsPage'));
const AdminReturns       = lazy(() => import('@/pages/admin/ReturnsPage'));
const AdminBarcodePrint  = lazy(() => import('@/pages/admin/BarcodePrintPage'));
const AdminInventory     = lazy(() => import('@/pages/admin/InventoryPage'));
const AdminPrescriptions = lazy(() => import('@/pages/admin/PrescriptionsPage'));
const AdminInteractions  = lazy(() => import('@/pages/admin/InteractionsPage'));

const router = createBrowserRouter([
  {
    element: <MainLayout/>,
    children: [
      { path: '/',                   element: <S><HomePage/></S> },
      { path: '/store',              element: <S><StorePage/></S> },
      { path: '/store/:id',          element: <S><ProductDetailPage/></S> },
      { path: '/blog',               element: <S><BlogPage/></S> },
      { path: '/blog/:slug',         element: <S><ArticlePage/></S> },
      { path: '/booking',            element: <S><BookingPage/></S> },
      { path: '/about',              element: <S><AboutPage/></S> },
      { path: '/contact',            element: <S><ContactPage/></S> },
      { path: '/login',              element: <S><LoginPage/></S> },
      { path: '/register',           element: <S><RegisterPage/></S> },
      { path: '/prescription',       element: <S><PrescriptionPage/></S> },
      { path: '/drug-interactions',  element: <S><InteractionCheckerPage/></S> },
      {
        element: <ProtectedRoute/>,
        children: [
          { path: '/cart',                    element: <S><CartPage/></S> },
          { path: '/checkout',                element: <S><CheckoutPage/></S> },
          { path: '/orders',                  element: <S><OrdersPage/></S> },
          { path: '/orders/:id',              element: <S><OrderDetailPage/></S> },
          { path: '/orders/:orderId/invoice', element: <S><InvoicePage/></S> },
          { path: '/profile',                 element: <S><ProfilePage/></S> },
          { path: '/appointments',            element: <S><AppointmentsPage/></S> },
          { path: '/chat',                    element: <S><ChatPage/></S> },
          { path: '/ai-assistant',            element: <S><AIChatPage/></S> },
          { path: '/returns',                 element: <S><ReturnsPage/></S> },
        ],
      },
    ],
  },
  {
    element: <AdminRoute/>,
    children: [{
      element: <AdminLayout/>,
      children: [
        { path: '/admin',                          element: <S><AdminDashboard/></S> },
        { path: '/admin/products',                 element: <S><AdminProducts/></S> },
        { path: '/admin/orders',                   element: <S><AdminOrders/></S> },
        { path: '/admin/users',                    element: <S><AdminUsers/></S> },
        { path: '/admin/appointments',             element: <S><AdminAppointments/></S> },
        { path: '/admin/blog',                     element: <S><AdminBlog/></S> },
        { path: '/admin/chat',                     element: <S><AdminChat/></S> },
        { path: '/admin/analytics',                element: <S><AdminAnalytics/></S> },
        { path: '/admin/reports',                  element: <S><AdminReports/></S> },
        { path: '/admin/inventory',                element: <S><AdminInventory/></S> },
        { path: '/admin/prescriptions',            element: <S><AdminPrescriptions/></S> },
        { path: '/admin/interactions',             element: <S><AdminInteractions/></S> },
        { path: '/admin/returns',                  element: <S><AdminReturns/></S> },
        { path: '/admin/barcode-print',            element: <S><AdminBarcodePrint/></S> },
        { path: '/admin/orders/:orderId/invoice',  element: <S><InvoicePage/></S> },
      ],
    }],
  },
  { path: '*', element: <S><NotFoundPage/></S> },
]);

export default function AppRouter() {
  return <RouterProvider router={router}/>;
}
