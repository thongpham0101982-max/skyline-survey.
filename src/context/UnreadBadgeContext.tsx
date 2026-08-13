"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface BadgeInfo {
  badgeType: "NEW" | "HOT" | "COUNT" | string
  unreadCount: number
  title?: string | null
  isUnread: boolean
}

interface UnreadBadgeContextType {
  badges: Record<string, BadgeInfo>
  loading: boolean
  markAsRead: (featureKey: string) => Promise<void>
  refreshBadges: () => Promise<void>
  triggerMockBadge: (featureKey?: string, badgeType?: string, title?: string) => Promise<void>
}

const UnreadBadgeContext = createContext<UnreadBadgeContextType>({
  badges: {},
  loading: true,
  markAsRead: async () => {},
  refreshBadges: async () => {},
  triggerMockBadge: async () => {},
})

export function UnreadBadgeProvider({ children }: { children: React.ReactNode }) {
  const[badges, setBadges] = useState<Record<string, BadgeInfo>>({})
  const[loading, setLoading] = useState(true)

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/unread-badges")
      if (res.ok) {
        const data = await res.json()
        setBadges(data.badges || {})
      }
    } catch (err) {
      console.error("Failed to fetch unread badges:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBadges()
    const interval = setInterval(fetchBadges, 30000)
    return () => clearInterval(interval)
  }, [fetchBadges])

  const markAsRead = useCallback(async (featureKey: string) => {
    setBadges((prev) => {
      const next = { ...prev }
      delete next[featureKey]
      return next
    })

    try {
      const res = await fetch("/api/teacher/unread-badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, action: "markRead" }),
      })
      if (res.ok) {
        const data = await res.json()
        setBadges(data.badges || {})
      }
    } catch (err) {
      console.error("Failed to mark badge as read:", err)
    }
  }, [])

  const triggerMockBadge = useCallback(async (featureKey = "GVCN_CLASSES", badgeType = "NEW", title = "Cap nhat thu nghiem") => {
    try {
      const res = await fetch("/api/teacher/unread-badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, action: "triggerMock", badgeType, title }),
      })
      if (res.ok) {
        const data = await res.json()
        setBadges(data.badges || {})
      }
    } catch (err) {
      console.error("Failed to trigger mock badge:", err)
    }
  }, [])

  return (
    <UnreadBadgeContext.Provider
      value={{
        badges,
        loading,
        markAsRead,
        refreshBadges: fetchBadges,
        triggerMockBadge,
      }}
    >
      {children}
    </UnreadBadgeContext.Provider>
  )
}

export function useUnreadBadges() {
  return useContext(UnreadBadgeContext)
}