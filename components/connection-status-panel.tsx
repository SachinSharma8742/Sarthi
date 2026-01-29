"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Smartphone, Key, Copy, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ConnectionStatusPanelProps {
  onClose: () => void
}

export function ConnectionStatusPanel({ onClose }: ConnectionStatusPanelProps) {
  const [connectionToken, setConnectionToken] = useState<string | null>(null)
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const { tourist } = useAuth()
  const { toast } = useToast()

  if (!tourist) return null

  const generateConnectionToken = async () => {
    setIsGeneratingToken(true)
    try {
      const response = await fetch("/api/generate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("tourist_token")}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setConnectionToken(data.connectionToken)
        toast({
          title: "Token Generated",
          description: "Connection token generated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to generate connection token",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingToken(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Token copied to clipboard",
    })
  }

  // Mock connection status - in real app this would check if mobile app is connected
  const isAppConnected = false

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-950/95 backdrop-blur-md border-zinc-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-zinc-800/50">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile App Connection Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isAppConnected ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 border-orange-500/30">
                    Not Connected
                  </Badge>
                </>
              )}
            </div>

            {!isAppConnected && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <p className="text-orange-200 text-sm font-medium">App Not Connected</p>
                <p className="text-orange-200/80 text-xs">
                  Please connect your mobile app using the connection token below
                </p>
              </div>
            )}

            <div className="text-zinc-400 text-xs space-y-1">
              <p>
                Location: {tourist.latitude && tourist.longitude ? "Available" : "Not available (Mobile app required)"}
              </p>
              <p>SOS Status: {tourist.sos ? "Active" : "Inactive"}</p>
            </div>
          </div>

          {/* Connection Token */}
          <div className="space-y-3">
            <Label className="text-white text-sm">App Connection Token</Label>
            <div className="flex gap-2">
              <Button
                onClick={generateConnectionToken}
                disabled={isGeneratingToken}
                className="bg-zinc-700 hover:bg-zinc-600 text-white"
                size="sm"
              >
                {isGeneratingToken ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                Generate Token
              </Button>
            </div>

            {connectionToken && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={connectionToken}
                    readOnly
                    className="bg-zinc-900/50 border-zinc-700/50 text-white text-xs font-mono"
                  />
                  <Button
                    onClick={() => copyToClipboard(connectionToken)}
                    variant="outline"
                    size="icon"
                    className="border-zinc-700/50 text-white hover:bg-zinc-800/50"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-zinc-400 text-xs">
                  Use this token in your mobile app to connect to this web dashboard
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
