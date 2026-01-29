import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
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

    // Toggle SOS status (only change the token color, no alerts)
    const newSOSStatus = !tourist.sos

    await tourists.updateOne(
      { _id: new ObjectId(decoded.id) },
      {
        $set: {
          sos: newSOSStatus,
          updatedAt: new Date(),
        },
      },
    )

    console.log(`[v0] Tourist ${decoded.email} toggled SOS status to: ${newSOSStatus}`)

    return NextResponse.json({
      success: true,
      sos: newSOSStatus,
      message: newSOSStatus ? "SOS status activated" : "SOS status deactivated",
    })
  } catch (error) {
    console.error("[v0] SOS toggle error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
