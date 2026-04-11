"use client"

import React from "react"
import { motion } from "framer-motion"
import { useLocation, Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
}

interface TubelightNavBarProps {
  items: NavItem[]
  className?: string
}

export function TubelightNavBar({ items, className }: TubelightNavBarProps) {
  const location = useLocation()
  const currentPath = location.pathname

  // Determine active tab based on current route
  const getActiveTab = () => {
    // Exact match first
    const exactMatch = items.find(item => item.url === currentPath)
    if (exactMatch) return exactMatch.name
    
    // Check for partial match (for nested routes)
    const partialMatch = items.find(item => 
      item.url !== "/" && currentPath.startsWith(item.url)
    )
    if (partialMatch) return partialMatch.name
    
    // Default to Home if on root or no match
    if (currentPath === "/") {
      const homeItem = items.find(item => item.url === "/")
      return homeItem?.name || items[0]?.name
    }
    
    return null
  }

  const activeTab = getActiveTab()

  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-background/60 backdrop-blur-xl border border-border/50 py-1.5 px-2 rounded-full shadow-lg",
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeTab === item.name

        return (
          <Link
            key={item.name}
            to={item.url}
            className={cn(
              "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-all duration-300",
              "text-muted-foreground hover:text-primary",
              isActive && "text-primary"
            )}
          >
            <span className="relative z-10">{item.name}</span>
            
            {isActive && (
              <motion.div
                layoutId="tubelight-glow"
                className="absolute inset-0 rounded-full -z-0"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 30,
                }}
              >
                {/* Glow background */}
                <div className="absolute inset-0 rounded-full bg-primary/15" />
                
                {/* Bottom tubelight glow effect */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-1">
                  {/* Center bright line */}
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-primary rounded-full" />
                  {/* Glow spread */}
                  <div className="absolute inset-x-[-25%] top-[-2px] h-2 bg-primary/40 blur-md rounded-full" />
                  {/* Outer glow */}
                  <div className="absolute inset-x-[-50%] top-[-4px] h-3 bg-primary/20 blur-xl rounded-full" />
                </div>
              </motion.div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
