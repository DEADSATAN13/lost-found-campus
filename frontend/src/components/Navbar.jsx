import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api, { getStoredToken, getStoredUser, clearSession, saveSession } from '../api.js';

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isLoggedIn, setIsLoggedIn] = useState(!!getStoredToken());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Synchronize state with window auth events
  useEffect(() => {
    function handleAuthChange() {
      const token = getStoredToken();
      setIsLoggedIn(!!token);
      setCurrentUser(getStoredUser());
    }

    async function handleRefreshUser() {
      const token = getStoredToken();
      if (!token) return;
      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.user) {
          saveSession(res.data.user, token);
          setCurrentUser(res.data.user);
        }
      } catch (err) {
        // 401 is intercepted by api.js which triggers authChange
      }
    }

    window.addEventListener('authChange', handleAuthChange);
    window.addEventListener('refreshUser', handleRefreshUser);

    // Initial user refresh if token is present
    if (getStoredToken()) {
      handleRefreshUser();
    }

    return () => {
      window.removeEventListener('authChange', handleAuthChange);
      window.removeEventListener('refreshUser', handleRefreshUser);
    };
  }, []);

  // Close mobile menu on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="bg-paper border-b border-line sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-serif italic font-bold text-2xl text-ink tracking-tight group-hover:text-moss transition-colors">
            Found.
          </span>
          <span className="hidden sm:inline-block text-xs uppercase tracking-widest text-muted border border-line rounded px-1.5 py-0.5 font-sans">
            Campus Board
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className={`transition-colors ${
              location.pathname === '/' ? 'text-moss font-semibold' : 'text-ink/80 hover:text-ink'
            }`}
          >
            Browse Board
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                to="/create"
                className={`transition-colors ${
                  location.pathname === '/create' ? 'text-moss font-semibold' : 'text-ink/80 hover:text-ink'
                }`}
              >
                + Post Notice
              </Link>
              <Link
                to="/my-posts"
                className={`transition-colors ${
                  location.pathname === '/my-posts' ? 'text-moss font-semibold' : 'text-ink/80 hover:text-ink'
                }`}
              >
                My Notices
              </Link>

              {currentUser?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`text-mustard font-semibold hover:text-mustard-dark transition-colors ${
                    location.pathname === '/admin' ? 'underline' : ''
                  }`}
                >
                  Admin Panel
                </Link>
              )}

              {/* Points badge */}
              <div
                className="flex items-center gap-1.5 bg-white border border-line px-2.5 py-1 rounded-full text-xs font-semibold text-moss shadow-sm"
                title="Points earned by returning found items"
              >
                <span>🌟</span>
                <span>{currentUser?.points || 0} pts</span>
              </div>

              <Link
                to="/profile"
                className={`transition-colors ${
                  location.pathname === '/profile' ? 'text-moss font-semibold' : 'text-ink/80 hover:text-ink'
                }`}
              >
                {currentUser?.name ? currentUser.name.split(' ')[0] : 'Profile'}
              </Link>

              <button
                onClick={handleLogout}
                className="text-muted hover:text-ink text-sm transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-ink/80 hover:text-ink text-sm font-medium px-3 py-1.5 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-moss hover:bg-moss-dark text-paper text-sm font-medium px-4 py-1.5 rounded transition-colors shadow-sm"
              >
                Join Found.
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-3">
          {isLoggedIn && (
            <div className="flex items-center gap-1 bg-white border border-line px-2 py-0.5 rounded-full text-xs font-bold text-moss">
              <span>🌟</span>
              <span>{currentUser?.points || 0}</span>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-ink hover:text-moss focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line bg-paper px-4 pt-3 pb-6 flex flex-col gap-3 font-medium text-sm">
          <Link to="/" className="py-2 text-ink hover:text-moss">
            Browse Board
          </Link>
          {isLoggedIn ? (
            <>
              <Link to="/create" className="py-2 text-moss font-semibold">
                + Post Notice
              </Link>
              <Link to="/my-posts" className="py-2 text-ink hover:text-moss">
                My Notices
              </Link>
              {currentUser?.role === 'admin' && (
                <Link to="/admin" className="py-2 text-mustard font-semibold">
                  Admin Panel
                </Link>
              )}
              <Link to="/profile" className="py-2 text-ink hover:text-moss">
                Profile & Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-left py-2 text-muted hover:text-ink cursor-pointer"
              >
                Sign out ({currentUser?.name})
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2 border border-line rounded text-ink bg-white font-medium"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="w-full text-center py-2 bg-moss text-paper rounded font-medium shadow-sm"
              >
                Join Found.
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
