import { type NextRequest, NextResponse } from "next/server"
import { getActiveAlerts, resolveAlert, createAlert, deleteAlert } from "@/lib/database-operations"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

// GET /api/alerts - Get all active alerts
export async function GET(request: NextRequest) {
  try {
    const alerts = await getActiveAlerts()

    // Convert ObjectId to string for JSON serialization
    const formattedAlerts = alerts.map((alert) => ({
      ...alert,
      _id: alert._id?.toString(),
      userId: alert.userId?.toString(),
    }))

    console.log(`[v0] Alerts accessed - ${formattedAlerts.length} active alerts`)

    return NextResponse.json({
      success: true,
      data: formattedAlerts,
      count: formattedAlerts.length,
    })
  } catch (error) {
    console.error("[v0] Fetch alerts error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/alerts - Resolve an alert
export async function POST(request: NextRequest) {
  try {
    const { alertId } = await request.json()

    if (!alertId) {
      return NextResponse.json({ success: false, error: "Alert ID is required" }, { status: 400 })
    }

    await resolveAlert(new ObjectId(alertId), new ObjectId("507f1f77bcf86cd799439011"))

    console.log(`[v0] Alert ${alertId} resolved`)

    return NextResponse.json({
      success: true,
      message: "Alert resolved successfully",
    })
  } catch (error) {
    console.error("[v0] Resolve alert error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/alerts - Create a new alert (authority action)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, severity, location } = body as {
      userId?: string
      type?: "SOS" | "GEOFENCE" | "ANOMALY"
      severity?: "LOW" | "MEDIUM" | "HIGH"
      location?: { lat: number; lng: number }
    }

    if (!userId || !type || !severity || !location) {
      return NextResponse.json(
        { success: false, error: "userId, type, severity and location (lat,lng) are required" },
        { status: 400 },
      )
    }

    // Basic validation
    if (
      !["SOS", "GEOFENCE", "ANOMALY"].includes(type) ||
      !["LOW", "MEDIUM", "HIGH"].includes(severity) ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number" ||
      location.lat < -90 ||
      location.lat > 90 ||
      location.lng < -180 ||
      location.lng > 180
    ) {
      return NextResponse.json({ success: false, error: "Invalid alert payload" }, { status: 400 })
    }

    const insertedId = await createAlert({
      userId: new ObjectId(userId),
      type,
      severity,
      location,
    })

    console.log("[v0] Alert created by authority:", insertedId.toString())

    return NextResponse.json({
      success: true,
      message: "Alert created successfully",
      id: insertedId.toString(),
    })
  } catch (error) {
    console.error("[v0] Create alert error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/alerts - Delete an alert (authority action)
export async function DELETE(request: NextRequest) {
  try {
    const { alertId } = await request.json()

    if (!alertId) {
      return NextResponse.json({ success: false, error: "Alert ID is required" }, { status: 400 })
    }

    await deleteAlert(new ObjectId(alertId))

    console.log(`[v0] Alert ${alertId} deleted`)

    return NextResponse.json({
      success: true,
      message: "Alert deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete alert error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
