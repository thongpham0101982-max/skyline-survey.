import React, { Suspense } from "react"
import { WorkHubTasksView } from "../components/WorkHubTasksView"

export default function WorkHubMyTasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Đang tải Công việc của tôi...</div>}>
      <WorkHubTasksView
        defaultViewMode="MY_TASKS"
        pageTitle="Công việc của tôi"
        pageSubtitle="Các công việc bạn chịu trách nhiệm chính, tham gia phối hợp hoặc được phân công nghiệm thu"
      />
    </Suspense>
  )
}
