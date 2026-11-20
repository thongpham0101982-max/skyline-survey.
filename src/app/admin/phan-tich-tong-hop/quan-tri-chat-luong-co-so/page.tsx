import React from "react"
import { CampusQualityDashboardClient } from "@/components/campus-quality/CampusQualityDashboardClient"

export const metadata = {
  title: "Quản trị chất lượng theo cơ sở | Phân tích tổng hợp · SSM Sky-Line",
  description:
    "Dashboard trực quan Realtime giúp Giám đốc cơ sở và Ban KT&ĐBCL theo dõi quy mô học sinh, chất lượng học tập, tuyển sinh, thành tích, dự giờ và hỗ trợ học sinh.",
}

export default function CampusQualityGovernancePage() {
  return <CampusQualityDashboardClient />
}
