// Load environment variables first
require('dotenv').config({ path: '.env.local' })

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const mongoose = require('mongoose')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Prepare the Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Store connected users and their rooms
const connectedUsers = new Map()
const userRooms = new Map()

// Global database connection function
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI not found in environment variables")
    return null
  }

  try {
    console.log("🔍 Attempting to connect to MongoDB...")
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "liveChat",
    })
    console.log("✅ Database connected:", db.connection.host)
    return db.connection
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return null
  }
}

// Create models directly in server.js to avoid import issues
const createMessageModel = () => {
  const MessageSchema = new mongoose.Schema({
    sender: {
      type: String,
      required: true,
    },
    receiver: {
      type: String,
      required: false,
    },
    room: {
      type: String,
      required: false,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }, {
    timestamps: true,
  })

  // Add indexes
  MessageSchema.index({ timestamp: -1 })
  MessageSchema.index({ sender: 1 })
  MessageSchema.index({ receiver: 1 })
  MessageSchema.index({ room: 1 })

  return mongoose.models.Message || mongoose.model('Message', MessageSchema)
}

const createUserModel = () => {
  const UserSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  }, {
    timestamps: true,
  })

  // Add indexes
  UserSchema.index({ email: 1 })
  UserSchema.index({ username: 1 })
  UserSchema.index({ isOnline: 1 })

  return mongoose.models.User || mongoose.model('User', UserSchema)
}

