"use client"

import { useAuth } from "@/contexts/auth-context"
import type { ReactNode } from "react"

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { tourist, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tourist) {
    return fallback || null
  }

  return <>{children}</>
}
