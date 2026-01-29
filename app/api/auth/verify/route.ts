import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth-server"
import { ObjectId } from "mongodb"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const db = await getDatabase()

    if (decoded.type === "authority") {
      const authorities = db.collection("authorities")
      const authority = await authorities.findOne({
        _id: new ObjectId(decoded.id),
        isActive: true,
      })

      if (!authority) {
        return NextResponse.json({ success: false, error: "Authority not found or inactive" }, { status: 404 })
      }

      const authorityData = {
        _id: authority._id.toString(),
        name: authority.name,
        email: authority.email,
        role: authority.role,
        permissions: authority.permissions,
        createdAt: authority.createdAt,
        lastLogin: authority.lastLogin,
      }

      return NextResponse.json({
        success: true,
        authority: authorityData,
        type: "authority",
      })
    } else {
      // Tourist verification
      const tourists = db.collection("tourists")
      const tourist = await tourists.findOne({ _id: new ObjectId(decoded.id) })

      if (!tourist) {
        return NextResponse.json({ success: false, error: "Tourist not found" }, { status: 404 })
      }

      const touristData = {
        _id: tourist._id.toString(),
        name: tourist.name,
        email: tourist.email,
        proofType: tourist.proofType,
        proofNumber: tourist.proofNumber,
        createdAt: tourist.createdAt,
        lastKnownLocation: tourist.lastKnownLocation,
      }

      return NextResponse.json({
        success: true,
        tourist: touristData,
        type: "tourist",
      })
    }
  } catch (error) {
    console.error("[v0] Token verification error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
