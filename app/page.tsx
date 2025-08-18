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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Settings,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Search,
  Crown,
  Shield
} from "lucide-react"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"

interface Message {
  _id: string
  sender: string
  receiver?: string
  room?: string
  text: string
  timestamp: Date
}

interface ChatUser {
  userId: string
  username: string
  avatar?: string
  socketId: string
}

interface Room {
  name: string
  userCount: number
  createdBy: string
  createdAt: Date
  isPrivate: boolean
}

function ChatApp() {
  const { user, login, register, logout, isLoading } = useAuth()
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  
  // Auth state
  const [isLogin, setIsLogin] = useState(true)
  const [authError, setAuthError] = useState("")
  const [isLoadingAuth, setIsLoadingAuth] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  })
  
  // Chat state
  const [currentRoom, setCurrentRoom] = useState("general")
  const [roomInput, setRoomInput] = useState("")
  const [message, setMessage] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showOnlineUsers, setShowOnlineUsers] = useState(false)
  
  // Enhanced room management
  const [rooms, setRooms] = useState<Room[]>([])
  const [showRooms, setShowRooms] = useState(true)
  const [roomSearch, setRoomSearch] = useState("")
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [roomError, setRoomError] = useState("")
  
  // Enhanced message management
  const [messages, setMessages] = useState<Message[]>([])
  const [roomMessages, setRoomMessages] = useState<{ [key: string]: Message[] }>({})
  const [privateMessages, setPrivateMessages] = useState<{ [key: string]: Message[] }>({})
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  // Private chat state
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [privateChats, setPrivateChats] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize Socket.IO connection when user is authenticated
  useEffect(() => {
    if (!user) return

    // Determine the correct server URL based on environment
    let serverUrl: string
    
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      
      if (isLocalhost) {
        serverUrl = "http://localhost:3000"
      } else {
        serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
      }
    } else {
      serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    }

    console.log("Connecting to Socket.IO server:", serverUrl)
    
    const newSocket = io(serverUrl, {
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on("connect", () => {
      console.log("🟢 Connected to Socket.IO server")
      setIsConnected(true)
      
      // Join chat with user info
      newSocket.emit("user:join", {
        userId: user._id,
        username: user.username,
        avatar: user.avatar
      })
    })

    newSocket.on("disconnect", () => {
      console.log("🔴 Disconnected from Socket.IO server")
      setIsConnected(false)
    })

    newSocket.on("connection:status", (data) => {
      console.log("Connection status:", data)
      setIsConnected(data.connected)
    })

    newSocket.on("user:joined", (userData) => {
      console.log("User joined:", userData)
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.userId === userData.userId)
        if (existing) {
          return prev.map(u => u.userId === userData.userId ? userData : u)
        }
        return [...prev, userData]
      })
    })

    newSocket.on("user:left", (userData) => {
      console.log("User left:", userData)
      setOnlineUsers(prev => prev.filter(u => u.userId !== userData.userId))
    })

    newSocket.on("users:online", (users) => {
      console.log("Online users:", users)
      setOnlineUsers(users)
    })

    newSocket.on("rooms:list", (roomsList) => {
      console.log("Rooms list received:", roomsList)
      setRooms(roomsList)
    })

    newSocket.on("roomCreated", (newRoom) => {
      console.log("New room created:", newRoom)
      setRooms(prev => {
        const existing = prev.find(r => r.name === newRoom.name)
        if (!existing) {
          return [newRoom, ...prev]
        }
        return prev
      })
    })

    newSocket.on("roomError", (error) => {
      console.log("Room error:", error)
      setRoomError(error.message)
      setTimeout(() => setRoomError(""), 5000)
    })

    newSocket.on("roomMessages", (data) => {
      console.log("Room messages received:", data)
      const { room, messages: roomMsgs } = data
      
      setRoomMessages(prev => ({
        ...prev,
        [room]: roomMsgs
      }))
      
      // If this is the current room, update the messages
      if (room === currentRoom && !selectedUser) {
        setMessages(roomMsgs)
      }
      
      setIsLoadingMessages(false)
    })

    newSocket.on("privateMessages", (data) => {
      console.log("Private messages received:", data)
      const { otherUserId, messages: privateMsgs } = data
      
      setPrivateMessages(prev => ({
        ...prev,
        [otherUserId]: privateMsgs
      }))
      
      // If this is the current private chat, update the messages
      if (otherUserId === selectedUser) {
        setMessages(privateMsgs)
      }
      
      setIsLoadingMessages(false)
    })

    newSocket.on("newMessage", (messageData) => {
      console.log("New message received:", messageData)
      
      if (messageData.room) {
        // Room message
        setRoomMessages(prev => ({
          ...prev,
          [messageData.room]: [...(prev[messageData.room] || []), messageData]
        }))
        
        if (messageData.room === currentRoom && !selectedUser) {
          setMessages(prev => [...prev, messageData])
        }
      } else if (messageData.receiver) {
        // Private message
        const otherUser = messageData.sender === currentUser?.userId ? messageData.receiver : messageData.sender
        setPrivateMessages(prev => ({
          ...prev,
          [otherUser]: [...(prev[otherUser] || []), messageData]
        }))
        
        if (otherUser === selectedUser) {
          setMessages(prev => [...prev, messageData])
        }
        
        // Add to private chats if not already there
        if (!privateChats.includes(otherUser)) {
          setPrivateChats(prev => [...prev, otherUser])
        }
      }
    })

    newSocket.on("userJoinedRoom", (data) => {
      console.log("User joined room:", data)
      // Update room user count
      setRooms(prev => prev.map(room => 
        room.name === data.room 
          ? { ...room, userCount: room.userCount + 1 }
          : room
      ))
    })

    newSocket.on("userLeftRoom", (data) => {
      console.log("User left room:", data)
      // Update room user count
      setRooms(prev => prev.map(room => 
        room.name === data.room 
          ? { ...room, userCount: Math.max(0, room.userCount - 1) }
          : room
      ))
    })

    newSocket.on("roomJoined", (data) => {
      console.log("Joined room:", data)
      // Add room to list if not exists
      setRooms(prev => {
        const existing = prev.find(r => r.name === data.room)
        if (!existing) {
          return [...prev, { name: data.room, userCount: 1, isJoined: true, isPrivate: false }]
        }
        return prev.map(room => 
          room.name === data.room 
            ? { ...room, isJoined: true, userCount: room.userCount + 1 }
            : room
        )
      })
    })

    newSocket.on("userTyping", (data) => {
      console.log("User typing:", data)
      if (data.room === currentRoom) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u !== data.user)
          return data.isTyping ? [...filtered, data.user] : filtered
        })
      }
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [user])

  // Set current user when socket connects
  useEffect(() => {
    if (socket && user) {
      setCurrentUser({
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        socketId: socket.id || 'temp-id'
      })
    }
  }, [socket, user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle form submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    setIsLoadingAuth(true)

    try {
      let result
      
      if (isLogin) {
        result = await login(formData.email, formData.password)
      } else {
        result = await register(formData.username, formData.email, formData.password)
      }

      if (!result.success) {
        setAuthError(result.error || "Authentication failed")
      }
    } catch (error) {
      setAuthError("An unexpected error occurred")
    } finally {
      setIsLoadingAuth(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setAuthError("")
  }

  // Handle creating room
  const handleCreateRoom = () => {
    if (!roomInput.trim() || !socket) return

    setIsCreatingRoom(true)
    socket.emit("createRoom", {
      roomName: roomInput.trim(),
      isPrivate: false
    })
    
    setRoomInput("")
    setIsCreatingRoom(false)
  }

  // Handle switching to a room
  const handleSwitchToRoom = (roomName: string) => {
    if (!socket || !currentUser) return

    setCurrentRoom(roomName)
    setSelectedUser(null)
    setIsLoadingMessages(true)

    // Check if we have cached messages for this room
    if (roomMessages[roomName]) {
      setMessages(roomMessages[roomName])
      setIsLoadingMessages(false)
    } else {
      // Load messages from server
      socket.emit("loadRoomMessages", roomName)
    }
  }

  // Handle private chat
  const handlePrivateChat = (userId: string) => {
    if (!socket || !currentUser) return

    setSelectedUser(userId)
    setCurrentRoom("")
    setIsLoadingMessages(true)

    // Check if we have cached private messages
    if (privateMessages[userId]) {
      setMessages(privateMessages[userId])
      setIsLoadingMessages(false)
    } else {
      // Load private messages from server
      socket.emit("loadPrivateMessages", userId)
    }
    
    // Add to private chats if not already there
    if (!privateChats.includes(userId)) {
      setPrivateChats(prev => [...prev, userId])
    }
  }

  // Handle joining room
  const handleJoinRoom = (roomName?: string) => {
    if (!socket) return

    const roomToJoin = roomName || roomInput.trim()
    if (!roomToJoin) return

    socket.emit("joinRoom", roomToJoin)
    setCurrentRoom(roomToJoin)
    setRoomInput("")
    setSelectedUser(null)
    setIsLoadingMessages(true)
  }

  // Handle leaving room
  const handleLeaveRoom = (roomName: string) => {
    if (!socket) return
    
    socket.emit("leaveRoom", roomName)
    
    if (currentRoom === roomName) {
      setCurrentRoom("general")
      setSelectedUser(null)
      setMessages([])
    }
  }

  // Handle sending message
  const handleSendMessage = () => {
    if (!message.trim() || !socket || !currentUser) return

    if (selectedUser) {
      socket.emit("sendMessage", {
        sender: currentUser.userId,
        receiver: selectedUser,
        text: message.trim()
      })
    } else {
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

  // Handle logout
  const handleLogout = () => {
    if (socket) {
      socket.emit("user:leave")
      socket.close()
    }
    logout()
  }

  // Filter rooms based on search
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(roomSearch.toLowerCase())
  )

  // Filter online users (exclude current user)
  const otherUsers = onlineUsers.filter(u => u.userId !== currentUser?.userId)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <MessageCircle className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to LiveChat Pro</CardTitle>
            <p className="text-muted-foreground">Sign in to start chatting</p>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {authError && (
                    <Alert variant="destructive">
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoadingAuth}>
                    {isLoadingAuth ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Logging in...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Login
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        placeholder="Enter your username"
                        className="pl-10"
                        minLength={2}
                        maxLength={30}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {authError && (
                    <Alert variant="destructive">
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoadingAuth}>
                    {isLoadingAuth ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating account...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Register
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              >
                <Users className="h-4 w-4 mr-2" />
                Online ({onlineUsers.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
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
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Global Rooms
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRooms(!showRooms)}
                  >
                    {showRooms ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
             

                {roomError && (
                  <Alert variant="destructive">
                    <AlertDescription>{roomError}</AlertDescription>
                  </Alert>
                )}
                
                {showRooms && (
                  <>
                    {/* Search Rooms */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        placeholder="Search rooms..."
                        className="pl-10"
                      />
                    </div>
                    
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {/* Joined Rooms */}
                        <div className="space-y-1">
                          {/* <Label className="text-xs font-medium text-muted-foreground">JOINED ROOMS</Label> */}
                          {filteredRooms
                            .filter(room => room.name === currentRoom || room.name === "general")
                            .map((room) => (
                              <div
                                key={room.name}
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                  currentRoom === room.name && !selectedUser 
                                    ? 'bg-blue-100 border border-blue-200' 
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  {room.name === "general" && <Crown className="h-4 w-4 text-yellow-500" />}
                                  {room.isPrivate && <Shield className="h-4 w-4 text-purple-500" />}
                                  <Hash className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{room.name}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-muted-foreground">
                                        {room.userCount} user{room.userCount !== 1 ? 's' : ''}
                                      </p>
                                      {room.createdBy !== "system" && (
                                        <p className="text-xs text-muted-foreground">
                                          by {room.createdBy}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => handleSwitchToRoom(room.name)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  {room.name !== "general" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-red-600 hover:text-red-700"
                                      onClick={() => handleLeaveRoom(room.name)}
                                    >
                                      <UserMinus className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Available Rooms */}
                        {/* <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">AVAILABLE ROOMS</Label>
                          {filteredRooms
                            .filter(roo m => room.name !== currentRoom && room.name !== "general")
                            .map((room) => (
                              <div
                                key={room.name}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  {room.isPrivate && <Shield className="h-4 w-4 text-purple-500" />}
                                  <Hash className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{room.name}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs text-muted-foreground">
                                        {room.userCount} user{room.userCount !== 1 ? 's' : ''}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        by {room.createdBy}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => handleJoinRoom(room.name)}
                                >
                                  <UserPlus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                        </div> */}

                        {filteredRooms.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No rooms found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Private Chats */}
            {privateChats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Private Chats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {privateChats.map((userId) => {
                        const userData = onlineUsers.find(u => u.userId === userId)
                        if (!userData) return null
                        
                        return (
                          <div
                            key={userId}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedUser === userId 
                                ? 'bg-purple-100 border border-purple-200' 
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => handlePrivateChat(userId)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={userData.avatar} />
                              <AvatarFallback>{userData.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{userData.username}</p>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-xs text-muted-foreground">Private</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

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
                      {otherUsers.map((user) => (
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
                            {isLoadingMessages && " • Loading messages..."}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitchToRoom("general")}
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
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-sm">Loading messages...</p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No messages yet</p>
                          <p className="text-sm">Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`flex gap-3 ${
                            msg.sender === currentUser?.userId ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.sender !== currentUser?.userId && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={onlineUsers.find(u => u.userId === msg.sender)?.avatar} />
                              <AvatarFallback>
                                {onlineUsers.find(u => u.userId === msg.sender)?.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.sender === currentUser?.userId
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            {msg.sender !== currentUser?.userId && (
                              <p className="text-xs opacity-75 mb-1">
                                {onlineUsers.find(u => u.userId === msg.sender)?.username}
                              </p>
                            )}
                            <p className="text-sm">{msg.text}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {typingUsers.length > 0 && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                          <p className="text-sm italic">typing...</p>
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
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onInput={handleTyping}
                    placeholder={
                      selectedUser 
                        ? `Message ${selectedUserData?.username}...` 
                        : `Message in ${currentRoom}...`
                    }
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!message.trim()}>
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

export default function Page() {
  return (
    <AuthProvider>
      <ChatApp />
    </AuthProvider>
  )
}
