export const revalidate = 0

import TimetableClient from "@/app/admin/thoi-khoa-bieu/client"
import { getTimetableMatrixData } from "@/app/admin/thoi-khoa-bieu/actions"

export default async function TeacherTimetablePage({
  searchParams
}: {
  searchParams: Promise<{ campusId?: string; level?: string }>
}) {
  const params = await searchParams
  const initialData = await getTimetableMatrixData(params.campusId, params.level || "TIEU_HOC")

  return <TimetableClient initialData={initialData} />
}
