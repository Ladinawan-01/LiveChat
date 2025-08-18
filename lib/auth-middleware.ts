import { type NextRequest, NextResponse } from "next/server"
import { extractTokenFromHeader, verifyAccessToken } from "./auth"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    username: string
    email: string
  }
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization')
      const token = extractTokenFromHeader(authHeader || undefined)

      if (!token) {
        return NextResponse.json(
          { success: false, error: "Access token required" },
          { status: 401 }
        )
      }

      // Verify access token
      const payload = verifyAccessToken(token)
      
      if (!payload) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired access token" },
          { status: 401 }
        )
      }

      // Add user to request
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = payload

      // Call the original handler
      return await handler(authenticatedRequest)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      )
    }
  }
}
