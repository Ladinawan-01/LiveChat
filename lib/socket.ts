import type { Server as NetServer } from "http"
import { Server as ServerIO } from "socket.io"
import connectDB from "@/lib/database"
import Message from "@/models/Message"
import User from "@/models/User"
import TypingStatus from "@/models/TypingStatus"

export type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io: ServerIO
    }
  }
}

export interface SocketUser {
  userId: string
  username: string
  avatar?: string
}

export interface ServerToClientEvents {
  "message:new": (message: any) => void
  "user:joined": (user: SocketUser) => void
  "user:left": (user: SocketUser) => void
  "user:typing": (data: { userId: string; username: string; isTyping: boolean }) => void
  "users:online": (users: SocketUser[]) => void
}

export interface ClientToServerEvents {
  "message:send": (data: { content: string; sender: string; senderName: string }) => void
  "user:join": (data: { userId: string; username: string; avatar?: string }) => void
  "user:leave": (data: { userId: string }) => void
  "typing:start": (data: { userId: string; username: string }) => void
  "typing:stop": (data: { userId: string; username: string }) => void
}

export const initializeSocket = (server: NetServer) => {
  const io = new ServerIO(server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
      methods: ["GET", "POST"],
    },
  })

  // Store connected users
  const connectedUsers = new Map<string, SocketUser>()

  io.on("connection", (socket) => {
    console.log("[v0] Socket connected:", socket.id)

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
          { upsert: true, new: true },
        )

        // Store user in connected users
        connectedUsers.set(socket.id, { userId, username, avatar })

        // Join user to general room
        socket.join("chat")

        // Broadcast user joined
        socket.broadcast.emit("user:joined", { userId, username, avatar })

        // Send current online users to the new user
        const onlineUsers = Array.from(connectedUsers.values())
        socket.emit("users:online", onlineUsers)

        console.log("[v0] User joined:", username)
      } catch (error) {
        console.error("[v0] Error handling user join:", error)
      }
    })

    // Handle sending messages
    socket.on("message:send", async (data: { content: string; sender: string; senderName: string }) => {
      try {
        await connectDB()

        const { content, sender, senderName } = data

        if (!content.trim()) return

        // Save message to database
        const newMessage = new Message({
          content: content.trim(),
          sender,
          senderName,
          timestamp: new Date(),
          messageType: "text",
          isRead: false,
        })

        const savedMessage = await newMessage.save()

        // Broadcast message to all users in chat room
        io.to("chat").emit("message:new", {
          _id: savedMessage._id,
          content: savedMessage.content,
          sender: savedMessage.sender,
          senderName: savedMessage.senderName,
          timestamp: savedMessage.timestamp,
          messageType: savedMessage.messageType,
          isRead: savedMessage.isRead,
        })

        console.log("[v0] Message sent by:", senderName)
      } catch (error) {
        console.error("[v0] Error handling message send:", error)
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
          { upsert: true, new: true },
        )

        // Broadcast typing status to other users
        socket.broadcast.emit("user:typing", { userId, username, isTyping: true })

        console.log("[v0] User started typing:", username)
      } catch (error) {
        console.error("[v0] Error handling typing start:", error)
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
          { upsert: true, new: true },
        )

        // Broadcast typing status to other users
        socket.broadcast.emit("user:typing", { userId, username, isTyping: false })

        console.log("[v0] User stopped typing:", username)
      } catch (error) {
        console.error("[v0] Error handling typing stop:", error)
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

    // Helper function to handle user disconnect
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
            },
          )

          // Remove typing status
          await TypingStatus.findOneAndUpdate(
            { userId: user.userId },
            {
              isTyping: false,
              lastTyping: new Date(),
            },
          )

          // Remove from connected users
          connectedUsers.delete(socketId)

          // Broadcast user left
          socket.broadcast.emit("user:left", user)
          socket.broadcast.emit("user:typing", { userId: user.userId, username: user.username, isTyping: false })

          console.log("[v0] User disconnected:", user.username)
        }
      } catch (error) {
        console.error("[v0] Error handling user disconnect:", error)
      }
    }
  })

  return io
}
