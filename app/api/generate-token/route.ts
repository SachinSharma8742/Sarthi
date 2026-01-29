import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-server"
import { connectToDatabase } from "@/lib/mongodb"
import { randomBytes } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Generate token request received")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[v0] No authorization header found")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      console.log("[v0] Invalid token")
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    // Generate a unique connection token
    const connectionToken = randomBytes(32).toString("hex")

    console.log("[v0] Generated connection token for user:", decoded.email)

    // In a real app, you would store this token in the database
    // associated with the user for validation when the mobile app connects
    const { db } = await connectToDatabase()

    await db.collection("tourists").updateOne(
      { email: decoded.email },
      {
        $set: {
          connectionToken,
          tokenGeneratedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      success: true,
      connectionToken,
    })
  } catch (error) {
    console.error("[v0] Generate token error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
