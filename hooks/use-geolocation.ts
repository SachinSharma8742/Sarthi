"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  isLoading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: true,
  })

  const { tourist } = useAuth()

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        isLoading: false,
      }))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setState({
          latitude,
          longitude,
          error: null,
          isLoading: false,
        })

        console.log(`[v0] Geolocation updated: ${latitude}, ${longitude}`)
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error: error.message,
          isLoading: false,
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache position for 1 minute
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [tourist])

  return state
}
