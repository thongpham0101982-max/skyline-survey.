import { prisma } from "@/lib/db"

export type BadgeType = "NEW" | "HOT" | "COUNT"

export interface TriggerBadgeOptions {
  userIds?: string[]
  teacherIds?: string[]
  featureKey: string
  badgeType?: BadgeType
  unreadCount?: number
  title?: string
}

export async function triggerFeatureBadgeUpdate(options: TriggerBadgeOptions) {
  try {
    const { featureKey, badgeType = "NEW", unreadCount = 1, title } = options
    let targetUserIds: string[] = options.userIds || []

    if (options.teacherIds && options.teacherIds.length > 0) {
      const teachers = await prisma.teacher.findMany({
        where: { id: { in: options.teacherIds } },
        select: { userId: true },
      })
      const userIdsFromTeachers = teachers.map((t) => t.userId)
      targetUserIds = Array.from(new Set([...targetUserIds, ...userIdsFromTeachers]))
    }

    if (targetUserIds.length === 0) {
      const allTeachers = await prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        select: { userId: true },
      })
      targetUserIds = allTeachers.map((t) => t.userId)
    }

    if (targetUserIds.length === 0) return

    const now = new Date()

    await Promise.all(
      targetUserIds.map((userId) =>
        prisma.userFeatureBadge.upsert({
          where: {
            userId_featureKey: {
              userId,
              featureKey,
            },
          },
          create: {
            userId,
            featureKey,
            badgeType,
            unreadCount,
            title: title || null,
            lastUpdatedContentAt: now,
            lastViewedAt: null,
          },
          update: {
            badgeType,
            unreadCount: { increment: unreadCount },
            title: title || undefined,
            lastUpdatedContentAt: now,
            lastViewedAt: null,
          },
        })
      )
    )
  } catch (error) {
    console.error("Error triggering feature badge update:", error)
  }
}

export async function getUserUnreadBadges(userId: string) {
  try {
    const badges = await prisma.userFeatureBadge.findMany({
      where: {
        userId,
      },
    })

    const result: Record<string, { badgeType: string; unreadCount: number; title?: string | null; isUnread: boolean }> = {}

    for (const b of badges) {
      const isUnread = !b.lastViewedAt || b.lastUpdatedContentAt > b.lastViewedAt
      if (isUnread) {
        result[b.featureKey] = {
          badgeType: b.badgeType,
          unreadCount: b.unreadCount,
          title: b.title,
          isUnread: true,
        }
      }
    }

    return result
  } catch (error) {
    console.error("Error getting user unread badges:", error)
    return {}
  }
}

export async function markFeatureBadgeAsRead(userId: string, featureKey: string) {
  try {
    await prisma.userFeatureBadge.upsert({
      where: {
        userId_featureKey: {
          userId,
          featureKey,
        },
      },
      create: {
        userId,
        featureKey,
        badgeType: "NEW",
        unreadCount: 0,
        lastViewedAt: new Date(),
      },
      update: {
        unreadCount: 0,
        lastViewedAt: new Date(),
      },
    })
  } catch (error) {
    console.error("Error marking feature badge as read:", error)
  }
}