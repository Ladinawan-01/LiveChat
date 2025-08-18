import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/database"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check database connection
    const db = await connectDB()
    const dbConnectionTime = Date.now() - startTime
    
    if (!db) {
      return NextResponse.json({
        success: false,
        status: "error",
        message: "Database connection failed",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        database: {
          connected: false,
          connectionTime: dbConnectionTime,
          error: "Database not available"
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        }
      }, { status: 503 })
    }

    // Check if we can perform a simple database operation
    let dbOperationTime = 0
    let dbOperationSuccess = false
    
    try {
      const operationStart = Date.now()
      // Try to get database stats
      if (mongoose.connection.db) {
        const stats = await mongoose.connection.db.admin().ping()
        dbOperationTime = Date.now() - operationStart
        dbOperationSuccess = stats.ok === 1
      }
    } catch (error) {
      console.error("Database operation test failed:", error)
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      status: "healthy",
      message: "All systems operational",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        connected: true,
        connectionTime: dbConnectionTime,
        operationTime: dbOperationTime,
        operationSuccess: dbOperationSuccess,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        readyState: mongoose.connection.readyState,
        readyStateText: getReadyStateText(mongoose.connection.readyState)
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      },
      responseTime: totalTime
    })
  } catch (error) {
    console.error("Health check error:", error)
    
    return NextResponse.json({
      success: false,
      status: "error",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      error: error instanceof Error ? error.message : "Unknown error",
      database: {
        connected: false,
        error: "Connection failed"
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    }, { status: 500 })
  }
}

function getReadyStateText(readyState: number): string {
  switch (readyState) {
    case 0:
      return "disconnected"
    case 1:
      return "connected"
    case 2:
      return "connecting"
    case 3:
      return "disconnecting"
    default:
      return "unknown"
  }
}
