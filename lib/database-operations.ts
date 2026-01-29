// Database operations for enhanced tourist tracking system
import { getDatabase } from "./mongodb"
import type { ObjectId } from "mongodb"
import type { Tourist, LocationHistory, Alert, Authority, DashboardStats } from "./models"

// Tourist operations
export async function createTourist(tourist: Omit<Tourist, "_id" | "createdAt">): Promise<ObjectId> {
  const db = await getDatabase()
  const result = await db.collection("tourists").insertOne({
    ...tourist,
    createdAt: new Date(),
  })
  return result.insertedId
}

export async function findTouristByEmail(email: string): Promise<Tourist | null> {
  const db = await getDatabase()
  return await db.collection("tourists").findOne({ email })
}

export async function updateTouristLocation(
  userId: ObjectId,
  location: { lat: number; lng: number; sos: boolean },
): Promise<void> {
  const db = await getDatabase()
  const timestamp = new Date()

  await db.collection("tourists").updateOne(
    { _id: userId },
    {
      $set: {
        lat: location.lat,
        lng: location.lng,
        sos: location.sos,
        timestamp,
      },
    },
  )

  // Add to location history
  await db.collection("locations").insertOne({
    userId,
    location: {
      type: "Point",
      coordinates: [location.lng, location.lat], // GeoJSON format [lng, lat]
    },
    sos: location.sos,
    timestamp,
  })
}

// Location operations
export async function getLocationHistory(userId: ObjectId, limit = 100): Promise<LocationHistory[]> {
  const db = await getDatabase()
  return await db.collection("locations").find({ userId }).sort({ timestamp: -1 }).limit(limit).toArray()
}

export async function getNearbyTourists(lat: number, lng: number, radiusInMeters = 1000): Promise<LocationHistory[]> {
  const db = await getDatabase()
  return await db
    .collection("locations")
    .find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
    .toArray()
}

// Alert operations
export async function createAlert(alert: Omit<Alert, "_id" | "timestamp" | "resolved">): Promise<ObjectId> {
  const db = await getDatabase()
  const result = await db.collection("alerts").insertOne({
    ...alert,
    timestamp: new Date(),
    resolved: false,
  })
  return result.insertedId
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const db = await getDatabase()
  return await db.collection("alerts").find({ resolved: false }).sort({ timestamp: -1 }).toArray()
}

export async function resolveAlert(alertId: ObjectId, resolvedBy: ObjectId): Promise<void> {
  const db = await getDatabase()
  await db.collection("alerts").updateOne(
    { _id: alertId },
    {
      $set: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    },
  )
}

// Authority operations
export async function findAuthorityByEmail(email: string): Promise<Authority | null> {
  const db = await getDatabase()
  return await db.collection("authorities").findOne({ email })
}

export async function updateAuthorityLastLogin(authorityId: ObjectId): Promise<void> {
  const db = await getDatabase()
  await db.collection("authorities").updateOne({ _id: authorityId }, { $set: { lastLogin: new Date() } })
}

// Dashboard operations
export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDatabase()

  const [totalTourists, activeTourists, sosAlerts, resolvedAlerts] = await Promise.all([
    db.collection("tourists").countDocuments(),
    db.collection("tourists").countDocuments({
      timestamp: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    }),
    db.collection("alerts").countDocuments({ resolved: false, type: "SOS" }),
    db.collection("alerts").countDocuments({ resolved: true }),
  ])

  return {
    totalTourists,
    activeTourists,
    sosAlerts,
    resolvedAlerts,
    lastUpdated: new Date(),
  }
}

export async function getAllTouristsWithLocation(): Promise<Tourist[]> {
  const db = await getDatabase()

  console.log("[v0] Fetching all tourists from tourist_tracker.tourists collection...")

  try {
    const allTourists = await db
      .collection("tourists")
      .find({})
      .project({ passwordHash: 0 }) // Exclude password hash for security
      .toArray()

    console.log("[v0] Total tourists found in database:", allTourists.length)
    console.log(
      "[v0] Sample tourist data:",
      allTourists[0]
        ? {
            name: allTourists[0].name,
            email: allTourists[0].email,
            hasCoordinates: !!(allTourists[0].lat && allTourists[0].lng),
            lat: allTourists[0].lat,
            lng: allTourists[0].lng,
            sos: allTourists[0].sos,
            timestamp: allTourists[0].timestamp,
          }
        : "No tourists found",
    )

    console.log("[v0] Tourists with location info:", allTourists.length)
    console.log("[v0] Tourists with actual coordinates:", allTourists.filter((t) => t.lat && t.lng).length)
    console.log("[v0] Tourists with SOS active:", allTourists.filter((t) => t.sos === true).length)

    return allTourists
  } catch (error) {
    console.error("[v0] Error fetching tourists from database:", error)
    throw error
  }
}

// Additional operations
export async function deleteAlert(alertId: ObjectId): Promise<void> {
  const db = await getDatabase()
  await db.collection("alerts").deleteOne({ _id: alertId })
}

export async function findUnresolvedAlertByUserAndType(userId: ObjectId, type: Alert["type"]): Promise<Alert | null> {
  const db = await getDatabase()
  return await db.collection("alerts").findOne({ userId, type, resolved: false })
}

export async function resolveUnresolvedAlertsByUserAndType(
  userId: ObjectId,
  type: Alert["type"],
  resolvedBy?: ObjectId,
): Promise<number> {
  const db = await getDatabase()
  const result = await db.collection("alerts").updateMany(
    { userId, type, resolved: false },
    {
      $set: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    },
  )
  return result.modifiedCount
}
