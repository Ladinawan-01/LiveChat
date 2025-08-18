# 🗄️ MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud - Recommended)

1. **Go to [MongoDB Atlas](https://www.mongodb.com/atlas)**
2. **Create a free account**
3. **Create a new cluster (Free tier)**
4. **Get your connection string**
5. **Update your `.env.local`:**

```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/live-chat?retryWrites=true&w=majority
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

## Option 2: Install MongoDB Locally

### Windows:
1. **Download MongoDB Community Server** from [mongodb.com](https://www.mongodb.com/try/download/community)
2. **Install with default settings**
3. **Start MongoDB service:**
   ```powershell
   net start MongoDB
   ```

### macOS:
```bash
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### Linux (Ubuntu):
```bash
sudo apt update
sudo apt install mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Option 3: Use Docker

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Option 4: Quick Test with MongoDB Memory Server

For testing, you can use MongoDB Memory Server:

```bash
npm install mongodb-memory-server
```

Then update `lib/database.ts` to use it in development.

---

## 🔧 **After Setup:**

1. **Test connection:**
   ```bash
   npm run dev
   ```

2. **Check MongoDB is running:**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl status mongod
   ```

3. **Create database and user:**
   ```javascript
   // Connect to MongoDB shell
   mongosh
   
   // Create database
   use live-chat
   
   // Create user (if using local MongoDB)
   db.createUser({
     user: "livechat123",
     pwd: "livechat123",
     roles: ["readWrite"]
   })
   ```

---

## 🚨 **Current Error Fix:**

The error `"Database not available"` means MongoDB isn't running. Choose one of the options above to fix it.

**Quickest fix:** Use MongoDB Atlas (Option 1) - it's free and takes 5 minutes to set up!
