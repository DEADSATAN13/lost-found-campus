import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper py-8 text-xs text-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <span className="font-serif italic font-bold text-ink text-sm">Found.</span>
          <span className="ml-2">Campus Lost, Found & Trade Board</span>
          <p className="mt-1 text-muted/80">
            A student-run community board. Contact details stay private until an item inquiry is made.
          </p>
        </div>

        <div className="flex items-center gap-6 font-medium text-ink/70">
          <Link to="/" className="hover:text-moss transition-colors">
            Board
          </Link>
          <Link to="/privacy" className="hover:text-moss transition-colors underline">
            Privacy Policy & Rules
          </Link>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-moss transition-colors"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
