// Simple test script to verify chat functionality
const io = require('socket.io-client')

console.log('🧪 Testing LiveChat Pro...')

// Test Socket.IO connection
const socket = io('http://localhost:3000')

socket.on('connect', () => {
  console.log('✅ Connected to server')
  
  // Test user join
  socket.emit('user:join', {
    userId: 'test-user-1',
    username: 'TestUser1',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser1'
  })
  
  // Test room join
  setTimeout(() => {
    socket.emit('joinRoom', 'test-room')
    console.log('✅ Joined test room')
  }, 1000)
  
  // Test message sending
  setTimeout(() => {
    socket.emit('sendMessage', {
      sender: 'test-user-1',
      room: 'test-room',
      text: 'Hello from test script!'
    })
    console.log('✅ Sent test message')
  }, 2000)
  
  // Test typing indicator
  setTimeout(() => {
    socket.emit('typing', {
      room: 'test-room',
      isTyping: true
    })
    console.log('✅ Sent typing indicator')
  }, 3000)
  
  // Test typing stop
  setTimeout(() => {
    socket.emit('typing', {
      room: 'test-room',
      isTyping: false
    })
    console.log('✅ Stopped typing indicator')
  }, 4000)
  
  // Test private message
  setTimeout(() => {
    socket.emit('sendMessage', {
      sender: 'test-user-1',
      receiver: 'test-user-2',
      text: 'Private message test'
    })
    console.log('✅ Sent private message')
  }, 5000)
  
  // Cleanup
  setTimeout(() => {
    socket.emit('user:leave', { userId: 'test-user-1' })
    socket.disconnect()
    console.log('✅ Test completed successfully')
    process.exit(0)
  }, 6000)
})

socket.on('connection:status', (data) => {
  console.log('📡 Connection status:', data)
})

socket.on('newMessage', (message) => {
  console.log('📨 Received message:', message)
})

socket.on('users:online', (users) => {
  console.log('👥 Online users:', users.length)
})

socket.on('user:joined', (user) => {
  console.log('👋 User joined:', user.username)
})

socket.on('user:left', (user) => {
  console.log('👋 User left:', user.username)
})

socket.on('roomJoined', (data) => {
  console.log('🚪 Room joined:', data)
})

socket.on('userTyping', (data) => {
  console.log('⌨️ User typing:', data)
})

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server')
})

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message)
  process.exit(1)
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted')
  socket.disconnect()
  process.exit(0)
})

console.log('⏳ Waiting for server connection...')
