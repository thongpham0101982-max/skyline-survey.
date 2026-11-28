import React from "react"
import { TeacherQualityClient } from "@/components/teacher-quality/TeacherQualityClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Quản trị chất lượng giáo viên · Thành tích & Bồi dưỡng GV | SSM Sky-Line",
  description:
    "Theo dõi dự giờ theo tháng trong hồ sơ giáo viên SSM, đối chiếu định mức Đi dự giờ và Dạy học theo quy định Sky-Line, liên kết tạo nội dung bồi dưỡng từ phiếu dự giờ đã duyệt.",
}

export default async function TeacherQualityGovernancePage(props: {
  searchParams: Promise<{ section?: string }>
}) {
  const sp = await props.searchParams
  return <TeacherQualityClient initialSection={sp?.section} />
}
