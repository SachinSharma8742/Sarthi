import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { hashPassword, generateToken } from "@/lib/auth-server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Signup API called")

    let body
    try {
      body = await request.json()
      console.log("[v0] Request body parsed successfully")
    } catch (error) {
      console.error("[v0] Failed to parse request body:", error)
      return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { name, email, proofType, proofNumber, password } = body

    // Validate required fields
    if (!name || !email || !proofType || !proofNumber || !password) {
      console.log("[v0] Missing required fields:", {
        name: !!name,
        email: !!email,
        proofType: !!proofType,
        proofNumber: !!proofNumber,
        password: !!password,
      })
      return NextResponse.json({ success: false, error: "All fields are required" }, { status: 400 })
    }

    // Validate proof type
    if (!["Aadhaar", "Passport"].includes(proofType)) {
      console.log("[v0] Invalid proof type:", proofType)
      return NextResponse.json({ success: false, error: "Invalid proof type" }, { status: 400 })
    }

    console.log("[v0] Connecting to database...")
    const db = await getDatabase()
    const tourists = db.collection("tourists")
    console.log("[v0] Database connection successful")

    // Check if email already exists
    console.log("[v0] Checking for existing email...")
    const existingTourist = await tourists.findOne({ email })
    if (existingTourist) {
      console.log("[v0] Email already exists:", email)
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
    }

    // Hash password
    console.log("[v0] Hashing password...")
    const hashedPassword = await hashPassword(password)
    console.log("[v0] Password hashed successfully")

    // Create new tourist
    const newTourist = {
      name,
      email,
      proofType,
      proofNumber,
      password: hashedPassword,
      createdAt: new Date(),
      sos: false,
    }

    console.log("[v0] Inserting new tourist...")
    const result = await tourists.insertOne(newTourist)
    console.log("[v0] Tourist inserted with ID:", result.insertedId)

    // Generate JWT token
    const touristData = {
      _id: result.insertedId.toString(),
      name,
      email,
      proofType,
      proofNumber,
      createdAt: newTourist.createdAt,
      sos: false,
    }

    console.log("[v0] Generating JWT token...")
    const token = generateToken(touristData)
    console.log("[v0] JWT token generated successfully")

    return NextResponse.json({
      success: true,
      token,
      tourist: touristData,
    })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)

      if (error.message.includes("MONGODB_URI")) {
        return NextResponse.json(
          {
            success: false,
            error: "Database configuration error. Please check MONGODB_URI environment variable.",
          },
          { status: 500 },
        )
      }

      if (
        error.message.includes("MongoServerError") ||
        error.message.includes("connection") ||
        error.message.includes("ENOTFOUND")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Database connection failed. Please verify MongoDB URI is correct.",
          },
          { status: 500 },
        )
      }
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
