import { NextRequest, NextResponse } from "next/server"
import { Server as NetServer } from "http"
import { Server as ServerIO } from "socket.io"
import { NextApiResponse } from "next"
import connectDB from "@/lib/database"
import Message from "@/models/Message"
import User from "@/models/User"
import TypingStatus from "@/models/TypingStatus"

export interface SocketUser {
  userId: string
  username: string
  avatar?: string
  socketId: string
}

// This is a workaround for Vercel deployment
// In production, you should use a dedicated Socket.IO service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let io: ServerIO | null = null
const connectedUsers = new Map<string, SocketUser>()

// Initialize Socket.IO server
function initializeSocketIO() {
  if (io) return io

  // Create a minimal HTTP server for Socket.IO
  const httpServer = new NetServer()
  
  io = new ServerIO(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? process.env.NEXT_PUBLIC_APP_URL || "*"
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["polling", "websocket"], // Start with polling for Vercel compatibility
    allowEIO3: true
  })

  setupSocketHandlers(io)
  
  // Start the server on a different port for local development
  if (process.env.NODE_ENV === "development") {
    const port = 3001
    httpServer.listen(port, () => {
      console.log(`[Socket.IO] Server running on port ${port}`)
    })
  }

  return io
}

function setupSocketHandlers(io: ServerIO) {
  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id)

    // Send connection status
    socket.emit("connection:status", { 
      connected: true, 
      message: "Connected to chat server" 
    })

    // Handle user joining
    socket.on("user:join", async (data: { userId: string; username: string; avatar?: string }) => {
      try {
        await connectDB()

        const { userId, username, avatar } = data

        // Update user status in database
        await User.findOneAndUpdate(
          { username },
          {
            username,
            avatar,
            isOnline: true,
            lastSeen: new Date(),
          },
          { upsert: true, new: true }
        )

        // Store user in connected users
        const socketUser: SocketUser = { 
          userId, 
          username, 
          avatar, 
          socketId: socket.id 
        }
        connectedUsers.set(socket.id, socketUser)

        // Join user to general room
        socket.join("chat")
        console.log("[Socket.IO] User joined chat room:", username)

        // Broadcast user joined
        socket.broadcast.emit("user:joined", socketUser)

        // Send current online users to the new user
        const onlineUsers = Array.from(connectedUsers.values())
        socket.emit("users:online", onlineUsers)

        console.log("[Socket.IO] User joined:", username)
        console.log("[Socket.IO] Total connected users:", connectedUsers.size)
      } catch (error) {
        console.error("[Socket.IO] Error handling user join:", error)
        socket.emit("connection:status", { 
          connected: false, 
          message: "Failed to join chat" 
        })
      }
    })

    // Handle sending messages
    socket.on("message:send", async (data: { content: string; sender: string; senderName: string }) => {
      try {
        console.log("[Socket.IO] Received message data:", data)
        
        await connectDB()
        console.log("[Socket.IO] Database connected, saving message...")

        const { content, sender, senderName } = data

        if (!content.trim()) {
          console.log("[Socket.IO] Empty message content, skipping...")
          return
        }

        // Save message to database
        const newMessage = new Message({
          content: content.trim(),
          sender,
          senderName,
          timestamp: new Date(),
          messageType: "text",
          isRead: false,
        })

        console.log("[Socket.IO] Attempting to save message:", {
          content: newMessage.content,
          sender: newMessage.sender,
          senderName: newMessage.senderName
        })

        const savedMessage = await newMessage.save()
        console.log("[Socket.IO] Message saved successfully:", savedMessage._id)

        // Broadcast message to all users in chat room
        const messageData = {
          _id: savedMessage._id,
          content: savedMessage.content,
          sender: savedMessage.sender,
          senderName: savedMessage.senderName,
          timestamp: savedMessage.timestamp,
          messageType: savedMessage.messageType,
          isRead: savedMessage.isRead,
        }
        
        console.log("[Socket.IO] Broadcasting message to chat room:", messageData)
        io?.to("chat").emit("message:new", messageData)
        
        // Also emit to the sender to confirm
        socket.emit("message:new", messageData)

        console.log("[Socket.IO] Message broadcasted by:", senderName)
      } catch (error) {
        console.error("[Socket.IO] Error handling message send:", error)
        console.error("[Socket.IO] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    })

    // Handle typing start
    socket.on("typing:start", async (data: { userId: string; username: string }) => {
      try {
        await connectDB()

        const { userId, username } = data

        // Update typing status in database
        await TypingStatus.findOneAndUpdate(
          { userId },
          {
            userId,
            username,
            isTyping: true,
            lastTyping: new Date(),
          },
          { upsert: true, new: true }
        )

        // Broadcast typing status to other users
        socket.broadcast.emit("user:typing", { userId, username, isTyping: true })

        console.log("[Socket.IO] User started typing:", username)
      } catch (error) {
        console.error("[Socket.IO] Error handling typing start:", error)
      }
    })

    // Handle typing stop
    socket.on("typing:stop", async (data: { userId: string; username: string }) => {
      try {
        await connectDB()

        const { userId, username } = data

        // Update typing status in database
        await TypingStatus.findOneAndUpdate(
          { userId },
          {
            userId,
            username,
            isTyping: false,
            lastTyping: new Date(),
          },
          { upsert: true, new: true }
        )

        // Broadcast typing status to other users
        socket.broadcast.emit("user:typing", { userId, username, isTyping: false })

        console.log("[Socket.IO] User stopped typing:", username)
      } catch (error) {
        console.error("[Socket.IO] Error handling typing stop:", error)
      }
    })

    // Handle user leaving
    socket.on("user:leave", async (data: { userId: string }) => {
      await handleUserDisconnect(socket.id)
    })

    // Handle disconnect
    socket.on("disconnect", async () => {
      await handleUserDisconnect(socket.id)
    })
  })
}

async function handleUserDisconnect(socketId: string) {
  try {
    const user = connectedUsers.get(socketId)
    if (user) {
      await connectDB()

      // Update user status in database
      await User.findOneAndUpdate(
        { username: user.username },
        {
          isOnline: false,
          lastSeen: new Date(),
        }
      )

      // Remove typing status
      await TypingStatus.findOneAndUpdate(
        { userId: user.userId },
        {
          isTyping: false,
          lastTyping: new Date(),
        }
      )

      // Remove from connected users
      connectedUsers.delete(socketId)

      // Broadcast user left
      io?.emit("user:left", user)
      io?.emit("user:typing", { 
        userId: user.userId, 
        username: user.username, 
        isTyping: false 
      })

      console.log("[Socket.IO] User disconnected:", user.username)
    }
  } catch (error) {
    console.error("[Socket.IO] Error handling user disconnect:", error)
  }
}

export async function GET(req: NextRequest) {
  try {
    // Initialize Socket.IO if not already done
    if (!io) {
      initializeSocketIO()
    }

    return NextResponse.json({
      success: true,
      message: "Socket.IO server is running",
      connectedUsers: connectedUsers.size,
      environment: process.env.NODE_ENV
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

    // Initialize Socket.IO if not already done
    if (!io) {
      initializeSocketIO()
    }

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
          users: Array.from(connectedUsers.values())
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
