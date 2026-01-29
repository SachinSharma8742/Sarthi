"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Globe from "globe.gl"
import useSWR from "swr"
import type { ApiResponse, Zone } from "@/lib/models"
import { useAuth } from "@/contexts/auth-context"
import { useGeolocation } from "@/hooks/use-geolocation"
import * as THREE from "three"

interface GlobeComponentProps {
  onGlobeClick: (position: { lat: number; lng: number }) => void
  shouldZoomOut?: boolean
  zoomOutPosition?: { lat: number; lng: number } | null
  onZoomOutComplete?: () => void
  selectedPlace?: { lat: number; lng: number } | null
  onZoomToMap?: (position?: { lat: number; lng: number }) => void
  showZoomButton?: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<ApiResponse<Zone[]>>)

export default function GlobeComponent({
  onGlobeClick,
  shouldZoomOut,
  zoomOutPosition,
  onZoomOutComplete,
  selectedPlace,
  onZoomToMap,
  showZoomButton = false,
}: GlobeComponentProps) {
  const globeEl = useRef<HTMLDivElement>(null)
  const globeInstanceRef = useRef<any>(null)
  const globeInstance = useRef<any>(null)
  const [currentAltitude, setCurrentAltitude] = useState(3.5)
  const [isRotating, setIsRotating] = useState(false)
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const [isInMapMode, setIsInMapMode] = useState(false)
  const [isMounted, setIsMounted] = useState(true)
  const isInitializedRef = useRef(false)

  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const targetRotationSpeedRef = useRef<number>(0)
  const rotationSpeedRef = useRef<number>(0)
  const idleTimeoutRef = useRef<number | null>(null)

  const { tourist } = useAuth()
  const { latitude, longitude } = useGeolocation()

  const markerDataRef = useRef([
    {
      lat: selectedPlace?.lat || 0,
      lng: selectedPlace?.lng || 0,
      size: 1.0,
      color: "#3b82f6", // Default blue color
      opacity: 1.0,
      hasBorder: false,
    },
  ])

  const latestStateRef = useRef({
    latitude,
    longitude,
    tourist,
    selectedPlace,
  })
  useEffect(() => {
    latestStateRef.current = { latitude, longitude, tourist, selectedPlace }
  }, [latitude, longitude, tourist, selectedPlace])

  const getLiveTarget = useCallback((): { lat: number; lng: number } | null => {
    if (latitude !== null && longitude !== null) {
      return { lat: latitude, lng: longitude }
    }
    if (tourist?.lastKnownLocation?.lat != null && tourist?.lastKnownLocation?.lng != null) {
      return {
        lat: tourist.lastKnownLocation.lat,
        lng: tourist.lastKnownLocation.lng,
      }
    }
    if (selectedPlace) return selectedPlace
    return null
  }, [latitude, longitude, tourist, selectedPlace])

  useEffect(() => {
    if (tourist && globeInstanceRef.current) {
      const newColor = tourist.sos ? "#ef4444" : "#3b82f6" // Red for SOS, blue for normal
      markerDataRef.current[0].color = newColor

      // Update the globe marker color immediately
      globeInstanceRef.current.pointsData([...markerDataRef.current])
      console.log(`[v0] Globe marker color updated to: ${newColor} (SOS: ${tourist.sos})`)
    }
  }, [tourist]) // Watch specifically for SOS changes

  const safeSetState = useCallback(
    (setter: () => void) => {
      if (isMounted) {
        setter()
      }
    },
    [isMounted],
  )

  const {
    data: zonesResp,
    error: zonesError,
    isLoading: zonesLoading,
  } = useSWR<ApiResponse<Zone[]>>("/api/zones", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: false,
  })
  const zones = zonesResp?.data ?? []

  const addZonesToGlobe = useCallback(() => {
    if (!globeInstanceRef.current || !zones || !Array.isArray(zones)) {
      console.log("[v0] Globe: No zones to add or globe not ready")
      return
    }

    console.log(`[v0] Globe: Processing ${zones.length} zones`)

    try {
      const polygonData = zones
        .map((zone) => {
          if (!zone || !zone.coordinates || !Array.isArray(zone.coordinates) || zone.coordinates.length < 3) {
            return null
          }

          try {
            // Ensure first and last points are the same for valid GeoJSON Polygon
            const closedCoordinates = [...zone.coordinates]
            if (
              closedCoordinates[0][0] !== closedCoordinates[closedCoordinates.length - 1][0] ||
              closedCoordinates[0][1] !== closedCoordinates[closedCoordinates.length - 1][1]
            ) {
              closedCoordinates.push(closedCoordinates[0])
            }

            // Return a valid GeoJSON Feature
            return {
              type: "Feature",
              properties: {
                id: zone._id?.toString(),
                name: zone.name,
                type: zone.type,
                description: zone.description,
                color: zone.type === "green" ? "#22c55e" : zone.type === "yellow" ? "#eab308" : "#ef4444",
                strokeColor: zone.type === "green" ? "#16a34a" : zone.type === "yellow" ? "#ca8a04" : "#dc2626",
              },
              geometry: {
                type: "Polygon",
                coordinates: [closedCoordinates]
              }
            }
          } catch (err) {
            console.error("[v0] Globe: Error formatting zone feature:", err)
            return null
          }
        })
        .filter(Boolean)

      console.log(`[v0] Globe: Setting polygonsData with ${polygonData.length} valid features`)

      globeInstanceRef.current
        .polygonsData(polygonData)
        .polygonGeoJson((d: any) => d) // Default but explicit
        .polygonCapColor((d: any) => d.properties?.color || "#ef4444")
        .polygonSideColor((d: any) => d.properties?.color || "#ef4444")
        .polygonStrokeColor((d: any) => d.properties?.strokeColor || "#dc2626")
        .polygonAltitude(0.01)
        .polygonCapMaterial(
          () =>
            new THREE.MeshLambertMaterial({
              transparent: true,
              opacity: 0.3,
            }),
        )
        .polygonSideMaterial(
          () =>
            new THREE.MeshLambertMaterial({
              transparent: true,
              opacity: 0.2,
            }),
        )
        .onPolygonClick((d: any) => {
          if (!d || !d.properties) return
          const props = d.properties
          console.log(`[v0] Globe: Zone clicked: ${props.name}`)
          alert(`Zone: ${props.name}\nType: ${String(props.type).toUpperCase()}\nDescription: ${props.description}`)
        })
        .onPolygonHover((d: any) => {
          if (globeEl.current) {
            globeEl.current.style.cursor = d ? "pointer" : ""
          }
        })

      console.log("[v0] Globe: Successfully added zones to globe")
    } catch (err) {
      console.error("[v0] Globe: Fatal error in addZonesToGlobe:", err)
    }
  }, [zones])

  useEffect(() => {
    if (selectedPlace && globeInstanceRef.current) {
      console.log(`[v0] Globe: Updating marker position to: ${selectedPlace.lat}, ${selectedPlace.lng}`)

      markerDataRef.current[0].lat = selectedPlace.lat
      markerDataRef.current[0].lng = selectedPlace.lng
      markerDataRef.current[0].color = tourist?.sos ? "#ef4444" : "#3b82f6"
      globeInstanceRef.current.pointsData([...markerDataRef.current])
    }
  }, [selectedPlace, tourist]) // Watch for SOS changes

  useEffect(() => {
    if (selectedPlace && globeInstanceRef.current && isMounted && isInitializedRef.current) {
      console.log(`[v0] Globe: Updating marker position to: ${selectedPlace.lat}, ${selectedPlace.lng}`)

      markerDataRef.current[0].lat = selectedPlace.lat
      markerDataRef.current[0].lng = selectedPlace.lng
      markerDataRef.current[0].color = tourist?.sos ? "#ef4444" : "#3b82f6"
      globeInstanceRef.current.pointsData([...markerDataRef.current])

      globeInstanceRef.current.pointOfView(
        {
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          altitude: 2.0,
        },
        2000,
      )

      setTimeout(() => {
        if (globeInstanceRef.current && isMounted) {
          globeInstanceRef.current.pointOfView(
            {
              lat: selectedPlace.lat,
              lng: selectedPlace.lng,
              altitude: 3.5,
            },
            1500,
          )
        }
      }, 2500)
    }
  }, [selectedPlace, isMounted, tourist])

  const animateRotation = useCallback(
    (currentTime: number) => {
      if (!globeInstanceRef.current || isUserInteracting || isInMapMode || !isMounted) {
        if (isMounted) {
          animationFrameRef.current = requestAnimationFrame(animateRotation)
        }
        return
      }

      const deltaTime = currentTime - lastFrameTimeRef.current
      lastFrameTimeRef.current = currentTime

      const speedDifference = targetRotationSpeedRef.current - rotationSpeedRef.current
      rotationSpeedRef.current += speedDifference * 0.02

      if (Math.abs(rotationSpeedRef.current) > 0.001) {
        const currentPov = globeInstanceRef.current.pointOfView()
        const rotationIncrement = rotationSpeedRef.current * (deltaTime / 16.67)
        const newLng = currentPov.lng + rotationIncrement

        globeInstanceRef.current.pointOfView(
          {
            ...currentPov,
            lng: newLng,
          },
          0,
        )
      }

      if (isMounted) {
        animationFrameRef.current = requestAnimationFrame(animateRotation)
      }
    },
    [isUserInteracting, isInMapMode, isMounted, safeSetState],
  )

  const startRotation = useCallback(() => {
    if (!isMounted) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    safeSetState(() => setIsRotating(true))
    console.log("[v0] Starting smooth rotation")

    targetRotationSpeedRef.current = 0.005
    lastFrameTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animateRotation)
  }, [animateRotation, safeSetState, isMounted])

  const stopRotation = useCallback(() => {
    if (!isMounted) return

    console.log("[v0] Stopping rotation with smooth deceleration")
    targetRotationSpeedRef.current = 0

    setTimeout(() => {
      if (isMounted) {
        safeSetState(() => setIsRotating(false))
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }
    }, 500)
  }, [safeSetState, isMounted])

  const animateZoomOut = () => {
    if (!globeInstanceRef.current) {
      console.log("[v0] ZOOM OUT: Globe instance not available")
      return
    }

    let targetPosition = zoomOutPosition
    if (!targetPosition) {
      const currentPov = globeInstanceRef.current.pointOfView()
      targetPosition = { lat: currentPov.lat, lng: currentPov.lng }
      console.log("[v0] ZOOM OUT: Using current globe position as fallback:", targetPosition)
    }

    console.log("[v0] ZOOM OUT: Starting animation from position:", targetPosition)

    const startAltitude = 0.0001
    const targetAltitude = 2.5
    const duration = 4000
    const startTime = Date.now()

    const targetLat = targetPosition.lat
    const targetLng = targetPosition.lng

    globeInstanceRef.current.pointOfView(
      {
        lat: targetLat,
        lng: targetLng,
        altitude: startAltitude,
      },
      0,
    )

    setCurrentAltitude(startAltitude)
    updateMarkerSize(startAltitude)

    const animateOut = () => {
      if (!globeInstanceRef.current || !isMounted) {
        console.log("[v0] ZOOM OUT: Animation stopped - component unmounted or globe destroyed")
        return
      }

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      const easedProgress = easeInOutCubic(progress)
      const newAltitude = startAltitude + (targetAltitude - startAltitude) * easedProgress

      setCurrentAltitude(newAltitude)
      updateMarkerSize(newAltitude)

      globeInstanceRef.current.pointOfView(
        {
          lat: targetLat,
          lng: targetLng,
          altitude: newAltitude,
        },
        50,
      )

      if (progress < 1) {
        requestAnimationFrame(animateOut)
      } else {
        console.log("[v0] ZOOM OUT: Animation completed - reached target altitude 2.5")
        console.log("[v0] ZOOM OUT: Waiting 1 second before executing completion actions...")
        setTimeout(() => {
          if (!isMounted) return
          console.log("[v0] ZOOM OUT: Executing completion actions")
          safeSetState(() => setIsInMapMode(false))

          if (onZoomOutComplete) {
            onZoomOutComplete()
          }
          console.log("[v0] ZOOM OUT: All completion functions executed")
        }, 1000)
      }
    }

    animateOut()
  }

  const animateZoomInToMap = (target: { lat: number; lng: number }, onComplete?: () => void) => {
    if (!globeInstanceRef.current || !isMounted) {
      console.log("[v0] ZOOM IN: Globe instance not available or unmounted")
      if (onComplete) onComplete()
      return
    }

    // Pause auto-rotation during cinematic zoom-in
    targetRotationSpeedRef.current = 0

    const pov = globeInstanceRef.current.pointOfView()
    const startLat = pov.lat
    const startLng = pov.lng
    const startAltitude = pov.altitude ?? 3.5

    const targetLat = target.lat
    const targetLng = target.lng
    const targetAltitude = 0.0001 // near-surface altitude for a convincing dive-in
    const duration = 4000
    const startTime = Date.now()

    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

    const animateIn = () => {
      if (!globeInstanceRef.current || !isMounted) {
        console.log("[v0] ZOOM IN: Animation stopped - unmounted or globe destroyed")
        return
      }

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)

      // Interpolate lat/lng toward the target for a cinematic pan+zoom
      const newLat = startLat + (targetLat - startLat) * eased
      const newLng = startLng + (targetLng - startLng) * eased
      const newAltitude = startAltitude + (targetAltitude - startAltitude) * eased

      setCurrentAltitude(newAltitude)
      updateMarkerSize(newAltitude)

      globeInstanceRef.current.pointOfView(
        {
          lat: newLat,
          lng: newLng,
          altitude: newAltitude,
        },
        50,
      )

      if (progress < 1) {
        requestAnimationFrame(animateIn)
      } else {
        console.log("[v0] ZOOM IN: Animation completed - reached near-surface altitude")
        if (onComplete) onComplete()
      }
    }

    animateIn()
  }

  const updateMarkerSize = (altitude: number) => {
    const baseSize = 0.8
    const minSize = 0.05

    const sizeMultiplier = Math.max(0.1, altitude / 3.5)
    const calculatedSize = baseSize * sizeMultiplier

    const finalSize = Math.max(minSize, Math.min(baseSize, calculatedSize))

    const maxOpacityAltitude = 2.0
    const minOpacityAltitude = 1.0
    const minOpacity = 0.2

    let opacity = 1.0
    let hasBorder = false
    if (altitude < maxOpacityAltitude) {
      if (altitude <= minOpacityAltitude) {
        opacity = minOpacity
        hasBorder = true
      } else {
        const opacityRange = maxOpacityAltitude - minOpacityAltitude
        const altitudeInRange = altitude - minOpacityAltitude
        const opacityFactor = altitudeInRange / opacityRange
        opacity = minOpacity + (1.0 - minOpacity) * opacityFactor
        hasBorder = opacity < 0.8
      }
    }

    markerDataRef.current[0].size = finalSize
    markerDataRef.current[0].opacity = opacity
    markerDataRef.current[0].hasBorder = hasBorder

    if (globeInstanceRef.current) {
      globeInstanceRef.current
        .pointsData([...markerDataRef.current])
        .pointAltitude(0)
        .pointRadius((d: any) => d.size)
        .pointColor((d: any) => {
          const baseColor = d.color || "#3b82f6"
          const opacity = d.opacity || 1.0
          const r = Number.parseInt(baseColor.slice(1, 3), 16)
          const g = Number.parseInt(baseColor.slice(3, 5), 16)
          const b = Number.parseInt(baseColor.slice(5, 7), 16)

          if (d.hasBorder) {
            return `rgba(${r}, ${g}, ${b}, ${Math.min(opacity + 0.3, 1.0)})`
          }

          return `rgba(${r}, ${g}, ${b}, ${opacity})`
        })
        .pointResolution(32)
    }
  }

  useEffect(() => {
    if (isInitializedRef.current) return

    setIsMounted(true)

    if (!globeEl.current) return

    const globe = Globe()
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .width(window.innerWidth)
      .height(window.innerHeight)
      .pointOfView({
        lat: selectedPlace?.lat || 26.9124,
        lng: selectedPlace?.lng || 75.7873,
        altitude: 3.5,
      })
      .enablePointerInteraction(true)

      ; (globe as any)(globeEl.current)
    globeInstanceRef.current = globe
    globeInstance.current = globe
    isInitializedRef.current = true

    const controls = globe.controls()
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    const onStart = () => {
      console.log("[v0] User interaction started - pausing rotation")
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
        idleTimeoutRef.current = null
      }
      safeSetState(() => setIsUserInteracting(true))
      stopRotation()
    }

    const onEnd = () => {
      console.log("[v0] User interaction ended - will resume after idle")
      safeSetState(() => setIsUserInteracting(false))
      idleTimeoutRef.current = window.setTimeout(() => {
        console.log("[v0] Idle detected - resuming smooth rotation")
        startRotation()
      }, 2000)
    }

    controls.addEventListener("start", onStart)
    controls.addEventListener("end", onEnd)

    if (selectedPlace) {
      markerDataRef.current[0].lat = selectedPlace.lat
      markerDataRef.current[0].lng = selectedPlace.lng
    } else {
      markerDataRef.current[0].lat = 26.9124
      markerDataRef.current[0].lng = 75.7873
    }

    markerDataRef.current[0].color = tourist?.sos ? "#ef4444" : "#3b82f6"

    const handleInitialZoom = () => {
      if (globeInstanceRef.current && isMounted) {
        const targetLat = selectedPlace?.lat || 26.9124
        const targetLng = selectedPlace?.lng || 75.7873

        console.log(`[v0] Starting initial zoom to: ${targetLat}, ${targetLng}`)
        globeInstanceRef.current.pointOfView(
          {
            lat: targetLat,
            lng: targetLng,
            altitude: 1.0,
          },
          1500,
        )

        setTimeout(() => {
          if (globeInstanceRef.current && isMounted) {
            globeInstanceRef.current.pointOfView(
              {
                lat: targetLat,
                lng: targetLng,
                altitude: 3.5,
              },
              1000,
            )
          }
        }, 2000)
      }
    }

    const enableInitialZoom = false
    const autoZoomTimeout = enableInitialZoom ? window.setTimeout(handleInitialZoom, 2000) : undefined

    setTimeout(() => {
      if (isMounted) {
        console.log("[v0] Globe initialized, starting smooth rotation")
        startRotation()
        addZonesToGlobe()
      }
    }, 500)

    return () => {
      console.log("[v0] Globe component unmounting - cleaning up")
      controls.removeEventListener("start", onStart)
      controls.removeEventListener("end", onEnd)

      if (autoZoomTimeout) clearTimeout(autoZoomTimeout)
      setIsMounted(false)
      isInitializedRef.current = false

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
        idleTimeoutRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (globeInstanceRef.current) {
        try {
          globeInstanceRef.current._destructor()
        } catch (error) {
          console.warn("[v0] Globe destructor error:", error)
        }
        globeInstanceRef.current = null
      }

      const globeElement = globeEl.current
      if (globeElement) {
        globeElement.removeEventListener("mousedown", () => { })
        globeElement.removeEventListener("mousemove", () => { })
        globeElement.removeEventListener("mouseup", () => { })
        globeElement.removeEventListener("mouseenter", () => { })
        globeElement.removeEventListener("mouseleave", () => { })
        globeElement.removeEventListener("wheel", () => { })
        // click handler removal remains below
      }

      window.removeEventListener("resize", () => { })
    }
  }, [])

  useEffect(() => {
    if (shouldZoomOut && globeInstanceRef.current && isMounted) {
      console.log(
        "[v0] ZOOM OUT: Effect triggered - shouldZoomOut:",
        shouldZoomOut,
        "zoomOutPosition:",
        zoomOutPosition,
      )
      animateZoomOut()
    }
  }, [shouldZoomOut, zoomOutPosition, isMounted, onZoomOutComplete])

  useEffect(() => {
    if (globeInstanceRef.current && zones.length > 0) {
      console.log(`[v0] Zones data updated, refreshing globe zones: ${zones.length} zones`)
      addZonesToGlobe()
    }
  }, [zones, addZonesToGlobe])

  const handleZoomButtonClick = () => {
    if (!onZoomToMap || !globeInstanceRef.current) return

    const liveTarget = getLiveTarget() ?? { lat: 26.9124, lng: 75.7873 }

    console.log(`[v0] Zoom button clicked - cinematic zoom-in to live target: ${liveTarget.lat}, ${liveTarget.lng}`)

    animateZoomInToMap(liveTarget, () => {
      onZoomToMap(liveTarget)
    })
  }

  return (
    <div className="relative w-full h-screen">
      <div ref={globeEl} className="w-full h-full" />

      {showZoomButton && (
        <div className="absolute bottom-6 left-6 z-10">
          <button
            onClick={handleZoomButtonClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 backdrop-blur-sm border border-blue-500/30"
          >
            🔍 Zoom to Map
          </button>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 text-white text-center">
          <p className="text-sm">
            🌍{" "}
            {showZoomButton
              ? "Search above, click anywhere, or use Zoom button to explore"
              : "Search for places above or click anywhere to explore"}
          </p>
          {zones.length > 0 && <p className="text-xs text-white/70 mt-1">Click colored zones for safety information</p>}
        </div>
      </div>
    </div>
  )
}
