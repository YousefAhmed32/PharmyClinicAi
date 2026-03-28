import React from 'react';

export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-neutral-500 font-body animate-pulse">Loading…</p>
      </div>
    </div>
  );
}
