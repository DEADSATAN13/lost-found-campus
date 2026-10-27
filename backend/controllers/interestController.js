import Interest from '../models/Interest.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { serverError } from '../utils/respond.js';

function coerceString(val) {
  return typeof val === 'string' ? val.trim() : '';
}

/**
 * POST /api/interests
 * Creates a response/interest message for a post.
 * Enforces: active post only, cannot respond to own post, no duplicate responses, message <= 500.
 * Immediately unlocks and returns the poster's contact details to the responder.
 * Dispatches an email notification to the post owner (non-blocking).
 */
export async function createInterest(req, res) {
  try {
    const postId = coerceString(req.body.postId);
    const message = coerceString(req.body.message);

    if (!postId) {
      return res.status(400).json({ message: 'Post ID is required.' });
    }

    if (!message || message.length > 500) {
      return res.status(400).json({ message: 'Message is required and must not exceed 500 characters.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Active status check
    if (post.status !== 'active') {
      return res.status(400).json({ message: 'Cannot respond to an inactive or resolved post.' });
    }

    // Prevent answering own post
    if (post.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot respond to your own post.' });
    }

    // Prevent duplicate responses
    const existing = await Interest.findOne({ post: post._id, student: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already responded to this post.' });
    }

    // Create interest record
    const interest = await Interest.create({
      post: post._id,
      student: req.user._id,
      message,
    });

    // Fetch poster contact info to reveal to responder and notify via email
    const poster = await User.findById(post.user).select('name email phone');

    // Notify post owner via email asynchronously without awaiting or failing the request
    if (poster && poster.email) {
      sendEmail({
        to: poster.email,
        subject: `New response to your post: "${post.title}"`,
        text: `Hi ${poster.name},\n\n${req.user.name} responded to your post "${post.title}":\n\n"${message}"\n\nResponder Contact:\nEmail: ${req.user.email}\nPhone: ${req.user.phone || 'Not provided'}\n\n- The Found. Team`,
      }).catch((err) => console.error('Failed to notify post owner:', err.message));
    }

    return res.status(201).json({
      message: 'Interest submitted successfully.',
      interest,
      posterContact: {
        name: poster.name,
        email: poster.email,
        phone: poster.phone || null,
      },
    });
  } catch (error) {
    return serverError(res, error, 'Failed to submit response.');
  }
}

/**
 * GET /api/interests/post/:postId
 * Retrieves all interested inquiries for a post.
 * Accessible only by the post owner or an admin.
 * Populates responder name, email, and phone.
 */
export async function getInterestsForPost(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const isOwner = post.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to view responses for this post.' });
    }

    const interests = await Interest.find({ post: post._id })
      .populate('student', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ interests });
  } catch (error) {
    return serverError(res, error, 'Failed to fetch responses.');
  }
}
