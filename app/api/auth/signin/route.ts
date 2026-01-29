import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { comparePassword, generateToken } from "@/lib/auth-server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const tourists = db.collection("tourists")

    // Find tourist by email
    const tourist = await tourists.findOne({ email })
    if (!tourist) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await comparePassword(password, tourist.password)
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Generate JWT token
    const touristData = {
      _id: tourist._id.toString(),
      name: tourist.name,
      email: tourist.email,
      proofType: tourist.proofType,
      proofNumber: tourist.proofNumber,
      createdAt: tourist.createdAt,
      lat: tourist.lat,
      lng: tourist.lng,
      timestamp: tourist.timestamp,
      sos: tourist.sos,
    }

    const token = generateToken(touristData)

    return NextResponse.json({
      success: true,
      token,
      tourist: touristData,
    })
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
