import React from "react"
import { StudentStatisticsClient } from "@/components/student-statistics/StudentStatisticsClient"

export const metadata = {
  title: "Báo cáo thống kê học sinh | Phân tích tổng hợp · SSM Sky-Line",
  description:
    "Báo cáo thống kê học sinh cam kết đầu vào theo môn học và theo dõi tâm lý cam kết đầu vào trên hệ thống SSM Sky-Line.",
}

export default function StudentStatisticsReportPage() {
  return <StudentStatisticsClient />
}
