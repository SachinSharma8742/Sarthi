// WebSocket server implementation for real-time updates
import { Server as SocketIOServer } from "socket.io"
import type { Server as HTTPServer } from "http"
import { verifyToken } from "./auth-server"
import type { WebSocketMessage } from "./models"

export class WebSocketManager {
  private io: SocketIOServer
  private connectedClients = new Map<string, { socket: any; type: "tourist" | "authority"; userId: string }>()

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === "development" ? "http://localhost:3000" : false,
        methods: ["GET", "POST"],
      },
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`[v0] WebSocket client connected: ${socket.id}`)

      // Handle authentication
      socket.on("authenticate", (data: { token: string }) => {
        const decoded = verifyToken(data.token)
        if (!decoded) {
          socket.emit("auth_error", { message: "Invalid token" })
          socket.disconnect()
          return
        }

        const clientType = decoded.type === "authority" ? "authority" : "tourist"
        this.connectedClients.set(socket.id, {
          socket,
          type: clientType,
          userId: decoded.id,
        })

        socket.emit("authenticated", { type: clientType, userId: decoded.id })
        console.log(`[v0] Client authenticated: ${decoded.email} (${clientType})`)

        // Notify authorities about new tourist connection
        if (clientType === "tourist") {
          this.broadcastToAuthorities({
            type: "USER_CONNECTED",
            data: { userId: decoded.id, name: decoded.name, email: decoded.email },
            timestamp: new Date(),
          })
        }
      })

      // Handle location updates from tourists
      socket.on("location_update", (data: { lat: number; lng: number; sos: boolean }) => {
        const client = this.connectedClients.get(socket.id)
        if (!client || client.type !== "tourist") {
          socket.emit("error", { message: "Unauthorized" })
          return
        }

        // Broadcast location update to all authorities
        this.broadcastToAuthorities({
          type: "LOCATION_UPDATE",
          data: {
            userId: client.userId,
            location: { lat: data.lat, lng: data.lng },
            sos: data.sos,
          },
          timestamp: new Date(),
        })

        console.log(`[v0] Location update from ${client.userId}: ${data.lat}, ${data.lng}, SOS: ${data.sos}`)
      })

      // Handle SOS alerts from tourists
      socket.on("sos_alert", (data: { lat: number; lng: number }) => {
        const client = this.connectedClients.get(socket.id)
        if (!client || client.type !== "tourist") {
          socket.emit("error", { message: "Unauthorized" })
          return
        }

        // Broadcast SOS alert to all authorities
        this.broadcastToAuthorities({
          type: "SOS_ALERT",
          data: {
            userId: client.userId,
            location: { lat: data.lat, lng: data.lng },
            severity: "HIGH",
          },
          timestamp: new Date(),
        })

        console.log(`[v0] SOS alert from ${client.userId} at ${data.lat}, ${data.lng}`)
      })

      // Handle alert resolution from authorities
      socket.on("resolve_alert", (data: { alertId: string }) => {
        const client = this.connectedClients.get(socket.id)
        if (!client || client.type !== "authority") {
          socket.emit("error", { message: "Unauthorized" })
          return
        }

        // Broadcast alert resolution to all authorities
        this.broadcastToAuthorities({
          type: "ALERT_RESOLVED",
          data: {
            alertId: data.alertId,
            resolvedBy: client.userId,
          },
          timestamp: new Date(),
        })

        console.log(`[v0] Alert ${data.alertId} resolved by authority ${client.userId}`)
      })

      // Handle disconnection
      socket.on("disconnect", () => {
        const client = this.connectedClients.get(socket.id)
        if (client) {
          console.log(`[v0] Client disconnected: ${client.userId} (${client.type})`)

          // Notify authorities about tourist disconnection
          if (client.type === "tourist") {
            this.broadcastToAuthorities({
              type: "USER_DISCONNECTED",
              data: { userId: client.userId },
              timestamp: new Date(),
            })
          }

          this.connectedClients.delete(socket.id)
        }
      })
    })
  }

  // Broadcast message to all connected authorities
  private broadcastToAuthorities(message: WebSocketMessage) {
    this.connectedClients.forEach((client) => {
      if (client.type === "authority") {
        client.socket.emit("dashboard_update", message)
      }
    })
  }

  // Broadcast message to specific tourist
  public sendToTourist(userId: string, message: WebSocketMessage) {
    this.connectedClients.forEach((client) => {
      if (client.type === "tourist" && client.userId === userId) {
        client.socket.emit("notification", message)
      }
    })
  }

  // Broadcast message to all tourists
  public broadcastToTourists(message: WebSocketMessage) {
    this.connectedClients.forEach((client) => {
      if (client.type === "tourist") {
        client.socket.emit("notification", message)
      }
    })
  }

  // Get connected clients statistics
  public getStats() {
    const tourists = Array.from(this.connectedClients.values()).filter((c) => c.type === "tourist").length
    const authorities = Array.from(this.connectedClients.values()).filter((c) => c.type === "authority").length

    return {
      totalConnections: this.connectedClients.size,
      tourists,
      authorities,
    }
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null

export function initializeWebSocket(server: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server)
    console.log("[v0] WebSocket server initialized")
  }
  return wsManager
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager
}
