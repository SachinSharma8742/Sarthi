"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, MapPin, AlertTriangle, Users, Shield, Clock, CheckCircle, Map } from "lucide-react"
import type { Tourist, Alert, DashboardStats, Zone } from "@/lib/models"
import { ZoneManagementPanel } from "@/components/zone-management-panel"

const EnhancedAuthorityMap = dynamic(() => import("@/components/enhanced-authority-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
        <p className="text-sm">Loading map...</p>
      </div>
    </div>
  ),
})

const Globe = dynamic(() => import("@/components/globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
        <p className="text-sm">Loading globe...</p>
      </div>
    </div>
  ),
})



export default function AuthorityDashboard() {
  const [isMounted, setIsMounted] = useState(false)
  const [tourists, setTourists] = useState<Tourist[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [selectedTourist, setSelectedTourist] = useState<Tourist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  const [showOnlySOS, setShowOnlySOS] = useState(false)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [showGlobeView, setShowGlobeView] = useState(false) // Updated to default to false
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [globePosition, setGlobePosition] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<{ lat: number; lng: number } | null>(null)
  const [newAlert, setNewAlert] = useState<{
    userId: string
    type: "SOS" | "GEOFENCE" | "ANOMALY"
    severity: "LOW" | "MEDIUM" | "HIGH"
    lat: string
    lng: string
  }>({ userId: "", type: "SOS", severity: "MEDIUM", lat: "", lng: "" })

  const fetchDashboardData = async () => {
    console.log("[v0] Starting dashboard data fetch")
    setIsLoading(true)
    setError(null)

    try {
      const headers = {
        "Content-Type": "application/json",
      }

      console.log("[v0] Fetching tourists, alerts, and stats")
      const [touristsRes, alertsRes, statsRes] = await Promise.all([
        fetch("/api/tourists", { headers }),
        fetch("/api/alerts", { headers }),
        fetch("/api/dashboard/stats", { headers }),
      ])

      console.log("[v0] API responses received:", {
        tourists: touristsRes.status,
        alerts: alertsRes.status,
        stats: statsRes.status,
      })

      const [touristsData, alertsData, statsData] = await Promise.all([
        touristsRes.json(),
        alertsRes.json(),
        statsRes.json(),
      ])

      console.log("[v0] Parsed API data:", {
        touristsSuccess: touristsData.success,
        alertsSuccess: alertsData.success,
        statsSuccess: statsData.success,
        touristsDebug: touristsData.debug,
        touristsCount: touristsData.count,
        touristsDataLength: touristsData.data?.length,
      })

      if (touristsData.success) {
        setTourists(touristsData.data || [])
        console.log("[v0] Set tourists:", touristsData.data?.length || 0)
        console.log(
          "[v0] Tourist details:",
          touristsData.data?.map((t: Tourist) => ({
            name: t.name,
            email: t.email,
            hasLocation: !!(t.lat && t.lng),
            coordinates: t.lat && t.lng ? `${t.lat}, ${t.lng}` : "No location",
            sos: t.sos || false,
          })),
        )
      } else {
        console.error("[v0] Tourists API error:", touristsData.error, touristsData.details)
        setError(`Failed to load tourists: ${touristsData.error}`)
      }

      if (alertsData.success) {
        setAlerts(alertsData.data || [])
        console.log("[v0] Set alerts:", alertsData.data?.length || 0)
      } else {
        console.error("[v0] Alerts API error:", alertsData.error)
      }

      if (statsData.success) {
        setStats(statsData.data)
        console.log("[v0] Set stats:", statsData.data)
      } else {
        console.error("[v0] Stats API error:", statsData.error)
      }

      setLastRefresh(new Date())
      console.log("[v0] Dashboard data fetch completed successfully")
    } catch (error) {
      console.error("[v0] Failed to fetch dashboard data:", error)
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    console.log("[v0] Resolving alert:", alertId)
    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId }),
      })
      const data = await response.json()
      console.log("[v0] Alert resolution response:", data.success)
      if (data.success) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to resolve alert:", error)
    }
  }

  const createAlertHandler = async () => {
    if (!newAlert.userId || !newAlert.lat || !newAlert.lng) {
      console.error("[v0] Missing fields for creating alert")
      return
    }
    try {
      const response = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newAlert.userId,
          type: newAlert.type,
          severity: newAlert.severity,
          location: { lat: Number.parseFloat(newAlert.lat), lng: Number.parseFloat(newAlert.lng) },
        }),
      })
      const data = await response.json()
      console.log("[v0] Create alert response:", data.success)
      if (data.success) {
        // reset minimal fields but keep user selection
        setNewAlert((prev) => ({ ...prev, lat: "", lng: "" }))
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to create alert:", error)
    }
  }

  const deleteAlertHandler = async (alertId: string) => {
    try {
      const response = await fetch("/api/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      })
      const data = await response.json()
      console.log("[v0] Delete alert response:", data.success)
      if (data.success) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error("[v0] Failed to delete alert:", error)
    }
  }

  const handleTouristClick = (tourist: Tourist) => {
    console.log("[v0] Tourist clicked:", tourist.name, tourist._id)
    setSelectedTourist(tourist)
  }

  const handleZoneClick = (zone: Zone) => {
    console.log("[v0] Zone clicked:", zone.name, zone._id)
    setSelectedZone(zone)
    // TODO: Implement map zoom to zone functionality
  }

  const handleZoneUpdated = (zone: Zone) => {
    console.log("[v0] Zone updated:", zone.name)
    // The zone management panel handles the update internally
  }

  const handleZoneDeleted = (zoneId: string) => {
    console.log("[v0] Zone deleted:", zoneId)
    // The zone management panel handles the deletion internally
  }



  const handleGlobeClick = (position: { lat: number; lng: number }) => {
    console.log(`[v0] Globe clicked at: ${position.lat}, ${position.lng}`)
    // Auto-zoom to Jaipur on first interaction
    if (!selectedPlace) {
      setSelectedPlace({ lat: 26.9124, lng: 75.7873 })
    }
  }

  useEffect(() => {
    setIsMounted(true)
    console.log("[v0] Dashboard useEffect mounting")
    fetchDashboardData()
    const interval = setInterval(() => {
      console.log("[v0] Auto-refreshing dashboard data")
      fetchDashboardData()
    }, 10000)

    return () => {
      console.log("[v0] Dashboard useEffect cleanup")
      clearInterval(interval)
    }
  }, [])

  const filteredTourists = showOnlySOS ? tourists.filter((t) => t.sos) : tourists

  const sosCount = tourists.filter((t) => t.sos).length
  const activeCount = tourists.filter((t) => t.lat && t.lng).length

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Dashboard Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 mb-4">{error}</p>
            <Button onClick={fetchDashboardData} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 relative">


      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${showGlobeView ? "opacity-100 z-20" : "opacity-0 z-0 pointer-events-none"
          }`}
      >
        {showGlobeView && (
          <Globe
            onGlobeClick={handleGlobeClick}
            shouldZoomOut={false}
            zoomOutPosition={null}
            onZoomOutComplete={() => { }}
            selectedPlace={selectedPlace}
          />
        )}
      </div>

      {/* Back to Globe permanently removed for Authorities Dashboard */}

      <div
        className={`transition-all duration-500 ease-in-out ${showGlobeView ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Saarthi Authorities Dashboard</h1>
                <p className="text-slate-400">Tourist Monitoring & Emergency Response</p>
              </div>
            </div>

            <Button onClick={fetchDashboardData} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Total Tourists</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats?.totalTourists || tourists.length}</div>
                <p className="text-xs text-slate-400">Registered in system</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Active Locations</CardTitle>
                <MapPin className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{stats?.activeTourists || activeCount}</div>
                <p className="text-xs text-slate-400">Currently sharing location</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">SOS Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(stats?.sosAlerts || sosCount) > 0 ? "text-red-400" : "text-slate-400"}`}
                >
                  {stats?.sosAlerts || sosCount}
                </div>
                <p className="text-xs text-slate-400">Active emergency alerts</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Resolved Alerts</CardTitle>
                <CheckCircle className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{stats?.resolvedAlerts || 0}</div>
                <p className="text-xs text-slate-400">Successfully resolved</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-slate-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
                <Users className="h-4 w-4 mr-2" />
                Tourist Overview
              </TabsTrigger>
              <TabsTrigger value="zones" className="data-[state=active]:bg-slate-700">
                <Map className="h-4 w-4 mr-2" />
                Zone Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Main Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Map */}
                <Card className="lg:col-span-3 bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">Tourist Locations</CardTitle>
                        <p className="text-sm text-slate-400">Last updated: {isMounted ? lastRefresh.toLocaleTimeString() : ""}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label htmlFor="sos-filter" className="text-sm text-slate-300">
                          Show Only SOS Cases
                        </label>
                        <Switch id="sos-filter" checked={showOnlySOS} onCheckedChange={setShowOnlySOS} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 rounded-lg overflow-hidden">
                      <EnhancedAuthorityMap
                        tourists={filteredTourists}
                        selectedTourist={selectedTourist}
                        onTouristClick={handleTouristClick}
                        showZoneDrawing={true}
                        onZoneCreated={(zone) => console.log("[v0] Zone created:", zone.name)}
                        onZoneUpdated={handleZoneUpdated}
                        onZoneDeleted={handleZoneDeleted}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Alerts Sidebar */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-auto">
                      <div className="p-3 bg-slate-800/70 rounded-lg border border-slate-600 space-y-2">
                        <p className="text-xs text-slate-300 font-medium">Create Alert</p>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="bg-slate-700 text-slate-100 text-xs rounded px-2 py-1 border border-slate-600 col-span-2"
                            value={newAlert.userId}
                            onChange={(e) => {
                              const userId = e.target.value
                              const t = tourists.find((tt) => tt._id?.toString() === userId)
                              setNewAlert((prev) => ({
                                ...prev,
                                userId,
                                lat: t?.lat != null ? String(t.lat) : prev.lat,
                                lng: t?.lng != null ? String(t.lng) : prev.lng,
                              }))
                            }}
                          >
                            <option value="">Select Tourist (attach alert)</option>
                            {tourists.map((t) => (
                              <option key={t._id?.toString()} value={t._id?.toString() || ""}>
                                {t.name}{" "}
                                {t.lat && t.lng ? `(${t.lat.toFixed(3)}, ${t.lng.toFixed(3)})` : "(no location)"}
                              </option>
                            ))}
                          </select>

                          <select
                            className="bg-slate-700 text-slate-100 text-xs rounded px-2 py-1 border border-slate-600"
                            value={newAlert.type}
                            onChange={(e) => setNewAlert((prev) => ({ ...prev, type: e.target.value as any }))}
                          >
                            <option value="SOS">SOS</option>
                            <option value="GEOFENCE">GEOFENCE</option>
                            <option value="ANOMALY">ANOMALY</option>
                          </select>

                          <select
                            className="bg-slate-700 text-slate-100 text-xs rounded px-2 py-1 border border-slate-600"
                            value={newAlert.severity}
                            onChange={(e) => setNewAlert((prev) => ({ ...prev, severity: e.target.value as any }))}
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                          </select>

                          <input
                            placeholder="Latitude"
                            className="bg-slate-700 text-slate-100 text-xs rounded px-2 py-1 border border-slate-600"
                            value={newAlert.lat}
                            onChange={(e) => setNewAlert((prev) => ({ ...prev, lat: e.target.value }))}
                          />
                          <input
                            placeholder="Longitude"
                            className="bg-slate-700 text-slate-100 text-xs rounded px-2 py-1 border border-slate-600"
                            value={newAlert.lng}
                            onChange={(e) => setNewAlert((prev) => ({ ...prev, lng: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            className="col-span-2 bg-blue-600 hover:bg-blue-700 text-xs"
                            onClick={createAlertHandler}
                            disabled={!newAlert.userId || !newAlert.lat || !newAlert.lng}
                          >
                            Create Alert
                          </Button>
                        </div>
                      </div>

                      {alerts.length === 0 ? (
                        <p className="text-slate-400 text-sm">No active alerts</p>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert._id?.toString()}
                            className="p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    className={`text-xs ${alert.type === "SOS"
                                      ? "bg-red-500/20 text-red-200 border-red-500/50"
                                      : "bg-yellow-500/20 text-yellow-200 border-yellow-500/50"
                                      }`}
                                  >
                                    {alert.type}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${alert.severity === "HIGH"
                                      ? "bg-red-500/20 text-red-200 border-red-500/50"
                                      : alert.severity === "MEDIUM"
                                        ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/50"
                                        : "bg-blue-500/20 text-blue-200 border-blue-500/50"
                                      }`}
                                  >
                                    {alert.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-300">
                                  Location: {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                                </p>
                                <p className="text-xs text-slate-400">{isMounted ? new Date(alert.timestamp).toLocaleString() : ""}</p>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <Button
                                  size="sm"
                                  onClick={() => resolveAlert(alert._id?.toString() || "")}
                                  className="bg-green-600 hover:bg-green-700 text-xs"
                                >
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteAlertHandler(alert._id?.toString() || "")}
                                  className="text-xs border-red-500/50 text-red-200 hover:bg-red-500/10"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tourist Status Table */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Tourist Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Name</TableHead>
                          <TableHead className="text-slate-300">Status</TableHead>
                          <TableHead className="text-slate-300">Location</TableHead>
                          <TableHead className="text-slate-300">Last Update</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTourists.map((tourist) => (
                          <TableRow
                            key={tourist._id?.toString()}
                            className={`border-slate-700 cursor-pointer hover:bg-slate-700/30 ${selectedTourist?._id === tourist._id ? "bg-slate-700/50" : ""
                              }`}
                            onClick={() => handleTouristClick(tourist)}
                          >
                            <TableCell className="text-white">
                              <div>
                                <p className="font-medium">{tourist.name}</p>
                                <p className="text-xs text-slate-400">{tourist.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {tourist.sos && (
                                  <Badge className="bg-red-500/20 text-red-200 border-red-500/50">SOS ACTIVE</Badge>
                                )}
                                {tourist.lat && tourist.lng ? (
                                  <Badge className="bg-green-500/20 text-green-200 border-green-500/50">
                                    Connected
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-500/20 text-gray-200 border-gray-500/50">
                                    Not Connected
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {tourist.lat && tourist.lng ? (
                                <div className="text-xs">
                                  <p>
                                    {tourist.lat.toFixed(4)}, {tourist.lng.toFixed(4)}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1 h-6 px-2 text-xs bg-blue-600/20 border-blue-500/50 text-blue-200 hover:bg-blue-600/30"
                                    onClick={(e) => {
                                      e.stopPropagation() // Prevent row click
                                      console.log(`[v0] Go to Location clicked for ${tourist.name}`)
                                      handleTouristClick(tourist)
                                    }}
                                  >
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Go to Location
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-slate-500">No location</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {tourist.timestamp ? (
                                <div className="text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {isMounted ? new Date(tourist.timestamp).toLocaleString() : ""}
                                </div>
                              ) : (
                                <span className="text-slate-500">Never</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="zones" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Map with Zone Focus */}
                <Card className="lg:col-span-3 bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Map className="h-5 w-5" />
                      Zone Management Map
                    </CardTitle>
                    <p className="text-sm text-slate-400">Draw new zones or manage existing ones</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 rounded-lg overflow-hidden">
                      <EnhancedAuthorityMap
                        tourists={[]} // Hide tourists in zone management view
                        selectedTourist={null}
                        onTouristClick={() => { }}
                        showZoneDrawing={true}
                        onZoneCreated={(zone) => console.log("[v0] Zone created:", zone.name)}
                        onZoneUpdated={handleZoneUpdated}
                        onZoneDeleted={handleZoneDeleted}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Zone Management Panel */}
                <div className="h-fit">
                  <ZoneManagementPanel
                    onZoneClick={handleZoneClick}
                    onZoneUpdated={handleZoneUpdated}
                    onZoneDeleted={handleZoneDeleted}
                    onToggleVisibility={(visible) => console.log("[v0] Zone visibility:", visible)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
