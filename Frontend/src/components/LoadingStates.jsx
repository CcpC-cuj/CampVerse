import React from 'react';

/**
 * Loading Spinner Component
 * Displays a centered loading animation
 */
export function LoadingSpinner({ size = 'md', message = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
      </div>
      {message && (
        <p className="mt-4 text-gray-400 text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
}

/**
 * Page Loader Component
 * Full-page loading state
 */
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 relative mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
        </div>
        <p className="text-gray-400 text-lg animate-pulse">{message}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton Card Component
 * Placeholder for loading card content
 */
export function SkeletonCard() {
  return (
    <div className="bg-[#1a1a2e]/60 rounded-2xl border border-white/10 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-white/10"></div>
        <div className="flex-1">
          <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-white/10 rounded w-full"></div>
        <div className="h-3 bg-white/10 rounded w-5/6"></div>
        <div className="h-3 bg-white/10 rounded w-4/6"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton Table Component
 * Placeholder for loading table content
 */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-[#1a1a2e]/60 rounded-2xl border border-white/10 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-white/5 border-b border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-white/10 rounded flex-1"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-white/5 last:border-0">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-white/10 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton Event Card Component
 * Placeholder for loading event cards
 */
export function SkeletonEventCard() {
  return (
    <div className="bg-[#1a1a2e]/60 rounded-2xl border border-white/10 overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="h-48 bg-white/10"></div>
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="h-5 bg-white/10 rounded w-3/4"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-white/10 rounded-full w-20"></div>
          <div className="h-8 bg-white/10 rounded-full w-16"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Loader Component
 * Small inline loading indicator
 */
export function InlineLoader({ size = 'sm' }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}></div>
  );
}

export default LoadingSpinner;
