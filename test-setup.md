# Live Chat Application - Test Setup Guide

## Prerequisites Check

1. **Node.js**: Ensure you have Node.js 18+ installed
   ```bash
   node --version
   ```

2. **MongoDB**: Ensure MongoDB is running
   - Local: `mongod` should be running
   - Atlas: Connection string should be valid

3. **Environment Variables**: Create `.env.local` file
   ```env
   MONGODB_URI=mongodb://localhost:27017/live-chat
   NEXT_PUBLIC_APP_URL=https://live-chat-gamma-black.vercel.app/
   NODE_ENV=development
   ```

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to: https://live-chat-gamma-black.vercel.app/

## Testing the Application

### 1. User Join Test
- Enter a username (2-30 characters)
- Click "Join Chat"
- Should see the chat interface

### 2. Real-time Messaging Test
- Open multiple browser tabs/windows
- Join with different usernames
- Send messages
- Verify messages appear in real-time

### 3. Typing Indicators Test
- Start typing in one window
- Verify typing indicator appears in other windows
- Stop typing and verify indicator disappears

### 4. Online Users Test
- Click the users icon
- Verify online users panel shows current users
- Join/leave with different users to test

### 5. Sound Notifications Test
- Toggle sound on/off
- Send messages from other users
- Verify sound plays when enabled

## API Endpoint Tests

### Test Messages API
```bash
curl https://live-chat-gamma-black.vercel.app//api/messages
```

### Test Users API
```bash
curl https://live-chat-gamma-black.vercel.app//api/users
```

### Test Socket.IO Status
```bash
curl https://live-chat-gamma-black.vercel.app//api/socket
```

## Common Issues & Solutions

### 1. MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env.local`
- Verify database permissions

### 2. Socket.IO Connection Error
- Check if custom server is running
- Verify CORS settings
- Check browser console for errors

### 3. TypeScript Errors
- Run `npm run type-check`
- Fix any type issues
- Ensure all imports are correct

### 4. Build Errors
- Run `npm run build`
- Fix any compilation errors
- Check for missing dependencies

## Performance Testing

1. **Load Testing**: Open 10+ browser tabs
2. **Message Volume**: Send 100+ messages quickly
3. **User Count**: Test with 20+ simultaneous users
4. **Network**: Test on slow connections

## Security Testing

1. **Input Validation**: Test with special characters
2. **XSS Prevention**: Test with script tags
3. **Rate Limiting**: Test rapid message sending
4. **CORS**: Test from different origins

## Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Deployment Testing

1. **Build**: `npm run build`
2. **Start**: `npm run start`
3. **Environment**: Set production variables
4. **SSL**: Test with HTTPS
5. **Domain**: Test with custom domain
