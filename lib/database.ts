import mongoose from "mongoose";

let isConnected = false; // global flag to avoid multiple connections

const connectDB = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  // Load environment variables if not already loaded
  if (!process.env.MONGODB_URI) {
    try {
      require('dotenv').config({ path: '.env.local' });
    } catch (error) {
      console.warn('Could not load .env.local file');
    }
  }

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in environment variables");
    console.log("Available env vars:", Object.keys(process.env).filter(key => key.includes('MONGODB')));
    return null;
  }

  try {
    console.log("🔍 Attempting to connect to MongoDB...");
    console.log("🔍 MONGODB_URI length:", process.env.MONGODB_URI?.length || 0);
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "liveChat", // Use the correct database name
    });
    isConnected = true;
    console.log("✅ Database connected:", db.connection.host);
    return db.connection;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return null;
  }
};

export default connectDB;
