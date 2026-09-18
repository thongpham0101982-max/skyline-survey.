export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { getParentChildren } from "@/lib/parentData"
import ParentProfileClient from "./client"

export default async function ParentProfilePage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ""
  const children = userId ? await getParentChildren(userId) : []

  return <ParentProfileClient initialChildren={children} />
}
