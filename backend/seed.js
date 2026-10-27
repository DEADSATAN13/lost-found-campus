import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Post from './models/Post.js';
import Interest from './models/Interest.js';
import Report from './models/Report.js';
import PointAward from './models/PointAward.js';
import { connectDB } from './config/db.js';

// Strictly forbid seeding in production
if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: Seeding is blocked in production environment.');
  process.exit(1);
}

async function seed() {
  try {
    await connectDB();
    console.log(`[Seed] Target database to be wiped: "${mongoose.connection.name}"`);

    // Wipe existing data
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Interest.deleteMany({}),
      Report.deleteMany({}),
      PointAward.deleteMany({}),
    ]);
    console.log('[Seed] Wiped existing collections.');

    // Common password hash for test accounts
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    // Create 3 verified users
    const [arjun, priya, admin] = await User.create([
      {
        name: 'Arjun Kumar',
        email: 'arjun@example.com',
        phone: '9000000001',
        password: hashedPassword,
        role: 'student',
        points: 20,
        emailVerified: true,
        termsAcceptedAt: now,
      },
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '9000000002',
        password: hashedPassword,
        role: 'student',
        points: 10,
        emailVerified: true,
        termsAcceptedAt: now,
      },
      {
        name: 'Campus Admin',
        email: 'admin@example.com',
        phone: '9000000003',
        password: hashedPassword,
        role: 'admin',
        points: 0,
        emailVerified: true,
        termsAcceptedAt: now,
      },
    ]);
    console.log('[Seed] Created 3 verified users: Arjun, Priya, Admin.');

    // Create 3 posts
    const [post1, post2, post3] = await Post.create([
      {
        title: 'Blue Hydro Flask with Stickers',
        description: 'Left my 32oz dark blue Hydro Flask with NASA and mountain stickers on the 2nd floor library study table.',
        category: 'Accessories',
        type: 'lost',
        status: 'active',
        location: 'Library 2nd Floor',
        photoUrl: 'https://res.cloudinary.com/sogebtjn/image/upload/v1793091175/Blue_Water_Bottle.jpg',
        verificationHint: 'Has a small dent on the bottom rim and initials "AK" scratched near the lid.',
        user: arjun._id,
      },
      {
        title: 'Scientific Calculator fx-991EX',
        description: 'Found a Casio scientific calculator on desk #4 in Science Block Lab 3 after afternoon lab session.',
        category: 'Electronics',
        type: 'found',
        status: 'active',
        location: 'Science Block Lab 3',
        photoUrl: 'https://res.cloudinary.com/sogebtjn/image/upload/v1793090368/photo-1516201580490-33550d32de5c.jpg',
        verificationHint: 'Back cover has a cat sticker and handwritten formula sheet inside the slide case.',
        user: priya._id,
      },
      {
        title: 'Data Structures in C++ Textbook',
        description: 'Looking to trade 3rd edition Data Structures textbook for a Digital Logic or Discrete Math reference book.',
        category: 'Books',
        type: 'trade',
        status: 'active',
        location: 'Student Center Lounge',
        photoUrl: '',
        verificationHint: '',
        user: arjun._id,
      },
    ]);
    console.log('[Seed] Created 3 sample posts (lost, found, trade).');

    // Create 1 response
    await Interest.create({
      post: post1._id,
      student: priya._id,
      message: 'Hey Arjun! I think I saw your blue flask at the library circulation desk with the librarian on duty.',
    });
    console.log('[Seed] Created 1 sample response from Priya on Arjun\'s post.');

    console.log('\n================ [SEED COMPLETE] ================');
    console.log('Sample Logins (Password: password123):');
    console.log(' - Student: arjun@example.com (9000000001)');
    console.log(' - Student: priya@example.com (9000000002)');
    console.log(' - Admin:   admin@example.com (9000000003)');
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed] Seeding error:', error);
    process.exit(1);
  }
}

seed();
