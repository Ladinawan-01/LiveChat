import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var myMongoose: MongooseCache | undefined
}

let cached = global.myMongoose

if (!cached) {
  cached = global.myMongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached!.conn) {
    console.log("[MongoDB] Using cached connection")
    return cached!.conn
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    }

    console.log("[MongoDB] Creating new connection...")
    cached!.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log("[MongoDB] Connected successfully")
      return mongoose
    }).catch((error) => {
      console.error("[MongoDB] Connection error:", error)
      throw error
    })
  }

  try {
    cached!.conn = await cached!.promise
    console.log("[MongoDB] Connection established")
  } catch (e) {
    console.error("[MongoDB] Failed to establish connection:", e)
    cached!.promise = null
    throw e
  }

  return cached!.conn
}

export default connectDB
