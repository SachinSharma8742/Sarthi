"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useGeolocation } from "@/hooks/use-geolocation"

export function LocationTracker() {
  const { tourist } = useAuth()
  const { latitude, longitude } = useGeolocation()
  const [isMounted, setIsMounted] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (!tourist || latitude === null || longitude === null || !isMounted) {
      return
    }

    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime

    // Only update if it's been at least 5 seconds since last update
    if (timeSinceLastUpdate < 5000 && lastUpdateTime > 0) {
      return
    }

    const updateLocation = async () => {
      try {
        const token = localStorage.getItem("tourist_token")
        if (!token) return

        const response = await fetch("/api/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            sos: tourist.sos || false,
          }),
        })

        const data = await response.json()
        if (data.success) {
          setLastUpdateTime(now)
          console.log(`[v0] Location updated successfully: ${latitude}, ${longitude}`)
        } else {
          console.error("[v0] Failed to update location:", data.error)
        }
      } catch (error) {
        console.error("[v0] Failed to update location in database:", error)
      }
    }

    updateLocation()
  }, [latitude, longitude, tourist, isMounted, lastUpdateTime])

  useEffect(() => {
    if (!tourist || !isMounted) return

    const interval = setInterval(() => {
      if (latitude !== null && longitude !== null) {
        const updateLocation = async () => {
          try {
            const token = localStorage.getItem("tourist_token")
            if (!token) return

            const response = await fetch("/api/location", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                sos: tourist.sos || false,
              }),
            })

            const data = await response.json()
            if (data.success) {
              console.log(`[v0] Location refreshed: ${latitude}, ${longitude}`)
            }
          } catch (error) {
            console.error("[v0] Failed to refresh location:", error)
          }
        }

        updateLocation()
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [tourist, latitude, longitude, isMounted])

  useEffect(() => {
    if (isMounted && tourist) {
      console.log("[v0] Location tracker active for tourist:", tourist.name)
    }
  }, [tourist, isMounted])

  // This component doesn't render anything visible
  return null
}
