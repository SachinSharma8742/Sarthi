import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { getLocationHistory } from "@/lib/database-operations"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

// GET /api/locations/[userId] - Get location history for a specific user
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.type !== "authority") {
      return NextResponse.json({ success: false, error: "Authority access required" }, { status: 403 })
    }

    const { userId } = params
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "100")

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 })
    }

    const locationHistory = await getLocationHistory(new ObjectId(userId), limit)

    // Convert ObjectId to string for JSON serialization
    const formattedHistory = locationHistory.map((location) => ({
      ...location,
      _id: location._id?.toString(),
      userId: location.userId?.toString(),
    }))

    console.log(
      `[v0] Authority ${decoded.email} accessed location history for user ${userId} - ${formattedHistory.length} records`,
    )

    return NextResponse.json({
      success: true,
      data: formattedHistory,
      count: formattedHistory.length,
      userId,
    })
  } catch (error) {
    console.error("[v0] Fetch location history error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
