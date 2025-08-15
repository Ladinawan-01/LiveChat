import { Server as NetServer } from "http"
import { Server as ServerIO } from "socket.io"
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

export interface ServerToClientEvents {
  "message:new": (message: any) => void
  "user:joined": (user: SocketUser) => void
  "user:left": (user: SocketUser) => void
  "user:typing": (data: { userId: string; username: string; isTyping: boolean }) => void
  "users:online": (users: SocketUser[]) => void
  "connection:status": (status: { connected: boolean; message: string }) => void
}

export interface ClientToServerEvents {
  "message:send": (data: { content: string; sender: string; senderName: string }) => void
  "user:join": (data: { userId: string; username: string; avatar?: string }) => void
  "user:leave": (data: { userId: string }) => void
  "typing:start": (data: { userId: string; username: string }) => void
  "typing:stop": (data: { userId: string; username: string }) => void
}

class SocketServer {
  private static instance: SocketServer
  private io: ServerIO | null = null
  private connectedUsers = new Map<string, SocketUser>()

  static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer()
    }
    return SocketServer.instance
  }

  initialize(server: NetServer): ServerIO {
    if (this.io) {
      return this.io
    }

    this.io = new ServerIO(server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? process.env.NEXT_PUBLIC_APP_URL || "*"
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ["websocket", "polling"]
    })

    this.setupEventHandlers()
    return this.io
  }

  private setupEventHandlers() {
    if (!this.io) return

    this.io.on("connection", (socket) => {
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
          this.connectedUsers.set(socket.id, socketUser)

          // Join user to general room
          socket.join("chat")
          console.log("[Socket.IO] User joined chat room:", username)

          // Broadcast user joined
          socket.broadcast.emit("user:joined", socketUser)

          // Send current online users to the new user
          const onlineUsers = Array.from(this.connectedUsers.values())
          socket.emit("users:online", onlineUsers)

          console.log("[Socket.IO] User joined:", username)
          console.log("[Socket.IO] Total connected users:", this.connectedUsers.size)
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
          this.io?.to("chat").emit("message:new", messageData)
          
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
        await this.handleUserDisconnect(socket.id)
      })

      // Handle disconnect
      socket.on("disconnect", async () => {
        await this.handleUserDisconnect(socket.id)
      })
    })
  }

  private async handleUserDisconnect(socketId: string) {
    try {
      const user = this.connectedUsers.get(socketId)
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
        this.connectedUsers.delete(socketId)

        // Broadcast user left
        this.io?.emit("user:left", user)
        this.io?.emit("user:typing", { 
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

  getIO(): ServerIO | null {
    return this.io
  }

  getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values())
  }
}

export default SocketServer
