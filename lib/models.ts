// MongoDB Models and Interfaces for Tourist Tracker
import type { ObjectId } from "mongodb"

// Enhanced User/Tourist interface with location tracking
export interface Tourist {
  _id?: ObjectId
  name: string
  email: string
  proofType: "Aadhaar" | "Passport"
  proofNumber: string
  passwordHash?: string
  password?: string
  createdAt: Date
  // Location fields are directly at root level for connected tourists
  lat?: number
  lng?: number
  sos?: boolean
  timestamp?: Date
  geoFenceBreached?: boolean
  currentZoneType?: "green" | "yellow" | "red" | null
  currentZoneName?: string | null
  breachTime?: Date | null
  // Connection token fields for app connectivity
  connectionToken?: string
  tokenGeneratedAt?: Date
}

// Location history collection for tracking movement
export interface LocationHistory {
  _id?: ObjectId
  userId: ObjectId
  location: {
    type: "Point"
    coordinates: [number, number] // [lng, lat] - GeoJSON format
  }
  sos: boolean
  timestamp: Date
}

// Alerts collection for SOS and anomaly events
export interface Alert {
  _id?: ObjectId
  userId: ObjectId
  type: "SOS" | "GEOFENCE" | "ANOMALY"
  severity: "LOW" | "MEDIUM" | "HIGH"
  location: {
    lat: number
    lng: number
  }
  timestamp: Date
  resolved: boolean
  resolvedBy?: ObjectId
  resolvedAt?: Date
}

// Authority user interface
export interface Authority {
  _id?: ObjectId
  name: string
  email: string
  passwordHash: string
  role: "ADMIN" | "OPERATOR"
  createdAt: Date
  lastLogin?: Date
}

// WebSocket message types for real-time updates
export interface WebSocketMessage {
  type: "LOCATION_UPDATE" | "SOS_ALERT" | "ALERT_RESOLVED" | "USER_CONNECTED" | "USER_DISCONNECTED"
  data: any
  timestamp: Date
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Dashboard statistics interface
export interface DashboardStats {
  totalTourists: number
  activeTourists: number
  sosAlerts: number
  resolvedAlerts: number
  lastUpdated: Date
}

// Zone interface for geo-fencing system
export interface Zone {
  _id?: ObjectId
  name: string
  type: "green" | "yellow" | "red"
  description: string
  coordinates: [number, number][] // Array of [lng, lat] pairs for polygon vertices
  createdAt: Date
  createdBy: ObjectId // Authority who created the zone
  updatedAt?: Date
  updatedBy?: ObjectId
  isActive: boolean
}
