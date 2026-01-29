import crypto from "crypto"
import rateLimit from "express-rate-limit"

export class SecurityUtils {
  // Rate limiting for API endpoints
  static createRateLimit(windowMs: number = 15 * 60 * 1000, max = 100) {
    return rateLimit({
      windowMs,
      max,
      message: { error: "Too many requests, please try again later" },
      standardHeaders: true,
      legacyHeaders: false,
    })
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, "") // Remove potential XSS characters
      .trim()
      .substring(0, 1000) // Limit length
  }

  // Validate coordinates
  static validateCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    )
  }

  // Generate secure random tokens
  static generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString("hex")
  }

  // Hash sensitive data
  static hashData(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex")
  }

  // Validate user input for alerts
  static validateAlertData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.message || typeof data.message !== "string") {
      errors.push("Message is required and must be a string")
    } else if (data.message.length > 500) {
      errors.push("Message must be less than 500 characters")
    }

    if (!data.location || typeof data.location !== "object") {
      errors.push("Location is required")
    } else {
      if (!this.validateCoordinates(data.location.lat, data.location.lng)) {
        errors.push("Invalid coordinates")
      }
    }

    if (data.type && !["emergency", "medical", "security", "general"].includes(data.type)) {
      errors.push("Invalid alert type")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Validate location update data
  static validateLocationData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.validateCoordinates(data.lat, data.lng)) {
      errors.push("Invalid coordinates")
    }

    if (data.accuracy && (typeof data.accuracy !== "number" || data.accuracy < 0)) {
      errors.push("Accuracy must be a positive number")
    }

    if (data.speed && (typeof data.speed !== "number" || data.speed < 0)) {
      errors.push("Speed must be a positive number")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Check if user is within allowed geographic bounds
  static isWithinAllowedBounds(
    lat: number,
    lng: number,
    bounds?: {
      north: number
      south: number
      east: number
      west: number
    },
  ): boolean {
    if (!bounds) return true

    return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west
  }
}

// Request logging for security monitoring
export function logSecurityEvent(event: {
  type: "auth_attempt" | "unauthorized_access" | "suspicious_activity" | "data_breach_attempt"
  userId?: string
  ip?: string
  userAgent?: string
  details?: any
}) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    ...event,
  }

  // In production, this should be sent to a proper logging service
  console.log("[SECURITY]", JSON.stringify(logEntry))

  // Store in database for analysis
  // This would typically be sent to a security monitoring service
}
