"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Pencil, Square, Save, X } from "lucide-react"
import type { Zone } from "@/lib/models"

interface ZoneDrawingToolProps {
  map: any // Mapbox map instance
  onZoneCreated?: (zone: Zone) => void
  onZoneUpdated?: (zone: Zone) => void
  onZoneDeleted?: (zoneId: string) => void
}

export function ZoneDrawingTool({ map, onZoneCreated, onZoneUpdated, onZoneDeleted }: ZoneDrawingToolProps) {
  const [isDrawing, setIsDrawing] = useState(false)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [currentDrawingCoords, setCurrentDrawingCoords] = useState<[number, number][]>([])
  const [drawingPoints, setDrawingPoints] = useState<any[]>([])
  const [tempPolygonAdded, setTempPolygonAdded] = useState(false)

  // Form state
  const [zoneName, setZoneName] = useState("")
  const [zoneType, setZoneType] = useState<"green" | "yellow" | "red">("green")
  const [zoneDescription, setZoneDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createValidPolygonCoords = useCallback((coords: [number, number][]) => {
    if (coords.length < 3) return null

    // Ensure the polygon is closed by checking if first and last points are the same
    const closedCoords = [...coords]
    const firstPoint = coords[0]
    const lastPoint = coords[coords.length - 1]

    // Only add closing point if it's not already closed
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      closedCoords.push(firstPoint)
    }

    return closedCoords
  }, [])

  const startDrawing = useCallback(() => {
    if (!map) return

    setIsDrawing(true)
    setCurrentDrawingCoords([])
    setDrawingPoints([])

    // Change cursor to crosshair
    map.getCanvas().style.cursor = "crosshair"

    // Add click handler for drawing
    const handleMapClick = (e: any) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      setCurrentDrawingCoords((prev) => {
        const newCoords = [...prev, coords]

        // Create visual point marker
        const pointEl = document.createElement("div")
        pointEl.className = "drawing-point"
        pointEl.style.cssText = `
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #3b82f6;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        `

        const mapboxgl = (window as any).mapboxgl
        const marker = new mapboxgl.Marker(pointEl).setLngLat(coords).addTo(map)

        setDrawingPoints((prev) => [...prev, marker])

        // If we have at least 3 points, show the polygon preview
        if (newCoords.length >= 3) {
          updateTempPolygon(newCoords)
        }

        return newCoords
      })
    }

    map.on("click", handleMapClick)

    // Store the handler for cleanup
    map._zoneDrawingHandler = handleMapClick
  }, [map])

  const updateTempPolygon = useCallback(
    (coords: [number, number][]) => {
      if (!map || coords.length < 3) return

      try {
        // Remove existing temp polygon layers and source
        if (tempPolygonAdded) {
          if (map.getLayer("temp-polygon-fill")) {
            map.removeLayer("temp-polygon-fill")
          }
          if (map.getLayer("temp-polygon-line")) {
            map.removeLayer("temp-polygon-line")
          }
          if (map.getSource("temp-polygon")) {
            map.removeSource("temp-polygon")
          }
          setTempPolygonAdded(false)
        }

        // Create properly closed polygon coordinates
        const validCoords = createValidPolygonCoords(coords)
        if (!validCoords) return

        // Create GeoJSON polygon
        const polygonData = {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [validCoords],
          },
          properties: {},
        }

        console.log("[v0] Creating temp polygon with", validCoords.length, "coordinates")

        // Add source
        map.addSource("temp-polygon", {
          type: "geojson",
          data: polygonData,
        })

        // Add fill layer
        map.addLayer({
          id: "temp-polygon-fill",
          type: "fill",
          source: "temp-polygon",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.3,
          },
        })

        // Add line layer
        map.addLayer({
          id: "temp-polygon-line",
          type: "line",
          source: "temp-polygon",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        })

        setTempPolygonAdded(true)
      } catch (error) {
        console.error("[v0] Error updating temp polygon:", error)
        setTempPolygonAdded(false)
      }
    },
    [map, tempPolygonAdded, createValidPolygonCoords],
  )

  const finishDrawing = useCallback(() => {
    if (currentDrawingCoords.length < 3) {
      alert("Please draw at least 3 points to create a zone")
      return
    }

    const validCoords = createValidPolygonCoords(currentDrawingCoords)
    if (!validCoords) {
      alert("Invalid polygon coordinates. Please try drawing again.")
      return
    }

    console.log("[v0] Finishing drawing with", currentDrawingCoords.length, "points")
    setShowZoneForm(true)
  }, [currentDrawingCoords, createValidPolygonCoords])

  const cancelDrawing = useCallback(() => {
    if (!map) return

    setIsDrawing(false)
    setCurrentDrawingCoords([])

    // Reset cursor
    map.getCanvas().style.cursor = ""

    // Remove click handler
    if (map._zoneDrawingHandler) {
      map.off("click", map._zoneDrawingHandler)
      delete map._zoneDrawingHandler
    }

    // Clear drawing points
    drawingPoints.forEach((marker) => {
      try {
        marker.remove()
      } catch (e) {
        console.warn("[v0] Error removing marker:", e)
      }
    })
    setDrawingPoints([])

    // Remove temp polygon
    if (tempPolygonAdded) {
      try {
        if (map.getLayer("temp-polygon-fill")) {
          map.removeLayer("temp-polygon-fill")
        }
        if (map.getLayer("temp-polygon-line")) {
          map.removeLayer("temp-polygon-line")
        }
        if (map.getSource("temp-polygon")) {
          map.removeSource("temp-polygon")
        }
        console.log("[v0] Cleaned up temp polygon layers")
      } catch (e) {
        console.warn("[v0] Error cleaning up temp polygon:", e)
      }
      setTempPolygonAdded(false)
    }
  }, [map, drawingPoints, tempPolygonAdded])

  const handleZoneSubmit = async () => {
    if (!zoneName.trim() || !zoneDescription.trim()) {
      alert("Please fill in all required fields")
      return
    }

    if (currentDrawingCoords.length < 3) {
      alert("Invalid polygon: need at least 3 points")
      return
    }

    setIsSubmitting(true)

    try {
      // Validate and format coordinates
      const validCoords = createValidPolygonCoords(currentDrawingCoords)
      if (!validCoords) {
        alert("Invalid polygon coordinates. Please try drawing again.")
        return
      }

      const zoneData = {
        name: zoneName.trim(),
        type: zoneType,
        description: zoneDescription.trim(),
        coordinates: currentDrawingCoords, // Send original coordinates, API will handle GeoJSON formatting
      }

      console.log("[v0] Submitting zone with", currentDrawingCoords.length, "coordinates")

      const response = await fetch("/api/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(zoneData),
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setZoneName("")
        setZoneType("green")
        setZoneDescription("")
        setShowZoneForm(false)

        // Clean up drawing
        cancelDrawing()

        // Notify parent component
        if (onZoneCreated) {
          onZoneCreated(result.data)
        }

        console.log("[v0] Zone created successfully:", result.data)
      } else {
        alert(`Failed to create zone: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Error creating zone:", error)
      alert("Failed to create zone. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormCancel = () => {
    setShowZoneForm(false)
    setZoneName("")
    setZoneType("green")
    setZoneDescription("")
    cancelDrawing()
  }

  return (
    <>
      {/* Drawing Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {!isDrawing ? (
          <Button onClick={startDrawing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Draw Zone
          </Button>
        ) : (
          <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Square className="h-4 w-4" />
              Drawing Zone
            </div>
            <div className="text-xs text-slate-600">Click on the map to add points</div>
            <Badge variant="outline" className="text-xs">
              {currentDrawingCoords.length} points
            </Badge>
            <div className="flex gap-2">
              <Button
                onClick={finishDrawing}
                disabled={currentDrawingCoords.length < 3}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-3 w-3 mr-1" />
                Finish
              </Button>
              <Button onClick={cancelDrawing} size="sm" variant="outline">
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Zone Creation Form Modal */}
      <Dialog open={showZoneForm} onOpenChange={setShowZoneForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zone-name">Zone Name *</Label>
              <Input
                id="zone-name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Enter zone name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="zone-type">Zone Type *</Label>
              <Select value={zoneType} onValueChange={(value: "green" | "yellow" | "red") => setZoneType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Green Zone (Safe)
                    </div>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Yellow Zone (Caution)
                    </div>
                  </SelectItem>
                  <SelectItem value="red">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Red Zone (Restricted)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="zone-description">Description *</Label>
              <Textarea
                id="zone-description"
                value={zoneDescription}
                onChange={(e) => setZoneDescription(e.target.value)}
                placeholder="Describe this zone and any important information"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={handleFormCancel} variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleZoneSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? "Creating..." : "Create Zone"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
