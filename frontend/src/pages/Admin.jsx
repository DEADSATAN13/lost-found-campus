import React, { useState, useEffect, useCallback } from 'react';
import api from '../api.js';
import TypeBadge from '../components/TypeBadge.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, postsRes, usersRes] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/admin/posts'),
        api.get('/admin/users'),
      ]);

      setReports(reportsRes.data.reports || []);
      setPosts(postsRes.data.posts || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      showToast('Failed to load admin panel data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Dismiss an open report
  const handleDismissReport = async (reportId) => {
    try {
      await api.patch(`/admin/reports/${reportId}/dismiss`);
      showToast('Report dismissed.', 'success');
      setReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err) {
      showToast('Failed to dismiss report.', 'error');
    }
  };

  // Remove a post (and cascade delete)
  const handleRemovePost = async (postId) => {
    if (!window.confirm('Permanently remove this notice and its associated responses/reports?')) {
      return;
    }
    try {
      await api.delete(`/admin/posts/${postId}`);
      showToast('Notice permanently removed.', 'success');
      // Update both posts and open reports
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setReports((prev) => prev.filter((r) => r.post?._id !== postId));
    } catch (err) {
      showToast('Failed to remove notice.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="border-b border-line pb-4 mb-8">
        <h1 className="font-serif text-3xl font-bold text-ink">Campus Moderation Panel</h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Review community reports, moderate notices, and inspect registered campus accounts.
        </p>
      </div>

      {/* Counts KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-line rounded p-5 shadow-notice">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">Total Notices</div>
          <div className="text-3xl font-serif font-bold text-ink mt-1">{posts.length}</div>
        </div>
        <div className="bg-white border border-red-200 rounded p-5 shadow-notice">
          <div className="text-xs uppercase tracking-wider text-red-700 font-bold">Open Reports</div>
          <div className="text-3xl font-serif font-bold text-red-800 mt-1">{reports.length}</div>
        </div>
        <div className="bg-white border border-line rounded p-5 shadow-notice">
          <div className="text-xs uppercase tracking-wider text-muted font-bold">Registered Users</div>
          <div className="text-3xl font-serif font-bold text-moss mt-1">{users.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted font-serif">Loading admin records...</div>
      ) : (
        <div className="space-y-10">
          {/* Open Violation Reports */}
          <section className="bg-white border border-line rounded-md p-6 shadow-notice">
            <h2 className="font-serif text-xl font-bold text-ink mb-2">
              Open Violation Reports ({reports.length})
            </h2>
            <p className="text-xs text-muted mb-6">
              Notices flagged by students for spam, scams, or campus policy violations.
            </p>

            {reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-paper rounded border border-line">
                ✓ All clear! There are no open violation reports right now.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report._id}
                    className="p-4 rounded border border-red-200 bg-red-50/40 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-red-700 text-white font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[10px]">
                          {report.reason}
                        </span>
                        <span className="font-semibold text-ink">
                          Target Notice: "{report.post?.title || 'Unknown or Deleted Post'}"
                        </span>
                      </div>
                      <span className="text-muted text-[11px]">
                        Reported by {report.reporter?.name} ({report.reporter?.email})
                      </span>
                    </div>

                    {report.note && (
                      <p className="text-ink/80 bg-white p-2.5 rounded border border-line/70">
                        <strong>Reporter Note:</strong> {report.note}
                      </p>
                    )}

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => handleDismissReport(report._id)}
                        className="px-3 py-1 bg-white hover:bg-stone-100 text-ink border border-line rounded text-xs font-semibold cursor-pointer"
                      >
                        Dismiss Report
                      </button>
                      {report.post?._id && (
                        <button
                          onClick={() => handleRemovePost(report.post._id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          Remove Notice
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* All Notices Directory */}
          <section className="bg-white border border-line rounded-md p-6 shadow-notice">
            <h2 className="font-serif text-xl font-bold text-ink mb-4">
              All Campus Notices ({posts.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider">
                    <th className="py-2.5 pr-4">Type</th>
                    <th className="py-2.5 pr-4">Title</th>
                    <th className="py-2.5 pr-4">Author</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-4">Location</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {posts.map((post) => (
                    <tr key={post._id} className="hover:bg-paper/40">
                      <td className="py-3 pr-4">
                        <TypeBadge type={post.type} size="sm" />
                      </td>
                      <td className="py-3 pr-4 font-medium text-ink max-w-xs truncate">
                        {post.title}
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {post.user?.name || 'Unknown'} ({post.user?.email || 'N/A'})
                      </td>
                      <td className="py-3 pr-4">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-paper border border-line">
                          {post.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted truncate max-w-[140px]">
                        {post.location}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRemovePost(post._id)}
                          className="text-red-600 hover:underline font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* User Accounts Directory */}
          <section className="bg-white border border-line rounded-md p-6 shadow-notice">
            <h2 className="font-serif text-xl font-bold text-ink mb-4">
              Registered Accounts ({users.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider">
                    <th className="py-2.5 pr-4">Name</th>
                    <th className="py-2.5 pr-4">Email</th>
                    <th className="py-2.5 pr-4">Phone</th>
                    <th className="py-2.5 pr-4">Role</th>
                    <th className="py-2.5 pr-4">Points</th>
                    <th className="py-2.5 text-right">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-paper/40">
                      <td className="py-3 pr-4 font-medium text-ink">{u.name}</td>
                      <td className="py-3 pr-4 text-muted">{u.email}</td>
                      <td className="py-3 pr-4 text-muted">{u.phone || '—'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                            u.role === 'admin'
                              ? 'bg-mustard-tint text-mustard-dark border border-mustard/30'
                              : 'bg-paper text-ink/70 border border-line'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-moss">{u.points || 0}</td>
                      <td className="py-3 text-right">
                        {u.emailVerified ? (
                          <span className="text-moss font-bold">✓ Verified</span>
                        ) : (
                          <span className="text-stone-400">Unverified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
