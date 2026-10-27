import React from 'react';

/**
 * Noticeboard badge tag displaying item classification:
 * - LOST: Mustard on mustard-tint
 * - FOUND: Teal on teal-tint
 * - TRADE: Plum on plum-tint
 */
export default function TypeBadge({ type, size = 'md' }) {
  const normType = String(type || '').toLowerCase();

  let colorClasses = 'bg-stone-100 text-ink border-stone-200';
  let label = normType.toUpperCase();

  if (normType === 'lost') {
    colorClasses = 'bg-mustard-tint text-mustard-dark border-mustard/30';
  } else if (normType === 'found') {
    colorClasses = 'bg-teal-tint text-teal-dark border-teal/30';
  } else if (normType === 'trade') {
    colorClasses = 'bg-plum-tint text-plum-dark border-plum/30';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-xs font-bold tracking-wider';

  return (
    <span className={`inline-flex items-center uppercase rounded border font-sans ${sizeClasses} ${colorClasses}`}>
      {label}
    </span>
  );
}
