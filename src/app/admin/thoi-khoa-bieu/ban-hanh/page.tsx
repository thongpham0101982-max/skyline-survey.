import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTimetablePublishPageAction } from "../actions"
import { PublishClient } from "./PublishClient"

export const dynamic = "force-dynamic"

export default async function TimetablePublishPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const sp = await props.searchParams
  const res = await getTimetablePublishPageAction({
    academicYearId: sp.academicYearId,
    semester: sp.semester ? Number(sp.semester) : undefined,
    scopeGroup: sp.scopeGroup as any,
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

  return <PublishClient initialData={res} />
}
