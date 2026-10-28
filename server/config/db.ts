import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Connect to MongoDB Atlas.
 * In production, a failed connection throws an error
 * so the server does not start without its database.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  // Require an explicitly configured database in production.
  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Configure it in your environment variables.",
    );
  }

  mongoose.set("strictQuery", true);

  // Register connection lifecycle listeners once.
  mongoose.connection.on("connected", () => {
    console.log("[Database] Connected to MongoDB.");
  });

  mongoose.connection.on("error", (error) => {
    console.error("[Database] MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[Database] MongoDB disconnected.");
  });

  try {
    console.log("[Database] Connecting to MongoDB Atlas...");

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("[Database] Successfully connected to MongoDB Atlas.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("[Database] Connection failed:", message);

    throw error;
  }
}

/**
 * Mongoose readyState:
 * 0 = disconnected
 * 1 = connected
 * 2 = connecting
 * 3 = disconnecting
 */
export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
