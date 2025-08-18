import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"
import { hashPassword, generateTokens, generateAvatarUrl } from "@/lib/auth"
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
    const { username, email, password } = body

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Validate username length
    if (username.length < 2 || username.length > 30) {
      return NextResponse.json(
        { success: false, error: "Username must be between 2 and 30 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: "Email already registered" },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { success: false, error: "Username already taken" },
          { status: 409 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate avatar
    const avatar = generateAvatarUrl(username)

    // Create new user
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar,
      isOnline: true,
      lastSeen: new Date(),
    })

    const savedUser = await newUser.save()

    // Generate JWT tokens
    const tokens = generateTokens({
      userId: savedUser._id.toString(),
      username: savedUser.username,
      email: savedUser.email,
    })

    // Update user with refresh token
    await User.findByIdAndUpdate(savedUser._id, {
      refreshToken: tokens.refreshToken
    })

    // Return user data (without password) and tokens
    const userData = {
      _id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      avatar: savedUser.avatar,
      isOnline: savedUser.isOnline,
      lastSeen: savedUser.lastSeen,
      createdAt: savedUser.createdAt,
    }

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      user: userData,
      tokens,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
