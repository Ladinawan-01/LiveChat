const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

async function testDatabaseConnection() {
  console.log('🔍 Testing MongoDB Connection...')
  console.log('Environment:', process.env.NODE_ENV || 'development')
  console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set')
  
  if (!process.env.MONGODB_URI) {
    console.log('❌ MONGODB_URI not found in environment variables')
    console.log('Please check your .env.local file')
    return
  }

  try {
    console.log('🔄 Connecting to MongoDB...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    console.log('✅ Successfully connected to MongoDB!')
    console.log('📊 Database:', mongoose.connection.name)
    console.log('🌐 Host:', mongoose.connection.host)
    console.log('🔌 Port:', mongoose.connection.port)
    console.log('📈 Ready State:', mongoose.connection.readyState)

    // Test database operations
    console.log('\n🧪 Testing database operations...')
    
    // Test ping
    const pingResult = await mongoose.connection.db.admin().ping()
    console.log('🏓 Ping test:', pingResult.ok === 1 ? '✅ Passed' : '❌ Failed')

    // Test creating a collection
    const testCollection = mongoose.connection.db.collection('test_connection')
    await testCollection.insertOne({ test: true, timestamp: new Date() })
    console.log('📝 Write test: ✅ Passed')

    // Test reading
    const readResult = await testCollection.findOne({ test: true })
    console.log('📖 Read test:', readResult ? '✅ Passed' : '❌ Failed')

    // Clean up
    await testCollection.deleteOne({ test: true })
    console.log('🧹 Cleanup test: ✅ Passed')

    console.log('\n🎉 All database tests passed!')
    console.log('Your MongoDB connection is working perfectly.')

  } catch (error) {
    console.log('❌ Database connection failed:')
    console.log('Error:', error.message)
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: MongoDB is not running')
      console.log('Please start MongoDB or use MongoDB Atlas')
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Solution: Check your username/password in MONGODB_URI')
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Solution: Check your MongoDB URI format')
    }
    
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
      console.log('\n🔌 Connection closed')
    }
    process.exit(0)
  }
}

// Run the test
testDatabaseConnection()
