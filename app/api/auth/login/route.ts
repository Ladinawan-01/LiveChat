import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"
import { comparePassword, generateTokens } from "@/lib/auth"
import { handleApiError } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const db = await connectDB()
    
    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Database not available"
      }, { status: 503 })
    }

    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Update user status
    await User.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    })

    // Generate JWT tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    })

    // Update user with refresh token
    await User.findByIdAndUpdate(user._id, {
      refreshToken: tokens.refreshToken
    })

    // Return user data (without password) and tokens
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline: true,
      lastSeen: new Date(),
      createdAt: user.createdAt,
    }

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: userData,
      tokens,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
