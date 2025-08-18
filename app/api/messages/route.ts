import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import Message from "@/models/Message"
import { handleApiError } from "@/lib/utils"

// GET /api/messages - Fetch chat messages
export async function GET(request: NextRequest) {
  try {
    const db = await connectDB()
    
    // Skip database operations during build time
    if (!db) {
      return NextResponse.json({
        success: true,
        messages: [],
        pagination: {
          page: 1,
          limit: 50,
          hasMore: false,
          total: 0,
        },
      })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const page = Math.max(Number.parseInt(searchParams.get("page") || "1"), 1)
    const skip = (page - 1) * limit
    const room = searchParams.get("room")
    const sender = searchParams.get("sender")
    const receiver = searchParams.get("receiver")

    // Build query based on parameters
    let query: any = {}
    
    if (room) {
      query.room = room
    }
    
    if (sender && receiver) {
      // Private chat between two users
      query.$or = [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    // Reverse to show oldest first
    const reversedMessages = messages.reverse()

    return NextResponse.json({
      success: true,
      messages: reversedMessages,
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit,
        total: await Message.countDocuments(query),
      },
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// POST /api/messages - Send a new message
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
    const { sender, receiver, room, text } = body

    // Validate required fields
    if (!sender || !text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate message content
    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: "Message cannot be empty" },
        { status: 400 }
      )
    }

    // Validate that either room or receiver is provided
    if (!room && !receiver) {
      return NextResponse.json(
        { success: false, error: "Either room or receiver must be specified" },
        { status: 400 }
      )
    }

    const newMessage = new Message({
      sender,
      receiver,
      room,
      text: text.trim(),
      timestamp: new Date(),
    })

    const savedMessage = await newMessage.save()

    return NextResponse.json({
      success: true,
      message: savedMessage,
    })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
