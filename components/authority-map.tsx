"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { Tourist } from "@/lib/models"

interface AuthorityMapProps {
  tourists: Tourist[]
  selectedTourist?: Tourist | null
  onTouristClick?: (tourist: Tourist) => void
}

export default function AuthorityMap({ tourists, selectedTourist, onTouristClick }: AuthorityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersMap = useRef<Map<string, any>>(new Map())
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const handleTouristClick = useCallback(
    (tourist: Tourist) => {
      if (onTouristClick) {
        onTouristClick(tourist)
      }
    },
    [onTouristClick],
  )

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initializeMap = () => {
      try {
        const mapboxgl = (window as any).mapboxgl

        if (!mapboxgl) {
          setMapError("Mapbox GL JS not loaded")
          return
        }

        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [77.209, 28.6139], // Delhi, India
          zoom: 5,
          transformRequest: (url: string, resourceType: string) => {
            if (
              url.includes("events.mapbox.com") ||
              url.includes("api.mapbox.com/events") ||
              url.includes("api.mapbox.com/v1/events")
            ) {
              return { url: "" }
            }
            return { url }
          },
          collectResourceTiming: false,
          trackResize: false,
        })

        map.current.addControl(new mapboxgl.NavigationControl())

        map.current.on("load", () => {
          setMapboxLoaded(true)
          setMapError(null)
        })

        map.current.on("error", (e: any) => {
          console.warn("Map error (non-critical):", e.error?.message || e)
          // Don't set error state for telemetry/events errors
          if (!e.error?.message?.includes("events")) {
            setMapError(e.error?.message || "Map initialization error")
          }
        })
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setMapError(error instanceof Error ? error.message : "Unknown map error")
      }
    }

    const timer = setTimeout(initializeMap, 100)

    return () => {
      clearTimeout(timer)
      if (map.current) {
        try {
          map.current.remove()
        } catch (e) {
          console.warn("Error removing map:", e)
        }
        map.current = null
        setMapboxLoaded(false)
      }
    }
  }, []) // Keep empty - map should only initialize once

  useEffect(() => {
    if (!map.current || !mapboxLoaded) return

    const getMarkerSize = (zoom: number) => {
      if (zoom <= 4) return 8 // Slightly larger for world view visibility
      if (zoom <= 6) return 10 // Small for country view
      if (zoom <= 8) return 12 // Medium-small for region view
      if (zoom <= 10) return 14 // Medium for city view
      if (zoom <= 12) return 16 // Medium-large for district view
      if (zoom <= 14) return 18 // Large for street view
      return 20 // Maximum 20px for very close zoom
    }

    const updateMarkerSizes = () => {
      const currentZoom = map.current.getZoom()
      const size = getMarkerSize(currentZoom)

      markersMap.current.forEach((marker) => {
        const element = marker.getElement()
        if (element) {
          element.style.width = `${size}px`
          element.style.height = `${size}px`
          element.style.marginLeft = `-${size / 2}px`
          element.style.marginTop = `-${size / 2}px`
        }
      })
    }

    const currentTouristIds = new Set(tourists.map((t) => t._id))

    markersMap.current.forEach((marker, touristId) => {
      if (!currentTouristIds.has(touristId)) {
        try {
          marker.remove()
          markersMap.current.delete(touristId)
        } catch (e) {
          console.warn("Error removing marker:", e)
        }
      }
    })

    tourists.forEach((tourist) => {
      if (!tourist.lat || !tourist.lng || isNaN(tourist.lat) || isNaN(tourist.lng)) {
        return
      }

      const existingMarker = markersMap.current.get(tourist._id)

      if (existingMarker) {
        const element = existingMarker.getElement()
        if (element) {
          // Update color based on SOS status - blue for normal, red for SOS
          element.style.backgroundColor = tourist.sos ? "#ef4444" : "#3b82f6"
          element.style.boxShadow = tourist.sos
            ? "0 0 15px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.3)"
            : "0 2px 8px rgba(59, 130, 246, 0.3)"

          element.style.animation = "none"

          if (selectedTourist?._id === tourist._id) {
            element.style.border = "3px solid #fbbf24"
            element.style.transform = "scale(1.2)"
            element.style.zIndex = "1001"
          } else {
            element.style.border = "2px solid white"
            element.style.transform = "scale(1)"
            element.style.zIndex = "auto"
          }
        }

        const lng = Number.parseFloat(tourist.lng.toString())
        const lat = Number.parseFloat(tourist.lat.toString())
        existingMarker.setLngLat([lng, lat])

        // Update popup content
        const sosBadge = tourist.sos
          ? '<div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-2"><span class="w-2 h-2 bg-red-500 rounded-full mr-1"></span>SOS Active</div>'
          : ""

        const popup = existingMarker.getPopup()
        if (popup) {
          popup.setHTML(`
            <div class="p-3 min-w-[200px]">
              ${sosBadge}
              <h3 class="font-bold text-base mb-2 text-gray-900">${tourist.name}</h3>
              <div class="space-y-1 text-sm text-gray-600">
                <p><strong>Email:</strong> ${tourist.email}</p>
                <p><strong>Proof Type:</strong> ${tourist.proofType}</p>
                <p><strong>Proof Number:</strong> ${tourist.proofNumber}</p>
                ${tourist.createdAt ? `<p><strong>Created At:</strong> ${new Date(tourist.createdAt).toLocaleDateString()}</p>` : ""}
                ${tourist.timestamp ? `<p class="text-xs text-gray-500 mt-2"><strong>Last Updated:</strong> ${new Date(tourist.timestamp).toLocaleString()}</p>` : ""}
              </div>
            </div>
          `)
        }
      } else {
        try {
          const mapboxgl = (window as any).mapboxgl
          const currentZoom = map.current.getZoom()
          const markerSize = getMarkerSize(currentZoom)

          const el = document.createElement("div")
          el.className = "tourist-marker"

          el.style.cssText = `
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: 2px solid white;
            cursor: pointer;
            background-color: ${tourist.sos ? "#ef4444" : "#3b82f6"};
            box-shadow: ${tourist.sos
              ? "0 0 15px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.3)"
              : "0 2px 8px rgba(59, 130, 246, 0.3)"
            };
            transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
            display: block;
            position: absolute;
            margin-left: -${markerSize / 2}px;
            margin-top: -${markerSize / 2}px;
          `

          // No animation applied to keep marker stable

          if (selectedTourist?._id === tourist._id) {
            el.style.border = "3px solid #fbbf24"
            el.style.transform = "scale(1.2)"
            el.style.zIndex = "1001"
          }

          const sosBadge = tourist.sos
            ? '<div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-2"><span class="w-2 h-2 bg-red-500 rounded-full mr-1"></span>SOS Active</div>'
            : ""

          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
          }).setHTML(`
            <div class="p-3 min-w-[200px]">
              ${sosBadge}
              <h3 class="font-bold text-base mb-2 text-gray-900">${tourist.name}</h3>
              <div class="space-y-1 text-sm text-gray-600">
                <p><strong>Email:</strong> ${tourist.email}</p>
                <p><strong>Proof Type:</strong> ${tourist.proofType}</p>
                <p><strong>Proof Number:</strong> ${tourist.proofNumber}</p>
                ${tourist.createdAt ? `<p><strong>Created At:</strong> ${new Date(tourist.createdAt).toLocaleDateString()}</p>` : ""}
                ${tourist.timestamp ? `<p class="text-xs text-gray-500 mt-2"><strong>Last Updated:</strong> ${new Date(tourist.timestamp).toLocaleString()}</p>` : ""}
              </div>
            </div>
          `)

          const lng = Number.parseFloat(tourist.lng.toString())
          const lat = Number.parseFloat(tourist.lat.toString())

          const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).setPopup(popup).addTo(map.current)

          el.addEventListener("click", () => handleTouristClick(tourist))

          markersMap.current.set(tourist._id, marker)
        } catch (error) {
          console.warn("Error creating marker:", error)
        }
      }
    })

    const sosTourists = tourists.filter(
      (tourist) => tourist.sos && tourist.lat && tourist.lng && !isNaN(tourist.lat) && !isNaN(tourist.lng),
    )

    if (sosTourists.length > 0) {
      try {
        const mapboxgl = (window as any).mapboxgl
        const bounds = new mapboxgl.LngLatBounds()

        sosTourists.forEach((tourist) => {
          bounds.extend([Number.parseFloat(tourist.lng.toString()), Number.parseFloat(tourist.lat.toString())])
        })

        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
          duration: 1000,
        })
      } catch (error) {
        console.warn("Error fitting bounds to SOS tourists:", error)
      }
    }

    const handleZoom = () => {
      updateMarkerSizes()
    }

    map.current.on("zoom", handleZoom)

    return () => {
      if (map.current) {
        map.current.off("zoom", handleZoom)
      }
    }
  }, [tourists, selectedTourist, handleTouristClick, mapboxLoaded])

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-sm text-red-400">Map Error: {mapError}</p>
          <p className="text-xs text-slate-400 mt-2">Using demo mode without map</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      {!mapboxLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes pulse-sos {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }
        .tourist-marker:hover {
          transform: scale(1.1) !important;
        }
        .tourist-marker {
          transition: transform 0.2s ease-in-out !important;
        }
      `}</style>
    </>
  )
}
