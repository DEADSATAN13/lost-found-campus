import Post from '../models/Post.js';
import User from '../models/User.js';
import Interest from '../models/Interest.js';
import Report from '../models/Report.js';
import PointAward from '../models/PointAward.js';
import { serverError } from '../utils/respond.js';

// Coerces string to safe trimmed string
function coerceString(val) {
  return typeof val === 'string' ? val.trim() : '';
}

// Regex-escape helper for safe search queries
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Stop words to ignore during title match suggestion
const STOP_WORDS = new Set([
  'lost', 'found', 'trade', 'with', 'near', 'from', 'this', 'that',
  'have', 'item', 'campus', 'hall', 'room', 'block', 'floor', 'desk',
  'bag', 'case', 'bottle', 'phone', 'color', 'black', 'white', 'blue',
  'please', 'help', 'need', 'want', 'area', 'about', 'some'
]);

/**
 * GET /api/posts
 * Public browse endpoint.
 * Supports type, category, search, and status filters, with page & limit pagination.
 * Excludes private verification hints and poster contact info.
 */
export async function getPosts(req, res) {
  try {
    const rawType = coerceString(req.query.type);
    const rawCategory = coerceString(req.query.category);
    const rawSearch = coerceString(req.query.search);
    const rawStatus = coerceString(req.query.status);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    // Hard cap at 50 per page
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by type if whitelisted
    if (['lost', 'found', 'trade'].includes(rawType)) {
      query.type = rawType;
    }

    // Filter by category if provided
    if (rawCategory) {
      query.category = rawCategory;
    }

    // Status filter: defaults to excluding archived posts unless explicitly requested
    if (['active', 'resolved', 'archived'].includes(rawStatus)) {
      query.status = rawStatus;
    } else {
      query.status = { $ne: 'archived' };
    }

    // Safe regex search on title and description
    if (rawSearch) {
      const escaped = escapeRegex(rawSearch);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-verificationHint') // Never leak verification hint
        .populate('user', 'name') // Poster's name only (privacy guarantee)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      posts,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch posts.');
  }
}

/**
 * GET /api/posts/mine
 * Authenticated endpoint for the current user's posts.
 * Includes all statuses (active, resolved, archived) and private verification hints.
 */
export async function getMine(req, res) {
  try {
    const posts = await Post.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name')
      .lean();

    return res.status(200).json({ posts });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch your posts.');
  }
}

/**
 * GET /api/posts/:id
 * Public endpoint with optional authentication.
 * Returns post details, owner flag, verificationHint (for owner only), and match suggestion.
 * Archived posts return 404 unless viewed by owner or admin.
 */
export async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name')
      .lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const currentUserId = req.user ? req.user._id.toString() : null;
    const postOwnerId = post.user ? post.user._id.toString() : null;
    const isOwner = currentUserId !== null && currentUserId === postOwnerId;
    const isAdmin = req.user ? req.user.role === 'admin' : false;

    // Archived posts are hidden from the general public
    if (post.status === 'archived' && !isOwner && !isAdmin) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Strip private verification hint if viewer is not the owner
    if (!isOwner) {
      delete post.verificationHint;
    }

    // Find opposite-type match for lost/found items
    let match = null;
    if (post.type === 'lost' || post.type === 'found') {
      const oppositeType = post.type === 'lost' ? 'found' : 'lost';

      // Extract alphanumeric keywords of 4+ characters, filtering out common stop words
      const rawWords = post.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

      if (rawWords.length > 0) {
        const keywordOrConditions = rawWords.map((kw) => ({
          title: { $regex: escapeRegex(kw), $options: 'i' },
        }));

        match = await Post.findOne({
          _id: { $ne: post._id },
          type: oppositeType,
          status: 'active',
          $or: keywordOrConditions,
        })
          .select('-verificationHint')
          .populate('user', 'name')
          .lean();
      }
    }

    return res.status(200).json({
      post,
      isOwner,
      match,
    });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch post.');
  }
}

/**
 * POST /api/posts
 * Authenticated endpoint to create a new post.
 * Validates fields, lengths, and Cloudinary photo URL prefix.
 */
