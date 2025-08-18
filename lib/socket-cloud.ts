// Socket.IO Cloud Integration for Production
// This is an alternative to the current Socket.IO setup for Vercel deployment

import { io, type Socket } from "socket.io-client"

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

class SocketCloudClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private static instance: SocketCloudClient
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  static getInstance(): SocketCloudClient {
    if (!SocketCloudClient.instance) {
      SocketCloudClient.instance = new SocketCloudClient()
    }
    return SocketCloudClient.instance
  }

  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket || !this.socket.connected) {
      // Use Socket.IO Cloud URL from environment variable
      const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"

      console.log("[Socket.IO Cloud] Connecting to:", serverUrl)

      this.socket = io(serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: true,
      })

      this.setupEventHandlers()
    }

    return this.socket
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on("connect", () => {
      console.log("[Socket.IO Cloud] Connected:", this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket.IO Cloud] Disconnected:", reason)
      if (reason === "io server disconnect") {
        this.socket?.connect()
      }
    })

    this.socket.on("connect_error", (error) => {
      console.error("[Socket.IO Cloud] Connection error:", error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[Socket.IO Cloud] Max reconnection attempts reached")
      }
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Helper methods for common operations
  joinChat(userId: string, username: string, avatar?: string) {
    if (this.socket && this.isConnected()) {
      this.socket.emit("user:join", { userId, username, avatar })
    }
  }

  leaveChat(userId: string) {
    if (this.socket && this.isConnected()) {
      this.socket.emit("user:leave", { userId })
    }
  }

  sendMessage(content: string, sender: string, senderName: string) {
    if (this.socket && this.isConnected()) {
      this.socket.emit("message:send", { content, sender, senderName })
    }
  }

  startTyping(userId: string, username: string) {
    if (this.socket && this.isConnected()) {
      this.socket.emit("typing:start", { userId, username })
    }
  }

  stopTyping(userId: string, username: string) {
    if (this.socket && this.isConnected()) {
      this.socket.emit("typing:stop", { userId, username })
    }
  }
}

export default SocketCloudClient
