export interface Tourist {
  _id?: string
  name: string
  email: string
  proofType: "Aadhaar" | "Passport"
  proofNumber: string
  password: string
  createdAt: Date
  lat?: number
  lng?: number
  sos?: boolean
  lastKnownLocation?: {
    lat: number
    lng: number
    sos: boolean
    timestamp: Date
  }
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

// Client-safe token verification (no database operations)
// export function verifyTokenClient(token: string): any {
//   try {
//     const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET
//     if (!JWT_SECRET) {
//       console.error("[v0] JWT_SECRET not available")
//       return null
//     }

//     const decoded = jwt.verify(token, JWT_SECRET, {
//       issuer: "globemap-app",
//       audience: ["tourist-client", "authority-dashboard"],
//     }) as any

//     // Additional security checks
//     if (!decoded.id || !decoded.email || !decoded.type) {
//       console.error("[v0] Token missing required fields")
//       return null
//     }

//     // Check token age (additional security layer)
//     const tokenAge = Date.now() / 1000 - decoded.iat
//     const maxAge = decoded.type === "authority" ? 8 * 60 * 60 : 7 * 24 * 60 * 60 // 8h for authority, 7d for tourist

//     if (tokenAge > maxAge) {
//       console.error("[v0] Token expired beyond maximum age")
//       return null
//     }

//     console.log("[v0] Token verified successfully, type:", decoded.type)
//     return decoded
//   } catch (error) {
//     console.error("[v0] Token verification failed:", error)
//     return null
//   }
// }

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
