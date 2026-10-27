import React from 'react';
import { Link } from 'react-router-dom';
import TypeBadge from './TypeBadge.jsx';

/**
 * Noticeboard Card component:
 * - 4px solid left border in the category/type tint
 * - Mobile-first layout with clean typography
 * - Strict campus privacy: renders only poster's first name
 */
export default function PostCard({ post }) {
  if (!post) return null;

  const type = String(post.type || 'lost').toLowerCase();
  let borderLeftColor = 'border-l-mustard';
  if (type === 'found') borderLeftColor = 'border-l-teal';
  if (type === 'trade') borderLeftColor = 'border-l-plum';

  // Extract first name only for public display
  const rawName = post.user?.name || 'Student';
  const firstName = rawName.trim().split(' ')[0];

  const formattedDate = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <Link
      to={`/post/${post._id}`}
      className={`block bg-white rounded-md p-5 border border-line border-l-4 ${borderLeftColor} shadow-notice hover:shadow-noticeHover transition-all duration-150 flex flex-col justify-between group`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <TypeBadge type={post.type} size="sm" />
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            {post.category}
          </span>
        </div>

        <h3 className="font-serif text-lg font-bold text-ink leading-snug group-hover:text-moss transition-colors line-clamp-2 mb-1.5">
          {post.title}
        </h3>

        <p className="text-ink/80 text-sm leading-relaxed line-clamp-2 mb-3">
          {post.description}
        </p>
      </div>

      <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
        <span className="truncate max-w-[55%] flex items-center gap-1 font-medium text-ink/70">
          📍 {post.location}
        </span>
        <span>
          By {firstName} • {formattedDate}
        </span>
      </div>
    </Link>
  );
}
