import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import User from "@/models/User"
import Message from "@/models/Message"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Testing database connection...")
    
    // Test 1: Basic connection
    const db = await connectDB()
    
    if (!db) {
      return NextResponse.json({
        success: false,
        message: "❌ Database connection failed",
        error: "Database not available",
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    console.log("✅ Database connection successful")

    // Test 2: Check if we can access collections
    try {
      const userCount = await User.countDocuments()
      const messageCount = await Message.countDocuments()
      
      console.log(`📊 User count: ${userCount}, Message count: ${messageCount}`)
      
      return NextResponse.json({
        success: true,
        message: "✅ Database connection and operations successful",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          collections: {
            users: userCount,
            messages: messageCount
          }
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || "development",
          mongodbUri: process.env.MONGODB_URI ? "Set" : "Not set"
        }
      })
    } catch (collectionError) {
      console.error("❌ Collection access failed:", collectionError)
      
      return NextResponse.json({
        success: false,
        message: "❌ Database connected but collection access failed",
        error: collectionError instanceof Error ? collectionError.message : "Unknown error",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          collections: "Failed to access"
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("❌ Database test failed:", error)
    
    return NextResponse.json({
      success: false,
      message: "❌ Database test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        mongodbUri: process.env.MONGODB_URI ? "Set" : "Not set"
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Running database operations test...")
    
    const db = await connectDB()
    
    if (!db) {
      return NextResponse.json({
        success: false,
        message: "❌ Database not available for operations test"
      }, { status: 503 })
    }

    // Test creating a temporary user
    const testUser = new User({
      username: "test-user-" + Date.now(),
      email: "test-" + Date.now() + "@example.com",
      password: "testpassword123",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
      isOnline: false
    })

    const savedUser = await testUser.save()
    console.log("✅ Test user created:", savedUser._id)

    // Test creating a temporary message
    const testMessage = new Message({
      sender: savedUser._id.toString(),
      text: "Test message " + Date.now(),
      timestamp: new Date()
    })

    const savedMessage = await testMessage.save()
    console.log("✅ Test message created:", savedMessage._id)

    // Clean up test data
    await User.findByIdAndDelete(savedUser._id)
    await Message.findByIdAndDelete(savedMessage._id)
    console.log("🧹 Test data cleaned up")

    return NextResponse.json({
      success: true,
      message: "✅ Database operations test successful",
      timestamp: new Date().toISOString(),
      tests: {
        userCreation: "✅ Passed",
        messageCreation: "✅ Passed",
        dataCleanup: "✅ Passed"
      }
    })
    
  } catch (error) {
    console.error("❌ Database operations test failed:", error)
    
    return NextResponse.json({
      success: false,
      message: "❌ Database operations test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
