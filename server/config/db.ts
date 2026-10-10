import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB connection helper using Mongoose
 * Gracefully attempts connection to MONGODB_URI.
 * In environments where a live MongoDB server is not yet configured,
 * it catches the error without terminating the Express process,
 * allowing the server to operate with clear status reporting.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/academic_portal';

  try {
    // Configure mongoose connection options
    mongoose.set('strictQuery', true);

    // Detect template placeholders (e.g. cluster0.xxxxx or <username>)
    if (uri.includes('xxxxx') || uri.includes('<') || uri.includes('>')) {
      console.warn(`[Database Info] MONGODB_URI contains template placeholder ('${uri}').`);
      console.warn(`[Database Info] Operating with in-memory fallback cache for preview.`);
      return;
    }

    console.log(`[Database] Attempting connection to MongoDB...`);
    
    // Set a reasonable serverSelectionTimeoutMS and wrap in hard timeout to prevent DNS lookup hang
    const connectPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection attempt timed out after 3000ms')), 3000)
    );

    await Promise.race([connectPromise, timeoutPromise]);

    console.log(`[Database] Successfully connected to MongoDB at ${mongoose.connection.host}`);
  } catch (error: any) {
    console.warn(`[Database Warning] Could not establish live MongoDB connection: ${error.message}`);
    console.warn(`[Database Info] The backend will operate with demonstration in-memory caching for live preview.`);
    console.warn(`[Database Tip] To connect to your cloud database, set MONGODB_URI in your environment settings.`);
  }

  // Handle runtime connection lifecycle events
  mongoose.connection.on('connected', () => {
    console.log('[Database] Mongoose connected to database cluster.');
  });

  mongoose.connection.on('error', (err) => {
    console.warn(`[Database] Mongoose runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[Database] Mongoose connection disconnected.');
  });
}

/**
 * Check if Mongoose currently has an active connection
 * 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
 */
export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
