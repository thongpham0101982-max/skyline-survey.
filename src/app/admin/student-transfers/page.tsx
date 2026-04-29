
import { StudentTransfersClient } from "./client"

export default function StudentTransfersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Học sinh lưu chuyển</h1>
      </div>
      <StudentTransfersClient />
    </div>
  )
}
