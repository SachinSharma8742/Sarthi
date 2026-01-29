import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { getDatabase } from "./mongodb"
import type { ObjectId } from "mongodb"
import { env } from "./env"

const JWT_SECRET = env.JWT_SECRET

export interface Tourist {
  _id?: string
  name: string
  email: string
  proofType: "Aadhaar" | "Passport"
  proofNumber: string
  password: string
  createdAt: Date
  connectionToken?: string
  tokenGeneratedAt?: Date
}

export interface Authority {
  _id?: string
  name: string
  email: string
  passwordHash: string
  role: "ADMIN" | "OPERATOR"
  createdAt: Date
  lastLogin?: Date
  isActive: boolean
  permissions: string[]
}

export interface EnhancedTourist extends Tourist {
  lastKnownLocation?: {
    lat: number
    lng: number
    sos: boolean
    timestamp: Date
  }
}

export function generateToken(tourist: Omit<Tourist, "password">): string {
  console.log("[v0] Generating token for tourist:", tourist.email)
  try {
    const token = jwt.sign(
      {
        id: tourist._id,
        email: tourist.email,
        name: tourist.name,
        type: "tourist",
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: "globemap-app",
        audience: "tourist-client",
      },
    )
    console.log("[v0] Token generated successfully")
    return token
  } catch (error) {
    console.error("[v0] Token generation failed:", error)
    throw error
  }
}

export function generateAuthorityToken(authority: Omit<Authority, "passwordHash">): string {
  console.log("[v0] Generating token for authority:", authority.email)
  try {
    const token = jwt.sign(
      {
        id: authority._id,
        email: authority.email,
        name: authority.name,
        role: authority.role,
        type: "authority",
        permissions: authority.permissions,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      {
        expiresIn: "8h", // Shorter expiry for authorities
        issuer: "globemap-app",
        audience: "authority-dashboard",
      },
    )
    console.log("[v0] Authority token generated successfully")
    return token
  } catch (error) {
    console.error("[v0] Authority token generation failed:", error)
    throw error
  }
}

export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "globemap-app",
      audience: ["tourist-client", "authority-dashboard"],
    }) as any

    // Additional security checks
    if (!decoded.id || !decoded.email || !decoded.type) {
      console.error("[v0] Token missing required fields")
      return null
    }

    // Check token age (additional security layer)
    const tokenAge = Date.now() / 1000 - decoded.iat
    const maxAge = decoded.type === "authority" ? 8 * 60 * 60 : 7 * 24 * 60 * 60 // 8h for authority, 7d for tourist

    if (tokenAge > maxAge) {
      console.error("[v0] Token expired beyond maximum age")
      return null
    }

    console.log("[v0] Token verified successfully, type:", decoded.type)
    return decoded
  } catch (error) {
    console.error("[v0] Token verification failed:", error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  try {
    console.log("[v0] Hashing password...")
    const hash = await bcrypt.hash(password, 14)
    console.log("[v0] Password hashed successfully")
    return hash
  } catch (error) {
    console.error("[v0] Password hashing failed:", error)
    throw error
  }
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error("[v0] Password comparison failed:", error)
    return false
  }
}

export async function findAuthorityByEmail(email: string): Promise<Authority | null> {
  try {
    const db = await getDatabase()
    const authorities = db.collection("authorities")
    const authority = await authorities.findOne({ email, isActive: true })
    return authority as Authority | null
  } catch (error) {
    console.error("[v0] Find authority by email failed:", error)
    return null
  }
}

export async function updateAuthorityLastLogin(authorityId: ObjectId): Promise<void> {
  try {
    const db = await getDatabase()
    const authorities = db.collection("authorities")
    await authorities.updateOne({ _id: authorityId }, { $set: { lastLogin: new Date() } })
  } catch (error) {
    console.error("[v0] Update authority last login failed:", error)
  }
}

const authAttempts = new Map<string, { count: number; lastAttempt: Date }>()

export function checkRateLimit(identifier: string): boolean {
  const now = new Date()
  const attempts = authAttempts.get(identifier)

  if (!attempts) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now })
    return true
  }

  // Reset counter if more than 15 minutes have passed
  if (now.getTime() - attempts.lastAttempt.getTime() > 15 * 60 * 1000) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now })
    return true
  }

  // Allow up to 5 attempts per 15 minutes
  if (attempts.count >= 5) {
    return false
  }

  attempts.count++
  attempts.lastAttempt = now
  return true
}

export function resetRateLimit(identifier: string): void {
  authAttempts.delete(identifier)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return { valid: errors.length === 0, errors }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "")
}
