"use client"

import React from "react"
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
              isActive && "text-primary"
            )}
          >
            <span className="relative z-10">{item.name}</span>

            {isActive && (
              <span className="absolute inset-0 rounded-full bg-primary/15 -z-0 pointer-events-none">
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-primary rounded-full" />
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
