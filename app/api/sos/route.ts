import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { updateTouristLocation, createAlert } from "@/lib/database-operations"
import { getWebSocketManager } from "@/lib/websocket-server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.type === "authority") {
      return NextResponse.json({ success: false, error: "Invalid tourist token" }, { status: 401 })
    }

    const db = await getDatabase()
    const tourists = db.collection("tourists")

    // Get current tourist data
    const tourist = await tourists.findOne({ _id: new ObjectId(decoded.id) })
    if (!tourist) {
      return NextResponse.json({ success: false, error: "Tourist not found" }, { status: 404 })
    }

    const currentLocation = tourist.lastKnownLocation || { lat: 0, lng: 0 }

    // Update location with SOS status
    await updateTouristLocation(new ObjectId(decoded.id), {
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      sos: true,
    })

    // Create SOS alert
    await createAlert({
      userId: new ObjectId(decoded.id),
      type: "SOS",
      severity: "HIGH",
      location: {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      },
    })

    const wsManager = getWebSocketManager()
    if (wsManager) {
      // This will be handled by the WebSocket client, but we can also broadcast from API
      console.log(`[v0] SOS alert will be broadcast via WebSocket for user ${decoded.id}`)
    }

    console.log(
      `[v0] SOS activated for tourist ${decoded.email} at location: ${currentLocation.lat}, ${currentLocation.lng}`,
    )

    return NextResponse.json({
      success: true,
      sos: true,
      message: "SOS activated - Emergency alert created",
      location: currentLocation,
    })
  } catch (error) {
    console.error("[v0] SOS activation error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
