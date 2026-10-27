import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import User from './models/User.js';
import { connectDB } from './config/db.js';
import { normalizePhone } from './utils/phone.js';

async function run() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('Usage: node createAdmin.js "<Name>" <email> <phone> <password>');
    console.error('Example: node createAdmin.js "Campus Admin" admin@college.edu 9876543210 AdminPass123');
    process.exit(1);
  }

  const [name, rawEmail, rawPhone, password] = args;
  const email = String(rawEmail || '').trim().toLowerCase();

  if (name.length < 2 || name.length > 60) {
    console.error('Error: Name must be between 2 and 60 characters.');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Error: Invalid email format.');
    process.exit(1);
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    console.error('Error: Phone must be a valid 10-digit Indian mobile number (e.g. 9876543210, +91 98765 43210).');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Admin password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    await connectDB();

    const hashedPassword = await bcrypt.hash(password, 10);
    let user = await User.findOne({ email });

    if (user) {
      user.name = name;
      user.phone = phone;
      user.password = hashedPassword;
      user.role = 'admin';
      user.emailVerified = true;
      user.termsAcceptedAt = user.termsAcceptedAt || new Date();
      await user.save();
      console.log(`[Admin] Promoted existing account "${email}" to verified Admin.`);
    } else {
      user = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
        termsAcceptedAt: new Date(),
      });
      console.log(`[Admin] Created new verified Admin account for "${email}".`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin account:', error.message);
    process.exit(1);
  }
}

run();
