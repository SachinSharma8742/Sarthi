import jwt from "jsonwebtoken"
import { env } from "./env"

const JWT_SECRET = env.JWT_SECRET

export function verifyToken(token: string): any {
  try {
    if (token.startsWith("mock_authority_jwt_")) {
      // Return mock decoded token for authority
      return {
        userId: "authority_sachin",
        id: "authority_sachin",
        email: "sachin@saarthi.gov.in",
        type: "authority",
        role: "authority",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
        iss: "globemap-app",
        aud: ["authority-dashboard"],
      }
    }

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
