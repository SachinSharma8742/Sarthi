// MongoDB Zone Collection Setup Script
// This script creates the zones collection with proper indexes and sample data

const { MongoClient } = require("mongodb")

async function setupZonesCollection() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required")
  }

  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB for zones collection setup")

    const db = client.db()
    const zones = db.collection("zones")

    // Create indexes for zones collection
    console.log("Creating indexes for zones collection...")

    // Index for zone queries by type and active status
    await zones.createIndex({ type: 1, isActive: 1 })

    // Index for geospatial queries (2dsphere for GeoJSON)
    await zones.createIndex({
      geometry: "2dsphere",
    })

    // Index for text search on name and description
    await zones.createIndex({
      name: "text",
      description: "text",
    })

    // Index for creation and update tracking
    await zones.createIndex({ createdAt: -1 })
    await zones.createIndex({ updatedAt: -1 })
    await zones.createIndex({ createdBy: 1 })

    console.log("Zones collection indexes created successfully")

    // Check if sample zones already exist
    const existingZones = await zones.countDocuments()

    if (existingZones === 0) {
      console.log("Creating sample zones...")

      // Sample zones for demonstration
      const sampleZones = [
        {
          name: "Caution Area",
          type: "yellow",
          description: "Area requiring extra caution - moderate risk zone",
          coordinates: [
            [77.205, 28.61],
            [77.207, 28.61],
            [77.207, 28.612],
            [77.205, 28.612],
            [77.205, 28.61],
          ],
          createdAt: new Date(),
          createdBy: null,
          isActive: true,
        },
      ]

      await zones.insertMany(sampleZones)
      console.log(`Inserted ${sampleZones.length} sample zones`)
    } else {
      console.log(`Zones collection already has ${existingZones} zones`)
    }

    console.log("Zones collection setup completed successfully")
  } catch (error) {
    console.error("Error setting up zones collection:", error)
    throw error
  } finally {
    await client.close()
  }
}

// Run the setup
setupZonesCollection()
  .then(() => {
    console.log("Zone collection setup finished")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Zone collection setup failed:", error)
    process.exit(1)
  })
