import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Tourist, Zone } from "@/lib/models"
import {
  createAlert,
  findUnresolvedAlertByUserAndType,
  resolveUnresolvedAlertsByUserAndType,
} from "@/lib/database-operations"

// Point-in-polygon algorithm to check if a point is inside a polygon
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const db = await getDatabase()

    // Get all tourists with location data
    const tourists = await db
      .collection("tourists")
      .find({
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
      })
      .toArray()

    // Get all active zones
    const zones = await db.collection("zones").find({ isActive: true }).toArray()

    console.log(`[v0] Processing breach detection for ${tourists.length} tourists and ${zones.length} zones`)

    let updatedCount = 0
    let createdAlerts = 0
    let resolvedAlerts = 0

    // Process each tourist
    for (const tourist of tourists) {
      const touristPoint: [number, number] = [tourist.lng, tourist.lat]
      let currentZone: Zone | null = null
      let isInAnyZone = false

      // Check against all zones
      for (const zone of zones) {
        if (isPointInPolygon(touristPoint, zone.coordinates)) {
          currentZone = zone
          isInAnyZone = true
          break // Use the first matching zone
        }
      }

      // Determine breach status and update tourist
      let updateData: Partial<Tourist> = {}
      const prevBreached = !!tourist.geoFenceBreached
      let nextBreached = false

      if (isInAnyZone && currentZone) {
        const isBreached = currentZone.type === "yellow" || currentZone.type === "red"
        nextBreached = isBreached

        updateData = {
          geoFenceBreached: isBreached,
          currentZoneType: currentZone.type,
          currentZoneName: currentZone.name,
          breachTime: isBreached ? new Date() : null,
        }

        if (nextBreached && !prevBreached) {
          const existing = await findUnresolvedAlertByUserAndType(tourist._id, "GEOFENCE")
          if (!existing) {
            // Map zone type to severity
            const severity = currentZone.type === "red" ? "HIGH" : "MEDIUM"
            await createAlert({
              userId: tourist._id,
              type: "GEOFENCE",
              severity,
              location: { lat: tourist.lat!, lng: tourist.lng! },
            })
            createdAlerts++
          }
        }
      } else {
        // Not in any zone
        updateData = {
          geoFenceBreached: false,
          currentZoneType: null,
          currentZoneName: null,
          breachTime: null,
        }
        nextBreached = false

        if (!nextBreached && prevBreached) {
          const modified = await resolveUnresolvedAlertsByUserAndType(tourist._id, "GEOFENCE")
          resolvedAlerts += modified
        }
      }

      // Update tourist document
      await db.collection("tourists").updateOne({ _id: tourist._id }, { $set: updateData })
      updatedCount++
    }

    console.log(
      `[v0] Breach detection completed. Updated ${updatedCount} tourists, created ${createdAlerts} alerts, resolved ${resolvedAlerts} alerts`,
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${tourists.length} tourists, updated ${updatedCount} records`,
      data: {
        processedTourists: tourists.length,
        updatedRecords: updatedCount,
        activeZones: zones.length,
        createdAlerts, // include counts for UI/diagnostics
        resolvedAlerts, // include counts for UI/diagnostics
      },
    })
  } catch (error) {
    console.error("[v0] Breach detection error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
