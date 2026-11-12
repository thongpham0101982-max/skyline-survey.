import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTimetableOverviewAction } from "./actions"
import { OverviewClient } from "./OverviewClient"

export const dynamic = "force-dynamic"

export default async function TimetableOverviewPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const sp = await props.searchParams
  const resolvedScopeGroup =
    sp.scopeGroup ||
    (sp.level === "TIEU_HOC" || sp.level === "TRUNG_HOC" || sp.level === "HILL"
      ? sp.level
      : undefined)
  const res = await getTimetableOverviewAction({
    academicYearId: sp.academicYearId,
    semester: sp.semester ? Number(sp.semester) : undefined,
    scopeGroup: resolvedScopeGroup as any,
    campusId: sp.campusId,
    versionId: sp.versionId,
  })

  if (!res.success) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#E11D48] font-semibold">
        {res.error}
      </div>
    )
  }

  return <OverviewClient initialData={res} />
}
