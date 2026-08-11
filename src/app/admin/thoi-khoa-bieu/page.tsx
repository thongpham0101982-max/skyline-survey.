export const revalidate = 0

import TimetableClient from "./client"
import { getTimetableMatrixData } from "./actions"

export default async function TimetablePage({
  searchParams
}: {
  searchParams: Promise<{ campusId?: string; level?: string }>
}) {
  const params = await searchParams
  const initialData = await getTimetableMatrixData(params.campusId, params.level || "TIEU_HOC")

  return <TimetableClient initialData={initialData} />
}
