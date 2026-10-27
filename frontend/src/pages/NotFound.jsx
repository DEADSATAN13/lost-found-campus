import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="bg-white border border-line rounded-lg p-8 sm:p-12 max-w-md w-full shadow-notice">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper border border-line flex items-center justify-center text-3xl font-serif">
          📌
        </div>

        <h1 className="font-serif text-3xl font-bold text-ink mb-2">404: Notice Unpinned</h1>
        <p className="text-muted text-xs sm:text-sm mb-6 leading-relaxed">
          The notice or page you are looking for has been removed, expired, or never existed on this campus board.
        </p>

        <Link
          to="/"
          className="inline-block w-full bg-moss hover:bg-moss-dark text-paper text-sm font-semibold py-2.5 px-4 rounded transition-colors shadow-sm"
        >
          Return to Browse Board
        </Link>
      </div>
    </div>
  );
}
