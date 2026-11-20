import { Suspense } from "react"
import { StudentNameRequestsClient } from "./client"

export const dynamic = "force-dynamic"

export default function StudentNameRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">Đang tải danh sách yêu cầu đổi tên học sinh...</div>
      }
    >
      <StudentNameRequestsClient />
    </Suspense>
  )
}
