"use client"

import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Send, 
  Users, 
  MessageCircle,
  UserPlus,
  UserMinus,
  Hash,
  User,
  LogIn,
  LogOut,
  Settings
} from "lucide-react"

interface Message {
  _id: string
  sender: string
  receiver?: string
  room?: string
  text: string
  timestamp: Date
}

interface User {
  userId: string
  username: string
  avatar?: string
  socketId: string
}

export default function Home() {
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [username, setUsername] = useState("")
  const [showLogin, setShowLogin] = useState(true)
  
  // Chat state
  const [currentRoom, setCurrentRoom] = useState("general")
  const [roomInput, setRoomInput] = useState("")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showOnlineUsers, setShowOnlineUsers] = useState(false)
  
  // Private chat state
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [privateMessages, setPrivateMessages] = useState<{ [key: string]: Message[] }>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize Socket.IO connection
  useEffect(() => {
    // Determine the correct server URL based on environment
    let serverUrl: string
    
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      
      if (isLocalhost) {
        // Local development - connect to local server
        serverUrl = "http://localhost:3000"
      } else {
        // Production - use environment variable or fallback
        serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
      }
    } else {
      // Server-side fallback
      serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    }

    console.log("🔌 Connecting to Socket.IO server:", serverUrl)
    const socketInstance = io(serverUrl, {
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    
    setSocket(socketInstance)

    socketInstance.on("connect", () => {
      console.log("🟢 Connected to server")
      setIsConnected(true)
    })

    socketInstance.on("disconnect", () => {
      console.log("🔴 Disconnected from server")
      setIsConnected(false)
    })

    socketInstance.on("connection:status", (data) => {
      console.log("Connection status:", data)
    })

    socketInstance.on("newMessage", (message: Message) => {
      if (message.room === currentRoom) {
        setMessages(prev => [...prev, message])
      } else if (message.receiver && (message.sender === selectedUser || message.receiver === selectedUser)) {
        setPrivateMessages(prev => ({
          ...prev,
          [selectedUser!]: [...(prev[selectedUser!] || []), message]
        }))
      }
    })

    socketInstance.on("users:online", (users: User[]) => {
      setOnlineUsers(users)
    })

    socketInstance.on("user:joined", (user: User) => {
      setOnlineUsers(prev => {
        const exists = prev.find(u => u.userId === user.userId)
        if (!exists) {
          return [...prev, user]
        }
        return prev
      })
    })

    socketInstance.on("user:left", (user: User) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId))
    })

    socketInstance.on("userJoinedRoom", (data) => {
      console.log(`${data.user} joined room: ${data.room}`)
    })

    socketInstance.on("userLeftRoom", (data) => {
      console.log(`${data.user} left room: ${data.room}`)
    })

    socketInstance.on("roomJoined", (data) => {
      console.log(data.message)
    })

    socketInstance.on("userTyping", (data) => {
      if (data.room === currentRoom) {
        setTypingUsers(prev => {
          if (data.isTyping && !prev.includes(data.user)) {
            return [...prev, data.user]
          } else if (!data.isTyping) {
            return prev.filter(user => user !== data.user)
          }
          return prev
        })
      }
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, privateMessages])

  // Handle user login
  const handleLogin = () => {
    if (!username.trim() || !socket) return

    const userData = {
      userId: Date.now().toString(),
      username: username.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username.trim()}`,
      socketId: socket.id || 'temp-id'
    }

    socket.emit("user:join", userData)
    setCurrentUser(userData)
    setShowLogin(false)
  }

  // Handle joining room
  const handleJoinRoom = () => {
    if (!roomInput.trim() || !socket) return

    socket.emit("joinRoom", roomInput.trim())
    setCurrentRoom(roomInput.trim())
    setRoomInput("")
    setMessages([])
    setSelectedUser(null) // Exit private chat
  }

  // Handle sending message
  const handleSendMessage = () => {
    if (!message.trim() || !socket || !currentUser) return

    if (selectedUser) {
      // Private message
      socket.emit("sendMessage", {
        sender: currentUser.userId,
        receiver: selectedUser,
        text: message.trim()
      })
    } else {
      // Room message
      socket.emit("sendMessage", {
        sender: currentUser.userId,
        room: currentRoom,
        text: message.trim()
      })
    }

    setMessage("")
  }

  // Handle typing
  const handleTyping = () => {
    if (!socket || !currentUser) return

    socket.emit("typing", {
      room: currentRoom,
      isTyping: true
    })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", {
        room: currentRoom,
        isTyping: false
      })
    }, 1000)
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle private chat
  const handlePrivateChat = (userId: string) => {
    setSelectedUser(userId)
    setCurrentRoom("")
    if (!privateMessages[userId]) {
      setPrivateMessages(prev => ({ ...prev, [userId]: [] }))
    }
  }

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Login screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              LiveChat Pro
            </CardTitle>
            <p className="text-muted-foreground">Join the conversation</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Enter your username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                maxLength={30}
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={!username.trim()}
              className="w-full"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Join Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentMessages = selectedUser ? (privateMessages[selectedUser] || []) : messages
  const selectedUserData = onlineUsers.find(u => u.userId === selectedUser)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">LiveChat Pro</h1>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser?.avatar} />
                  <AvatarFallback>{currentUser?.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{currentUser?.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              >
                <Users className="h-4 w-4 mr-2" />
                Online ({onlineUsers.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Room Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Hash className="h-5 w-5" />
                  Rooms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    placeholder="Room name"
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                  <Button onClick={handleJoinRoom} size="sm">
                    Join
                  </Button>
                </div>
                
                <div className="space-y-1">
                  <Button
                    variant={currentRoom === "general" && !selectedUser ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setCurrentRoom("general")
                      setSelectedUser(null)
                      setMessages([])
                    }}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    General
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Online Users */}
            {showOnlineUsers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Online Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {onlineUsers.map((user) => (
                        <div
                          key={user.userId}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedUser === user.userId 
                              ? 'bg-blue-100 border border-blue-200' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handlePrivateChat(user.userId)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.username}</p>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-muted-foreground">Online</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedUser ? (
                      <>
                        <User className="h-5 w-5 text-purple-600" />
                        <div>
                          <CardTitle className="text-lg">Private Chat</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            with {selectedUserData?.username}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Hash className="h-5 w-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">Room: {currentRoom}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {onlineUsers.length} users online
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null)
                        setCurrentRoom("general")
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Back to General
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {currentMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No messages yet</p>
                          <p className="text-sm">Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      currentMessages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`flex gap-3 ${
                            msg.sender === currentUser?.userId ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {msg.sender === currentUser?.userId 
                                ? currentUser.username[0].toUpperCase()
                                : onlineUsers.find(u => u.userId === msg.sender)?.username[0].toUpperCase() || '?'
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`max-w-[70%] space-y-1 ${
                              msg.sender === currentUser?.userId ? 'text-right' : 'text-left'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {msg.sender === currentUser?.userId 
                                  ? currentUser.username
                                  : onlineUsers.find(u => u.userId === msg.sender)?.username || 'Unknown'
                                }
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            <div
                              className={`p-3 rounded-lg ${
                                msg.sender === currentUser?.userId
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {typingUsers.length > 0 && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-gray-100">
                          <div className="text-sm text-muted-foreground">
                            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      handleTyping()
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedUser 
                        ? `Message ${selectedUserData?.username}...`
                        : `Message in ${currentRoom}...`
                    }
                    disabled={!isConnected}
                    maxLength={1000}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !isConnected}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
