"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useGeolocation } from "@/hooks/use-geolocation"

export function SOSButton() {
  const [isActivating, setIsActivating] = useState(false)
  const { tourist, toggleSOS } = useAuth()
  const { latitude, longitude } = useGeolocation()

  const handleSOSClick = async () => {
    if (!tourist) {
      alert("Please log in to use SOS functionality.")
      return
    }

    if (latitude === null || longitude === null) {
      alert("Location not available. Please enable location services.")
      return
    }

    setIsActivating(true)

    try {
      await toggleSOS()

      // Send SOS via API
      const token = localStorage.getItem("tourist_token")
      const response = await fetch("/api/sos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log("[v0] SOS Alert Activated successfully")
        alert("SOS Alert Activated! Emergency services have been notified.")
      } else {
        console.error("[v0] SOS activation failed:", data.error)
        alert("Failed to activate SOS: " + data.error)
        // Revert SOS state if API call failed
        await toggleSOS()
      }
    } catch (error) {
      console.error("SOS activation error:", error)
      alert("Failed to activate SOS. Please try again.")
      // Revert SOS state if there was an error
      try {
        await toggleSOS()
      } catch (revertError) {
        console.error("Failed to revert SOS state:", revertError)
      }
    } finally {
      setIsActivating(false)
    }
  }

  if (!tourist) {
    return null
  }

  const isSOSActive = tourist.sos
  const buttonColor = isSOSActive
    ? "bg-red-700 hover:bg-red-800 border-red-600"
    : "bg-red-600 hover:bg-red-700 border-red-500"

  return (
    <Button
      onClick={handleSOSClick}
      disabled={isActivating}
      className={`${buttonColor} text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 border-2`}
      size="lg"
    >
      <AlertTriangle className={`h-6 w-6 mr-2 ${isActivating || isSOSActive ? "animate-pulse" : ""}`} />
      {isActivating ? "Activating SOS..." : isSOSActive ? "SOS ACTIVE" : "SOS Emergency"}
    </Button>
  )
}
