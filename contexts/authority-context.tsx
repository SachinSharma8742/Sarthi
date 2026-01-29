"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface Authority {
  id: string
  name: string
  email: string
  role: "authority"
  department: string
  permissions: string[]
  createdAt: Date
}

interface AuthorityContextType {
  authority: Authority | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
}

const AuthorityContext = createContext<AuthorityContextType | undefined>(undefined)

export function AuthorityProvider({ children }: { children: ReactNode }) {
  const [authority, setAuthority] = useState<Authority | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)

    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (token) {
      const mockAuthority: Authority = {
        id: "authority_sachin",
        name: "Sachin",
        email: "sachin@saarthi.gov.in",
        role: "authority",
        department: "Tourist Safety",
        permissions: ["view_dashboard", "manage_alerts", "track_tourists"],
        createdAt: new Date(),
      }
      setAuthority(mockAuthority)
    }

    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      if (username === "sachin" && password === "sher") {
        const mockTokenPayload = {
          userId: "authority_sachin",
          id: "authority_sachin",
          email: "sachin@saarthi.gov.in",
          type: "authority",
          role: "authority",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 hours
          iss: "globemap-app",
          aud: ["authority-dashboard"],
        }

        const mockToken = "mock_authority_jwt_" + Date.now()
        document.cookie = `auth-token=${mockToken}; path=/; max-age=${8 * 60 * 60}; secure; samesite=strict`

        localStorage.setItem("authority_token", mockToken)

        const mockAuthority: Authority = {
          id: "authority_sachin",
          name: "Sachin",
          email: "sachin@saarthi.gov.in",
          role: "authority",
          department: "Tourist Safety",
          permissions: ["view_dashboard", "manage_alerts", "track_tourists"],
          createdAt: new Date(),
        }

        setAuthority(mockAuthority)
        return { success: true }
      } else {
        return { success: false, error: "Invalid credentials" }
      }
    } catch (error) {
      return { success: false, error: "Network error occurred" }
    }
  }

  const logout = () => {
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    localStorage.removeItem("authority_token")
    setAuthority(null)
  }

  return (
    <AuthorityContext.Provider
      value={{
        authority,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthorityContext.Provider>
  )
}

export function useAuthority() {
  const context = useContext(AuthorityContext)
  if (context === undefined) {
    throw new Error("useAuthority must be used within an AuthorityProvider")
  }
  return context
}
