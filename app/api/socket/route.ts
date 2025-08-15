import { NextRequest, NextResponse } from "next/server"
import { createServer } from "http"
import SocketServer from "@/lib/socket-server"

// Create HTTP server for Socket.IO
const server = createServer()
const socketServer = SocketServer.getInstance()
const io = socketServer.initialize(server)

export async function GET(req: NextRequest) {
  try {
    // Check if Socket.IO server is running
    if (!io) {
      return NextResponse.json(
        { error: "Socket.IO server not initialized" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Socket.IO server is running",
      connectedUsers: socketServer.getConnectedUsers().length
    })
  } catch (error) {
    console.error("Socket.IO route error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, data } = body

    switch (action) {
      case "broadcast":
        if (io && data.message) {
          io.emit("message:new", data.message)
          return NextResponse.json({ success: true })
        }
        break
      
      case "getUsers":
        return NextResponse.json({
          success: true,
          users: socketServer.getConnectedUsers()
        })
      
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Socket.IO POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
