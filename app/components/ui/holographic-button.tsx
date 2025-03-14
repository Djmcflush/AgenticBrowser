"use client"

import * as React from "react"
import { Button, type ButtonProps } from "./button"
import { Tilt } from "./tilt"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface HolographicButtonProps extends ButtonProps {
  intensity?: "low" | "medium" | "high"
  glowColor?: string
}

export function HolographicButton({
  children,
  className,
  intensity = "medium",
  glowColor = "rgba(149, 76, 233, 0.5)",
  ...props
}: HolographicButtonProps) {
  // Define the intensity settings
  const intensitySettings = {
    low: {
      rotationFactor: 5,
      glowSize: "0px 0px 10px",
      opacity: 0.6,
      shimmerSpeed: "3s",
    },
    medium: {
      rotationFactor: 10,
      glowSize: "0px 0px 15px",
      opacity: 0.8,
      shimmerSpeed: "2.5s",
    },
    high: {
      rotationFactor: 15,
      glowSize: "0px 0px 25px",
      opacity: 1,
      shimmerSpeed: "2s",
    },
  }

  const settings = intensitySettings[intensity]

  return (
    <Tilt rotationFactor={settings.rotationFactor} springOptions={{ stiffness: 300, damping: 20 }}>
      <Button 
        className={cn(
          "relative overflow-hidden border-0 bg-gradient-to-r from-indigo-500/60 via-purple-500/60 to-pink-500/60 backdrop-blur-sm",
          "transition-all duration-300 hover:shadow-[0_0_15px_rgba(149,76,233,0.5)]",
          className
        )}
        style={{
          boxShadow: `${settings.glowSize} ${glowColor}`,
        }}
        {...props}
      >
        {/* Shimmer overlay */}
        <motion.span 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{
            opacity: settings.opacity,
          }}
          animate={{
            x: ["calc(-100% - 100px)", "calc(100% + 100px)"],
          }}
          transition={{
            duration: parseFloat(settings.shimmerSpeed),
            ease: "linear",
            repeat: Infinity,
          }}
        />
        
        {/* Prismatic edge glow */}
        <span className="absolute inset-0 rounded-md bg-gradient-to-r from-cyan-300/20 via-purple-500/20 to-pink-300/20 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Text content with subtle glow */}
        <span className="relative z-10 text-white drop-shadow-sm">
          {children}
        </span>
      </Button>
    </Tilt>
  )
}
