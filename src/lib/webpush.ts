import webpush from "web-push"
import { prisma } from "@/lib/db"

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BGE-CSwFtCtjOMa2W2-8z3v_gz2eCdsY4rxf1xarRTjxVRdhihcFQ9yamXaswP4o4PK9fuZkEWqa0tOeAxxYUUk"
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ""
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@skylineschool.edu.vn"

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch (err) {
    console.error("[WebPush Init Error]:", err)
  }
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  deepLink?: string
  tag?: string
  actions?: Array<{ action: string; title: string }>
}

/**
 * Sends a Web Push notification to all active devices of a given user
 */
export async function sendPushNotificationToUser(userId: string, payload: PushPayload): Promise<{
  success: boolean
  sentCount: number
  failedCount: number
}> {
  if (!vapidPrivateKey) {
    console.warn("[WebPush] VAPID_PRIVATE_KEY not set. Push notification skipped.")
    return { success: false, sentCount: 0, failedCount: 0 }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true }
  }).catch(() => [])

  if (subscriptions.length === 0) {
    return { success: true, sentCount: 0, failedCount: 0 }
  }

  let sentCount = 0
  let failedCount = 0

  const rawTitle = payload.title || "Thông báo mới";
  const formattedTitle = rawTitle.startsWith("SSSQ Thông báo:") || rawTitle.startsWith("SSQM Thông báo:") || rawTitle.startsWith("SSM Thông báo:")
    ? rawTitle
    : `SSSQ Thông báo: ${rawTitle}`;

  const notificationData = JSON.stringify({
    title: formattedTitle,
    body: payload.body,
    icon: payload.icon || "/icons/ssm-192.png",
    badge: payload.badge || "/icons/ssm-96.png",
    deepLink: payload.deepLink || "/",
    tag: payload.tag || "ssm-notification",
    badgeCount: (payload as any).badgeCount || 1,
    actions: payload.actions || []
  })

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSub, notificationData)
        sentCount++
      } catch (err: any) {
        failedCount++
        console.warn(`[WebPush] Failed to send push to ${sub.endpoint.slice(0, 30)}...:`, err.statusCode || err.message)

        // If subscription is expired or unsubscribed, deactivate it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false }
          }).catch(() => {})
        }
      }
    })
  )

  return { success: true, sentCount, failedCount }
}
