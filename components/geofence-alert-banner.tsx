"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AlertTriangle, X } from "lucide-react"

interface Alert {
  _id: string
  userId: string
  type: "SOS" | "GEOFENCE" | "MANUAL"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  location: {
    lat: number
    lng: number
  }
  timestamp: string
  resolved: boolean
  message?: string
  zoneName?: string
  zoneType?: "yellow" | "red"
}

export function GeofenceAlertBanner() {
  const { tourist } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!tourist?._id) return

    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem("tourist_token")
        if (!token) return

        const response = await fetch("/api/alerts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          // Filter for current tourist's GEOFENCE alerts
          const myGeofenceAlerts = data.data.filter(
            (alert: Alert) => alert.userId === tourist._id && alert.type === "GEOFENCE" && !alert.resolved,
          )
          setAlerts(myGeofenceAlerts)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch alerts:", error)
      }
    }

    fetchAlerts()
    // Refresh every 10 seconds
    const interval = setInterval(fetchAlerts, 10000)

    return () => clearInterval(interval)
  }, [tourist?._id])

  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert._id))

  if (visibleAlerts.length === 0) return null

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-600 border-red-700"
      case "HIGH":
        return "bg-red-500 border-red-600"
      case "MEDIUM":
        return "bg-yellow-500 border-yellow-600"
      default:
        return "bg-yellow-400 border-yellow-500"
    }
  }

  const getZoneTypeLabel = (zoneType?: string) => {
    switch (zoneType) {
      case "red":
        return "Restricted Zone"
      case "yellow":
        return "Caution Zone"
      default:
        return "Restricted Area"
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 p-4">
      {visibleAlerts.map((alert) => (
        <div
          key={alert._id}
          className={`${getSeverityStyles(alert.severity)} border-2 rounded-lg shadow-2xl backdrop-blur-sm animate-in slide-in-from-top duration-500`}
        >
          <div className="flex items-start gap-3 p-4">
            <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 text-white">
              <h3 className="font-bold text-lg mb-1">Geofence Breach Alert</h3>
              <p className="text-sm opacity-95 mb-1">
                You have entered a {getZoneTypeLabel(alert.zoneType)}
                {alert.zoneName && `: ${alert.zoneName}`}
              </p>
              <p className="text-xs opacity-90">Please exit this area immediately. Authorities have been notified.</p>
              <p className="text-xs opacity-75 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(alert._id))}
              className="text-white hover:bg-white/20 rounded p-1 transition-colors flex-shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
