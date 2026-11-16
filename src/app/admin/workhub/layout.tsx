import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { resolveWorkHubActorScope } from "@/lib/workhub/permissions"
import { WorkHubShell } from "./components/WorkHubShell"

export const metadata = {
  title: "WorkHub • Quản lý công việc & KPI | SSM Sky-Line",
}
export const dynamic = "force-dynamic"

export default async function WorkHubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const actor = await resolveWorkHubActorScope()
  if (!actor) {
    return (
      <div className="min-h-[70vh] bg-[#F8FAFC] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs max-w-lg w-full p-6 space-y-4">
          <div className="border-l-4 border-[#003B3A] pl-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-[#D97706] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#003B3A]">
                Chức năng dành riêng cho nhóm quyền Ban KT&ĐBCL
              </h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Phân hệ <strong>WorkHub • Quản lý công việc & KPI</strong> chỉ dành riêng cho các tài khoản thuộc nhóm quyền{" "}
                <strong>Ban KT&ĐBCL</strong>, không áp dụng cho các tài khoản khác.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay về trang làm việc
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <WorkHubShell actor={actor}>{children}</WorkHubShell>
}
