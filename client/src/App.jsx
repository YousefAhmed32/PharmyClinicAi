import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import AppRouter     from './router';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import OfflineBanner from '@/components/ui/OfflineBanner';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 2,
      gcTime:               1000 * 60 * 10,
      retry:                1,
      retryDelay:           (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
      throwOnError:         false,
    },
    mutations: {
      retry:        0,
      throwOnError: false,
    },
  },
});

function ToasterWrapper() {
  const { i18n } = useTranslation();
  const isRTL    = i18n.language === 'ar';
  return (
    <Toaster
      position={isRTL ? 'top-left' : 'top-right'}
      gutter={8}
      containerStyle={{ top: 16, ...(isRTL ? { left: 16 } : { right: 16 }) }}
      toastOptions={{
        duration: 3500,
        style: {
          fontFamily:   isRTL ? '"Cairo", "Tajawal", sans-serif' : '"DM Sans", sans-serif',
          fontSize:     '14px',
          borderRadius: '12px',
          padding:      '12px 16px',
          boxShadow:    '0 4px 24px rgba(0,0,0,0.12)',
          maxWidth:     '380px',
          direction:    isRTL ? 'rtl' : 'ltr',
          textAlign:    isRTL ? 'right' : 'left',
        },
        success: {
          iconTheme: { primary: '#339966', secondary: '#fff' },
          style:     { borderInlineStart: '3px solid #339966' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
          style:     { borderInlineStart: '3px solid #ef4444' },
          duration:  5000,
        },
        loading: {
          iconTheme: { primary: '#339966', secondary: '#f0f9f4' },
        },
      }}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineBanner/>
        <AppRouter/>
        <ToasterWrapper/>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
