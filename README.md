# 🚀 LiveChat Pro - Real-time Chat Application

A professional, feature-rich real-time chat application built with **Next.js 15**, **Socket.IO**, **MongoDB**, and **TypeScript**.

## ✨ Features

### 🎯 Core Features
- **Real-time Messaging** - Instant message delivery with Socket.IO
- **Group Chat Rooms** - Create and join multiple chat rooms
- **Private Messaging** - One-to-one private conversations
- **User Authentication** - Simple username-based login system
- **Online Status** - Real-time user online/offline indicators
- **Typing Indicators** - See when users are typing
- **Message Persistence** - All messages stored in MongoDB
- **Professional UI** - Modern, responsive design with Tailwind CSS

### 🎨 UI/UX Features
- **Modern Design** - Clean, professional interface
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Live connection status and user activity
- **Message Bubbles** - Different styles for sent/received messages
- **User Avatars** - Auto-generated avatars using DiceBear API
- **Room Management** - Easy room creation and joining
- **User List** - See all online users and start private chats

### 🔧 Technical Features
- **TypeScript** - Full type safety
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - Scalable document database
- **Next.js 15** - Latest React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Error Handling** - Comprehensive error management
- **Build Optimization** - Production-ready build system

## 🏗️ Architecture

### Frontend
```
app/
├── page.tsx              # Main chat interface
├── layout.tsx            # Root layout
└── api/                  # API routes
    ├── messages/         # Message CRUD operations
    ├── users/            # User management
    ├── rooms/            # Room management
    └── socket/           # Socket.IO server
```

### Backend
```
server.js                 # Main server with Socket.IO
lib/
├── database.ts          # MongoDB connection
├── socket-client.ts     # Socket.IO client
└── utils.ts             # Utility functions
models/
├── Message.ts           # Message schema
├── User.ts              # User schema
└── TypingStatus.ts      # Typing status schema
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or pnpm

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd LiveChat
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp env.example .env.local
```

Edit `.env.local`:
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/live-chat
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/live-chat

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

4. **Start MongoDB** (if using local MongoDB)
```bash
# Start MongoDB service
mongod
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

### Getting Started
1. **Enter your username** on the login screen
2. **Join the General room** (default)
3. **Start chatting** with other users

### Creating Rooms
1. **Enter room name** in the room input field
2. **Click "Join"** to create/join a room
3. **Messages** will be broadcast to all users in that room

### Private Chat
1. **Click on a user** in the online users list
2. **Start a private conversation** - messages are only visible to you and the selected user
3. **Return to General** by clicking "Back to General"

### Features
- **Real-time typing indicators** - See when users are typing
- **Online user list** - View all connected users
- **Message timestamps** - See when messages were sent
- **Auto-scroll** - Messages automatically scroll to bottom
- **Responsive design** - Works on all device sizes

## 🔧 API Endpoints

### Messages
- `GET /api/messages` - Get messages (supports room and private chat filtering)
- `POST /api/messages` - Send a new message

### Users
- `GET /api/users` - Get online users
- `POST /api/users` - Create/update user

### Rooms
- `GET /api/rooms` - Get all rooms with message counts
- `POST /api/rooms` - Create a new room

## 🗄️ Database Schema

### Message Model
```typescript
{
  sender: string,        // User ID of sender
  receiver?: string,     // User ID for private chat
  room?: string,         // Room name for group chat
  text: string,          // Message content
  timestamp: Date,       // Message timestamp
}
```

### User Model
```typescript
{
  username: string,      // Unique username
  avatar?: string,       // User avatar URL
  isOnline: boolean,     // Online status
  lastSeen: Date,        // Last seen timestamp
}
```

## 🔌 Socket.IO Events

### Client to Server
- `user:join` - User joins chat
- `joinRoom` - Join a chat room
- `leaveRoom` - Leave a chat room
- `sendMessage` - Send a message
- `typing` - Typing indicator

### Server to Client
- `connection:status` - Connection status
- `newMessage` - New message received
- `users:online` - Online users list
- `user:joined` - User joined
- `user:left` - User left
- `userTyping` - User typing indicator

## 🎨 Customization

### Styling
The app uses Tailwind CSS for styling. You can customize:
- Colors in `tailwind.config.js`
- Components in `components/ui/`
- Layout in `app/page.tsx`

### Features
Add new features by:
- Extending the Message model
- Adding new Socket.IO events
- Creating new API endpoints
- Updating the UI components

## 🚀 Deployment

### Vercel (Recommended)
1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set environment variables**
4. **Deploy**

### Environment Variables for Production
```env
MONGODB_URI=your-mongodb-atlas-uri
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
NODE_ENV=production
```

### MongoDB Atlas Setup
1. **Create MongoDB Atlas account**
2. **Create a cluster**
3. **Get connection string**
4. **Add to environment variables**

## 🔒 Security Considerations

- **Input Validation** - All inputs are validated
- **Rate Limiting** - Consider adding rate limiting for production
- **Authentication** - Add JWT or NextAuth for production
- **HTTPS** - Use HTTPS in production
- **CORS** - Configure CORS for your domain

## 🧪 Testing

### Manual Testing
1. **Open multiple browser tabs**
2. **Login with different usernames**
3. **Test room creation and joining**
4. **Test private messaging**
5. **Test typing indicators**

### Automated Testing
```bash
npm run test
npm run type-check
npm run lint
```

## 📈 Performance

### Optimizations
- **Message pagination** - Load messages in chunks
- **Connection pooling** - Efficient database connections
- **Caching** - Consider Redis for production
- **CDN** - Use CDN for static assets

### Monitoring
- **Socket.IO metrics** - Monitor connection counts
- **Database performance** - Monitor query performance
- **Error tracking** - Add error tracking service

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests**
5. **Submit a pull request**

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues** - Create an issue on GitHub
- **Documentation** - Check the code comments
- **Community** - Join our Discord server

## 🎯 Roadmap

### Planned Features
- [ ] **File Upload** - Send images and files
- [ ] **Message Reactions** - React to messages
- [ ] **Message Search** - Search through messages
- [ ] **User Profiles** - Detailed user profiles
- [ ] **Message Editing** - Edit sent messages
- [ ] **Message Deletion** - Delete messages
- [ ] **Push Notifications** - Browser notifications
- [ ] **Voice Messages** - Send voice messages
- [ ] **Video Calls** - Video calling feature
- [ ] **Message Encryption** - End-to-end encryption

### Technical Improvements
- [ ] **Redis Integration** - For better performance
- [ ] **Message Queuing** - For high-traffic scenarios
- [ ] **Microservices** - Split into microservices
- [ ] **Docker Support** - Containerization
- [ ] **Kubernetes** - Orchestration
- [ ] **Monitoring** - Advanced monitoring
- [ ] **Analytics** - User analytics
- [ ] **A/B Testing** - Feature testing

---

**Built with ❤️ using Next.js, Socket.IO, and MongoDB**