app.prepare().then(async () => {
  // Dynamically import ES modules
  let Server
  
  try {
    const socketIO = await import('socket.io')
    Server = socketIO.Server
    
    console.log('✅ Socket.IO imported successfully')

    // Connect to database first
    const db = await connectToDatabase()
    if (!db) {
      throw new Error('Failed to connect to database')
    }
    console.log('✅ Database connected and verified successfully')

    // Create models after database connection
    const Message = createMessageModel()
    const User = createUserModel()
    
    console.log('✅ Models created successfully')
    console.log('  - Message model:', typeof Message)
    console.log('  - User model:', typeof User)

  } catch (error) {
    console.error('Error importing modules or connecting to database:', error)
    console.log('Starting server without Socket.IO support...')
  }

  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO if modules are available
  if (Server) {
    const io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? process.env.NEXT_PUBLIC_APP_URL || "*"
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ["polling", "websocket"]
    })

    // Socket.IO event handlers
    io.on("connection", (socket) => {
      console.log("🟢 User connected:", socket.id)

      // Send connection status
      socket.emit("connection:status", { 
        connected: true, 
        message: "Connected to chat server" 
      })
 
      // Handle user joining
      socket.on("user:join", async (data) => {
        try {
          console.log("[Socket.IO] Verifying database connection...")
          
          // Check MongoDB connection state
          if (mongoose.connection.readyState !== 1) {
            console.warn("[Socket.IO] MongoDB connection lost, attempting to reconnect...")
            const db = await connectToDatabase()
            if (!db) {
              throw new Error('Failed to reconnect to database')
            }
          }
          
          console.log("[Socket.IO] Database connection verified")

          // Get models
          const Message = createMessageModel()
          const User = createUserModel()
          
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
          const socketUser = { 
            userId, 
            username, 
            avatar, 
            socketId: socket.id 
          }
          connectedUsers.set(socket.id, socketUser)

          // Join user to general room
          socket.join("general")
          userRooms.set(socket.id, ["general"])
          
          console.log("[Socket.IO] User joined general room:", username)

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

      // Join Room
      socket.on("joinRoom", async (room) => {
        try {
          const user = connectedUsers.get(socket.id)
          if (!user) return

          socket.join(room)
          
          // Track user's rooms
          const userCurrentRooms = userRooms.get(socket.id) || []
          if (!userCurrentRooms.includes(room)) {
            userCurrentRooms.push(room)
            userRooms.set(socket.id, userCurrentRooms)
          }
          
          console.log(`User ${user.username} joined room: ${room}`)
          
          // Notify others in the room
          socket.to(room).emit("userJoinedRoom", {
            user: user.username,
            room: room
          })
          
          // Send room info to user
          socket.emit("roomJoined", {
            room: room,
            message: `Joined room: ${room}`
          })
        } catch (error) {
          console.error("[Socket.IO] Error joining room:", error)
        }
      })

      // Leave Room
      socket.on("leaveRoom", (room) => {
        const user = connectedUsers.get(socket.id)
        if (!user) return

        socket.leave(room)
        
        // Remove from user's rooms
        const userCurrentRooms = userRooms.get(socket.id) || []
        const updatedRooms = userCurrentRooms.filter(r => r !== room)
        userRooms.set(socket.id, updatedRooms)
        
        console.log(`User ${user.username} left room: ${room}`)
        
        // Notify others in the room
        socket.to(room).emit("userLeftRoom", {
          user: user.username,
          room: room
        })
      })

      // Send Message (Group Chat)
      socket.on("sendMessage", async (data) => {
        try {
          console.log("[Socket.IO] Received message data:", data)
          
          // Verify database connection before proceeding
          if (mongoose.connection.readyState !== 1) {
            console.warn("[Socket.IO] Database connection lost, attempting to reconnect...")
            const db = await connectToDatabase()
            if (!db) {
              throw new Error('Failed to reconnect to database')
            }
          }

          // Get models
          const Message = createMessageModel()

          const { sender, receiver, room, text } = data

          if (!text.trim()) {
            console.log("[Socket.IO] Empty message content, skipping...")
            return
          }

          // Save message to database
          const newMessage = new Message({
            sender,
            receiver,
            room,
            text: text.trim(),
            timestamp: new Date(),
          })

          const savedMessage = await newMessage.save()
          console.log("[Socket.IO] Message saved successfully:", savedMessage._id)

          // Broadcast message based on type
          if (room) {
            // Group chat - broadcast to room
            io.to(room).emit("newMessage", {
              _id: savedMessage._id,
              sender: savedMessage.sender,
              receiver: savedMessage.receiver,
              room: savedMessage.room,
              text: savedMessage.text,
              timestamp: savedMessage.timestamp,
            })
            console.log(`[Socket.IO] Message broadcasted to room: ${room}`)
          } else if (receiver) {
            // Private chat - send to specific users
            const senderSocket = Array.from(connectedUsers.entries())
              .find(([_, user]) => user.userId === sender)?.[0]
            const receiverSocket = Array.from(connectedUsers.entries())
              .find(([_, user]) => user.userId === receiver)?.[0]

            if (senderSocket) {
              io.to(senderSocket).emit("newMessage", {
                _id: savedMessage._id,
                sender: savedMessage.sender,
                receiver: savedMessage.receiver,
                room: savedMessage.room,
                text: savedMessage.text,
                timestamp: savedMessage.timestamp,
              })
            }
            
            if (receiverSocket) {
              io.to(receiverSocket).emit("newMessage", {
                _id: savedMessage._id,
                sender: savedMessage.sender,
                receiver: savedMessage.receiver,
                room: savedMessage.room,
                text: savedMessage.text,
                timestamp: savedMessage.timestamp,
              })
            }
            console.log(`[Socket.IO] Private message sent from ${sender} to ${receiver}`)
          }
        } catch (error) {
          console.error("[Socket.IO] Error handling message send:", error)
        }
      })

      // Typing indicators
      socket.on("typing", (data) => {
        const { room, isTyping } = data
        const user = connectedUsers.get(socket.id)
        if (!user) return

        if (room) {
          socket.to(room).emit("userTyping", {
            user: user.username,
            room: room,
            isTyping: isTyping
          })
        }
      })

      // Handle user leaving
      socket.on("user:leave", async (data) => {
        await handleUserDisconnect(socket.id)
      })

      // Handle disconnect
      socket.on("disconnect", async () => {
        await handleUserDisconnect(socket.id)
      })
    })

    async function handleUserDisconnect(socketId) {
      try {
        const user = connectedUsers.get(socketId)
        if (user) {
          // Check MongoDB connection state
          if (mongoose.connection.readyState !== 1) {
            console.warn("[Socket.IO] Database connection lost during disconnect")
            return
          }

          // Get models
          const User = createUserModel()

          // Update user status in database
          await User.findOneAndUpdate(
            { username: user.username },
            {
              isOnline: false,
              lastSeen: new Date(),
            }
          )

          // Notify all rooms user was in
          const userCurrentRooms = userRooms.get(socketId) || []
          userCurrentRooms.forEach(room => {
            io.to(room).emit("userLeftRoom", {
              user: user.username,
              room: room
            })
          })

          // Remove from connected users
          connectedUsers.delete(socketId)
          userRooms.delete(socketId)

          // Broadcast user left
          io.emit("user:left", user)

          console.log("🔴 User disconnected:", user.username)
        }
      } catch (error) {
        console.error("[Socket.IO] Error handling user disconnect:", error)
      }
    }

    console.log("[Socket.IO] Server initialized successfully")
  } else {
    console.log("[Socket.IO] Server not initialized - missing dependencies")
  }

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 Server running on http://${hostname}:${port}`)
    if (Server) {
      console.log(`🟢 Socket.IO server is running on the same port`)
    } else {
      console.log(`🔴 Socket.IO server not available`)
    }
  })
})
