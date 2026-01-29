import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Zone } from "@/lib/models"
import { ObjectId } from "mongodb"

// GET /api/zones - Get all zones
export async function GET() {
  try {
    const db = await getDatabase()
    const zones = db.collection("zones")

    const allZones = await zones.find({ isActive: true }).sort({ createdAt: -1 }).toArray()

    const formattedZones = allZones.map((zone) => ({
      ...zone,
      _id: zone._id.toString(),
    }))

    console.log(`[v0] Retrieved ${formattedZones.length} zones`)

    return NextResponse.json({
      success: true,
      data: formattedZones,
      count: formattedZones.length,
    })
  } catch (error) {
    console.error("[v0] Get zones error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve zones",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST /api/zones - Create new zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, description, coordinates } = body

    // Validate required fields
    if (!name || !type || !description || !coordinates) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, type, description, coordinates",
        },
        { status: 400 },
      )
    }

    // Validate zone type
    if (!["green", "yellow", "red"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid zone type. Must be green, yellow, or red",
        },
        { status: 400 },
      )
    }

    // Validate coordinates (should be array of [lng, lat] pairs)
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Coordinates must be an array with at least 3 points",
        },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const zones = db.collection("zones")

    const newZone: Omit<Zone, "_id"> = {
      name: name.trim(),
      type,
      description: description.trim(),
      coordinates,
      createdAt: new Date(),
      createdBy: new ObjectId(), // TODO: Get from auth context
      isActive: true,
    }

    const result = await zones.insertOne(newZone)

    const createdZone = {
      ...newZone,
      _id: result.insertedId.toString(),
    }

    console.log(`[v0] Created new zone: ${name} (${type})`)

    return NextResponse.json({
      success: true,
      data: createdZone,
      message: "Zone created successfully",
    })
  } catch (error) {
    console.error("[v0] Create zone error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create zone",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT /api/zones - Update zone
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { _id, name, type, description, coordinates } = body

    if (!_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Zone ID is required",
        },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const zones = db.collection("zones")

    const updateData: Partial<Zone> = {
      updatedAt: new Date(),
      updatedBy: new ObjectId(), // TODO: Get from auth context
    }

    if (name) updateData.name = name.trim()
    if (type) updateData.type = type
    if (description) updateData.description = description.trim()
    if (coordinates) updateData.coordinates = coordinates

    const result = await zones.updateOne({ _id: new ObjectId(_id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Zone not found",
        },
        { status: 404 },
      )
    }

    console.log(`[v0] Updated zone: ${_id}`)

    return NextResponse.json({
      success: true,
      message: "Zone updated successfully",
    })
  } catch (error) {
    console.error("[v0] Update zone error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update zone",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE /api/zones - Delete zone (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get("id")

    if (!zoneId) {
      return NextResponse.json(
        {
          success: false,
          error: "Zone ID is required",
        },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const zones = db.collection("zones")

    const result = await zones.updateOne(
      { _id: new ObjectId(zoneId) },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
          updatedBy: new ObjectId(), // TODO: Get from auth context
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Zone not found",
        },
        { status: 404 },
      )
    }

    console.log(`[v0] Deleted zone: ${zoneId}`)

    return NextResponse.json({
      success: true,
      message: "Zone deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete zone error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete zone",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
