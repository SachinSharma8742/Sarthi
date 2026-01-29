"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import useSWR from "swr"
import type { ApiResponse, Zone } from "@/lib/models"
import { ZoneVisualization } from "@/components/zone-visualization"
import { useAuth } from "@/contexts/auth-context"

interface MapViewProps {
  onBackToGlobe: () => void
  isTransitioning?: boolean
  isVisible?: boolean
  isPreloaded?: boolean
  coordinates?: { lat: number; lng: number }
}

declare global {
  // eslint-disable-next-line no-var
  var __mapSingleton: { map: mapboxgl.Map | null; container: HTMLDivElement | null; styleInjected: boolean } | undefined
}
const __mapSingleton =
  globalThis.__mapSingleton ||
  (globalThis.__mapSingleton = {
    map: null as mapboxgl.Map | null,
    container: null as HTMLDivElement | null,
    styleInjected: false,
  })

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<ApiResponse<Zone[]>>)

export default function MapView({
  onBackToGlobe,
  isTransitioning,
  isVisible = false,
  isPreloaded = false,
  coordinates,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const markerElement = useRef<HTMLDivElement | null>(null)
  const animationFrameId = useRef<number | null>(null)
  const isMarkerActive = useRef(false)
  const markerCoordinates: [number, number] = coordinates ? [coordinates.lng, coordinates.lat] : [75.7873, 26.9124]
  const [isInitialized, setIsInitialized] = useState(false)

  const { tourist } = useAuth()

  const {
    data: zonesResp,
    error: zonesError,
    isLoading: zonesLoading,
  } = useSWR<ApiResponse<Zone[]>>("/api/zones", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  })
  const zones = zonesResp?.data ?? []

  useEffect(() => {
    // Avoid re-initializing on prop changes
    // Prepare a persistent container for the map
    if (!__mapSingleton.container) {
      __mapSingleton.container = document.createElement("div")
      __mapSingleton.container.style.width = "100%"
      __mapSingleton.container.style.height = "100%"
      __mapSingleton.container.style.willChange = "transform"
      __mapSingleton.container.style.contain = "layout size style"
      __mapSingleton.container.style.display = "none"
    }

    // Attach the singleton container into this component's DOM
    if (mapContainer.current && __mapSingleton.container.parentElement !== mapContainer.current) {
      mapContainer.current.appendChild(__mapSingleton.container)
    }
    // Make sure it's visible while mounted (visibility can still be toggled by isVisible below)
    __mapSingleton.container!.style.display = "block"

    // Initialize the map only once
    if (!__mapSingleton.map) {
      console.log("[v0] Bootstrapping persistent Mapbox instance (one-time init)")
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

      __mapSingleton.map = new mapboxgl.Map({
        container: __mapSingleton.container!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: markerCoordinates,
        zoom: 15.5,
        pitch: 45,
        bearing: 0,
        antialias: false, // Disable for better performance
        preserveDrawingBuffer: false,
        refreshExpiredTiles: false,
        maxTileCacheSize: 50,
        transformRequest: (url) => {
          if (url.includes("events.mapbox.com")) return { url: "" }
          return { url }
        },
        collectResourceTiming: false,
        trackResize: false,
      })

      __mapSingleton.map.addControl(new mapboxgl.NavigationControl(), "top-right")

      if (!__mapSingleton.styleInjected) {
        const style = document.createElement("style")
        style.textContent = `
          .mapboxgl-ctrl-attrib a {
            color: rgba(255, 255, 255, 0.8) !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
          }
          .mapboxgl-ctrl-attrib a:hover { color: rgba(255, 255, 255, 1) !important; }
          .mapboxgl-ctrl-attrib {
            background-color: rgba(0, 0, 0, 0.6) !important;
            backdrop-filter: blur(4px) !important;
          }
        `
        document.head.appendChild(style)
        __mapSingleton.styleInjected = true
      }

      __mapSingleton.map.on("style.load", () => {
        console.log("[v0] Map style loaded - creating marker immediately...")
        createMarkerElement()
        startMarkerUpdates()
      })

      __mapSingleton.map.on("load", () => {
        console.log("[v0] Map fully loaded and ready")
        setMapLoaded(true)
        setIsInitialized(true)

        if (!markerElement.current) createMarkerElement()
        if (!isMarkerActive.current) startMarkerUpdates()

        const isJaipur = coordinates?.lat === 26.9124 && coordinates?.lng === 75.7873
        if (isJaipur) {
          const jaipurCityBoundary = {
            id: "jaipur-boundary",
            type: "boundary",
            coordinates: [
              [
                [75.7273, 26.8624],
                [75.8473, 26.8624],
                [75.8473, 26.9624],
                [75.7273, 26.9624],
                [75.7273, 26.8624],
              ],
            ],
            name: "Jaipur City Boundary",
          }

          __mapSingleton.map!.addSource("jaipur-boundary-source", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: { name: jaipurCityBoundary.name, type: jaipurCityBoundary.type },
              geometry: { type: "Polygon", coordinates: jaipurCityBoundary.coordinates },
            },
          })

          __mapSingleton.map!.addLayer({
            id: "jaipur-boundary-layer",
            type: "line",
            source: "jaipur-boundary-source",
            paint: { "line-color": "#ff6b6b", "line-width": 3, "line-dasharray": [2, 2] },
          })
        }

        // Add dynamic zones from /api/zones (runs once; we deliberately avoid re-adding to prevent flicker)
        zones.forEach((zone) => {
          const sourceId = `${zone.id}-source`
          const layerId = `${zone.id}-layer`

          if (!__mapSingleton.map!.getSource(sourceId)) {
            __mapSingleton.map!.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: { name: zone.name, type: zone.type },
                geometry: { type: "Polygon", coordinates: zone.coordinates },
              },
            })
          }

          if (!__mapSingleton.map!.getLayer(layerId)) {
            __mapSingleton.map!.addLayer({
              id: layerId,
              type: "fill",
              source: sourceId,
              paint: { "fill-color": zone.type === "safe" ? "#10b981" : "#ef4444", "fill-opacity": 0.3 },
            })
          }

          if (!__mapSingleton.map!.getLayer(`${layerId}-border`)) {
            __mapSingleton.map!.addLayer({
              id: `${layerId}-border`,
              type: "line",
              source: sourceId,
              paint: { "line-color": zone.type === "safe" ? "#059669" : "#dc2626", "line-width": 2 },
            })
          }

          __mapSingleton.map!.on("click", layerId, (e) => {
            const properties = e.features![0].properties
            const zone = zones.find((z) => z.name === properties!.name)
            const popupContent =
              zone?.type === "safe"
                ? `
                  <div class="p-3 max-w-xs">
                    <h3 class="font-bold text-sm text-green-700 mb-2">${properties!.name}</h3>
                    <p class="text-xs text-gray-600 mb-2">${zone.description}</p>
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs font-medium">Safety Level:</span>
                      <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">${zone.safetyLevel}</span>
                    </div>
                    <p class="text-xs text-green-600 font-medium">✅ Safe Zone - Recommended for travel</p>
                  </div>
                `
                : `
                  <div class="p-3 max-w-xs">
                    <h3 class="font-bold text-sm text-red-700 mb-2">${properties!.name}</h3>
                    <p class="text-xs text-gray-600 mb-2">${zone?.description}</p>
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs font-medium">Risk Level:</span>
                      <span class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">${zone?.riskLevel}</span>
                    </div>
                    ${zone?.hazards
                  ? `
                      <div class="mb-2">
                        <span class="text-xs font-medium">Hazards:</span>
                        <ul class="text-xs text-gray-600 mt-1">
                          ${zone.hazards.map((hazard) => `<li>• ${hazard}</li>`).join("")}
                        </ul>
                      </div>
                    `
                  : ""
                }
                    <p class="text-xs text-red-600 font-medium">⚠️ Unsafe Zone - Exercise caution</p>
                  </div>
                `
            new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(popupContent).addTo(__mapSingleton.map!)
          })

          __mapSingleton.map!.on("mouseenter", layerId, () => {
            __mapSingleton.map!.getCanvas().style.cursor = "pointer"
          })
          __mapSingleton.map!.on("mouseleave", layerId, () => {
            __mapSingleton.map!.getCanvas().style.cursor = ""
          })
        })
      })
    } else {
      // Map already exists; mark flags and resume marker updates
      setMapLoaded(true)
      setIsInitialized(true)
      if (!isMarkerActive.current) startMarkerUpdates()
    }

    // Keep local ref in sync with singleton
    map.current = __mapSingleton.map

    return () => {
      console.log("[v0] Detaching persistent map (not destroying)")
      // Stop marker updates while hidden to save resources
      stopMarkerUpdates()

      // Hide and park the map container to avoid React unmount removing it
      if (__mapSingleton.container) {
        __mapSingleton.container.style.display = "none"
        document.body.appendChild(__mapSingleton.container)
      }

      setIsInitialized(false)
      setMapLoaded(false)

      // NOTE: We intentionally DO NOT remove the map to persist it across view switches
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once; persistence is handled via the singleton

  useEffect(() => {
    if (!__mapSingleton.container) return
    __mapSingleton.container.style.display = isVisible ? "block" : "none"
    if (isVisible && __mapSingleton.map && coordinates) {
      __mapSingleton.map.easeTo({
        center: markerCoordinates,
        duration: 300,
        essential: true,
      })
    }
  }, [isVisible, coordinates])

  const stopMarkerUpdates = () => {
    console.log("[v0] Stopping marker updates...")
    isMarkerActive.current = false

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
  }

  const startMarkerUpdates = () => {
    if (isMarkerActive.current || !map.current || !markerElement.current) return

    console.log("[v0] Starting real-time marker updates...")
    isMarkerActive.current = true
    updateMarkerRealTime()
  }

  const updateMarkerRealTime = () => {
    if (!map.current || !markerElement.current || !isMarkerActive.current) {
      return
    }

    try {
      const screenPoint = map.current.project(markerCoordinates)

      const currentZoom = map.current.getZoom()
      const altitudeThreshold = 16 // Start reducing size after this zoom level
      let finalScale = 1.0

      if (currentZoom > altitudeThreshold) {
        // Reduce marker size as we zoom in further
        const zoomDifference = currentZoom - altitudeThreshold
        finalScale = Math.max(0.3, 1.0 - zoomDifference * 0.15) // Minimum scale of 0.3
      }

      finalScale = Math.min(finalScale, 0.5)

      markerElement.current.style.transform = `translate3d(${screenPoint.x}px, ${screenPoint.y}px, 0) translate(-50%, -100%) scale(${finalScale})`

      animationFrameId.current = requestAnimationFrame(updateMarkerRealTime)
    } catch (error) {
      console.error("[v0] Marker update error:", error)
      animationFrameId.current = requestAnimationFrame(updateMarkerRealTime)
    }
  }

  const createMarkerElement = () => {
    if (!mapContainer.current || markerElement.current) return

    console.log("[v0] Creating new marker element...")

    markerElement.current = document.createElement("div")
    markerElement.current.className = "google-maps-marker"

    const markerColor = tourist?.sos ? "#ef4444" : "#1e40af" // Red for SOS, blue for normal

    markerElement.current.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 40px;
      height: 40px;
      background: ${markerColor};
      border: 3px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform-origin: center bottom;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: filter 0.2s ease, background-color 0.3s ease;
      z-index: 1000;
      pointer-events: auto;
      will-change: transform;
    `

    mapContainer.current.appendChild(markerElement.current)

    markerElement.current.addEventListener("click", (e) => {
      e.stopPropagation()
      if (map.current) {
        new mapboxgl.Popup({ closeOnClick: true })
          .setLngLat(markerCoordinates)
          .setHTML(`
            <div class="p-3">
              <h3 class="font-bold text-sm mb-1">Your Location</h3>
              <p class="text-xs text-gray-600">${coordinates && (coordinates.lat !== 26.9124 || coordinates.lng !== 75.7873)
              ? "Current GPS Location"
              : "Jaipur, Rajasthan, India (Fallback)"
            }</p>
              <p class="text-xs text-gray-500 mt-1">${coordinates?.lat.toFixed(4) || "26.9124"}°N, ${coordinates?.lng.toFixed(4) || "75.7873"}°E</p>
              ${tourist?.sos ? '<p class="text-xs text-red-600 font-medium mt-2">🚨 SOS ACTIVE</p>' : ""}
            </div>
          `)
          .addTo(map.current)
      }
    })

    markerElement.current.addEventListener("mouseenter", () => {
      if (markerElement.current) {
        markerElement.current.style.filter = "brightness(1.2) saturate(1.1)"
      }
    })

    markerElement.current.addEventListener("mouseleave", () => {
      if (markerElement.current) {
        markerElement.current.style.filter = "brightness(1) saturate(1)"
      }
    })

    console.log("[v0] Marker element created and configured")
  }

  return (
    <div className={`relative w-full h-screen`}>
      <div ref={mapContainer} className="w-full h-full" />

      {mapLoaded && <ZoneVisualization map={map.current} zones={zones} showLabels />}

      <div className="absolute top-6 left-6 z-10">
        <Button
          onClick={onBackToGlobe}
          variant="secondary"
          size="sm"
          className="bg-black/50 backdrop-blur-sm text-white border-white/20 hover:bg-black/70"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Globe
        </Button>
      </div>

      <div className="absolute top-6 right-6 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white min-w-[200px]">
          <h3 className="text-lg font-bold mb-3">Safety Zones</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#22c55e" }}></div>
              <div>
                <span className="text-sm font-medium">Green (Safer)</span>
                <div className="text-xs text-white/80">{zones.filter((z) => z.type === "green").length} areas</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#eab308" }}></div>
              <div>
                <span className="text-sm font-medium">Yellow (Caution)</span>
                <div className="text-xs text-white/80">{zones.filter((z) => z.type === "yellow").length} areas</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ef4444" }}></div>
              <div>
                <span className="text-sm font-medium">Red (Unsafe)</span>
                <div className="text-xs text-white/80">{zones.filter((z) => z.type === "red").length} areas</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-xs text-white/70">Tap zones for details</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
          <h3 className="text-sm font-bold mb-1">Current Location</h3>
          <p className="text-xs text-white/80">
            {coordinates && (coordinates.lat !== 26.9124 || coordinates.lng !== 75.7873)
              ? "Live GPS Location"
              : "Jaipur, Rajasthan, India (Fallback)"}
            {tourist?.sos && <span className="text-red-400 ml-2 font-bold animate-pulse">(SOS ACTIVE)</span>}
          </p>
          <p className="text-xs text-white/60 mt-1">
            {coordinates ? `${coordinates.lat.toFixed(4)}°N, ${coordinates.lng.toFixed(4)}°E` : "26.9124°N, 75.7873°E"}
          </p>
        </div>
      </div>

      {mapLoaded && zones.map((zone) => <ZoneVisualization key={zone.id} map={map.current!} zone={zone} />)}
    </div>
  )
}
