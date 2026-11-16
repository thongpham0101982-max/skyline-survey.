import React from "react"
import { redirect } from "next/navigation"
import { resolveWorkHubActorScope } from "@/lib/workhub/permissions"
import { WorkHubShell } from "./components/WorkHubShell"

export const metadata = {
  title: "WorkHub • Quản lý Công việc – Báo cáo – KPI | SSM Sky-Line",
}
export const dynamic = "force-dynamic"

export default async function WorkHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await resolveWorkHubActorScope()
  if (!actor) {
    redirect("/login")
  }

  return <WorkHubShell actor={actor}>{children}</WorkHubShell>
}
