"use client"

import { useState } from "react"
import { TouristLogin } from "./tourist-login"
import { TouristRegister } from "./tourist-register"

export function AuthModal() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <TouristLogin onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <TouristRegister onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}
