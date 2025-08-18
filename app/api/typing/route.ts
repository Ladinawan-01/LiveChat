import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import TypingStatus from "@/models/TypingStatus"

// GET /api/typing - Get current typing users
export async function GET() {
  try {
    const db = await connectDB()
    
    // Skip database operations during build time
    if (!db) {
      return NextResponse.json({
        success: true,
        typingUsers: [],
      })
    }

    // Get users who are currently typing (within last 5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000)

    const typingUsers = await TypingStatus.find({
      isTyping: true,
      lastTyping: { $gte: fiveSecondsAgo },
    })
      .select("userId username isTyping lastTyping")
      .lean()

    return NextResponse.json({
      success: true,
      typingUsers,
    })
  } catch (error) {
    console.error("Error fetching typing status:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch typing status" }, { status: 500 })
  }
}

// POST /api/typing - Update typing status
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
    const { userId, username, isTyping } = body

    if (!userId || !username || typeof isTyping !== "boolean") {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Update or create typing status
    const typingStatus = await TypingStatus.findOneAndUpdate(
      { userId },
      {
        userId,
        username,
        isTyping,
        lastTyping: new Date(),
      },
      { upsert: true, new: true },
    )

    return NextResponse.json({
      success: true,
      typingStatus,
    })
  } catch (error) {
    console.error("Error updating typing status:", error)
    return NextResponse.json({ success: false, error: "Failed to update typing status" }, { status: 500 })
  }
}
