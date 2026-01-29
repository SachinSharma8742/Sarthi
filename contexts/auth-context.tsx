"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Tourist } from "@/lib/auth-client"

interface AuthContextType {
  tourist: Omit<Tourist, "password"> | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  toggleSOS: () => Promise<void>
  refreshTourist: () => Promise<void>
  isLoading: boolean
}

interface RegisterData {
  name: string
  email: string
  proofType: "Aadhaar" | "Passport"
  proofNumber: string
  password: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tourist, setTourist] = useState<Omit<Tourist, "password"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem("tourist_token")
    if (token) {
      // Verify token and get tourist data
      fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTourist(data.tourist)
            document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
          } else {
            localStorage.removeItem("tourist_token")
          }
        })
        .catch(() => {
          localStorage.removeItem("tourist_token")
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem("tourist_token", data.token)
        document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        setTourist(data.tourist)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem("tourist_token", data.token)
        document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=strict`
        setTourist(data.tourist)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  const logout = () => {
    localStorage.removeItem("tourist_token")
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    setTourist(null)
  }

  const toggleSOS = async () => {
    if (!tourist) return

    try {
      const token = localStorage.getItem("tourist_token")
      if (!token) return

      // Immediately update local state for instant visual feedback
      const newSOSStatus = !tourist.sos
      setTourist((prev) => (prev ? { ...prev, sos: newSOSStatus } : null))

      const response = await fetch("/api/auth/toggle-sos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        // Confirm the SOS status from server response
        setTourist((prev) => (prev ? { ...prev, sos: data.sos } : null))
        console.log(`[v0] SOS status updated to: ${data.sos}`)
      } else {
        // Revert local state if server request failed
        setTourist((prev) => (prev ? { ...prev, sos: !newSOSStatus } : null))
        console.error("[v0] Failed to toggle SOS:", data.error)
      }
    } catch (error) {
      // Revert local state if request failed
      setTourist((prev) => (prev ? { ...prev, sos: !tourist.sos } : null))
      console.error("Failed to toggle SOS:", error)
    }
  }

  const refreshTourist = async () => {
    const token = localStorage.getItem("tourist_token")
    if (!token) return

    try {
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setTourist(data.tourist)
      }
    } catch (error) {
      console.error("Failed to refresh tourist data:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        tourist,
        login,
        register,
        logout,
        toggleSOS,
        isLoading,
        refreshTourist,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
