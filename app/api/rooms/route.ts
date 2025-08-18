import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import Message from "@/models/Message"
import { handleApiError } from "@/lib/utils"

// GET /api/rooms - Get all rooms with message counts
export async function GET() {
  try {
    const db = await connectDB()
    
    // Skip database operations during build time
    if (!db) {
      return NextResponse.json({
        success: true,
        rooms: [],
      })
    }

    // Get all unique rooms from messages
    const rooms = await Message.aggregate([
      { $match: { room: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$room",
          messageCount: { $sum: 1 },
          lastMessage: { $last: "$timestamp" }
        }
      },
      { $sort: { lastMessage: -1 } }
    ])

    const roomData = rooms.map(room => ({
      name: room._id,
      messageCount: room.messageCount,
      lastMessage: room.lastMessage
    }))

    return NextResponse.json({
      success: true,
      rooms: roomData,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// POST /api/rooms - Create a new room (optional, rooms are created automatically when messages are sent)
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
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Room name is required" },
        { status: 400 }
      )
    }

    // Rooms are created automatically when messages are sent
    // This endpoint can be used for room metadata in the future
    return NextResponse.json({
      success: true,
      message: "Room will be created when first message is sent",
      room: { name: name.trim(), description }
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
