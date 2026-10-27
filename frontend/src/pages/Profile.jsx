import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getStoredUser, saveSession, clearSession, getStoredToken } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function Profile() {
  const [user, setUser] = useState(getStoredUser());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Account deletion fields
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadFreshProfile() {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          setName(res.data.user.name || '');
          setPhone(res.data.user.phone || '');
          saveSession(res.data.user, getStoredToken());
        }
      } catch (err) {
        // Handled by api interceptor
      }
    }

    loadFreshProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await api.patch('/auth/profile', {
        name: name.trim(),
        phone: phone.trim(),
      });
      setUser(res.data.user);
      saveSession(res.data.user, getStoredToken());
      showToast('Profile information updated.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Password changed successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      showToast('Please enter your password to confirm account deletion.', 'warning');
      return;
    }

    if (!window.confirm('Are you ABSOLUTELY certain? All your posts, responses, and campus data will be permanently wiped.')) {
      return;
    }

    setDeletingAccount(true);
    try {
      await api.delete('/auth/me', {
        data: { password: deletePassword },
      });
      clearSession();
      showToast('Account successfully deleted.', 'info');
      navigate('/login');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="border-b border-line pb-4">
        <h1 className="font-serif text-3xl font-bold text-ink">Account Settings</h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Manage your campus profile, password credentials, and security settings.
        </p>
      </div>

      {/* Profile Info Form */}
      <section className="bg-white border border-line rounded-md p-6 shadow-notice">
        <h2 className="font-serif text-lg font-bold text-ink mb-1">Personal Details</h2>
        <p className="text-xs text-muted mb-5">
          Your college email is permanently tied to your student account.
        </p>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Email Address (Verified)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-stone-100 border border-line rounded px-3 py-2 text-sm text-stone-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              10-Digit Mobile Number (India)
            </label>
            <input
              type="tel"
              placeholder="e.g. 9876543210 or +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
            <p className="text-[11px] text-muted mt-1">
              Shared only with verified students who respond to your item notices.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updatingProfile}
              className="bg-moss hover:bg-moss-dark text-paper text-xs font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {updatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Change Password Form */}
      <section className="bg-white border border-line rounded-md p-6 shadow-notice">
        <h2 className="font-serif text-lg font-bold text-ink mb-1">Change Password</h2>
        <p className="text-xs text-muted mb-5">
          Must be at least 6 characters long.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Current Password *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updatingPassword}
              className="bg-ink hover:bg-black text-paper text-xs font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>

      {/* Danger Zone: Delete Account */}
      <section className="bg-white border border-red-200 rounded-md p-6 shadow-notice">
        <h2 className="font-serif text-lg font-bold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-muted mb-4">
          Permanently delete your Found. account. All active notices, inquiry responses, and reputation points will be purged immediately.
        </p>

        {user?.role === 'admin' ? (
          <div className="p-3 bg-paper border border-line rounded text-xs text-muted">
            🛡️ Admin accounts cannot be deleted from this portal. Please contact server operations.
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-red-700 mb-1">
                Confirm Password to Delete Account *
              </label>
              <input
                type="password"
                required
                placeholder="Type your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-paper border border-red-200 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={deletingAccount}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2 rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? 'Purging Data...' : 'Permanently Delete Account'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
