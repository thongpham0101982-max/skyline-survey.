import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTimetableAdjustmentsPageAction } from "../actions"
import { SubstitutionClient } from "./SubstitutionClient"

export const dynamic = "force-dynamic"

export default async function TimetableAdjustmentsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const sp = await props.searchParams
  const res = await getTimetableAdjustmentsPageAction({
    academicYearId: sp.academicYearId,
    semester: sp.semester ? Number(sp.semester) : undefined,
    scopeGroup: sp.scopeGroup as any,
    campusId: sp.campusId,
    targetDate: sp.targetDate,
  })

  if (!res.success) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#E11D48] font-semibold">
        {res.error}
      </div>
    )
  }

  return <SubstitutionClient initialData={res} />
}
