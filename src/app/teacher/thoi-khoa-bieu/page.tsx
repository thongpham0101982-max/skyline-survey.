export const revalidate = 0

import { Suspense } from "react"
import TimetableClient from "@/app/admin/thoi-khoa-bieu/client"
import { getTimetableMatrixData } from "@/app/admin/thoi-khoa-bieu/actions"

async function TimetableDataLoader({ campusId, level }: { campusId?: string; level?: string }) {
  const initialData = await getTimetableMatrixData(campusId, level || "TIEU_HOC")
  return <TimetableClient initialData={initialData} />
}

export default async function TeacherTimetablePage({
  searchParams
}: {
  searchParams: Promise<{ campusId?: string; level?: string }>
}) {
  const params = await searchParams

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#00A99D]/10 text-[#00A99D] flex items-center justify-center mx-auto animate-spin">
            ⏳
          </div>
          <p className="text-sm font-black text-slate-800">Đang tải ma trận Thời khóa biểu...</p>
        </div>
      </div>
    }>
      <TimetableDataLoader campusId={params.campusId} level={params.level} />
    </Suspense>
  )
}
