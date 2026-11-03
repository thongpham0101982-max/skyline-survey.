import { Suspense } from "react";
import KhaoThiSoAdminClient from "@/app/admin/ktdbcl/khao-thi-so/client";

export const metadata = {
  title: "Nhiệm vụ Khảo thí Số của Tôi | Giáo viên Sky-Line",
  description:
    "Không gian thực hiện các nhiệm vụ khảo thí được phân công: Soạn ma trận, Ra đề, Phản biện, Duyệt đề, Coi kiểm tra và Chấm bài OMR/LMS.",
};

export default function TeacherKhaoThiSoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải các nhiệm vụ Khảo thí Số được phân công cho Thầy/Cô...
        </div>
      }
    >
      <KhaoThiSoAdminClient mode="teacher" />
    </Suspense>
  );
}
