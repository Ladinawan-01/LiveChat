import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle Socket.IO requests
  if (pathname.startsWith("/api/socket")) {
    // Allow Socket.IO requests to pass through
    return NextResponse.next()
  }

  // Add security headers for API routes
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next()
    
    // Add CORS headers
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
