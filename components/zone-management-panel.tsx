"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Settings, Edit, Trash2, MapPin, Search, Filter, RefreshCw } from "lucide-react"
import type { Zone } from "@/lib/models"

interface ZoneManagementPanelProps {
  onZoneClick?: (zone: Zone) => void
  onZoneUpdated?: (zone: Zone) => void
  onZoneDeleted?: (zoneId: string) => void
  onToggleVisibility?: (visible: boolean) => void
}

export function ZoneManagementPanel({
  onZoneClick,
  onZoneUpdated,
  onZoneDeleted,
  onToggleVisibility,
}: ZoneManagementPanelProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [filteredZones, setFilteredZones] = useState<Zone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "green" | "yellow" | "red">("all")
  const [showZonesOnMap, setShowZonesOnMap] = useState(true)

  // Edit zone state
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    type: "green" as "green" | "yellow" | "red",
    description: "",
  })
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete zone state
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch zones from API
  const fetchZones = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/zones")
      const result = await response.json()

      if (result.success) {
        setZones(result.data || [])
        console.log(`[v0] Loaded ${result.data?.length || 0} zones for management`)
      } else {
        console.error("[v0] Failed to fetch zones:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error fetching zones:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Filter zones based on search and type
  useEffect(() => {
    let filtered = zones

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (zone) =>
          zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          zone.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((zone) => zone.type === filterType)
    }

    setFilteredZones(filtered)
  }, [zones, searchTerm, filterType])

  // Load zones on component mount
  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  // Handle zone click (zoom to zone on map)
  const handleZoneClick = (zone: Zone) => {
    if (onZoneClick) {
      onZoneClick(zone)
    }
  }

  // Handle edit zone
  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone)
    setEditForm({
      name: zone.name,
      type: zone.type,
      description: zone.description,
    })
  }

  // Handle update zone
  const handleUpdateZone = async () => {
    if (!editingZone) return

    setIsUpdating(true)
    try {
      const response = await fetch("/api/zones", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: editingZone._id,
          ...editForm,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update local state
        const updatedZone = { ...editingZone, ...editForm, updatedAt: new Date() }
        setZones((prev) => prev.map((zone) => (zone._id === editingZone._id ? updatedZone : zone)))

        setEditingZone(null)

        if (onZoneUpdated) {
          onZoneUpdated(updatedZone)
        }

        console.log("[v0] Zone updated successfully:", updatedZone.name)
      } else {
        alert(`Failed to update zone: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Error updating zone:", error)
      alert("Failed to update zone. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle delete zone
  const handleDeleteZone = async () => {
    if (!deletingZone) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/zones?id=${deletingZone._id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        // Remove from local state
        setZones((prev) => prev.filter((zone) => zone._id !== deletingZone._id))
        setDeletingZone(null)

        if (onZoneDeleted) {
          onZoneDeleted(deletingZone._id?.toString() || "")
        }

        console.log("[v0] Zone deleted successfully:", deletingZone.name)
      } else {
        alert(`Failed to delete zone: ${result.error}`)
      }
    } catch (error) {
      console.error("[v0] Error deleting zone:", error)
      alert("Failed to delete zone. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle zone visibility toggle
  const handleVisibilityToggle = (visible: boolean) => {
    setShowZonesOnMap(visible)
    if (onToggleVisibility) {
      onToggleVisibility(visible)
    }
  }

  const getZoneTypeColor = (type: "green" | "yellow" | "red") => {
    switch (type) {
      case "green":
        return "bg-green-500"
      case "yellow":
        return "bg-yellow-500"
      case "red":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getZoneTypeBadge = (type: "green" | "yellow" | "red") => {
    switch (type) {
      case "green":
        return "bg-green-500/20 text-green-200 border-green-500/50"
      case "yellow":
        return "bg-yellow-500/20 text-yellow-200 border-yellow-500/50"
      case "red":
        return "bg-red-500/20 text-red-200 border-red-500/50"
      default:
        return "bg-gray-500/20 text-gray-200 border-gray-500/50"
    }
  }

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700 h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Zones
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchZones}
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="border-slate-600 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Zone visibility toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Switch id="zone-visibility" checked={showZonesOnMap} onCheckedChange={handleVisibilityToggle} />
              <Label htmlFor="zone-visibility" className="text-sm text-slate-300">
                Show zones on map
              </Label>
            </div>
            <Badge variant="outline" className="text-slate-300">
              {zones.length} zones
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search zones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            <Select
              value={filterType}
              onValueChange={(value: "all" | "green" | "yellow" | "red") => setFilterType(value)}
            >
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                <SelectItem value="green">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Green Zones
                  </div>
                </SelectItem>
                <SelectItem value="yellow">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    Yellow Zones
                  </div>
                </SelectItem>
                <SelectItem value="red">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    Red Zones
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zone List */}
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm text-slate-400">Loading zones...</p>
                </div>
              ) : filteredZones.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">No zones found</p>
                  {searchTerm && <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter</p>}
                </div>
              ) : (
                filteredZones.map((zone) => (
                  <div
                    key={zone._id?.toString()}
                    className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700/70 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getZoneTypeColor(zone.type)}`}></div>
                        <h4 className="font-medium text-white text-sm">{zone.name}</h4>
                      </div>
                      <Badge className={`text-xs ${getZoneTypeBadge(zone.type)}`}>{zone.type.toUpperCase()}</Badge>
                    </div>

                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{zone.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">{zone.coordinates?.length || 0} points</div>

                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleZoneClick(zone)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        >
                          <MapPin className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleEditZone(zone)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => setDeletingZone(zone)}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Zone Dialog */}
      <Dialog open={!!editingZone} onOpenChange={() => setEditingZone(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-zone-name">Zone Name *</Label>
              <Input
                id="edit-zone-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter zone name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-zone-type">Zone Type *</Label>
              <Select
                value={editForm.type}
                onValueChange={(value: "green" | "yellow" | "red") => setEditForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Green Zone (Safe)
                    </div>
                  </SelectItem>
                  <SelectItem value="yellow">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Yellow Zone (Caution)
                    </div>
                  </SelectItem>
                  <SelectItem value="red">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Red Zone (Restricted)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-zone-description">Description *</Label>
              <Textarea
                id="edit-zone-description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this zone and any important information"
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setEditingZone(null)} variant="outline" disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleUpdateZone} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
                {isUpdating ? "Updating..." : "Update Zone"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirmation */}
      <AlertDialog open={!!deletingZone} onOpenChange={() => setDeletingZone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingZone?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteZone} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete Zone"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
