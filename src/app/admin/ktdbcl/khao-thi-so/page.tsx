import { Suspense } from "react";
import KhaoThiSoAdminClient from "./client";

export const metadata = {
  title: "Khảo thí Số (OMR & LMS) | SSM Sky-Line",
  description:
    "Nền tảng Khảo thí Số thống nhất: Kỳ kiểm tra, Phân công, Ma trận, Hồ sơ đề, Lịch & Coi kiểm tra, Chấm bài OMR/LMS, Duyệt điểm & Phân tích chất lượng.",
};

export default function KhaoThiSoAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải không gian quản trị Khảo thí Số Sky-Line...
        </div>
      }
    >
      <KhaoThiSoAdminClient mode="admin" />
    </Suspense>
  );
}
