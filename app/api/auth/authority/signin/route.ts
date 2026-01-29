import { type NextRequest, NextResponse } from "next/server"
import {
  findAuthorityByEmail,
  comparePassword,
  generateAuthorityToken,
  updateAuthorityLastLogin,
} from "@/lib/auth-server"
import { ObjectId } from "mongodb"
import { SecurityUtils, logSecurityEvent } from "@/lib/security"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      logSecurityEvent({
        type: "auth_attempt",
        ip: request.ip,
        userAgent: request.headers.get("user-agent") || undefined,
        details: { error: "Missing credentials", email },
      })
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedEmail = SecurityUtils.sanitizeInput(email)
    const sanitizedPassword = SecurityUtils.sanitizeInput(password)

    // Find authority by email
    const authority = await findAuthorityByEmail(sanitizedEmail)
    if (!authority) {
      logSecurityEvent({
        type: "auth_attempt",
        ip: request.ip,
        userAgent: request.headers.get("user-agent") || undefined,
        details: { error: "Authority not found", email: sanitizedEmail },
      })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await comparePassword(sanitizedPassword, authority.passwordHash)
    if (!isValidPassword) {
      logSecurityEvent({
        type: "auth_attempt",
        userId: authority._id?.toString(),
        ip: request.ip,
        userAgent: request.headers.get("user-agent") || undefined,
        details: { error: "Invalid password", email: sanitizedEmail },
      })
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Update last login
    await updateAuthorityLastLogin(new ObjectId(authority._id))

    // Generate token
    const token = generateAuthorityToken({
      _id: authority._id?.toString(),
      name: authority.name,
      email: authority.email,
      role: authority.role,
      createdAt: authority.createdAt,
    })

    logSecurityEvent({
      type: "auth_attempt",
      userId: authority._id?.toString(),
      ip: request.ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: { success: true, email: sanitizedEmail },
    })

    console.log(`[v0] Authority ${sanitizedEmail} signed in successfully`)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: authority._id?.toString(),
        name: authority.name,
        email: authority.email,
        role: authority.role,
        department: authority.department || "General",
        permissions: authority.permissions || ["view_dashboard", "manage_alerts"],
      },
      message: "Authority signed in successfully",
    })
  } catch (error) {
    console.error("[v0] Authority signin error:", error)
    logSecurityEvent({
      type: "auth_attempt",
      ip: request.ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: { error: "Server error", message: error instanceof Error ? error.message : "Unknown error" },
    })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
