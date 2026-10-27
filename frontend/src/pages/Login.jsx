import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { saveSession } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      showToast('Please enter both your identifier and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      saveSession(res.data.user, res.data.token);
      showToast('Welcome back to Found.!', 'success');
      navigate('/');
    } catch (err) {
      // Check if server rejected login because email is unverified (status 403)
      if (err.response?.status === 403 && err.response?.data?.needsVerification) {
        showToast(err.response.data.message || 'Please verify your email address to continue.', 'warning');
        navigate(`/verify-email?email=${encodeURIComponent(err.response.data.email || identifier.trim())}`);
        return;
      }

      showToast(err.response?.data?.message || 'Invalid email/phone or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice">
        <div className="text-center mb-6">
          <span className="font-serif italic font-bold text-3xl text-ink">Found.</span>
          <h1 className="font-serif text-xl font-bold text-ink mt-2">Sign in to your account</h1>
          <p className="text-xs text-muted mt-1">
            Access the campus noticeboard using your email or phone number.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Campus Email or 10-Digit Mobile Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. arjun@example.com or 9876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Password *
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-muted hover:text-moss underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-moss hover:bg-moss-dark text-paper text-sm font-semibold py-2.5 rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-line text-center text-xs text-muted">
          New to campus?{' '}
          <Link to="/signup" className="text-moss font-semibold underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
