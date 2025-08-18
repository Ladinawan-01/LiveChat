"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  _id: string
  username: string
  email: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  createdAt: Date
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshTokens: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user')
        const storedTokens = localStorage.getItem('tokens')
        
        if (storedUser && storedTokens) {
          setUser(JSON.parse(storedUser))
          setTokens(JSON.parse(storedTokens))
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('tokens')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  // Auto-refresh tokens
  useEffect(() => {
    if (!tokens) return

    const refreshInterval = setInterval(async () => {
      const success = await refreshTokens()
      if (!success) {
        // Token refresh failed, logout user
        await logout()
      }
    }, 14 * 60 * 1000) // Refresh every 14 minutes (tokens expire in 15 minutes)

    return () => clearInterval(refreshInterval)
  }, [tokens])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setTokens(data.tokens)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('tokens', JSON.stringify(data.tokens))
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setTokens(data.tokens)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('tokens', JSON.stringify(data.tokens))
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Registration failed. Please try again.' }
    }
  }

  const logout = async () => {
    try {
      if (tokens?.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setTokens(null)
      localStorage.removeItem('user')
      localStorage.removeItem('tokens')
    }
  }

  const refreshTokens = async (): Promise<boolean> => {
    try {
      if (!tokens?.refreshToken) return false

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      })

      const data = await response.json()

      if (data.success) {
        setTokens(data.tokens)
        localStorage.setItem('tokens', JSON.stringify(data.tokens))
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    login,
    register,
    logout,
    refreshTokens,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
