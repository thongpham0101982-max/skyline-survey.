import React, { Suspense } from "react"
import { WorkHubTasksView } from "../components/WorkHubTasksView"

export default function WorkHubAssignedTasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Đang tải Công việc đã giao...</div>}>
      <WorkHubTasksView
        defaultViewMode="ASSIGNED_BY_ME"
        pageTitle="Công việc đã giao & chờ nghiệm thu"
        pageSubtitle="Theo dõi tiến độ, đổi hạn, quản lý việc lặp lại và xét duyệt nghiệm thu các đầu việc đã giao"
      />
    </Suspense>
  )
}
