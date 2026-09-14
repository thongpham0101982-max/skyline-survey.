"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function getUserNotificationsAction() {
  try {
    const session = await auth()
    if (!session?.user?.id) return []

    const notifs = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return notifs
  } catch (err) {
    console.error("getUserNotificationsAction error:", err)
    return []
  }
}

export async function markNotificationsAsReadAction() {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true }
    })
    return { success: true }
  } catch (err) {
    console.error("markNotificationsAsReadAction error:", err)
    return { success: false }
  }
}