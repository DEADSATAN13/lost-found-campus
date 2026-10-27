import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api, { getStoredToken } from '../api.js';
import TypeBadge from '../components/TypeBadge.jsx';
import { useToast } from '../components/Toast.jsx';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [post, setPost] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Response state
  const [responseMsg, setResponseMsg] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [posterContact, setPosterContact] = useState(null);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportNote, setReportNote] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const isLoggedIn = !!getStoredToken();

  useEffect(() => {
    async function fetchPost() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await api.get(`/posts/${id}`);
        setPost(res.data.post);
        setIsOwner(res.data.isOwner);
        setMatch(res.data.match || null);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setNotFound(true);
        } else {
          showToast('Failed to load notice.', 'error');
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPost();
    }
  }, [id, showToast]);

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this notice? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/posts/${post._id}`);
      showToast('Notice deleted successfully.', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete notice.', 'error');
    }
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!responseMsg.trim()) {
      showToast('Please type a message before sending.', 'warning');
      return;
    }

    setSubmittingResponse(true);
    try {
      const res = await api.post('/interests', {
        postId: post._id,
        message: responseMsg.trim(),
      });
      showToast('Response sent! Poster contact details revealed below.', 'success');
      setPosterContact(res.data.posterContact);
      setResponseMsg('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit response.', 'error');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await api.post('/reports', {
        postId: post._id,
        reason: reportReason,
        note: reportNote.trim(),
      });
      showToast('Report submitted. Moderators have been notified.', 'success');
      setShowReportModal(false);
      setReportNote('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted">
        <div className="text-3xl animate-bounce mb-3">📌</div>
        <p className="font-serif text-lg">Fetching notice details...</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper border border-line flex items-center justify-center text-2xl">
          🔍
        </div>
        <h1 className="font-serif text-2xl font-bold text-ink mb-2">Notice Not Found</h1>
        <p className="text-muted text-sm mb-6">
          This post may have been resolved, archived, or removed by campus moderators.
        </p>
        <Link
          to="/"
          className="bg-moss hover:bg-moss-dark text-paper text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          Return to Board
        </Link>
      </div>
    );
  }

  // Border highlight color by type
  const typeStr = String(post.type || 'lost').toLowerCase();
  let leftBorderClass = 'border-l-mustard';
  if (typeStr === 'found') leftBorderClass = 'border-l-teal';
  if (typeStr === 'trade') leftBorderClass = 'border-l-plum';

  // Display only first name
  const rawPosterName = post.user?.name || 'Student';
  const posterFirstName = rawPosterName.trim().split(' ')[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/"
          className="text-xs font-semibold text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
        >
          ← Back to Noticeboard
        </Link>
      </div>

      {/* Archived Notice Warning */}
      {post.status === 'archived' && (
        <div className="mb-6 p-4 rounded bg-stone-100 border border-stone-300 text-stone-700 text-sm flex items-center justify-between">
          <span>⚠️ <strong>Archived Notice:</strong> This post has expired. It is only visible to you.</span>
          {isOwner && (
            <Link
              to="/my-posts"
              className="text-xs font-bold text-moss underline"
            >
              Renew in My Notices →
            </Link>
          )}
        </div>
      )}

      {/* Opposite-Type Keyword Match Banner */}
      {match && (
        <div className="mb-6 p-4 rounded bg-teal-tint/70 border border-teal/40 text-teal-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-teal">
              💡 Automated Match Alert
            </div>
            <div className="text-sm font-medium">
              We found a matching active <span className="uppercase font-bold">{match.type}</span> post titled:{' '}
              <strong>"{match.title}"</strong>
            </div>
          </div>
          <Link
            to={`/post/${match._id}`}
            className="inline-block bg-teal text-white hover:bg-teal-dark text-xs font-bold px-3 py-1.5 rounded transition-colors whitespace-nowrap text-center"
          >
            Inspect Match →
          </Link>
        </div>
      )}

      {/* Main Notice Card */}
      <article className={`bg-white rounded-md border border-line border-l-4 ${leftBorderClass} shadow-notice p-6 sm:p-8 mb-8`}>
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={post.type} />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider bg-paper px-2.5 py-1 rounded border border-line">
              {post.category}
            </span>
          </div>

          <div className="text-xs text-muted">
            Posted by <span className="font-semibold text-ink">{posterFirstName}</span> •{' '}
            {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Location line */}
        <div className="flex items-center gap-1.5 text-sm text-ink/80 font-medium mb-6">
          <span>📍</span>
          <span>Location: {post.location}</span>
        </div>

        {/* Attached photo (Cloudinary) */}
        {post.photoUrl && (
          <div className="mb-6 rounded-md overflow-hidden border border-line bg-stone-50 max-h-96 flex items-center justify-center">
            <img
              src={post.photoUrl}
              alt={post.title}
              className="max-h-96 w-auto object-contain"
            />
          </div>
        )}

        {/* Description */}
        <div className="prose prose-sm text-ink/90 whitespace-pre-wrap leading-relaxed mb-6 font-sans">
          {post.description}
        </div>

        {/* Private Verification Hint (Owner Only) */}
        {isOwner && (
          <div className="p-4 rounded-md bg-paper border border-line text-xs space-y-1 mb-6">
            <div className="font-bold text-moss flex items-center gap-1">
              <span>🔒</span> Private Verification Hint (Visible only to you)
            </div>
            <p className="text-ink/80 font-mono">
              {post.verificationHint || 'No private hint specified.'}
            </p>
            <p className="text-muted text-[11px]">
              Use this secret detail to verify a student actually has or lost this item before meeting.
            </p>
          </div>
        )}

        {/* Owner Controls */}
        {isOwner && (
          <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">Notice Status: <strong className="uppercase text-ink">{post.status}</strong></span>
            <div className="flex gap-2">
              <Link
                to={`/edit/${post._id}`}
                className="px-3.5 py-1.5 rounded border border-line bg-white hover:bg-paper text-ink text-xs font-semibold transition-colors"
              >
                Edit Notice
              </Link>
              <button
                onClick={handleDeletePost}
                className="px-3.5 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Delete Notice
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Response Section */}
      <section className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice mb-8">
        <h2 className="font-serif text-xl font-bold text-ink mb-2">
          {post.type === 'trade' ? 'Inquire to Trade' : 'Respond to this Notice'}
        </h2>
        <p className="text-xs text-muted mb-6">
          To maintain campus safety, the poster's phone number and college email are revealed immediately after you submit your inquiry message.
        </p>

        {isOwner ? (
          <div className="p-4 rounded bg-paper border border-line text-xs text-muted text-center">
            You are the author of this notice. Head over to{' '}
            <Link to="/my-posts" className="text-moss font-bold underline">
              My Notices
            </Link>{' '}
            to check student responses.
          </div>
        ) : post.status !== 'active' ? (
          <div className="p-4 rounded bg-stone-100 border border-stone-200 text-xs text-stone-600 text-center">
            This notice is resolved or archived and is no longer accepting responses.
          </div>
        ) : !isLoggedIn ? (
          <div className="p-6 rounded bg-paper border border-line text-center">
            <p className="text-sm font-medium text-ink mb-3">
              Sign in with your campus account to respond and unlock the poster's contact details.
            </p>
            <Link
              to="/login"
              className="inline-block bg-moss hover:bg-moss-dark text-paper text-xs font-bold px-5 py-2.5 rounded transition-colors"
            >
              Sign In to Respond
            </Link>
          </div>
        ) : posterContact ? (
          /* Contact Details Revealed State */
          <div className="p-6 rounded-md bg-teal-tint border border-teal/40 space-y-3">
            <div className="flex items-center gap-2 text-teal-dark font-serif font-bold text-lg">
              <span>🎉</span> Response Sent! Contact Details:
            </div>
            <div className="text-sm text-ink space-y-1">
              <div>
                <strong>Name:</strong> {posterContact.name}
              </div>
              <div>
                <strong>Email:</strong>{' '}
                <a
                  href={`mailto:${posterContact.email}`}
                  className="text-moss font-semibold underline"
                >
                  {posterContact.email}
                </a>
              </div>
              <div>
                <strong>Phone:</strong>{' '}
                {posterContact.phone ? (
                  <a
                    href={`tel:${posterContact.phone}`}
                    className="text-moss font-semibold underline"
                  >
                    {posterContact.phone} (Tap to Call)
                  </a>
                ) : (
                  <span className="text-muted">Not provided</span>
                )}
              </div>
            </div>
            <p className="text-xs text-teal-dark/90 mt-2">
              An email notification has also been sent to {posterContact.name} with your contact info.
            </p>
          </div>
        ) : (
          /* Response Form */
          <form onSubmit={handleSendResponse} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Your Message (Max 500 characters)
              </label>
              <textarea
                rows={4}
                maxLength={500}
                value={responseMsg}
                onChange={(e) => setResponseMsg(e.target.value)}
                placeholder="Hi! I think I found your water bottle near the cafe... or I'm interested in trading your textbook..."
                className="w-full bg-paper border border-line rounded p-3 text-sm text-ink focus:outline-none focus:border-moss"
                required
              />
              <div className="text-right text-[11px] text-muted mt-1">
                {responseMsg.length} / 500
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingResponse}
              className="bg-moss hover:bg-moss-dark text-paper text-sm font-semibold px-6 py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {submittingResponse ? 'Sending...' : 'Send Message & Reveal Contact'}
            </button>
          </form>
        )}
      </section>

      {/* Report Post Trigger */}
      {!isOwner && isLoggedIn && (
        <div className="text-right">
          <button
            onClick={() => setShowReportModal(true)}
            className="text-xs text-muted hover:text-red-700 underline transition-colors cursor-pointer"
          >
            Report suspicious or inappropriate notice
          </button>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-line">
            <h3 className="font-serif text-lg font-bold text-ink mb-1">Report Notice</h3>
            <p className="text-xs text-muted mb-4">
              Help keep Found. safe. Reports are investigated by campus administrators.
            </p>

            <form onSubmit={handleSendReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Reason for Report
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
                >
                  <option value="spam">Spam or Duplicate Post</option>
                  <option value="inappropriate">Inappropriate or Offensive Content</option>
                  <option value="scam">Suspected Scam or False Claim</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Additional Note (Optional, max 200 chars)
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Provide context for moderators..."
                  className="w-full bg-paper border border-line rounded p-2.5 text-sm text-ink focus:outline-none focus:border-moss"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-line rounded text-xs font-semibold text-ink hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
