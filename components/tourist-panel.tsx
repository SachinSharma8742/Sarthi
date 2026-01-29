"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useGeolocation } from "@/hooks/use-geolocation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Shield,
  Copy,
  AlertTriangle,
  LogOut,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Snowflake,
  Smartphone,
} from "lucide-react"
import { ConnectionStatusPanel } from "./connection-status-panel"

export function TouristPanel() {
  const { tourist, logout, toggleSOS, refreshTourist } = useAuth()
  const { latitude, longitude } = useGeolocation()
  const [showConnectionPanel, setShowConnectionPanel] = useState(false)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!tourist) return

    if (tourist.sos) {
      setShowConnectionPanel(true)
    }
  }, [tourist])

  useEffect(() => {
    if (!tourist) return

    const updateLocationFromSources = async () => {
      setIsUpdatingLocation(true)

      try {
        const token = localStorage.getItem("tourist_token")
        if (!token) return

        let locationData = null

        if (latitude && longitude) {
          locationData = {
            lat: latitude,
            lng: longitude,
            source: "browser",
          }
        } else if (tourist.lat && tourist.lng) {
          locationData = {
            lat: tourist.lat,
            lng: tourist.lng,
            source: "mobile_app",
          }
        }

        if (locationData) {
          const response = await fetch("/api/location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              lat: locationData.lat,
              lng: locationData.lng,
              sos: tourist.sos || false,
            }),
          })

          if (response.ok) {
            await refreshTourist()
          }
        }
      } catch (error) {
        console.error("[v0] Failed to update location:", error)
      } finally {
        setIsUpdatingLocation(false)
      }
    }

    updateLocationFromSources()
    locationIntervalRef.current = setInterval(updateLocationFromSources, 5000)

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = null
      }
    }
  }, [tourist, latitude, longitude, refreshTourist])

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error("[v0] Failed to copy:", error)
    }
  }

  const handleSOSToggle = async () => {
    await toggleSOS()
  }

  if (!tourist) return null

  const displayData = {
    name: tourist.name,
    country: "India", // Fake data
    idNumber: tourist.proofNumber,
    expiryDate: "2025-12-31", // Fake data
    bloodType: "O+", // Fake data
    emergencyContact: "+91-555-0123", // Fake data
    verified: true,
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    JSON.stringify({
      id: tourist._id?.toString() || "unknown",
      name: tourist.name,
      type: tourist.proofType,
      number: tourist.proofNumber,
    }),
  )}`

  return (
    <>
      <Card className="w-full max-w-[400px] mx-auto bg-gradient-to-br from-zinc-950 via-neutral-900 to-zinc-950 backdrop-blur-sm border-zinc-700/50 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-r from-zinc-900/80 to-neutral-800/80 p-4 sm:p-6 border-b border-zinc-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 cursor-pointer hover:text-white transition-colors" />
                <h2 className="text-lg sm:text-xl font-semibold text-white">Digital ID</h2>
              </div>
              {displayData.verified && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1 px-2 sm:px-3 py-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  VERIFIED
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="space-y-1">
              <p className="text-zinc-400 text-xs font-medium tracking-wider uppercase">Tourist Safety Card</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">SAARTHI</h3>
            </div>

            <div className="flex justify-center py-3 sm:py-4 relative">
              <div className="relative">
                <div className="absolute inset-0 bg-zinc-700/20 rounded-3xl blur-xl"></div>
                <div className="relative bg-zinc-800/60 backdrop-blur-sm border-2 border-zinc-600/40 rounded-3xl p-6 sm:p-8">
                  <User className="h-12 w-12 sm:h-16 sm:w-16 text-zinc-300" />
                </div>
                <div className="absolute -top-2 -right-2 bg-zinc-700/80 backdrop-blur-sm rounded-full p-2 sm:p-3 border-2 border-zinc-600/50">
                  <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-zinc-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-zinc-400 text-xs">Name</p>
                  <p className="text-white font-medium text-sm sm:text-base truncate">{displayData.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex-shrink-0"
                  onClick={() => handleCopy(displayData.name, "name")}
                >
                  {copiedField === "name" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-zinc-400 text-xs">Country</p>
                  <p className="text-white font-medium text-sm sm:text-base truncate">{displayData.country}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex-shrink-0"
                  onClick={() => handleCopy(displayData.country, "country")}
                >
                  {copiedField === "country" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-zinc-400 text-xs">{tourist.proofType} Number</p>
                  <p className="text-white font-medium text-sm sm:text-base truncate">{displayData.idNumber}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex-shrink-0"
                  onClick={() => handleCopy(displayData.idNumber, "id")}
                >
                  {copiedField === "id" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-zinc-400 text-xs">Valid Until</p>
                  <p className="text-white font-medium text-sm sm:text-base truncate">{displayData.expiryDate}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex-shrink-0"
                  onClick={() => handleCopy(displayData.expiryDate, "expiry")}
                >
                  {copiedField === "expiry" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-zinc-900/50 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-zinc-400 text-xs">Blood Type</p>
                  <p className="text-white font-medium text-sm sm:text-base truncate">{displayData.bloodType}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex-shrink-0"
                  onClick={() => handleCopy(displayData.bloodType, "blood")}
                >
                  {copiedField === "blood" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/40 flex items-center gap-3">
              <Snowflake className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-xs sm:text-sm font-medium truncate">
                  Emergency: {displayData.emergencyContact}
                </p>
              </div>
            </div>

            <div className="border border-zinc-700/30 rounded-lg overflow-hidden bg-zinc-900/30">
              <button
                onClick={() => setQrExpanded(!qrExpanded)}
                className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-zinc-800/60 p-2 rounded-lg">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-300 rounded-sm"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-300 rounded-sm"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-300 rounded-sm"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-zinc-300 rounded-sm"></div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-xs sm:text-sm">Digital Verification</p>
                    <p className="text-zinc-400 text-xs">Show QR code for verification</p>
                  </div>
                </div>
                {qrExpanded ? (
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 flex-shrink-0" />
                )}
              </button>

              {qrExpanded && (
                <div className="p-4 sm:p-6 border-t border-zinc-700/30 bg-zinc-950/50">
                  <div className="bg-white p-3 sm:p-4 rounded-lg">
                    <img src={qrCodeUrl || "/placeholder.svg"} alt="Verification QR Code" className="w-full h-auto" />
                  </div>
                  <p className="text-zinc-400 text-xs text-center mt-3">Scan this code to verify tourist identity</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowConnectionPanel(true)}
              variant="outline"
              className="w-full border-zinc-700/40 text-zinc-300 hover:bg-zinc-800/40 hover:text-white bg-transparent text-sm sm:text-base"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              App Connection & Token
            </Button>

            <Button
              onClick={handleSOSToggle}
              className={`w-full text-sm sm:text-base ${
                tourist.sos ? "bg-red-600 hover:bg-red-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"
              }`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {tourist.sos ? "Cancel SOS" : "Send SOS"}
            </Button>

            {tourist.sos && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm font-medium">SOS ACTIVE</p>
                <p className="text-red-200/80 text-xs">Emergency status activated</p>
              </div>
            )}

            <Button
              onClick={logout}
              variant="outline"
              className="w-full border-zinc-700/40 text-zinc-300 hover:bg-zinc-800/40 hover:text-white bg-transparent text-sm sm:text-base"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {showConnectionPanel && <ConnectionStatusPanel onClose={() => setShowConnectionPanel(false)} />}
    </>
  )
}
