import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { updateTouristLocation } from "@/lib/database-operations"
import { getWebSocketManager } from "@/lib/websocket-server"
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

    const { lat, lng, sos = false } = await request.json()

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 })
    }

    // Update location in database
    await updateTouristLocation(new ObjectId(decoded.id), { lat, lng, sos })

    const wsManager = getWebSocketManager()
    if (wsManager) {
      // This will be handled by the WebSocket client, but we can also broadcast from API
      console.log(`[v0] Location update will be broadcast via WebSocket for user ${decoded.id}`)
    }

    console.log(`[v0] Location updated for tourist ${decoded.email}: ${lat}, ${lng}, SOS: ${sos}`)

    return NextResponse.json({
      success: true,
      message: "Location updated successfully",
      data: { lat, lng, sos, timestamp: new Date() },
    })
  } catch (error) {
    console.error("[v0] Location update error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
