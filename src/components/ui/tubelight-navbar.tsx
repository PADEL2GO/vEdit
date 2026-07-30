"use client"

import React from "react"
import { useLocation, Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  /** Section-Akzentfarbe (hex) — färbt den aktiven Zustand */
  color?: string
}

interface TubelightNavBarProps {
  items: NavItem[]
  className?: string
}

export function TubelightNavBar({ items, className }: TubelightNavBarProps) {
  const location = useLocation()
  const currentPath = location.pathname

  const getActiveTab = () => {
    const exactMatch = items.find(item => item.url === currentPath)
    if (exactMatch) return exactMatch.name
    const partialMatch = items.find(item =>
      item.url !== "/" && currentPath.startsWith(item.url)
    )
    if (partialMatch) return partialMatch.name
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
        "flex items-center gap-1 bg-background/60 border border-border/50 py-1.5 px-2 rounded-full shadow-lg",
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
              "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-colors duration-150",
              "text-muted-foreground hover:text-primary",
              isActive && !item.color && "text-primary"
            )}
            style={isActive && item.color ? { color: item.color } : undefined}
          >
            <span className="relative z-10">{item.name}</span>

            {isActive && (
              <span
                className={cn("absolute inset-0 rounded-full -z-0 pointer-events-none", !item.color && "bg-primary/15")}
                style={item.color ? { background: `${item.color}26` } : undefined}
              >
                <span
                  className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-[2px] rounded-full", !item.color && "bg-primary")}
                  style={item.color ? { background: item.color } : undefined}
                />
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
