export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TimetableClient from "@/app/admin/thoi-khoa-bieu/client"
import { getTimetableMatrixData } from "@/app/admin/thoi-khoa-bieu/actions"

export default async function TimetablePage(props: {
  searchParams: Promise<{ campusId?: string; level?: string }>
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const searchParams = await props.searchParams
  const initialData = await getTimetableMatrixData(searchParams.campusId, searchParams.level || "TIEU_HOC")

  if (!initialData.success) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold text-xs">
        Lỗi nạp dữ liệu Thời khóa biểu: {initialData.error || "Không thể tải ma trận Thời khóa biểu."}
      </div>
    )
  }

  return <TimetableClient initialData={initialData} />
}
