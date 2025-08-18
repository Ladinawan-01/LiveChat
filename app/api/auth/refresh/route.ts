import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"
import { verifyRefreshToken, generateTokens } from "@/lib/auth"
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
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Refresh token is required" },
        { status: 400 }
      )
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid refresh token" },
        { status: 401 }
      )
    }

    // Find user and verify refresh token matches
    const user = await User.findById(payload.userId)
    
    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json(
        { success: false, error: "Invalid refresh token" },
        { status: 401 }
      )
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    })

    // Update user with new refresh token
    await User.findByIdAndUpdate(user._id, {
      refreshToken: tokens.refreshToken
    })

    return NextResponse.json({
      success: true,
      message: "Tokens refreshed successfully",
      tokens,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
