"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { AuthModal } from "@/components/auth-modal"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { LocationTracker } from "@/components/location-tracker"
import { SOSButton } from "@/components/sos-button"
import PlaceSearch from "@/components/place-search"
import { useGeolocation } from "@/hooks/use-geolocation"
import { GeofenceAlertBanner } from "@/components/geofence-alert-banner"

const Globe = dynamic(() => import("@/components/globe"), { ssr: false })
const MapView = dynamic(() => import("@/components/map-view"), { ssr: false })

function GlobeApp() {
  const [showMap, setShowMap] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [mapPosition, setMapPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [isMapPreloaded, setIsMapPreloaded] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number } | null>(null)
  const [lastClickedPosition, setLastClickedPosition] = useState<{ lat: number; lng: number } | null>(null)

  const { tourist } = useAuth()
  const { latitude, longitude, error: geoError, isLoading: geoLoading } = useGeolocation()

  const currentLocation = {
    lat: latitude || selectedPlace?.lat || 26.9124, // Real location > selected place > Jaipur fallback
    lng: longitude || selectedPlace?.lng || 75.7873,
  }

  useEffect(() => {
    if (latitude && longitude && tourist) {
      const updateLocation = async () => {
        try {
          const token = localStorage.getItem("token")
          if (!token) return

          await fetch("/api/location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              sos: false,
            }),
          })
          console.log(`[v0] Location updated in database: ${latitude}, ${longitude}`)
        } catch (error) {
          console.error("[v0] Failed to update location in database:", error)
        }
      }

      updateLocation()
    }
  }, [latitude, longitude, tourist])

  useEffect(() => {
    const preloadMapbox = () => {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      document.head.appendChild(link)

      const script = document.createElement("script")
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
      script.async = true
      document.head.appendChild(script)

      setTimeout(() => {
        setIsMapPreloaded(true)
        console.log("[v0] Map resources preloaded successfully")
      }, 1000)
    }

    preloadMapbox()
  }, [])

  const handlePlaceSelect = (place: { coordinates: { lat: number; lng: number } }) => {
    console.log(`[v0] Place selected for globe: ${place.coordinates.lat}, ${place.coordinates.lng}`)
    setSelectedPlace(place.coordinates)
  }

  const handleGlobeClick = (position: { lat: number; lng: number }) => {
    console.log(`[v0] Globe clicked at: ${position.lat}, ${position.lng}`)
    setMapPosition(position)
    setLastClickedPosition(position)
    setShowMap(true)
  }

  const handleBackToGlobe = () => {
    console.log("[v0] Back to Globe clicked - starting transition")
    setIsTransitioning(true)
    setShowMap(false)
  }

  const handleZoomOutComplete = () => {
    console.log("[v0] Zoom-out animation completed, resetting isTransitioning to false")
    setIsTransitioning(false)
  }

  const handleZoomToMap = (position?: { lat: number; lng: number }) => {
    console.log(`[v0] Zoom button clicked - transitioning to map view`)

    const targetPosition = position || currentLocation

    setMapPosition(targetPosition)
    setLastClickedPosition(targetPosition)
    setShowMap(true)
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {tourist && <GeofenceAlertBanner />}
      {tourist && <LocationTracker />}
      {tourist && <DashboardSidebar />}

      <div className="absolute top-6 right-6 z-20 w-80">
        <PlaceSearch onPlaceSelect={handlePlaceSelect} isVisible={!showMap} />
      </div>

      {tourist && (
        <div className="absolute bottom-6 right-6 z-20">
          <SOSButton />
        </div>
      )}

      <div
        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${!showMap ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
      >
        <Globe
          onGlobeClick={handleGlobeClick}
          shouldZoomOut={isTransitioning}
          zoomOutPosition={lastClickedPosition}
          onZoomOutComplete={handleZoomOutComplete}
          selectedPlace={currentLocation}
          onZoomToMap={handleZoomToMap}
          showZoomButton={!!tourist}
        />
      </div>

      <div
        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${showMap ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
      >
        <MapView
          onBackToGlobe={handleBackToGlobe}
          isTransitioning={isTransitioning}
          isVisible={showMap}
          isPreloaded={isMapPreloaded}
          coordinates={currentLocation}
        />
      </div>

      {!isMapPreloaded && !showMap && (
        <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-sm">Preparing seamless experience...</p>
          </div>
        </div>
      )}

      {geoLoading && (
        <div className="absolute top-6 left-6 z-20">
          <div className="bg-blue-600/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
            📍 Getting your location...
          </div>
        </div>
      )}

      {geoError && (
        <div className="absolute top-6 left-6 z-20">
          <div className="bg-yellow-600/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
            📍 Using fallback location
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AuthGuard fallback={<AuthModal />}>
        <GlobeApp />
      </AuthGuard>
    </AuthProvider>
  )
}
