import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validation utilities
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: "Username is required" }
  }
  
  if (username.trim().length < 2) {
    return { isValid: false, error: "Username must be at least 2 characters" }
  }
  
  if (username.trim().length > 30) {
    return { isValid: false, error: "Username must be less than 30 characters" }
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    return { isValid: false, error: "Username can only contain letters, numbers, underscores, and hyphens" }
  }
  
  return { isValid: true }
}

export function validateMessage(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: "Message cannot be empty" }
  }
  
  if (content.trim().length > 1000) {
    return { isValid: false, error: "Message must be less than 1000 characters" }
  }
  
  return { isValid: true }
}

// Date formatting utilities
export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function isToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export function isYesterday(date: Date | string): boolean {
  const d = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

// Error handling utilities
export function handleApiError(error: any): { success: false; error: string } {
  console.error('API Error:', error)
  
  if (error.name === 'ValidationError') {
    return { success: false, error: 'Validation error' }
  }
  
  if (error.code === 11000) {
    return { success: false, error: 'Duplicate entry' }
  }
  
  if (error.name === 'MongoError') {
    return { success: false, error: 'Database error' }
  }
  
  return { success: false, error: 'Internal server error' }
}

// Socket.IO utilities
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
