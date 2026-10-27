import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { triggerUserRefresh } from '../api.js';
import TypeBadge from '../components/TypeBadge.jsx';
import { useToast } from '../components/Toast.jsx';

export default function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeInquiryPostId, setActiveInquiryPostId] = useState(null);
  const [inquiries, setInquiries] = useState({});
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const { showToast } = useToast();

  const fetchMyPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts/mine');
      if (res.data && Array.isArray(res.data.posts)) {
        setPosts(res.data.posts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      showToast('Failed to load your notices.', 'error');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  // Mark an active post as resolved and award points if found item
  const handleResolve = async (postId) => {
    try {
      await api.patch(`/posts/${postId}/resolve`);
      showToast('Notice marked as resolved! Points updated.', 'success');
      // Refresh user points in navbar
      triggerUserRefresh();
      fetchMyPosts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark as resolved.', 'error');
    }
  };

  // Renew an expired/archived notice
  const handleRenew = async (postId) => {
    try {
      await api.patch(`/posts/${postId}/renew`);
      showToast('Notice renewed for 30 days.', 'success');
      fetchMyPosts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to renew notice.', 'error');
    }
  };

  // Delete notice
  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this notice? All associated responses and reports will be removed.')) {
      return;
    }
    try {
      await api.delete(`/posts/${postId}`);
      showToast('Notice deleted.', 'success');
      fetchMyPosts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete notice.', 'error');
    }
  };

  // Toggle and fetch inquiries for a post
  const toggleInquiries = async (postId) => {
    if (activeInquiryPostId === postId) {
      setActiveInquiryPostId(null);
      return;
    }

    setActiveInquiryPostId(postId);
    if (!inquiries[postId]) {
      setLoadingInquiries(true);
      try {
        const res = await api.get(`/interests/post/${postId}`);
        setInquiries((prev) => ({
          ...prev,
          [postId]: res.data.interests || [],
        }));
      } catch (err) {
        showToast('Failed to fetch inquiries.', 'error');
      } finally {
        setLoadingInquiries(false);
      }
    }
  };

  const calculateDaysLeft = (expiresAt) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">My Campus Notices</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Manage your lost, found, and trade notices, inspect student inquiries, and resolve returned items.
          </p>
        </div>
        <Link
          to="/create"
          className="inline-block bg-moss hover:bg-moss-dark text-paper text-xs font-semibold px-4 py-2.5 rounded transition-colors shadow-sm text-center"
        >
          + Post New Notice
        </Link>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted font-serif">
          Loading your notices...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="bg-white border border-line rounded-md p-10 text-center shadow-notice">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="font-serif text-lg font-bold text-ink mb-1">You haven't posted any notices yet</h3>
          <p className="text-muted text-xs sm:text-sm max-w-sm mx-auto mb-5">
            Lost something on campus, or spotted an item without an owner? Put up a notice on the board.
          </p>
          <Link
            to="/create"
            className="inline-block bg-moss hover:bg-moss-dark text-paper text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Create Your First Notice
          </Link>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => {
            const daysLeft = calculateDaysLeft(post.expiresAt);
            const isOpenInquiries = activeInquiryPostId === post._id;
            const currentInquiries = inquiries[post._id] || [];

            return (
              <div
                key={post._id}
                className="bg-white border border-line rounded-md p-5 shadow-notice transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <TypeBadge type={post.type} size="sm" />
                      <span className="text-xs font-medium text-muted uppercase">
                        {post.category}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          post.status === 'active'
                            ? 'bg-moss/10 text-moss'
                            : post.status === 'resolved'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    <Link
                      to={`/post/${post._id}`}
                      className="font-serif text-lg font-bold text-ink hover:text-moss transition-colors"
                    >
                      {post.title}
                    </Link>
                  </div>

                  {/* Expiration badge */}
                  <div className="text-xs text-muted sm:text-right shrink-0">
                    {post.status === 'active' ? (
                      <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⏳ {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                      </span>
                    ) : post.status === 'resolved' ? (
                      <span className="text-moss font-semibold">✓ Resolved & Reunited</span>
                    ) : (
                      <span className="text-stone-500">Expired / Archived</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-ink/80 line-clamp-2 mb-3 leading-relaxed">
                  {post.description}
                </p>

                {/* Verification Hint Display for Owner */}
                {post.verificationHint && (
                  <div className="bg-paper p-2.5 rounded text-[11px] text-muted mb-3 font-mono">
                    <span className="font-bold text-moss font-sans">Secret Hint:</span> {post.verificationHint}
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-line/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleInquiries(post._id)}
                      className="text-xs font-semibold text-moss hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      💬 {isOpenInquiries ? 'Hide Inquiries' : 'View Inquiries'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleResolve(post._id)}
                          className="px-3 py-1 bg-moss hover:bg-moss-dark text-paper text-xs font-semibold rounded transition-colors cursor-pointer"
                          title="Mark resolved and earn points if found item"
                        >
                          Mark Resolved
                        </button>
                        <Link
                          to={`/edit/${post._id}`}
                          className="px-3 py-1 bg-paper hover:bg-stone-200 text-ink text-xs font-semibold rounded border border-line transition-colors"
                        >
                          Edit
                        </Link>
                      </>
                    )}

                    {post.status === 'archived' && (
                      <button
                        onClick={() => handleRenew(post._id)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
                      >
                        Renew (+30 Days)
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(post._id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 text-xs font-semibold rounded border border-red-200 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inquiries Drawer */}
                {isOpenInquiries && (
                  <div className="mt-4 pt-4 border-t border-line/60 bg-paper/60 p-4 rounded-md">
                    <h4 className="font-serif text-sm font-bold text-ink mb-2">
                      Inquiries from Fellow Students
                    </h4>
                    {loadingInquiries ? (
                      <p className="text-xs text-muted">Loading inquiries...</p>
                    ) : currentInquiries.length === 0 ? (
                      <p className="text-xs text-muted italic">No students have responded to this notice yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {currentInquiries.map((inq) => (
                          <div
                            key={inq._id}
                            className="bg-white p-3.5 rounded border border-line text-xs space-y-1.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between font-medium">
                              <span className="text-ink font-bold">
                                {inq.student?.name || 'Student'}
                              </span>
                              <span className="text-muted text-[11px]">
                                {new Date(inq.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-ink/90 whitespace-pre-wrap">{inq.message}</p>
                            <div className="pt-1.5 border-t border-line/40 flex flex-wrap gap-4 text-muted text-[11px]">
                              <span>
                                ✉️ Email:{' '}
                                <a
                                  href={`mailto:${inq.student?.email}`}
                                  className="text-moss font-semibold underline"
                                >
                                  {inq.student?.email}
                                </a>
                              </span>
                              {inq.student?.phone && (
                                <span>
                                  📞 Phone:{' '}
                                  <a
                                    href={`tel:${inq.student?.phone}`}
                                    className="text-moss font-semibold underline"
                                  >
                                    {inq.student?.phone}
                                  </a>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
