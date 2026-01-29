import { MongoClient, type Db } from "mongodb"

const uri =
  "mongodb://sachin23bcon1246_db_user:sy5iZ78R80Q18Nso@ac-klkrwdi-shard-00-00.phv1njc.mongodb.net:27017,ac-klkrwdi-shard-00-01.phv1njc.mongodb.net:27017,ac-klkrwdi-shard-00-02.phv1njc.mongodb.net:27017/tourist_tracker?ssl=true&replicaSet=atlas-iy1ox0-shard-0&authSource=admin&retryWrites=true&w=majority"

const options = {
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 5,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDatabase(): Promise<Db> {
  try {
    console.log("[v0] Connecting to MongoDB tourist_tracker database...")
    const client = await clientPromise
    const db = client.db("tourist_tracker")
    console.log("[v0] MongoDB connection successful to tourist_tracker database")
    return db
  } catch (error) {
    console.error("[v0] MongoDB connection failed:", error)
    if (error instanceof Error) {
      console.error("[v0] Error details:", {
        message: error.message,
        name: error.name,
      })
    }
    throw error
  }
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    console.log("[v0] Connecting to MongoDB tourist_tracker database...")
    const client = await clientPromise
    const db = client.db("tourist_tracker")
    console.log("[v0] MongoDB connection successful to tourist_tracker database")
    return { client, db }
  } catch (error) {
    console.error("[v0] MongoDB connection failed:", error)
    if (error instanceof Error) {
      console.error("[v0] Error details:", {
        message: error.message,
        name: error.name,
      })
    }
    throw error
  }
}
