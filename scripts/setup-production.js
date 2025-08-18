#!/usr/bin/env node

/**
 * Production Setup Script for LiveChat
 * This script helps configure the project for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 LiveChat Production Setup\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...');
  fs.copyFileSync(path.join(process.cwd(), 'env.example'), envPath);
  console.log('✅ .env.local created from env.example');
} else {
  console.log('✅ .env.local already exists');
}

console.log('\n📋 Next Steps for Production Deployment:\n');

console.log('1. 🎯 Choose a Socket.IO Service:');
console.log('   • Socket.IO Cloud (Recommended): https://socket.io/cloud');
console.log('   • Pusher: https://pusher.com');
console.log('   • Ably: https://ably.com');
console.log('   • Heroku (separate server): https://heroku.com');

console.log('\n2. 🔧 Update Environment Variables:');
console.log('   Edit .env.local and set:');
console.log('   • NEXT_PUBLIC_SOCKET_URL=your-socket-service-url');
console.log('   • MONGODB_URI=your-mongodb-connection-string');
console.log('   • NEXT_PUBLIC_APP_URL=https://your-domain.com');
console.log('   • NODE_ENV=production');

console.log('\n3. 🚀 Deploy to Vercel:');
console.log('   • Install Vercel CLI: npm i -g vercel');
console.log('   • Deploy: vercel --prod');

console.log('\n4. 🔄 Alternative: Use Socket.IO Cloud');
console.log('   • Sign up at https://socket.io/cloud');
console.log('   • Create a new project');
console.log('   • Get your connection URL');
console.log('   • Update NEXT_PUBLIC_SOCKET_URL in .env.local');

console.log('\n📚 For more details, see DEPLOYMENT.md');

console.log('\n🎉 Setup complete! Happy coding! 🎉');
