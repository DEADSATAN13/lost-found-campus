import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreed) {
      showToast('You must agree to the campus terms and privacy policy.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        agreed,
      });

      showToast(res.data.message || 'Verification code sent to your email!', 'success');
      // Navigate to verification page passing the email in search params
      navigate(`/verify-email?email=${encodeURIComponent(res.data.email || email.trim())}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Signup failed. Please check your inputs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice">
        <div className="text-center mb-6">
          <span className="font-serif italic font-bold text-3xl text-ink">Found.</span>
          <h1 className="font-serif text-xl font-bold text-ink mt-2">Join Campus Board</h1>
          <p className="text-xs text-muted mt-1">
            Create an account to report lost belongings, return found items, and trade.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              placeholder="e.g. Arjun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Campus Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. yourname@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              10-Digit Mobile Number *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210 (or +91...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
            <p className="text-[11px] text-muted mt-1">
              Indian mobile number. Stored securely and revealed only upon item inquiry.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Password (Min 6 characters) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              maxLength={100}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          {/* Terms & Privacy Consent */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-moss focus:ring-moss"
              />
              <span className="text-xs text-muted leading-relaxed">
                I agree to the{' '}
                <Link to="/privacy" target="_blank" className="text-moss font-semibold underline">
                  Campus Privacy Policy & Rules
                </Link>
                , and understand that my contact details will be shared with verified students when an inquiry is made.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-moss hover:bg-moss-dark text-paper text-sm font-semibold py-2.5 rounded transition-colors shadow-sm disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? 'Creating Account...' : 'Continue to Verification →'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-line text-center text-xs text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-moss font-semibold underline">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
