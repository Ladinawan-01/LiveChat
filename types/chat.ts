export interface ChatMessage {
  _id: string
  content: string
  sender: string
  senderName: string
  timestamp: Date
  messageType: "text" | "image" | "file"
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ChatUser {
  _id: string
  username: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

export interface TypingUser {
  _id: string
  userId: string
  username: string
  isTyping: boolean
  lastTyping: Date
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
