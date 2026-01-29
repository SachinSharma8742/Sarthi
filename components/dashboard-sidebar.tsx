"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { TouristPanel } from "./tourist-panel"

export function DashboardSidebar() {
  const { tourist } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!tourist) return null

  return (
    <>
      {/* Hamburger Menu Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 left-6 z-50 bg-black/80 backdrop-blur-sm border-white/20 text-white hover:bg-black/90"
        size="icon"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-screen max-w-[420px] bg-transparent z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 md:p-6 h-full overflow-y-auto overflow-x-hidden flex items-start">
          {/* Close Button */}
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 text-white hover:bg-white/10 z-10"
          >
            <X className="h-5 w-5" />
          </Button>

          <TouristPanel />
        </div>
      </div>
    </>
  )
}
