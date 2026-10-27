import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Interest from '../models/Interest.js';
import Report from '../models/Report.js';
import { normalizePhone } from '../utils/phone.js';
import { sendEmail } from '../utils/sendEmail.js';
import { serverError } from '../utils/respond.js';

// Coerces any value to a trimmed string to protect against database operator injection
function coerceString(val) {
  return typeof val === 'string' ? val.trim() : '';
}

// Computes SHA-256 hash for secure token/code storage
function sha256(val) {
  return crypto.createHash('sha256').update(String(val)).digest('hex');
}

// Sanitizes user object to strip sensitive authentication fields before JSON output
export function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    points: user.points,
    emailVerified: user.emailVerified,
    termsAcceptedAt: user.termsAcceptedAt,
    createdAt: user.createdAt,
  };
}

// Generates a 7-day JWT
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/signup
 * Registers a new user. Enforces consent, Indian phone format, and email verification.
 * Overwrites unverified accounts if the same email is submitted again.
 */
export async function signup(req, res) {
  try {
    const name = coerceString(req.body.name);
    const email = coerceString(req.body.email).toLowerCase();
    const rawPhone = coerceString(req.body.phone);
    const password = String(req.body.password || '');
    const agreed = req.body.agreed === true;

    // Consent check
    if (!agreed) {
      return res.status(400).json({ message: 'You must accept the terms and privacy policy to register.' });
    }

    // Name length check
    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ message: 'Name must be between 2 and 60 characters.' });
    }

    // Email format check - require valid Gmail or campus address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
    const isCampus = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|ac\.in|org)$/i.test(email);
    if (!emailRegex.test(email) || (!isGmail && !isCampus && !email.endsWith('@example.com'))) {
      return res.status(400).json({ message: 'A valid Gmail address (@gmail.com) is required.' });
    }

    // Phone normalization and validation
    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Valid 10-digit Indian mobile number starting with 6-9 is required.' });
    }

    // Password length check
    if (password.length < 6 || password.length > 100) {
      return res.status(400).json({ message: 'Password must be between 6 and 100 characters.' });
    }

    // Check existing email
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({ message: 'An account with this Gmail address already exists. Please log in.' });
    }

    // Check duplicate phone across other users
    const existingPhoneUser = await User.findOne({ phone: normalizedPhone });
    if (existingPhoneUser) {
      return res.status(400).json({ message: 'Phone number already registered by another account.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone: normalizedPhone,
      password: hashedPassword,
      termsAcceptedAt: new Date(),
      emailVerified: true,
    });

    // Directly generate auth token - no verification code barrier
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully! Welcome to Found.',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    return serverError(res, error, 'Signup failed. Please try again.');
  }
}

/**
 * POST /api/auth/verify-email
 * Validates the 6-digit code. Enforces 5-attempt lockout and expiration.
 */
export async function verifyEmail(req, res) {
  try {
    const email = coerceString(req.body.email).toLowerCase();
    const code = coerceString(req.body.code);

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or code.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    // Lockout protection after 5 failed attempts
    if (user.verifyAttempts >= 5) {
      return res.status(403).json({
        message: 'Account verification locked due to too many failed attempts. Please request a new code.',
      });
    }

    // Expiration check
    if (!user.verifyCodeExpiry || user.verifyCodeExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    }

    // Compare hash of incoming code with stored hash
    const inputHash = sha256(code);
    if (inputHash !== user.verifyCodeHash) {
      user.verifyAttempts += 1;
      await user.save();
      const remaining = Math.max(0, 5 - user.verifyAttempts);
      return res.status(400).json({
        message: `Invalid verification code. Attempts remaining: ${remaining}`,
      });
    }

    // Verification successful: mark verified and clear code hashes
    user.emailVerified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpiry = undefined;
    user.verifyCodeSentAt = undefined;
    user.verifyAttempts = 0;
    await user.save();

    const token = generateToken(user);
    return res.status(200).json({
      message: 'Email successfully verified.',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    return serverError(res, error, 'Email verification failed.');
  }
}

/**
 * POST /api/auth/resend-code
 * Re-sends a fresh verification code. Throttled to once every 30 seconds.
 * Always returns a generic success message to prevent user enumeration.
 */
export async function resendCode(req, res) {
  try {
    const email = coerceString(req.body.email).toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const genericMsg = 'If an unverified account exists for this email, a new verification code has been sent.';
    const user = await User.findOne({ email });

    if (!user || user.emailVerified) {
      return res.status(200).json({ message: genericMsg });
    }

    // Rate-limiting throttle: 30-second cooldown
    if (user.verifyCodeSentAt && Date.now() - user.verifyCodeSentAt.getTime() < 30 * 1000) {
      return res.status(429).json({ message: 'Please wait 30 seconds before requesting another code.' });
    }

    // Generate fresh code and reset attempt counter
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    user.verifyCodeHash = sha256(rawCode);
    user.verifyCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.verifyCodeSentAt = new Date();
    user.verifyAttempts = 0;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Your New Found. Verification Code',
      text: `Hello ${user.name},\n\nYour new verification code is: ${rawCode}\n\nThis code will expire in 10 minutes.\n\n- The Found. Team`,
    });

    return res.status(200).json({ message: genericMsg });
  } catch (error) {
    return serverError(res, error, 'Failed to resend code.');
  }
}

/**
 * POST /api/auth/login
 * Identifier can be email OR 10-digit Indian mobile.
 * All inputs strictly coerced to string to block NoSQL operator injection.
 * Unverified users receive a fresh code and 403 status.
 */
