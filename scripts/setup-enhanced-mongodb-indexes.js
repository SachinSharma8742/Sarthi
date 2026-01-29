// Enhanced MongoDB Index Setup Script for Tourist Tracker with Authorities Dashboard
// Run this script to create necessary indexes for optimal performance

const { MongoClient } = require("mongodb")

async function setupEnhancedIndexes() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required")
    process.exit(1)
  }

  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("tourist_tracker")

    // Collections
    const tourists = db.collection("tourists")
    const locations = db.collection("locations")
    const alerts = db.collection("alerts")
    const authorities = db.collection("authorities")

    console.log("Setting up indexes for tourists collection...")
    await tourists.createIndex({ email: 1 }, { unique: true })
    await tourists.createIndex({ "lastKnownLocation.sos": 1 })
    await tourists.createIndex({ "lastKnownLocation.timestamp": -1 })
    await tourists.createIndex({ createdAt: 1 })
    await tourists.createIndex({ connectionToken: 1 }, { sparse: true })

    console.log("Setting up indexes for locations collection...")
    await locations.createIndex({ location: "2dsphere" }) // Geospatial index
    await locations.createIndex({ userId: 1, timestamp: -1 })
    await locations.createIndex({ sos: 1, timestamp: -1 })
    await locations.createIndex({ timestamp: -1 })

    console.log("Setting up indexes for alerts collection...")
    await alerts.createIndex({ userId: 1, timestamp: -1 })
    await alerts.createIndex({ type: 1, resolved: 1 })
    await alerts.createIndex({ severity: 1, resolved: 1 })
    await alerts.createIndex({ timestamp: -1 })
    await alerts.createIndex({ resolved: 1, timestamp: -1 })

    console.log("Setting up indexes for authorities collection...")
    await authorities.createIndex({ email: 1 }, { unique: true })
    await authorities.createIndex({ role: 1 })
    await authorities.createIndex({ lastLogin: -1 })

    console.log("✅ Enhanced indexes created successfully")
    console.log("Tourists Collection:")
    console.log("- Unique index on email field")
    console.log("- Index on lastKnownLocation.sos for emergency queries")
    console.log("- Index on lastKnownLocation.timestamp for recent locations")
    console.log("- Index on createdAt field for sorting")
    console.log("- Sparse index on connectionToken")

    console.log("\nLocations Collection:")
    console.log("- 2dsphere index on location field for geospatial queries")
    console.log("- Compound index on userId and timestamp")
    console.log("- Index on sos and timestamp for emergency tracking")
    console.log("- Index on timestamp for chronological queries")

    console.log("\nAlerts Collection:")
    console.log("- Compound index on userId and timestamp")
    console.log("- Compound index on type and resolved status")
    console.log("- Compound index on severity and resolved status")
    console.log("- Index on timestamp for chronological queries")
    console.log("- Compound index on resolved status and timestamp")

    console.log("\nAuthorities Collection:")
    console.log("- Unique index on email field")
    console.log("- Index on role field")
    console.log("- Index on lastLogin for activity tracking")
  } catch (error) {
    console.error("Error setting up enhanced indexes:", error)
  } finally {
    await client.close()
  }
}

setupEnhancedIndexes()
