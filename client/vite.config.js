import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':   ['@tanstack/react-query', 'zustand', 'axios'],
          'vendor-i18n':    ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-xlsx':    ['xlsx'],
          'vendor-barcode': ['jsbarcode', 'react-barcode', '@zxing/library'],
          'vendor-utils':   ['date-fns', 'lodash'],
          'vendor-ui':      ['react-hot-toast'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@tanstack/react-query', 'zustand', 'axios',
      'i18next', 'react-i18next', 'react-hot-toast', 'date-fns',
    ],
  },
});
