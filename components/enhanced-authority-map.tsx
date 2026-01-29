"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { Tourist, Zone } from "@/lib/models"
import { ZoneVisualization } from "./zone-visualization"
import { ZoneDrawingTool } from "./zone-drawing-tool"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"

interface EnhancedAuthorityMapProps {
  tourists: Tourist[]
  selectedTourist?: Tourist | null
  onTouristClick?: (tourist: Tourist) => void
  showZoneDrawing?: boolean
  onZoneCreated?: (zone: Zone) => void
  onZoneUpdated?: (zone: Zone) => void
  onZoneDeleted?: (zoneId: string) => void
}

export default function EnhancedAuthorityMap({
  tourists,
  selectedTourist,
  onTouristClick,
  showZoneDrawing = true,
  onZoneCreated,
  onZoneUpdated,
  onZoneDeleted,
}: EnhancedAuthorityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersMap = useRef<Map<string, any>>(new Map())
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [zonesLoaded, setZonesLoaded] = useState(false)
  const [showBreachOnly, setShowBreachOnly] = useState(false)
  const [isDetectingBreaches, setIsDetectingBreaches] = useState(false)
  const [mapboxJsReady, setMapboxJsReady] = useState(false)

  const handleTouristClick = useCallback(
    (tourist: Tourist) => {
      if (onTouristClick) {
        onTouristClick(tourist)
      }
    },
    [onTouristClick],
  )

  const runBreachDetection = useCallback(async () => {
    setIsDetectingBreaches(true)
    try {
      const response = await fetch("/api/breach-detection", {
        method: "POST",
      })
      const result = await response.json()

      if (result.success) {
        console.log("[v0] Breach detection completed:", result.data)
      } else {
        console.error("[v0] Breach detection failed:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error running breach detection:", error)
    } finally {
      setIsDetectingBreaches(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (mapboxLoaded && zonesLoaded) {
        runBreachDetection()
      }
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [mapboxLoaded, zonesLoaded, runBreachDetection])

  const filteredTourists = showBreachOnly ? tourists.filter((tourist) => tourist.geoFenceBreached === true) : tourists

  // Fetch zones from API
  const fetchZones = useCallback(async () => {
    try {
      const response = await fetch("/api/zones")
      const result = await response.json()

      if (result.success) {
        setZones(result.data || [])
        console.log(`[v0] Loaded ${result.data?.length || 0} zones`)
      } else {
        console.error("[v0] Failed to fetch zones:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error fetching zones:", error)
    } finally {
      setZonesLoaded(true)
    }
  }, [])

  // Handle zone creation
  const handleZoneCreated = useCallback(
    (newZone: Zone) => {
      setZones((prev) => [newZone, ...prev])
      if (onZoneCreated) {
        onZoneCreated(newZone)
      }
    },
    [onZoneCreated],
  )

  // Ensure Mapbox assets are available (self-contained, no reliance on outside preloads)
  useEffect(() => {
    if (typeof window === "undefined") return
    const win = window as any

    // If already present, we're good
    if (win.mapboxgl) {
      setMapboxJsReady(true)
      return
    }

    // Inject CSS once
    const cssHref = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
    if (!document.querySelector(`link[href="${cssHref}"]`)) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = cssHref
      document.head.appendChild(link)
    }

    // Inject JS (load once, share across components)
    const jsSrc = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"
    const existingScript = document.querySelector(`script[src="${jsSrc}"]`) as HTMLScriptElement | null

    const handleLoad = () => setMapboxJsReady(true)
    const handleError = () => setMapError("Failed to load Mapbox GL JS")

    if (existingScript) {
      // If it’s already loaded, mapboxgl will exist soon; otherwise wait for load
      if (win.mapboxgl) {
        setMapboxJsReady(true)
      } else {
        existingScript.addEventListener("load", handleLoad)
        existingScript.addEventListener("error", handleError)
      }
      return () => {
        existingScript.removeEventListener("load", handleLoad)
        existingScript.removeEventListener("error", handleError)
      }
    } else {
      const script = document.createElement("script")
      script.src = jsSrc
      script.async = true
      script.addEventListener("load", handleLoad)
      script.addEventListener("error", handleError)
      document.head.appendChild(script)

      return () => {
        script.removeEventListener("load", handleLoad)
        script.removeEventListener("error", handleError)
      }
    }
  }, [])

  // Initialize map only after Mapbox JS is ready, and set accessToken here
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    if (!mapboxJsReady) return

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
          transformRequest: (url: string) => {
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
          fetchZones() // Fetch zones after map loads
        })

        map.current.on("error", (e: any) => {
          console.warn("Map error (non-critical):", e.error?.message || e)
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
    return () => clearTimeout(timer)
  }, [mapboxJsReady, fetchZones])

  useEffect(() => {
    if (!map.current || !mapboxLoaded) return

    const getMarkerSize = (zoom: number) => {
      if (zoom <= 4) return 8
      if (zoom <= 6) return 10
      if (zoom <= 8) return 12
      if (zoom <= 10) return 14
      if (zoom <= 12) return 16
      if (zoom <= 14) return 18
      return 20
    }

    const getMarkerColor = (tourist: Tourist) => {
      if (tourist.sos) return "#ef4444" // Red for SOS (highest priority)

      switch (tourist.currentZoneType) {
        case "red":
          return "#dc2626" // Dark red for restricted zones
        case "yellow":
          return "#f59e0b" // Orange for unsafe zones
        case "green":
          return "#3b82f6" // Blue for safe zones
        default:
          return "#3b82f6" // Default blue for no zone
      }
    }

    const getMarkerShadow = (tourist: Tourist) => {
      if (tourist.sos) return "0 0 15px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.3)"

      switch (tourist.currentZoneType) {
        case "red":
          return "0 0 15px rgba(220, 38, 38, 0.6), 0 0 30px rgba(220, 38, 38, 0.3)"
        case "yellow":
          return "0 0 15px rgba(245, 158, 11, 0.6), 0 0 30px rgba(245, 158, 11, 0.3)"
        case "green":
          return "0 2px 8px rgba(59, 130, 246, 0.3)"
        default:
          return "0 2px 8px rgba(59, 130, 246, 0.3)"
      }
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

    const currentTouristIds = new Set(filteredTourists.map((t) => t._id))

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

    filteredTourists.forEach((tourist) => {
      if (!tourist.lat || !tourist.lng || isNaN(tourist.lat) || isNaN(tourist.lng)) {
        return
      }

      const existingMarker = markersMap.current.get(tourist._id)

      if (existingMarker) {
        const element = existingMarker.getElement()
        if (element) {
          element.style.backgroundColor = getMarkerColor(tourist)
          element.style.boxShadow = getMarkerShadow(tourist)

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

        const sosBadge = tourist.sos
          ? '<div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-2"><span class="w-2 h-2 bg-red-500 rounded-full mr-1"></span>SOS Active</div>'
          : ""

        const zoneBadge = tourist.currentZoneType
          ? `<div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tourist.currentZoneType === "red"
            ? "bg-red-100 text-red-800 border border-red-200"
            : tourist.currentZoneType === "yellow"
              ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
              : "bg-green-100 text-green-800 border border-green-200"
          } mb-2">
              <span class="w-2 h-2 ${tourist.currentZoneType === "red"
            ? "bg-red-500"
            : tourist.currentZoneType === "yellow"
              ? "bg-yellow-500"
              : "bg-green-500"
          } rounded-full mr-1"></span>
              ${tourist.currentZoneName} (${tourist.currentZoneType.toUpperCase()})
            </div>`
          : ""

        const breachInfo =
          tourist.geoFenceBreached && tourist.breachTime
            ? `<p class="text-xs text-red-600 mt-2"><strong>Breach Time:</strong> ${new Date(tourist.breachTime).toLocaleString()}</p>`
            : ""

        const popup = existingMarker.getPopup()
        if (popup) {
          popup.setHTML(`
            <div class="p-3 min-w-[200px]">
              ${sosBadge}
              ${zoneBadge}
              <h3 class="font-bold text-base mb-2 text-gray-900">${tourist.name}</h3>
              <div class="space-y-1 text-sm text-gray-600">
                <p><strong>Email:</strong> ${tourist.email}</p>
                <p><strong>Proof Type:</strong> ${tourist.proofType}</p>
                <p><strong>Proof Number:</strong> ${tourist.proofNumber}</p>
                ${tourist.createdAt ? `<p><strong>Created At:</strong> ${new Date(tourist.createdAt).toLocaleDateString()}</p>` : ""}
                ${tourist.timestamp ? `<p class="text-xs text-gray-500 mt-2"><strong>Last Updated:</strong> ${new Date(tourist.timestamp).toLocaleString()}</p>` : ""}
                ${breachInfo}
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
            background-color: ${getMarkerColor(tourist)};
            box-shadow: ${getMarkerShadow(tourist)};
            transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
            display: block;
            position: absolute;
            margin-left: -${markerSize / 2}px;
            margin-top: -${markerSize / 2}px;
          `

          if (selectedTourist?._id === tourist._id) {
            el.style.border = "3px solid #fbbf24"
            el.style.transform = "scale(1.2)"
            el.style.zIndex = "1001"
          }

          const sosBadge = tourist.sos
            ? '<div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-2"><span class="w-2 h-2 bg-red-500 rounded-full mr-1"></span>SOS Active</div>'
            : ""

          const zoneBadge = tourist.currentZoneType
            ? `<div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tourist.currentZoneType === "red"
              ? "bg-red-100 text-red-800 border border-red-200"
              : tourist.currentZoneType === "yellow"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-green-100 text-green-800 border border-green-200"
            } mb-2">
                <span class="w-2 h-2 ${tourist.currentZoneType === "red"
              ? "bg-red-500"
              : tourist.currentZoneType === "yellow"
                ? "bg-yellow-500"
                : "bg-green-500"
            } rounded-full mr-1"></span>
                ${tourist.currentZoneName} (${tourist.currentZoneType.toUpperCase()})
              </div>`
            : ""

          const breachInfo =
            tourist.geoFenceBreached && tourist.breachTime
              ? `<p class="text-xs text-red-600 mt-2"><strong>Breach Time:</strong> ${new Date(tourist.breachTime).toLocaleString()}</p>`
              : ""

          const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
          }).setHTML(`
            <div class="p-3 min-w-[200px]">
              ${sosBadge}
              ${zoneBadge}
              <h3 class="font-bold text-base mb-2 text-gray-900">${tourist.name}</h3>
              <div class="space-y-1 text-sm text-gray-600">
                <p><strong>Email:</strong> ${tourist.email}</p>
                <p><strong>Proof Type:</strong> ${tourist.proofType}</p>
                <p><strong>Proof Number:</strong> ${tourist.proofNumber}</p>
                ${tourist.createdAt ? `<p><strong>Created At:</strong> ${new Date(tourist.createdAt).toLocaleDateString()}</p>` : ""}
                ${tourist.timestamp ? `<p class="text-xs text-gray-500 mt-2"><strong>Last Updated:</strong> ${new Date(tourist.timestamp).toLocaleString()}</p>` : ""}
                ${breachInfo}
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

    const sosTourists = filteredTourists.filter(
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
  }, [filteredTourists, selectedTourist, handleTouristClick, mapboxLoaded])

  useEffect(() => {
    if (!map.current || !mapboxLoaded || !selectedTourist) return

    // Only zoom if tourist has valid coordinates
    if (!selectedTourist.lat || !selectedTourist.lng || isNaN(selectedTourist.lat) || isNaN(selectedTourist.lng)) {
      console.log(`[v0] Cannot zoom to ${selectedTourist.name} - invalid coordinates:`, {
        lat: selectedTourist.lat,
        lng: selectedTourist.lng,
      })
      return
    }

    console.log(
      `[v0] Zooming to selected tourist: ${selectedTourist.name} at ${selectedTourist.lat}, ${selectedTourist.lng}`,
    )

    const lng = Number.parseFloat(selectedTourist.lng.toString())
    const lat = Number.parseFloat(selectedTourist.lat.toString())

    if (isNaN(lng) || isNaN(lat)) {
      console.error(`[v0] Invalid coordinates for ${selectedTourist.name}:`, { lng, lat })
      return
    }

    // Ensure map is ready before flying
    if (map.current.isStyleLoaded && map.current.isStyleLoaded()) {
      // Smooth zoom to tourist location
      map.current.flyTo({
        center: [lng, lat],
        zoom: 16, // Close zoom level for clarity
        duration: 1500, // 1.5 second smooth transition
        essential: true, // This animation is essential for user experience
      })
      console.log(`[v0] Successfully initiated flyTo for ${selectedTourist.name}`)
    } else {
      // If style not loaded, wait for it
      console.log(`[v0] Map style not loaded, waiting for style load event`)
      const onStyleLoad = () => {
        map.current.flyTo({
          center: [lng, lat],
          zoom: 16,
          duration: 1500,
          essential: true,
        })
        console.log(`[v0] Successfully initiated delayed flyTo for ${selectedTourist.name}`)
        map.current.off("styledata", onStyleLoad)
      }
      map.current.on("styledata", onStyleLoad)
    }
  }, [selectedTourist, mapboxLoaded])

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
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-3 z-10">
        <div className="flex items-center space-x-2">
          <Switch id="breach-filter" checked={showBreachOnly} onCheckedChange={setShowBreachOnly} />
          <Label htmlFor="breach-filter" className="text-sm font-medium">
            Show Breach Cases Only
          </Label>
        </div>

        <Button onClick={runBreachDetection} disabled={isDetectingBreaches} size="sm" className="w-full">
          {isDetectingBreaches ? "Detecting..." : "Run Breach Detection"}
        </Button>
      </div>

      {/* Zone Visualization */}
      {mapboxLoaded && zonesLoaded && (
        <ZoneVisualization
          map={map.current}
          zones={zones}
          onZoneClick={(zone) => console.log("[v0] Zone clicked:", zone.name)}
          showLabels={true}
        />
      )}

      {/* Zone Drawing Tool */}
      {mapboxLoaded && showZoneDrawing && (
        <ZoneDrawingTool
          map={map.current}
          onZoneCreated={handleZoneCreated}
          onZoneUpdated={onZoneUpdated}
          onZoneDeleted={onZoneDeleted}
        />
      )}

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
    </div>
  )
}
