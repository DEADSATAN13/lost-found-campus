// Load environment variables before any other imports
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import Post from './models/Post.js';
import { startArchiveCron } from './utils/archiveJob.js';

// Environment variable validation
const { MONGO_URI, JWT_SECRET, NODE_ENV, PORT } = process.env;

if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI environment variable is required.');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required.');
  process.exit(1);
}

// In production, enforce secret strength and guard against default placeholders
if (NODE_ENV === 'production') {
  const placeholderSecrets = [
    'your_jwt_secret_here',
    'changeme',
    'secret',
    'jwt_secret',
    'replace_me',
    'placeholder',
    '1234567890123456',
  ];

  if (JWT_SECRET.length < 16) {
    console.error('FATAL: JWT_SECRET must be at least 16 characters long in production.');
    process.exit(1);
  }

  if (placeholderSecrets.includes(JWT_SECRET.toLowerCase())) {
    console.error('FATAL: JWT_SECRET is set to an insecure default placeholder. Please provide a secure random key.');
    process.exit(1);
  }
}

// Global unhandled promise rejection listener
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Boot database, start background jobs, and bind HTTP listener
async function startServer() {
  const port = PORT || 5000;
  const maxRetries = 6;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      await connectDB();

      // Start 6-hourly post auto-archiving job
      startArchiveCron(Post);

      app.listen(port, () => {
        console.log(`[Server] Found. API running in ${NODE_ENV || 'development'} mode on port ${port}`);
      });
      return;
    } catch (error) {
      if (attempt >= maxRetries) {
        console.error('Failed to start server after multiple connection attempts:', error.message);
        process.exit(1);
      }
      console.log(`[Server] Atlas cluster connection pending, retrying in 6 seconds... (Attempt ${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 6000));
    }
  }
}

startServer();
