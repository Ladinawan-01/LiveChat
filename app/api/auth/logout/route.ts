import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/auth"
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

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader || undefined)

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Access token required" },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid access token" },
        { status: 401 }
      )
    }

    // Update user status and clear refresh token
    await User.findByIdAndUpdate(payload.userId, {
      isOnline: false,
      lastSeen: new Date(),
      refreshToken: null,
    })

    return NextResponse.json({
      success: true,
      message: "Logout successful",
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
