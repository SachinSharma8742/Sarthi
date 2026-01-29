// Environment variables configuration
export const env = {
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const

export function validateEnvironment() {
  const errors: string[] = []

  if (!env.MONGODB_URI) {
    errors.push("MONGODB_URI environment variable is required")
  }

  if (env.NODE_ENV === "production" && env.JWT_SECRET === "your-secret-key-change-in-production") {
    errors.push("JWT_SECRET must be set to a secure value in production")
  }

  if (env.MONGODB_URI && !env.MONGODB_URI.startsWith("mongodb")) {
    errors.push(
      "MONGODB_URI must be a valid MongoDB connection string (should start with 'mongodb://' or 'mongodb+srv://')",
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
