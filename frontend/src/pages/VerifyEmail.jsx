import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api, { saveSession } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) {
      showToast('Please provide both your email and the 6-digit code.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-email', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      // Save credentials and update navbar
      saveSession(res.data.user, res.data.token);
      showToast('Email verified! Welcome to Found.', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Verification failed. Please check the code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      showToast('Please enter your email to resend code.', 'warning');
      return;
    }

    setResending(true);
    try {
      const res = await api.post('/auth/resend-code', {
        email: email.trim().toLowerCase(),
      });
      showToast(res.data.message || 'Fresh verification code dispatched.', 'info');
      setCountdown(30); // 30-second throttle
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resend code.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-tint flex items-center justify-center text-teal-dark text-xl font-serif">
          ✉️
        </div>

        <h1 className="font-serif text-2xl font-bold text-ink mb-1">Verify Your Email</h1>
        <p className="text-xs text-muted mb-6">
          We sent a 6-digit code to your campus email address. Enter it below to activate your account.
        </p>

        <form onSubmit={handleVerify} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-center text-xl font-mono tracking-widest text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-moss hover:bg-moss-dark text-paper text-sm font-semibold py-2.5 rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Verify and Log In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-line text-xs text-muted flex items-center justify-between">
          <span>Didn't get the code?</span>
          <button
            type="button"
            disabled={resending || countdown > 0}
            onClick={handleResend}
            className="text-moss font-bold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Dispatching...' : 'Resend Code'}
          </button>
        </div>

        <div className="mt-4 text-xs text-muted">
          Back to{' '}
          <Link to="/login" className="underline hover:text-ink">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
