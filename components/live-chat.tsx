"use client"
import { useState, useRef, useEffect } from "react"
import SocketClient from "@/lib/socket-client"
import type { ChatMessage, ChatUser } from "@/types/chat"
import type { SocketUser } from "@/lib/socket-server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  Send, 
  Users, 
  X, 
  Volume2, 
  VolumeX,
  MessageCircle,
  UserPlus,
  UserMinus
} from "lucide-react"

interface LiveChatProps {
  onClose?: () => void
}

export function LiveChat({ onClose }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showUserJoin, setShowUserJoin] = useState(true)
  const [username, setUsername] = useState("")
  const [showOnlineUsers, setShowOnlineUsers] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketClient = SocketClient.getInstance()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const audioRef = useRef<HTMLAudioElement>()

  // Initialize notification sound
  useEffect(() => {
    // Use Web Audio API for notification sound
    audioRef.current = new Audio()
    audioRef.current.volume = 0.3
  }, [])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load existing messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages?limit=50')
        const data = await response.json()
        if (data.success) {
          setMessages(data.messages)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [])

  // Socket connection and event handlers
  useEffect(() => {
    if (!showUserJoin) {
      const socket = socketClient.connect()
      setIsConnected(true)

      // Join chat
      socket.emit('user:join', {
        userId: currentUser?._id || Date.now().toString(),
        username: currentUser?.username || '',
        avatar: currentUser?.avatar
      })

      // Listen for new messages
      socket.on('message:new', (message: ChatMessage) => {
        setMessages(prev => [...prev, message])
        if (soundEnabled && message.sender !== currentUser?._id) {
          audioRef.current?.play().catch(console.error)
        }
      })

      // Listen for user join/leave
      socket.on('user:joined', (user: SocketUser) => {
        setOnlineUsers(prev => {
          const exists = prev.find(u => u._id === user.userId)
          if (!exists) {
            // Convert SocketUser to ChatUser format
            const chatUser: ChatUser = {
              _id: user.userId,
              username: user.username,
              avatar: user.avatar,
              isOnline: true,
              lastSeen: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }
            return [...prev, chatUser]
          }
          return prev
        })
      })

      socket.on('user:left', (user: SocketUser) => {
        setOnlineUsers(prev => prev.filter(u => u._id !== user.userId))
      })

      // Listen for typing indicators
      socket.on('user:typing', (data: { userId: string; username: string; isTyping: boolean }) => {
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (!prev.includes(data.username)) {
              return [...prev, data.username]
            }
            return prev
          })
        } else {
          setTypingUsers(prev => prev.filter(name => name !== data.username))
        }
      })

      // Listen for online users
      socket.on('users:online', (users: SocketUser[]) => {
        // Convert SocketUser[] to ChatUser[]
        const chatUsers: ChatUser[] = users.map(user => ({
          _id: user.userId,
          username: user.username,
          avatar: user.avatar,
          isOnline: true,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }))
        setOnlineUsers(chatUsers)
      })

      return () => {
        socket.off('message:new')
        socket.off('user:joined')
        socket.off('user:left')
        socket.off('user:typing')
        socket.off('users:online')
      }
    }
  }, [showUserJoin, currentUser, soundEnabled])

  // Handle user join
  const handleUserJoin = async () => {
    if (!username.trim()) return

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      })

      const data = await response.json()
      if (data.success) {
        setCurrentUser(data.user)
        setShowUserJoin(false)
      } else {
        alert(data.error || 'Failed to join chat')
      }
    } catch (error) {
      console.error('Error joining chat:', error)
      alert('Failed to join chat')
    }
  }

  // Handle sending message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentUser || !isConnected) return

    const socket = socketClient.getSocket()
    if (socket) {
      socket.emit('message:send', {
        content: newMessage.trim(),
        sender: currentUser._id,
        senderName: currentUser.username
      })
      setNewMessage("")
    }
  }

  // Handle typing
  const handleTyping = () => {
    if (!currentUser || !isConnected) return

    const socket = socketClient.getSocket()
    if (socket) {
      socket.emit('typing:start', {
        userId: currentUser._id,
        username: currentUser.username
      })

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', {
          userId: currentUser._id,
          username: currentUser.username
        })
      }, 1000)
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // User join screen
  if (showUserJoin) {
    return (
      <Card className="w-full max-w-md h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Join Live Chat
          </CardTitle>
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
              onKeyPress={(e) => e.key === 'Enter' && handleUserJoin()}
              maxLength={30}
            />
          </div>
          <Button 
            onClick={handleUserJoin} 
            disabled={!username.trim()}
            className="w-full"
          >
            Join Chat
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Live Chat
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnlineUsers(!showOnlineUsers)}
            >
              <Users className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarFallback>{currentUser.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            {currentUser.username}
          </div>
        )}
      </CardHeader>

      <Separator />

      {/* Messages Area */}
      <div className="flex-1 flex">
        <div className={`flex-1 flex flex-col ${showOnlineUsers ? 'w-2/3' : 'w-full'}`}>
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex gap-3 ${
                      message.sender === currentUser?._id ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.senderName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[70%] space-y-1 ${
                        message.sender === currentUser?._id ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {message.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          message.sender === currentUser?._id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                {typingUsers.length > 0 && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="text-sm text-muted-foreground">
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isConnected}
                maxLength={1000}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !isConnected}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Online Users Panel */}
        {showOnlineUsers && (
          <>
            <Separator orientation="vertical" />
            <div className="w-1/3 p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Online ({onlineUsers.length})
              </h3>
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {onlineUsers.map((user) => (
                    <div key={user._id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.username}</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />
                    </div>
                  ))}
                  {onlineUsers.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No users online
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