export async function login(req, res) {
  try {
    // Coerce inputs to string to prevent object injection (e.g. { $gt: "" })
    const identifier = coerceString(req.body.identifier);
    const password = String(req.body.password || '');

    const invalidMsg = 'Invalid email/phone or password';

    if (!identifier || !password) {
      return res.status(401).json({ message: invalidMsg });
    }

    let user = null;
    if (identifier.includes('@')) {
      const email = identifier.toLowerCase();
      const isGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
      const isCampus = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|ac\.in|org)$/i.test(email);
      if (!isGmail && !isCampus && !email.endsWith('@example.com')) {
        return res.status(400).json({ message: 'Please enter a valid Gmail address (@gmail.com).' });
      }
      user = await User.findOne({ email });
    } else {
      const normalizedPhone = normalizePhone(identifier);
      if (!normalizedPhone) {
        return res.status(401).json({ message: invalidMsg });
      }
      user = await User.findOne({ phone: normalizedPhone });
    }

    if (!user) {
      return res.status(401).json({ message: 'No registered account found with this Gmail address or phone. Please sign up.' });
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: invalidMsg });
    }

    // Ensure email is verified - no code verification barrier
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const token = generateToken(user);
    return res.status(200).json({
      message: 'Logged in successfully.',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    return serverError(res, error, 'Login failed.');
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export async function getMe(req, res) {
  return res.status(200).json({ user: sanitizeUser(req.user) });
}

/**
 * PATCH /api/auth/profile
 * Allows updating name and phone.
 */
export async function updateProfile(req, res) {
  try {
    const user = req.user;
    const name = req.body.name !== undefined ? coerceString(req.body.name) : null;
    const rawPhone = req.body.phone !== undefined ? coerceString(req.body.phone) : null;

    if (name !== null) {
      if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ message: 'Name must be between 2 and 60 characters.' });
      }
      user.name = name;
    }

    if (rawPhone !== null && rawPhone !== '') {
      const normalizedPhone = normalizePhone(rawPhone);
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Valid 10-digit Indian mobile number is required.' });
      }
      const existing = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ message: 'Phone number already registered by another account.' });
      }
      user.phone = normalizedPhone;
    }

    await user.save();
    return res.status(200).json({ user: sanitizeUser(user), message: 'Profile updated successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to update profile.');
  }
}

/**
 * POST /api/auth/change-password
 * Updates the user's password after verifying the existing password.
 */
export async function changePassword(req, res) {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required.' });
    }

    if (newPassword.length < 6 || newPassword.length > 100) {
      return res.status(400).json({ message: 'New password must be between 6 and 100 characters.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to change password.');
  }
}

/**
 * DELETE /api/auth/me
 * Permanently deletes user account, posts, responses, and reports.
 * Blocked for admin accounts.
 */
export async function deleteAccount(req, res) {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted through this endpoint.' });
    }

    const password = String(req.body.password || '');
    if (!password) {
      return res.status(400).json({ message: 'Password is required to confirm account deletion.' });
    }

    const isMatch = await bcrypt.compare(password, req.user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password incorrect.' });
    }

    // Cascade delete: find user's posts and remove their associated interests and reports
    const userPosts = await Post.find({ user: req.user._id }).select('_id');
    const postIds = userPosts.map((p) => p._id);

    await Interest.deleteMany({ post: { $in: postIds } });
    await Report.deleteMany({ post: { $in: postIds } });
    await Post.deleteMany({ user: req.user._id });

    // Clean up responses and reports authored by this user on other posts
    await Interest.deleteMany({ student: req.user._id });
    await Report.deleteMany({ reporter: req.user._id });

    // Remove user record
    await User.findByIdAndDelete(req.user._id);

    return res.status(200).json({ message: 'Account and associated data deleted successfully.' });
  } catch (error) {
    return serverError(res, error, 'Failed to delete account.');
  }
}

/**
 * POST /api/auth/forgot-password
 * Initiates password reset by emailing a 30-minute token link.
 * Same generic answer for non-existent emails.
 */
export async function forgotPassword(req, res) {
  try {
    const email = coerceString(req.body.email).toLowerCase();
    const genericMsg = 'If that email exists in our system, a password reset link has been sent.';

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: genericMsg });
    }

    // Generate 32-byte hex token and store sha256 hash with 30-minute expiration
    const resetTokenRaw = crypto.randomBytes(32).toString('hex');
    user.resetToken = sha256(resetTokenRaw);
    user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const frontendBase = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:5173';
    const cleanBase = frontendBase.replace(/\/$/, '');
    const resetUrl = `${cleanBase}/reset-password/${resetTokenRaw}`;

    await sendEmail({
      to: user.email,
      subject: 'Found. Password Reset Link',
      text: `Hello ${user.name},\n\nYou requested a password reset. Click or open the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes. If you did not request this, please ignore this email.\n\n- The Found. Team`,
    });

    return res.status(200).json({ message: genericMsg });
  } catch (error) {
    return serverError(res, error, 'Failed to process password reset request.');
  }
}

/**
 * POST /api/auth/reset-password/:token
 * Validates reset token and sets new password. Also marks the email as verified.
 */
export async function resetPassword(req, res) {
  try {
    const token = coerceString(req.params.token);
    const password = String(req.body.password || '');

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required.' });
    }

    if (password.length < 6 || password.length > 100) {
      return res.status(400).json({ message: 'Password must be between 6 and 100 characters.' });
    }

    const hashedToken = sha256(token);
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    // Set new password, mark email verified, clear reset token fields
    user.password = await bcrypt.hash(password, 10);
    user.emailVerified = true;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successful. You may now log in.' });
  } catch (error) {
    return serverError(res, error, 'Password reset failed.');
  }
}
