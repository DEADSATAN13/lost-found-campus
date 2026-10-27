import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
      showToast('Reset request received. Check your email.', 'info');
    } catch (err) {
      showToast('Failed to process reset request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-paper flex items-center justify-center text-xl">
            🔑
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink">Reset Your Password</h1>
          <p className="text-xs text-muted mt-1">
            Enter your college email address to receive a secure 30-minute reset link.
          </p>
        </div>

        {submitted ? (
          <div className="p-5 rounded bg-teal-tint/60 border border-teal/30 text-teal-dark text-xs space-y-3 text-center">
            <p className="font-medium">
              If an account is associated with <strong>{email}</strong>, a password reset link has been dispatched to your inbox.
            </p>
            <p className="text-[11px] text-muted">
              Check your spam or junk folder if the email does not appear within a minute.
            </p>
            <div className="pt-2">
              <Link to="/login" className="text-xs font-bold text-moss underline">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                College Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. arjun@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-moss hover:bg-moss-dark text-paper text-sm font-semibold py-2.5 rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-line text-center text-xs text-muted">
          Remembered your password?{' '}
          <Link to="/login" className="text-moss font-semibold underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
