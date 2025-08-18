import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"

// PUT /api/users/[userId]/status - Update user online status
export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const db = await connectDB()
    
    // Skip database operations during build time
    if (!db) {
      return NextResponse.json({
        success: false,
        error: "Database not available during build time"
      }, { status: 503 })
    }

    const { userId } = await params
    const body = await request.json()
    const { isOnline } = body

    if (typeof isOnline !== "boolean") {
      return NextResponse.json({ success: false, error: "isOnline must be a boolean" }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isOnline,
        lastSeen: new Date(),
      },
      { new: true },
    ).select("username avatar isOnline lastSeen")

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ success: false, error: "Failed to update user status" }, { status: 500 })
  }
}
