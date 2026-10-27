import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      showToast(res.data.message || 'Password reset successful! You can now log in.', 'success');
      navigate('/login');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid or expired password reset link.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice">
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-bold text-ink">Set New Password</h1>
          <p className="text-xs text-muted mt-1">
            Choose a new secure password for your Found. account.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              New Password (Min 6 characters) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-moss hover:bg-moss-dark text-paper text-sm font-semibold py-2.5 rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Save Password and Log In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-line text-center text-xs text-muted">
          Back to{' '}
          <Link to="/login" className="text-moss font-semibold underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
