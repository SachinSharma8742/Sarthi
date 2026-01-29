"use client"

import { useEffect, useState } from "react"

interface UseWebSocketOptions {
  token: string
  onLocationUpdate?: (data: any) => void
  onSOSAlert?: (data: any) => void
  onAlertResolved?: (data: any) => void
  onUserConnected?: (data: any) => void
  onUserDisconnected?: (data: any) => void
}

export function useWebSocket({
  token,
  onLocationUpdate,
  onSOSAlert,
  onAlertResolved,
  onUserConnected,
  onUserDisconnected,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    setIsMounted(true)

    console.log("[v0] WebSocket hook initialized")

    if (token && isMounted) {
      const timeout = setTimeout(() => {
        if (isMounted) {
          setIsConnected(true) // Set to true to enable SOS functionality
          setConnectionError(null)
          console.log("[v0] WebSocket connection simulated (web mode)")
        }
      }, 1000)

      return () => {
        clearTimeout(timeout)
        setIsMounted(false)
      }
    }

    return () => {
      setIsMounted(false)
    }
  }, [token, isMounted])

  const emitLocationUpdate = (lat: number, lng: number, sos: boolean) => {
    console.log(`[v0] Location update: ${lat}, ${lng}, SOS: ${sos}`)
    // In a real implementation, this would send via WebSocket
    // For now, we rely on the API endpoints
  }

  const emitSOSAlert = (lat: number, lng: number) => {
    console.log(`[v0] SOS alert emitted: ${lat}, ${lng}`)
    // In a real implementation, this would send via WebSocket
    // For now, we rely on the API endpoints
  }

  const emitResolveAlert = (alertId: string) => {
    console.log(`[v0] Alert resolved: ${alertId}`)
    // In a real implementation, this would send via WebSocket
  }

  return {
    isConnected,
    connectionError,
    emitLocationUpdate,
    emitSOSAlert,
    emitResolveAlert,
  }
}
