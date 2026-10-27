import React from 'react';

/**
 * Animated skeleton placeholder card rendered while notices are loading.
 */
export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-md p-5 border border-line border-l-4 border-l-line shadow-notice animate-pulse flex flex-col justify-between h-56">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-16 bg-stone-200 rounded"></div>
          <div className="h-4 w-20 bg-stone-200 rounded"></div>
        </div>
        <div className="h-6 w-3/4 bg-stone-200 rounded mb-2"></div>
        <div className="h-4 w-full bg-stone-100 rounded mb-1.5"></div>
        <div className="h-4 w-2/3 bg-stone-100 rounded"></div>
      </div>

      <div className="pt-3 border-t border-line/50 flex items-center justify-between">
        <div className="h-4 w-28 bg-stone-200 rounded"></div>
        <div className="h-4 w-20 bg-stone-200 rounded"></div>
      </div>
    </div>
  );
}
