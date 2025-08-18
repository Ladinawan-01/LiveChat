import { io, type Socket } from "socket.io-client"
import type { ServerToClientEvents, ClientToServerEvents } from "@/lib/socket-server"

class SocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private static instance: SocketClient
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient()
    }
    return SocketClient.instance
  }

  connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket || !this.socket.connected) {
      // Determine the correct server URL
      let serverUrl: string
      
      if (typeof window !== 'undefined') {
        // Client-side: use current origin for production, localhost for development
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        serverUrl = isLocalhost ? "https://live-chat-gamma-black.vercel.app/" : window.location.origin
      } else {
        // Server-side: use environment variable or default
        serverUrl = process.env.NODE_ENV === "production" 
          ? process.env.NEXT_PUBLIC_APP_URL || "https://live-chat-gamma-black.vercel.app"
          : "https://live-chat-gamma-black.vercel.app/"
      }

      console.log("[Socket.IO Client] Connecting to:", serverUrl)

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
      console.log("[Socket.IO Client] Connected:", this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket.IO Client] Disconnected:", reason)
      if (reason === "io server disconnect") {
        // Server disconnected us, try to reconnect
        this.socket?.connect()
      }
    })

    this.socket.on("connect_error", (error) => {
      console.error("[Socket.IO Client] Connection error:", error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[Socket.IO Client] Max reconnection attempts reached")
        // For production, you might want to show a user-friendly error message
        if (typeof window !== 'undefined') {
          console.warn("[Socket.IO Client] Consider using a dedicated Socket.IO service for production")
        }
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

export default SocketClient
