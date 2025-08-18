import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"
import { validateUsername, handleApiError } from "@/lib/utils"

// GET /api/users - Get all online users
export async function GET() {
  try {
    const db = await connectDB()
    
    // Skip database operations during build time
    if (!db) {
      return NextResponse.json({
        success: true,
        users: [],
      })
    }

    const users = await User.find({ isOnline: true })
      .select("username avatar isOnline lastSeen")
      .sort({ lastSeen: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// POST /api/users - Create or update user
export async function POST(request: NextRequest) {
  try {
    const db = await connectDB()
    
    // Skip database operations during build time
    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Database not available during build time"
      }, { status: 503 })
    }

    const body = await request.json()
    const { username, avatar } = body

    // Validate username
    const validation = validateUsername(username)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const trimmedUsername = username.trim()

    // Find existing user or create new one
    let user = await User.findOne({ username: trimmedUsername })

    if (user) {
      // Update existing user
      user.isOnline = true
      user.lastSeen = new Date()
      if (avatar) user.avatar = avatar
      await user.save()
    } else {
      // Create new user
      user = new User({
        username: trimmedUsername,
        avatar: avatar || null,
        isOnline: true,
        lastSeen: new Date(),
      })
      await user.save()
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      },
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
