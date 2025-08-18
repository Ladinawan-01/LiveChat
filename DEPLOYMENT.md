# LiveChat Deployment Guide

## Socket.IO Deployment Issues

The current Socket.IO implementation has limitations when deploying to Vercel due to:

1. **Serverless Environment**: Vercel's serverless functions have execution time limits and can't maintain persistent WebSocket connections
2. **No Persistent State**: Serverless functions don't maintain state between invocations
3. **Connection Limits**: WebSocket connections are not supported in Vercel's serverless environment

## Solutions

### Option 1: Local Development (Current Setup)

For local development, the current setup works by running a separate Socket.IO server on port 3001.

**To run locally:**
```bash
npm run dev
```

The Socket.IO server will start on port 3001 and the Next.js app on port 3000.

### Option 2: Production Deployment with External Socket.IO Service

For production deployment, you have several options:

#### A. Socket.IO Cloud (Recommended)
1. Sign up at [socket.io/cloud](https://socket.io/cloud)
2. Create a new project
3. Get your connection URL
4. Update the client configuration

#### B. Pusher
1. Sign up at [pusher.com](https://pusher.com)
2. Create a new app
3. Get your credentials
4. Install: `npm install pusher pusher-js`

#### C. Ably
1. Sign up at [ably.com](https://ably.com)
2. Create a new app
3. Get your API key
4. Install: `npm install ably`

#### D. Heroku (Separate Socket.IO Server)
1. Deploy a separate Socket.IO server to Heroku
2. Update the client to connect to the Heroku URL

### Option 3: Vercel with Server-Sent Events (SSE)

For a simpler real-time solution on Vercel, you can use Server-Sent Events instead of WebSockets.

## Implementation for Production

### Using Socket.IO Cloud

1. **Update environment variables:**
```env
NEXT_PUBLIC_SOCKET_URL=your-socket-io-cloud-url
```

2. **Update socket-client.ts:**
```typescript
const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
```

3. **Deploy to Vercel:**
```bash
vercel --prod
```

### Using Pusher (Alternative)

1. **Install dependencies:**
```bash
npm install pusher pusher-js
```

2. **Create lib/pusher.ts:**
```typescript
import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
)
```

3. **Update API routes to use Pusher instead of Socket.IO**

## Current Status

- ✅ **Local Development**: Working with Socket.IO on port 3001
- ❌ **Vercel Production**: WebSocket connections fail
- 🔄 **Need External Service**: For production deployment

## Quick Fix for Testing

To test the current setup locally:

1. Make sure you're running on localhost
2. The Socket.IO server will start on port 3001
3. The client will connect to localhost:3001

## Next Steps

1. **For Development**: Continue using the current setup
2. **For Production**: Choose one of the external Socket.IO services
3. **For Simple Real-time**: Consider Server-Sent Events as an alternative

## Environment Variables

```env
# For local development
NODE_ENV=development

# For production with external Socket.IO service
NEXT_PUBLIC_SOCKET_URL=your-socket-io-service-url
MONGODB_URI=your-mongodb-connection-string
NEXT_PUBLIC_APP_URL=https://your-domain.com
```
