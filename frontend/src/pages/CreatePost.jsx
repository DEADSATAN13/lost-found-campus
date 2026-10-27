import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../components/Toast.jsx';

const CATEGORY_OPTIONS = [
  'Accessories',
  'Electronics',
  'Books',
  'Clothing',
  'IDs & Cards',
  'Keys',
  'Sports & Gym',
  'Other',
];

export default function CreatePost() {
  const { id } = useParams(); // If present, edit mode
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Accessories');
  const [type, setType] = useState('lost');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [verificationHint, setVerificationHint] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // If in edit mode, populate existing post data
  useEffect(() => {
    if (!isEditMode) return;

    async function loadPost() {
      try {
        const res = await api.get(`/posts/${id}`);
        const p = res.data.post;
        if (!res.data.isOwner) {
          showToast('You do not have permission to edit this notice.', 'error');
          navigate('/');
          return;
        }
        if (p.status !== 'active') {
          showToast('Only active notices can be edited.', 'warning');
          navigate(`/post/${id}`);
          return;
        }

        setTitle(p.title || '');
        setDescription(p.description || '');
        setCategory(p.category || 'Accessories');
        setType(p.type || 'lost');
        setLocation(p.location || '');
        setPhotoUrl(p.photoUrl || '');
        setVerificationHint(p.verificationHint || '');
      } catch (err) {
        showToast('Failed to load notice details.', 'error');
        navigate('/');
      } finally {
        setInitialLoading(false);
      }
    }

    loadPost();
  }, [id, isEditMode, navigate, showToast]);

  // Direct client-side photo upload to Cloudinary using unsigned preset
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce image file types only
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    // Enforce 5MB upload limit
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      showToast('Image size cannot exceed 5MB.', 'error');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      showToast('Cloudinary environment variables (CLOUD_NAME / PRESET) not configured.', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setPhotoUrl(data.secure_url);
      showToast('Photo uploaded successfully!', 'success');
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      showToast(err.message || 'Photo upload failed. Try again.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !location.trim()) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        photoUrl: photoUrl.trim(),
        verificationHint: verificationHint.trim(),
      };

      if (isEditMode) {
        // Edit mode: PATCH /api/posts/:id (type cannot be modified)
        await api.patch(`/posts/${id}`, payload);
        showToast('Notice updated successfully.', 'success');
        navigate(`/post/${id}`);
      } else {
        // Create mode: POST /api/posts
        payload.type = type;
        const res = await api.post('/posts', payload);
        showToast('Notice posted to the board!', 'success');
        navigate(`/post/${res.data.post._id}`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save notice.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted font-serif">
        Loading notice details...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link to="/" className="text-xs font-semibold text-muted hover:text-ink">
          ← Cancel and return to board
        </Link>
      </div>

      <div className="bg-white border border-line rounded-md p-6 sm:p-8 shadow-notice">
        <div className="border-b border-line pb-4 mb-6">
          <h1 className="font-serif text-2xl font-bold text-ink">
            {isEditMode ? 'Edit Campus Notice' : 'Post a Notice on the Board'}
          </h1>
          <p className="text-xs text-muted mt-1">
            {isEditMode
              ? 'Update the details of your active notice.'
              : 'Post about an item you lost, found on campus, or want to trade with other students.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Notice Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Notice Type {isEditMode && <span className="text-xs font-normal normal-case text-amber-700">(Type cannot be modified)</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'lost', label: 'Lost', color: 'hover:border-mustard peer-checked:bg-mustard-tint peer-checked:text-mustard-dark peer-checked:border-mustard' },
                { id: 'found', label: 'Found', color: 'hover:border-teal peer-checked:bg-teal-tint peer-checked:text-teal-dark peer-checked:border-teal' },
                { id: 'trade', label: 'Trade', color: 'hover:border-plum peer-checked:bg-plum-tint peer-checked:text-plum-dark peer-checked:border-plum' },
              ].map((opt) => (
                <label key={opt.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="noticeType"
                    value={opt.id}
                    disabled={isEditMode}
                    checked={type === opt.id}
                    onChange={(e) => setType(e.target.value)}
                    className="sr-only peer"
                  />
                  <div
                    className={`border border-line rounded py-2.5 text-center text-xs font-bold uppercase transition-all bg-paper/50 ${opt.color} ${
                      isEditMode && type !== opt.id ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  >
                    {opt.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Notice Title *
            </label>
            <input
              type="text"
              maxLength={100}
              required
              placeholder="e.g. Casio fx-991EX Calculator or Blue Hydro Flask"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
            />
            <div className="text-right text-[11px] text-muted mt-1">{title.length} / 100</div>
          </div>

          {/* Category & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Campus Location *
              </label>
              <input
                type="text"
                maxLength={100}
                required
                placeholder="e.g. Library 2nd Floor, Science Lab 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-paper border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Description *
            </label>
            <textarea
              rows={4}
              maxLength={1000}
              required
              placeholder="Describe the item, when it was seen or lost, specific condition, or what you wish to trade for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-paper border border-line rounded p-3 text-sm text-ink focus:outline-none focus:border-moss"
            />
            <div className="text-right text-[11px] text-muted mt-1">{description.length} / 1000</div>
          </div>

          {/* Private Verification Hint (For Lost & Found only) */}
          {(type === 'lost' || type === 'found') && (
            <div className="p-4 rounded bg-paper border border-line">
              <label className="block text-xs font-bold text-moss mb-1">
                🔒 Private Verification Hint (Max 200 chars)
              </label>
              <p className="text-[11px] text-muted mb-2">
                This detail is hidden from the public and kept strictly private to you. Use it to verify the rightful owner (e.g. "Has initials AK on bottom", "Lock screen wallpaper is an anime character").
              </p>
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Secret scratch on back, specific sticker, or keychain"
                value={verificationHint}
                onChange={(e) => setVerificationHint(e.target.value)}
                className="w-full bg-white border border-line rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-moss font-mono"
              />
            </div>
          )}

          {/* Photo Upload (Cloudinary) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
              Item Photo (Optional, Max 5MB)
            </label>

            {photoUrl ? (
              <div className="flex items-center gap-4 p-3 bg-paper border border-line rounded">
                <img
                  src={photoUrl}
                  alt="Item preview"
                  className="w-16 h-16 object-cover rounded border border-line"
                />
                <div className="flex-1 truncate">
                  <div className="text-xs font-semibold text-ink">Photo attached</div>
                  <div className="text-[11px] text-muted truncate">{photoUrl}</div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-moss file:text-paper hover:file:bg-moss-dark cursor-pointer"
                />
                {uploadingPhoto && (
                  <p className="text-xs text-moss font-semibold mt-1.5 animate-pulse">
                    Uploading image to Cloudinary...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-line flex justify-end gap-3">
            <Link
              to="/"
              className="px-4 py-2 border border-line rounded text-xs font-semibold text-ink hover:bg-paper"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="bg-moss hover:bg-moss-dark text-paper text-sm font-semibold px-6 py-2 rounded transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {submitting
                ? isEditMode
                  ? 'Saving Changes...'
                  : 'Posting Notice...'
                : isEditMode
                ? 'Save Changes'
                : 'Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
