import { type NextRequest, NextResponse } from "next/server"
import { getAllTouristsWithLocation } from "@/lib/database-operations"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] API /tourists - Starting fetch...")
    const tourists = await getAllTouristsWithLocation()

    // Convert ObjectId to string for JSON serialization
    const formattedTourists = tourists.map((tourist) => ({
      ...tourist,
      _id: tourist._id?.toString(),
    }))

    console.log(`[v0] API /tourists - Successfully fetched ${formattedTourists.length} tourists`)
    console.log(
      "[v0] API /tourists - Sample tourist:",
      formattedTourists[0]
        ? {
            name: formattedTourists[0].name,
            email: formattedTourists[0].email,
            hasCoordinates: !!(formattedTourists[0].lat && formattedTourists[0].lng),
            lat: formattedTourists[0].lat,
            lng: formattedTourists[0].lng,
            sosStatus: formattedTourists[0].sos,
          }
        : "No tourists",
    )

    return NextResponse.json({
      success: true,
      data: formattedTourists,
      count: formattedTourists.length,
      debug: {
        totalTourists: formattedTourists.length,
        touristsWithLocation: formattedTourists.filter((t) => t.lat && t.lng).length,
        sosActiveTourists: formattedTourists.filter((t) => t.sos === true).length,
      },
    })
  } catch (error) {
    console.error("[v0] API /tourists - Fetch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
