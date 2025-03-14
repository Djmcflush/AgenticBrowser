"use client"

import React from "react"
import { HolographicButton } from "./holographic-button"
import { Card } from "./card"

export function HolographicButtonDemo() {
  return (
    <Card className="p-6 space-y-8 bg-black/80 backdrop-blur-md">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-4">Holographic Button</h2>
        <p className="text-gray-400 mb-6">A button with holographic effects that responds to mouse movement</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center space-y-2">
          <p className="text-sm font-medium text-gray-300">Low Intensity</p>
          <HolographicButton intensity="low">
            Low Effect
          </HolographicButton>
        </div>
        
        <div className="flex flex-col items-center space-y-2">
          <p className="text-sm font-medium text-gray-300">Medium Intensity</p>
          <HolographicButton intensity="medium">
            Medium Effect
          </HolographicButton>
        </div>
        
        <div className="flex flex-col items-center space-y-2">
          <p className="text-sm font-medium text-gray-300">High Intensity</p>
          <HolographicButton intensity="high" glowColor="rgba(233, 76, 197, 0.5)">
            High Effect
          </HolographicButton>
        </div>
      </div>
      
      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-lg font-medium text-white mb-4">Different Sizes</h3>
        <div className="flex flex-wrap gap-4 justify-center">
          <HolographicButton size="sm" intensity="medium">
            Small
          </HolographicButton>
          <HolographicButton size="default" intensity="medium">
            Default
          </HolographicButton>
          <HolographicButton size="lg" intensity="medium">
            Large
          </HolographicButton>
        </div>
      </div>
      
      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-lg font-medium text-white mb-4">Custom Glow Colors</h3>
        <div className="flex flex-wrap gap-4 justify-center">
          <HolographicButton intensity="medium" glowColor="rgba(76, 233, 153, 0.6)">
            Green Glow
          </HolographicButton>
          <HolographicButton intensity="medium" glowColor="rgba(233, 160, 76, 0.6)">
            Orange Glow
          </HolographicButton>
          <HolographicButton intensity="medium" glowColor="rgba(76, 145, 233, 0.6)">
            Blue Glow
          </HolographicButton>
        </div>
      </div>
    </Card>
  )
}
