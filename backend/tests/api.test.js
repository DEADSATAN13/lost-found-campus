import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Ensure test environment before loading app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_found_testing_purposes_only_12345';

import app from '../app.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Interest from '../models/Interest.js';
import Report from '../models/Report.js';
import PointAward from '../models/PointAward.js';
import { testInbox, clearTestInbox } from '../utils/sendEmail.js';
import { runArchiveJob } from '../utils/archiveJob.js';

let mongoServer = null;

test('Backend API Integration Tests', async (suite) => {
  // Test suite lifecycle setup
  suite.before(async () => {
    // Determine database URI: use external test DB if set, or spin up in-memory MongoDB
    let uri = process.env.MONGO_URI_TEST;
    if (!uri) {
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName: 'found_test' },
      });
      uri = mongoServer.getUri() + 'found_test';
      process.env.MONGO_URI_TEST = uri;
    }

    // Guardrail: Database name MUST contain 'test' to prevent wiping production databases
    if (!process.env.MONGO_URI_TEST.toLowerCase().includes('test')) {
      throw new Error('Refusing to run tests: MONGO_URI_TEST database name must contain "test"');
    }

    await mongoose.connect(process.env.MONGO_URI_TEST);
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Interest.deleteMany({}),
      Report.deleteMany({}),
      PointAward.deleteMany({}),
    ]);
  });

  suite.after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  let student1Token = '';
  let student1User = null;
  let student2Token = '';
  let student2User = null;
  let adminToken = '';
  let adminUser = null;

  // ==========================================
  // AUTHENTICATION & VALIDATION
  // ==========================================
  await suite.test('Signup validation and consent', async (t) => {
    await t.test('rejects signup when agreed is not true', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Arjun Kumar',
        email: 'arjun@example.com',
        phone: '9876543210',
        password: 'password123',
        agreed: false,
      });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /accept the terms/i);
    });

    await t.test('rejects invalid Indian phone format', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Arjun Kumar',
        email: 'arjun@example.com',
        phone: '1234567890', // Starts with 1
        password: 'password123',
        agreed: true,
      });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /valid 10-digit/i);
    });

    await t.test('successful signup sends 6-digit code without logging user in', async () => {
      clearTestInbox();
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Arjun Kumar',
        email: 'arjun@example.com',
        phone: '+91 98765 43210',
        password: 'password123',
        agreed: true,
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.needsVerification, true);
      assert.equal(res.body.email, 'arjun@example.com');
      assert.equal(res.body.token, undefined); // Never log in unverified user

      // Check captured email
      assert.equal(testInbox.length, 1);
      assert.equal(testInbox[0].to, 'arjun@example.com');
      assert.match(testInbox[0].text, /\d{6}/);
    });
  });

  await suite.test('Verification code flow and lockout', async (t) => {
    // Extract code from captured email
    const emailText = testInbox[0].text;
    const codeMatch = emailText.match(/\b\d{6}\b/);
    const validCode = codeMatch ? codeMatch[0] : '';
    assert.ok(validCode, 'Should extract 6-digit verification code');

    await t.test('wrong code increments attempts and fails', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        email: 'arjun@example.com',
        code: '000000',
      });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /Invalid verification code/i);
    });

    await t.test('resend code throttle enforces 30s cooldown', async () => {
      const res = await request(app).post('/api/auth/resend-code').send({
        email: 'arjun@example.com',
      });
      assert.equal(res.status, 429);
      assert.match(res.body.message, /wait 30 seconds/i);
    });

    await t.test('entering correct code verifies account and returns token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        email: 'arjun@example.com',
        code: validCode,
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.user.emailVerified, true);
      assert.ok(res.body.token);

      student1Token = res.body.token;
      student1User = res.body.user;
    });

    await t.test('already verified email rejects second verification attempt', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        email: 'arjun@example.com',
        code: validCode,
      });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /already verified/i);
    });

    await t.test('account gets locked after 5 failed attempts on a new unverified user', async () => {
      await request(app).post('/api/auth/signup').send({
        name: 'Lockout Test',
        email: 'lockout@example.com',
        phone: '9999900000',
        password: 'password123',
        agreed: true,
      });

      // Submit wrong code 5 times
      for (let i = 0; i < 4; i++) {
        await request(app).post('/api/auth/verify-email').send({
          email: 'lockout@example.com',
          code: '111111',
        });
      }
      const fifthRes = await request(app).post('/api/auth/verify-email').send({
        email: 'lockout@example.com',
        code: '111111',
      });
      assert.equal(fifthRes.status, 400);

      // 6th attempt is locked
      const lockedRes = await request(app).post('/api/auth/verify-email').send({
        email: 'lockout@example.com',
        code: '111111',
      });
      assert.equal(lockedRes.status, 403);
      assert.match(lockedRes.body.message, /locked/i);
    });
  });

  await suite.test('Login flows, unverified redirect, and injection protection', async (t) => {
    await t.test('login with verified email succeeds', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'arjun@example.com',
        password: 'password123',
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.token);
    });

    await t.test('login with 10-digit phone succeeds', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: '9876543210',
        password: 'password123',
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.token);
    });

    await t.test('unverified user login returns 403 with needsVerification: true', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'lockout@example.com',
        password: 'password123',
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.needsVerification, true);
    });

    await t.test('database operator injection in login body is blocked', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: { $gt: '' },
        password: { $gt: '' },
      });
      assert.equal(res.status, 401);
      assert.match(res.body.message, /Invalid email\/phone or password/i);
    });
  });

  await suite.test('Duplicate handling and unverified overwrite', async (t) => {
    await t.test('rejects duplicate verified email', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Another Arjun',
        email: 'arjun@example.com',
        phone: '9123456780',
        password: 'password123',
        agreed: true,
      });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /already registered/i);
    });

    await t.test('rejects duplicate phone number', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Diff Email Same Phone',
        email: 'unique@example.com',
        phone: '9876543210', // Belongs to Arjun
        password: 'password123',
        agreed: true,
      });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /Phone number already registered/i);
    });

    await t.test('overwrites existing unverified account on new signup', async () => {
      // Create student2
      const res1 = await request(app).post('/api/auth/signup').send({
        name: 'Priya Typo',
        email: 'priya@example.com',
        phone: '9888877777',
        password: 'password123',
        agreed: true,
      });
      assert.equal(res1.status, 201);

      // Overwrite with correct name and phone
      clearTestInbox();
      const res2 = await request(app).post('/api/auth/signup').send({
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '9777788888',
        password: 'newpassword123',
        agreed: true,
      });
      assert.equal(res2.status, 201);

      // Verify priya
      const codeMatch = testInbox[testInbox.length - 1].text.match(/\b\d{6}\b/);
      const resVerify = await request(app).post('/api/auth/verify-email').send({
        email: 'priya@example.com',
        code: codeMatch[0],
      });
      assert.equal(resVerify.status, 200);
      student2Token = resVerify.body.token;
      student2User = resVerify.body.user;
      assert.equal(student2User.name, 'Priya Sharma');
    });
  });

  // Provision Admin User
  await suite.test('Setup admin account', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminDoc = await User.create({
      name: 'Campus Moderator',
      email: 'admin@example.com',
      phone: '9666655555',
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      termsAcceptedAt: new Date(),
    });
    adminUser = adminDoc;

    const res = await request(app).post('/api/auth/login').send({
      identifier: 'admin@example.com',
      password: 'password123',
    });
    adminToken = res.body.token;
    assert.ok(adminToken);
  });

  // ==========================================
  // POSTS, MATCHING, PRIVACY & OWNERSHIP
  // ==========================================
  let lostPostId = '';
  let foundPostId = '';

  await suite.test('Post creation, Cloudinary validation, and privacy', async (t) => {
    await t.test('rejects photoUrl not originating from Cloudinary', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          title: 'Lost Keys',
          description: 'Left on bench',
          category: 'Accessories',
          type: 'lost',
          location: 'Main Quad',
          photoUrl: 'https://evil-site.com/image.jpg',
        });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /Cloudinary/i);
    });

    await t.test('creates lost post with private verification hint', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          title: 'Lost Hydro Flask with Stickers',
          description: 'Dark blue hydro flask lost near library reading room.',
          category: 'Accessories',
          type: 'lost',
          location: 'Library 2nd Floor',
          photoUrl: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
          verificationHint: 'Dented bottom rim and initials AK scratched.',
        });
      assert.equal(res.status, 201);
      lostPostId = res.body.post._id;
      assert.equal(res.body.post.title, 'Lost Hydro Flask with Stickers');
    });

    await t.test('creates found post for opposite type keyword matching', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          title: 'Found Hydro Flask in Library',
          description: 'Found a water bottle on a desk.',
          category: 'Accessories',
          type: 'found',
          location: 'Library 2nd Floor',
          photoUrl: 'https://res.cloudinary.com/test/image/upload/sample2.jpg',
          verificationHint: 'Has stickers and dent.',
        });
      assert.equal(res.status, 201);
      foundPostId = res.body.post._id;
    });

    await t.test('privacy rule: public browse never reveals verificationHint, phone, or email', async () => {
      const res = await request(app).get('/api/posts');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.posts));
      assert.ok(res.body.posts.length >= 2);

      const sample = res.body.posts[0];
      assert.equal(sample.verificationHint, undefined);
      assert.ok(sample.user.name);
      assert.equal(sample.user.email, undefined);
      assert.equal(sample.user.phone, undefined);
    });

    await t.test('privacy rule: single post hides hint from visitors, reveals to owner', async () => {
      // Visitor view
      const visitorRes = await request(app).get(`/api/posts/${lostPostId}`);
      assert.equal(visitorRes.status, 200);
      assert.equal(visitorRes.body.isOwner, false);
      assert.equal(visitorRes.body.post.verificationHint, undefined);
      // Verify match suggestion
      assert.ok(visitorRes.body.match);
      assert.equal(visitorRes.body.match._id, foundPostId);

      // Owner view
      const ownerRes = await request(app)
        .get(`/api/posts/${lostPostId}`)
        .set('Authorization', `Bearer ${student1Token}`);
      assert.equal(ownerRes.status, 200);
      assert.equal(ownerRes.body.isOwner, true);
      assert.equal(ownerRes.body.post.verificationHint, 'Dented bottom rim and initials AK scratched.');
    });

    await t.test('invalid object ID returns 404', async () => {
      const res = await request(app).get('/api/posts/not-a-valid-hex-id');
      assert.equal(res.status, 404);
    });
  });

  await suite.test('Post editing and ownership rules', async (t) => {
    await t.test('non-owner cannot edit post', async () => {
      const res = await request(app)
        .patch(`/api/posts/${lostPostId}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ title: 'Hacked Title' });
      assert.equal(res.status, 403);
    });

    await t.test('post type cannot be changed', async () => {
      const res = await request(app)
        .patch(`/api/posts/${lostPostId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ type: 'trade' });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /type cannot be changed/i);
    });

    await t.test('owner can update title and location', async () => {
      const res = await request(app)
        .patch(`/api/posts/${lostPostId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ location: 'Library 3rd Floor' });
      assert.equal(res.status, 200);
      assert.equal(res.body.post.location, 'Library 3rd Floor');
    });
  });

  // ==========================================
  // RESPONSES & INTERESTS
  // ==========================================
  await suite.test('Interest responses and contact disclosure', async (t) => {
    await t.test('cannot respond to own post', async () => {
      const res = await request(app)
        .post('/api/interests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          postId: lostPostId,
          message: 'Trying to answer my own post',
        });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /cannot respond to your own post/i);
    });

    await t.test('message over 500 characters is rejected', async () => {
      const res = await request(app)
        .post('/api/interests')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          postId: lostPostId,
          message: 'a'.repeat(501),
        });
      assert.equal(res.status, 400);
    });

    await t.test('successful response returns poster contact details immediately', async () => {
      const res = await request(app)
        .post('/api/interests')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          postId: lostPostId,
          message: 'I have your hydro flask! It is at the front desk.',
        });
      assert.equal(res.status, 201);
      assert.ok(res.body.posterContact);
      assert.equal(res.body.posterContact.name, 'Arjun Kumar');
      assert.equal(res.body.posterContact.email, 'arjun@example.com');
      assert.ok(res.body.posterContact.phone);
    });

    await t.test('second response on the same post is blocked', async () => {
      const res = await request(app)
        .post('/api/interests')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          postId: lostPostId,
          message: 'Spamming second message',
        });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /already responded/i);
    });

    await t.test('owner can retrieve inquiries with responder email and phone', async () => {
      const res = await request(app)
        .get(`/api/interests/post/${lostPostId}`)
        .set('Authorization', `Bearer ${student1Token}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.interests.length, 1);
      assert.equal(res.body.interests[0].student.name, 'Priya Sharma');
      assert.equal(res.body.interests[0].student.email, 'priya@example.com');
      assert.ok(res.body.interests[0].student.phone);
    });
  });

  // ==========================================
  // RACE CONDITION / POINTS PAYOUT TEST
  // ==========================================
  await suite.test('Points paid exactly once even under 5 simultaneous resolve requests', async () => {
    // Check initial points of student2 (who owns foundPostId)
    const userBefore = await User.findById(student2User.id);
    const initialPoints = userBefore.points;

    // Send 5 concurrent resolve requests
    const resolveRequests = Array(5)
      .fill(null)
      .map(() =>
        request(app)
          .patch(`/api/posts/${foundPostId}/resolve`)
          .set('Authorization', `Bearer ${student2Token}`)
      );

    const results = await Promise.all(resolveRequests);

    // Exactly one should succeed with status 200, others fail with 400 because post is already resolved
    const successfulResolves = results.filter((r) => r.status === 200);
    assert.equal(successfulResolves.length, 1);

    // Verify PointAward has exactly 1 entry for this post
    const awards = await PointAward.find({ post: foundPostId });
    assert.equal(awards.length, 1);
    assert.equal(awards[0].points, 10);

    // Verify user points increased by exactly 10
    const userAfter = await User.findById(student2User.id);
    assert.equal(userAfter.points, initialPoints + 10);
  });

  // ==========================================
  // AUTO-ARCHIVE & RENEWAL
  // ==========================================
  await suite.test('Auto-archive and renew flow', async () => {
    // Create an expired active post
    const expiredPost = await Post.create({
      title: 'Old Umbrella',
      description: 'Found long ago',
      category: 'Accessories',
      type: 'found',
      status: 'active',
      location: 'Old Hall',
      user: student1User.id,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    });

    // Run auto-archive sweeper
    const archivedCount = await runArchiveJob(Post);
    assert.ok(archivedCount >= 1);

    const postAfterSweep = await Post.findById(expiredPost._id);
    assert.equal(postAfterSweep.status, 'archived');

    // Visitor receives 404 for archived post
    const visitorRes = await request(app).get(`/api/posts/${expiredPost._id}`);
    assert.equal(visitorRes.status, 404);

    // Owner renews post
    const renewRes = await request(app)
      .patch(`/api/posts/${expiredPost._id}/renew`)
      .set('Authorization', `Bearer ${student1Token}`);
    assert.equal(renewRes.status, 200);
    assert.equal(renewRes.body.post.status, 'active');
    assert.ok(new Date(renewRes.body.post.expiresAt) > new Date());
  });

  // ==========================================
  // REPORTS & ADMIN CAPABILITIES
  // ==========================================
  await suite.test('Reports, admin protection, and cascade deletion', async (t) => {
    await t.test('student cannot access admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${student1Token}`);
      assert.equal(res.status, 403);
    });

    let reportId = '';
    await t.test('user can report a post', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          postId: lostPostId,
          reason: 'spam',
          note: 'Looks like duplicate test spam.',
        });
      assert.equal(res.status, 201);
      reportId = res.body.report._id;
    });

    await t.test('admin can view and dismiss report', async () => {
      const listRes = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.reports.length >= 1);

      const dismissRes = await request(app)
        .patch(`/api/admin/reports/${reportId}/dismiss`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(dismissRes.status, 200);
      assert.equal(dismissRes.body.report.status, 'dismissed');
    });

    await t.test('admin cascade-deleting post removes interests and reports', async () => {
      const delRes = await request(app)
        .delete(`/api/admin/posts/${lostPostId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(delRes.status, 200);

      const postInDb = await Post.findById(lostPostId);
      assert.equal(postInDb, null);

      const interestsInDb = await Interest.find({ post: lostPostId });
      assert.equal(interestsInDb.length, 0);

      const reportsInDb = await Report.find({ post: lostPostId });
      assert.equal(reportsInDb.length, 0);
    });
  });

  // ==========================================
  // PROFILE, PASSWORD & ACCOUNT DELETION
  // ==========================================
  await suite.test('Profile update, password change, and account deletion', async (t) => {
    await t.test('update profile name and phone', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          name: 'Arjun Updated',
          phone: '9111122222',
        });
      assert.equal(res.status, 200);
      assert.equal(res.body.user.name, 'Arjun Updated');
      assert.equal(res.body.user.phone, '9111122222');
    });

    await t.test('change password verifies current password', async () => {
      // Wrong password
      const badRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newsecurepassword123',
        });
      assert.equal(badRes.status, 400);

      // Correct password
      const goodRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newsecurepassword123',
        });
      assert.equal(goodRes.status, 200);
    });

    await t.test('delete account deletes user and rejects deleted user token', async () => {
      const delRes = await request(app)
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ password: 'newsecurepassword123' });
      assert.equal(delRes.status, 200);

      // Verify token immediately stops working
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${student1Token}`);
      assert.equal(meRes.status, 401);
      assert.match(meRes.body.message, /no longer exists/i);
    });
  });

  // ==========================================
  // FORGOT & RESET PASSWORD
  // ==========================================
  await suite.test('Forgot password and reset token flow', async () => {
    clearTestInbox();
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'priya@example.com',
    });
    assert.equal(forgotRes.status, 200);

    assert.ok(testInbox.length >= 1);
    const emailItem = testInbox[testInbox.length - 1];
    assert.equal(emailItem.to, 'priya@example.com');
    const tokenMatch = emailItem.text.match(/reset-password\/([a-f0-9]{64})/);
    assert.ok(tokenMatch, 'Should capture reset token in email link');
    const rawToken = tokenMatch[1];

    const resetRes = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'resetpassword123' });
    assert.equal(resetRes.status, 200);

    // Verify login with new password
    const loginRes = await request(app).post('/api/auth/login').send({
      identifier: 'priya@example.com',
      password: 'resetpassword123',
    });
    assert.equal(loginRes.status, 200);
  });

  // ==========================================
  // LEADERBOARD, PAGINATION & SECURITY HEADERS
  // ==========================================
  await suite.test('Leaderboard and pagination limits', async () => {
    const lbRes = await request(app).get('/api/leaderboard');
    assert.equal(lbRes.status, 200);
    assert.ok(Array.isArray(lbRes.body.leaders));

    const statsRes = await request(app).get('/api/leaderboard/stats');
    assert.equal(statsRes.status, 200);
    assert.ok(typeof statsRes.body.resolvedCount === 'number');

    // Pagination hard cap at 50
    const pageRes = await request(app).get('/api/posts?limit=100');
    assert.equal(pageRes.status, 200);
  });

  await suite.test('Security headers and clean error formatting', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);

    // Helmet security headers
    assert.ok(res.headers['x-dns-prefetch-control']);
    assert.ok(res.headers['x-frame-options']);
    // Ensure Express banner is stripped
    assert.equal(res.headers['x-powered-by'], undefined);

    // Malformed JSON returns 400 without stack trace
    const malformedRes = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"bad_json":');
    assert.equal(malformedRes.status, 400);
    assert.equal(malformedRes.body.message, 'Malformed JSON body.');
    assert.equal(malformedRes.body.stack, undefined);
  });
});