export async function createPost(req, res) {
  try {
    const title = coerceString(req.body.title);
    const description = coerceString(req.body.description);
    const category = coerceString(req.body.category);
    const type = coerceString(req.body.type);
    const location = coerceString(req.body.location);
    const photoUrl = coerceString(req.body.photoUrl);
    const verificationHint = coerceString(req.body.verificationHint);

    // Validate required fields
    if (!title || !description || !category || !type || !location) {
      return res.status(400).json({ message: 'Title, description, category, type, and location are required.' });
    }

    if (title.length > 100) {
      return res.status(400).json({ message: 'Title cannot exceed 100 characters.' });
    }

    if (description.length > 1000) {
      return res.status(400).json({ message: 'Description cannot exceed 1000 characters.' });
    }

    if (category.length > 50) {
      return res.status(400).json({ message: 'Category cannot exceed 50 characters.' });
    }

    if (location.length > 100) {
      return res.status(400).json({ message: 'Location cannot exceed 100 characters.' });
    }

    if (!['lost', 'found', 'trade'].includes(type)) {
      return res.status(400).json({ message: 'Type must be lost, found, or trade.' });
    }

    if (verificationHint.length > 200) {
      return res.status(400).json({ message: 'Verification hint cannot exceed 200 characters.' });
    }

    // Photo URL validation: must use Cloudinary URL
    if (photoUrl) {
      if (!photoUrl.startsWith('https://res.cloudinary.com/')) {
        return res.status(400).json({ message: 'Photo URL must originate from Cloudinary.' });
      }
      if (photoUrl.length > 500) {
        return res.status(400).json({ message: 'Photo URL cannot exceed 500 characters.' });
      }
    }

    const post = await Post.create({
      title,
      description,
      category,
      type,
      location,
      photoUrl,
      verificationHint,
      user: req.user._id,
      status: 'active',
    });

    const populated = await Post.findById(post._id).populate('user', 'name');
    return res.status(201).json({ post: populated, message: 'Post created successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to create post.');
  }
}

/**
 * PATCH /api/posts/:id
 * Updates an existing active post. Only owner or admin may perform edits.
 * Changing post type is strictly forbidden.
 */
export async function updatePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isOwner = post.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to edit this post.' });
    }

    if (post.status !== 'active') {
      return res.status(400).json({ message: 'Only active posts can be edited.' });
    }

    // Reject attempts to change the post type
    if (req.body.type && req.body.type !== post.type) {
      return res.status(400).json({ message: 'Post type cannot be changed.' });
    }

    if (req.body.title !== undefined) {
      const title = coerceString(req.body.title);
      if (!title || title.length > 100) {
        return res.status(400).json({ message: 'Title must be between 1 and 100 characters.' });
      }
      post.title = title;
    }

    if (req.body.description !== undefined) {
      const description = coerceString(req.body.description);
      if (!description || description.length > 1000) {
        return res.status(400).json({ message: 'Description must be between 1 and 1000 characters.' });
      }
      post.description = description;
    }

    if (req.body.category !== undefined) {
      const category = coerceString(req.body.category);
      if (!category || category.length > 50) {
        return res.status(400).json({ message: 'Category must be between 1 and 50 characters.' });
      }
      post.category = category;
    }

    if (req.body.location !== undefined) {
      const location = coerceString(req.body.location);
      if (!location || location.length > 100) {
        return res.status(400).json({ message: 'Location must be between 1 and 100 characters.' });
      }
      post.location = location;
    }

    if (req.body.photoUrl !== undefined) {
      const photoUrl = coerceString(req.body.photoUrl);
      if (photoUrl && !photoUrl.startsWith('https://res.cloudinary.com/')) {
        return res.status(400).json({ message: 'Photo URL must originate from Cloudinary.' });
      }
      if (photoUrl.length > 500) {
        return res.status(400).json({ message: 'Photo URL cannot exceed 500 characters.' });
      }
      post.photoUrl = photoUrl;
    }

    if (req.body.verificationHint !== undefined) {
      const hint = coerceString(req.body.verificationHint);
      if (hint.length > 200) {
        return res.status(400).json({ message: 'Verification hint cannot exceed 200 characters.' });
      }
      post.verificationHint = hint;
    }

    await post.save();
    const updated = await Post.findById(post._id).populate('user', 'name');
    return res.status(200).json({ post: updated, message: 'Post updated successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to update post.');
  }
}

/**
 * DELETE /api/posts/:id
 * Deletes a post, cascading to remove its interests and reports.
 */
export async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isOwner = post.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this post.' });
    }

    // Cascade delete responses and reports
    await Promise.all([
      Interest.deleteMany({ post: post._id }),
      Report.deleteMany({ post: post._id }),
      post.deleteOne(),
    ]);

    return res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to delete post.');
  }
}

/**
 * PATCH /api/posts/:id/renew
 * Re-activates an expired or archived post and extends expiration by 30 days.
 * Resolved posts cannot be renewed.
 */
export async function renewPost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isOwner = post.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to renew this post.' });
    }

    if (post.status === 'resolved') {
      return res.status(400).json({ message: 'Resolved posts cannot be renewed.' });
    }

    post.status = 'active';
    post.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await post.save();

    return res.status(200).json({ post, message: 'Post renewed for another 30 days.' });
  } catch (error) {
    return serverError(res, error, 'Failed to renew post.');
  }
}

/**
 * PATCH /api/posts/:id/resolve
 * Marks an active post as resolved.
 * For "found" posts, awards 10 points to the finder.
 * Unique PointAward index ensures idempotent payouts even under concurrent racing requests.
 */
export async function resolvePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isOwner = post.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to resolve this post.' });
    }

    // Atomic update: only transitions if current status is active
    const updatedPost = await Post.findOneAndUpdate(
      { _id: post._id, status: 'active' },
      { $set: { status: 'resolved' } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(400).json({ message: 'Only active posts can be marked as resolved.' });
    }

    // Award 10 points if this resolved post was a "found" item
    if (updatedPost.type === 'found') {
      try {
        // PointAward unique index on `post` acts as a distributed lock
        await PointAward.create({
          post: updatedPost._id,
          user: updatedPost.user,
          points: 10,
        });

        // Increment user points only if PointAward was successfully created
        await User.findByIdAndUpdate(updatedPost.user, { $inc: { points: 10 } });
      } catch (err) {
        // Code 11000 = duplicate key on post; payout already completed, ignore safely
        if (err.code !== 11000) {
          console.error('Unexpected error recording point award:', err);
        }
      }
    }

    return res.status(200).json({
      message: 'Post marked as resolved.',
      post: updatedPost,
    });
  } catch (error) {
    return serverError(res, error, 'Failed to resolve post.');
  }
}
