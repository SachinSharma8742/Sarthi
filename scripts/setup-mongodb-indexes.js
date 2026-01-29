// MongoDB Index Setup Script for Tourist Tracker
// Run this script to create necessary indexes for optimal performance

const { MongoClient } = require("mongodb")

async function setupIndexes() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required")
    process.exit(1)
  }

  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("tourist_tracker")
    const tourists = db.collection("tourists")

    // Create indexes for optimal performance
    await tourists.createIndex({ email: 1 }, { unique: true })
    await tourists.createIndex({ sos: 1 })
    await tourists.createIndex({ createdAt: 1 })

    console.log("✅ Indexes created successfully")
    console.log("- Unique index on email field")
    console.log("- Index on sos field for emergency queries")
    console.log("- Index on createdAt field for sorting")
  } catch (error) {
    console.error("Error setting up indexes:", error)
  } finally {
    await client.close()
  }
}

setupIndexes()
