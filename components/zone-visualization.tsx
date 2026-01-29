"use client"

import { useEffect, useCallback, useRef } from "react"
import type { Zone } from "@/lib/models"

interface ZoneVisualizationProps {
  map: any // Mapbox map instance
  zones: Zone[]
  onZoneClick?: (zone: Zone) => void
  showLabels?: boolean
}

export function ZoneVisualization({ map, zones, onZoneClick, showLabels = true }: ZoneVisualizationProps) {
  const addedZonesRef = useRef<Set<string>>(new Set())
  const isUpdatingRef = useRef(false)

  const getZoneColors = useCallback((type: "green" | "yellow" | "red") => {
    switch (type) {
      case "green":
        return {
          fill: "#22c55e",
          fillOpacity: 0.2,
          stroke: "#16a34a",
          strokeWidth: 2,
        }
      case "yellow":
        return {
          fill: "#eab308",
          fillOpacity: 0.2,
          stroke: "#ca8a04",
          strokeWidth: 2,
        }
      case "red":
        return {
          fill: "#ef4444",
          fillOpacity: 0.2,
          stroke: "#dc2626",
          strokeWidth: 2,
        }
      default:
        return {
          fill: "#6b7280",
          fillOpacity: 0.2,
          stroke: "#4b5563",
          strokeWidth: 2,
        }
    }
  }, [])

  const cleanupZone = useCallback(
    (zoneId: string) => {
      if (!map || isUpdatingRef.current) return

      const sourceId = `zone-${zoneId}`
      const fillLayerId = `zone-fill-${zoneId}`
      const lineLayerId = `zone-line-${zoneId}`
      const labelLayerId = `zone-label-${zoneId}`
      const labelBgLayerId = `${labelLayerId}-bg` // Added background layer cleanup
      const labelSource = `${sourceId}-label`

      try {
        // Remove layers first (order matters)
        if (map.getLayer(labelLayerId)) {
          map.removeLayer(labelLayerId)
        }
        if (map.getLayer(labelBgLayerId)) {
          map.removeLayer(labelBgLayerId)
        }
        if (map.getLayer(lineLayerId)) {
          map.removeLayer(lineLayerId)
        }
        if (map.getLayer(fillLayerId)) {
          map.removeLayer(fillLayerId)
        }

        // Then remove sources
        if (map.getSource(labelSource)) {
          map.removeSource(labelSource)
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId)
        }

        addedZonesRef.current.delete(zoneId)
      } catch (error) {
        console.log("[v0] Error cleaning up zone:", error)
      }
    },
    [map],
  )

  const cleanupAllZones = useCallback(() => {
    if (!map || isUpdatingRef.current) return

    Array.from(addedZonesRef.current).forEach((zoneId) => {
      cleanupZone(zoneId)
    })
    addedZonesRef.current.clear()
  }, [map, cleanupZone])

  // Calculate polygon centroid for label placement
  const calculatePolygonCentroid = useCallback((coordinates: [number, number][]): [number, number] => {
    let x = 0
    let y = 0
    const n = coordinates.length

    coordinates.forEach(([lng, lat]) => {
      x += lng
      y += lat
    })

    return [x / n, y / n]
  }, [])

  const addZonesToMap = useCallback(() => {
    if (!map || !zones.length || isUpdatingRef.current) return

    console.log("[v0] Adding zones to map:", zones.length)
    isUpdatingRef.current = true

    try {
      // Clean up existing zones first
      cleanupAllZones()

      // Add zones to map
      zones.forEach((zone) => {
        if (!zone.coordinates || zone.coordinates.length < 3) {
          console.log("[v0] Skipping zone with invalid coordinates:", zone._id)
          return
        }

        const sourceId = `zone-${zone._id}`
        const fillLayerId = `zone-fill-${zone._id}`
        const lineLayerId = `zone-line-${zone._id}`
        const labelLayerId = `zone-label-${zone._id}`
        const labelBgLayerId = `${labelLayerId}-bg` // Added background layer cleanup
        const labelSource = `${sourceId}-label`

        // Double-check sources don't exist
        if (map.getSource(sourceId) || map.getSource(labelSource)) {
          console.log("[v0] Source already exists, skipping:", sourceId)
          return
        }

        // Close the polygon by adding the first point at the end
        const closedCoordinates = [...zone.coordinates, zone.coordinates[0]]
        const colors = getZoneColors(zone.type)

        // Create GeoJSON feature
        const geoJsonFeature = {
          type: "Feature" as const,
          properties: {
            zoneId: zone._id,
            name: zone.name,
            type: zone.type,
            description: zone.description,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [closedCoordinates],
          },
        }

        try {
          // Add main source
          map.addSource(sourceId, {
            type: "geojson",
            data: geoJsonFeature,
          })

          // Add fill layer
          map.addLayer({
            id: fillLayerId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": colors.fill,
              "fill-opacity": colors.fillOpacity,
            },
          })

          // Add line layer
          map.addLayer({
            id: lineLayerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": colors.stroke,
              "line-width": colors.strokeWidth,
              "line-opacity": 0.8,
            },
          })

          if (showLabels) {
            const centroid = calculatePolygonCentroid(zone.coordinates)

            map.addSource(labelSource, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {
                  name: zone.name,
                  type: zone.type,
                },
                geometry: {
                  type: "Point",
                  coordinates: centroid,
                },
              },
            })

            map.addLayer({
              id: labelLayerId,
              type: "symbol",
              source: labelSource,
              minzoom: 14, // Only show labels at zoom level 14 and above
              layout: {
                "text-field": zone.name,
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                "text-size": {
                  base: 1,
                  stops: [
                    [14, 11], // Smaller at lower zoom levels
                    [16, 12], // Standard size at medium zoom
                    [18, 13], // Slightly larger at high zoom
                  ],
                },
                "text-anchor": "center",
                "text-offset": [0, 0],
                "text-padding": 4, // Prevent label overlap
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              },
              paint: {
                "text-color": "#ffffff",
                "text-halo-color": "rgba(0, 0, 0, 0.8)", // Semi-transparent black halo
                "text-halo-width": 1.5,
                "text-opacity": {
                  base: 1,
                  stops: [
                    [14, 0], // Invisible below zoom 14
                    [14.5, 1], // Fade in smoothly
                  ],
                },
              },
            })

            map.addLayer(
              {
                id: labelBgLayerId,
                type: "circle",
                source: labelSource,
                minzoom: 14,
                paint: {
                  "circle-radius": {
                    base: 1,
                    stops: [
                      [14, 20], // Smaller background at lower zoom
                      [16, 25], // Medium background
                      [18, 30], // Larger background at high zoom
                    ],
                  },
                  "circle-color": "rgba(0, 0, 0, 0.5)", // Semi-transparent background
                  "circle-stroke-width": 1,
                  "circle-stroke-color": colors.stroke,
                  "circle-opacity": {
                    base: 1,
                    stops: [
                      [14, 0], // Invisible below zoom 14
                      [14.5, 0.8], // Fade in smoothly
                    ],
                  },
                },
              },
              labelLayerId,
            ) // Insert before the text layer
          }

          // Add click handlers
          map.on("click", fillLayerId, (e: any) => {
            if (onZoneClick) {
              onZoneClick(zone)
            }

            // Show popup with zone information
            const mapboxgl = (window as any).mapboxgl
            if (mapboxgl) {
              new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                  `
                  <div class="p-3 min-w-[200px]">
                    <div class="flex items-center gap-2 mb-2">
                      <div class="w-3 h-3 rounded-full" style="background-color: ${colors.fill}"></div>
                      <h3 class="font-bold text-base text-gray-900">${zone.name}</h3>
                    </div>
                    <div class="space-y-1 text-sm text-gray-600">
                      <p><strong>Type:</strong> ${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} Zone</p>
                      <p><strong>Description:</strong> ${zone.description}</p>
                      ${zone.createdAt ? `<p class="text-xs text-gray-500 mt-2"><strong>Created:</strong> ${new Date(zone.createdAt).toLocaleDateString()}</p>` : ""}
                    </div>
                  </div>
                `,
                )
                .addTo(map)
            }
          })

          // Change cursor on hover
          map.on("mouseenter", fillLayerId, () => {
            map.getCanvas().style.cursor = "pointer"
          })

          map.on("mouseleave", fillLayerId, () => {
            map.getCanvas().style.cursor = ""
          })

          addedZonesRef.current.add(zone._id)
          console.log("[v0] Successfully added zone:", zone._id)
        } catch (error) {
          console.log("[v0] Error adding zone to map:", error)
          // Clean up partial additions
          cleanupZone(zone._id)
        }
      })
    } catch (error) {
      console.log("[v0] Error in addZonesToMap:", error)
    } finally {
      isUpdatingRef.current = false
    }
  }, [map, zones, getZoneColors, onZoneClick, showLabels, cleanupAllZones, cleanupZone, calculatePolygonCentroid])

  useEffect(() => {
    if (!map) return

    const handleStyleLoad = () => {
      console.log("[v0] Map style loaded, adding zones")
      addZonesToMap()
    }

    const handleError = (error: any) => {
      console.log("[v0] Map error:", error)
    }

    try {
      if (map.isStyleLoaded()) {
        addZonesToMap()
      } else {
        map.once("style.load", handleStyleLoad)
        map.on("error", handleError)
      }
    } catch (error) {
      console.log("[v0] Error setting up map listeners:", error)
    }

    return () => {
      try {
        map.off("style.load", handleStyleLoad)
        map.off("error", handleError)
      } catch (error) {
        console.log("[v0] Error removing map listeners:", error)
      }
    }
  }, [map, addZonesToMap])

  useEffect(() => {
    return () => {
      console.log("[v0] Cleaning up zone visualization")
      cleanupAllZones()
    }
  }, [cleanupAllZones])

  return null // This component doesn't render anything visible
}
