import mongoose from 'mongoose';

/**
 * Connects Mongoose to MongoDB.
 * Supports:
 * 1. MongoDB Atlas URI (mongodb+srv://...)
 * 2. Local MongoDB URI (mongodb://127.0.0.1:27017/...)
 * 3. In-memory database (MONGO_URI=memory) for instant zero-setup local dev/demo
 */
export async function connectDB(customUri) {
  let uri = customUri || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not defined.');
  }

  // Support in-memory database for zero-config local development without installing MongoDB
  if (uri === 'memory' || process.env.USE_IN_MEMORY_DB === 'true') {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: { dbName: 'found_db' },
      });
      uri = mongod.getUri() + 'found_db';
      console.log(`[MongoDB] Initialized zero-setup in-memory database: ${uri}`);
    } catch (err) {
      console.warn('[MongoDB] Could not initialize in-memory database, falling back to standard URI:', err.message);
    }
  }

  // Mask credentials for terminal output
  const safeLogUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`[MongoDB] Connecting to ${safeLogUri}...`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });

    const safeHost = conn.connection.host || 'cluster';
    console.log(`[MongoDB] Connected successfully to database: "${conn.connection.name}" on ${safeHost}`);
    return conn;
  } catch (error) {
    console.error(`\n[MongoDB] Connection failed: ${error.message}`);
    if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
      console.error('\n👉 LOCAL MONGODB NOT DETECTED:');
      console.error('   Option 1: Paste your free MongoDB Atlas URI into backend/.env:');
      console.error('             MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/found_db?retryWrites=true&w=majority');
      console.error('   Option 2: Set MONGO_URI=memory in backend/.env for instant zero-install local development.');
      console.error('   Option 3: Start your local MongoDB server (e.g. net start MongoDB or Docker).\n');
    }
    throw error;
  }
}
