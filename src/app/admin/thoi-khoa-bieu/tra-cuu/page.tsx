import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTimetableLookupAction } from "../actions"
import { LookupClient } from "./LookupClient"

export const dynamic = "force-dynamic"

export default async function TimetableLookupPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const sp = await props.searchParams
  const lookupTab =
    sp.lookupTab === "BY_TEACHER" ||
    sp.lookupTab === "BY_ROOM" ||
    sp.lookupTab === "MATRIX"
      ? sp.lookupTab
      : "BY_CLASS"

  const res = await getTimetableLookupAction({
    academicYearId: sp.academicYearId,
    semester: sp.semester ? Number(sp.semester) : undefined,
    scopeGroup: sp.scopeGroup as any,
    campusId: sp.campusId,
    levelCode: sp.levelCode as any,
    grade: sp.grade,
    classId: sp.classId,
    versionId: sp.versionId,
    viewedWeekDate: sp.viewedWeekDate,
    lookupTab,
    teacherId: sp.teacherId,
    roomId: sp.roomId,
  })

  if (!res.success) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#E11D48] font-semibold">
        {res.error}
      </div>
    )
  }

  return (
    <LookupClient
      initialData={res}
      initialTab={lookupTab}
      initialTeacherId={sp.teacherId || "ALL"}
      initialRoomId={sp.roomId || "ALL"}
    />
  )
}
