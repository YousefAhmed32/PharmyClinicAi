import React from 'react';

// ── Base skeleton ─────────────────────────────────────────────────────────
export function Skeleton({ className = '', width, height, rounded = 'rounded-lg' }) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
      style={{ width, height }}
    />
  );
}

// ── Product card skeleton ─────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-square w-full rounded-none"/>
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-16"/>
        <Skeleton className="h-4 w-full"/>
        <Skeleton className="h-4 w-3/4"/>
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-5 w-20"/>
          <Skeleton className="h-8 w-8 rounded-xl"/>
        </div>
      </div>
    </div>
  );
}

// ── Product grid skeleton ─────────────────────────────────────────────────
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {[...Array(count)].map((_, i) => <ProductCardSkeleton key={i}/>)}
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-0">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-neutral-100">
          {[...Array(cols)].map((_, j) => (
            <Skeleton
              key={j}
              className="h-4"
              style={{ width: `${[15, 20, 12, 12, 10][j % 5]}%`, minWidth: '40px' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Card skeleton ─────────────────────────────────────────────────────────
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-5 w-1/3"/>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${[100, 80, 60][i % 3]}%` }}/>
      ))}
    </div>
  );
}

// ── Stats skeleton ────────────────────────────────────────────────────────
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <Skeleton className="h-10 w-10 rounded-2xl"/>
          <Skeleton className="h-7 w-24"/>
          <Skeleton className="h-3 w-32"/>
        </div>
      ))}
    </div>
  );
}

// ── Blog card skeleton ────────────────────────────────────────────────────
export function BlogCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-video w-full rounded-none"/>
      <div className="p-5 space-y-2">
        <Skeleton className="h-3 w-20 rounded-full"/>
        <Skeleton className="h-5 w-full"/>
        <Skeleton className="h-4 w-5/6"/>
        <Skeleton className="h-3 w-1/3"/>
      </div>
    </div>
  );
}

// ── Blog grid skeleton ────────────────────────────────────────────────────
export function BlogGridSkeleton({ count = 6 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => <BlogCardSkeleton key={i}/>)}
    </div>
  );
}

// ── Order skeleton ────────────────────────────────────────────────────────
export function OrderSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card p-5 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32"/>
            <Skeleton className="h-3 w-24"/>
            <Skeleton className="h-3 w-16"/>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-5 w-16 rounded-full"/>
            <Skeleton className="h-5 w-20"/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Appointment skeleton ──────────────────────────────────────────────────
export function AppointmentSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card p-5 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28"/>
            <Skeleton className="h-3 w-36"/>
            <Skeleton className="h-4 w-40"/>
          </div>
          <Skeleton className="h-6 w-20 rounded-full"/>
        </div>
      ))}
    </div>
  );
}

// ── Chat message skeleton ─────────────────────────────────────────────────
export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          {i % 2 === 0 && <Skeleton className="w-8 h-8 rounded-full shrink-0" style={{ borderRadius: '50%' }}/>}
          <div className="space-y-1" style={{ maxWidth: '60%' }}>
            <Skeleton className="h-10 rounded-2xl" style={{ width: `${120 + Math.random() * 80}px` }}/>
            <Skeleton className="h-2.5 w-12"/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Full page loading state ───────────────────────────────────────────────
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48"/>
          <Skeleton className="h-4 w-64"/>
        </div>
        <Skeleton className="h-10 w-32 rounded-xl"/>
      </div>
      <StatsSkeleton count={4}/>
      <div className="card p-5">
        <Skeleton className="h-6 w-40 mb-4"/>
        <Skeleton className="h-32 w-full rounded-xl"/>
      </div>
      <TableSkeleton rows={6} cols={5}/>
    </div>
  );
}
