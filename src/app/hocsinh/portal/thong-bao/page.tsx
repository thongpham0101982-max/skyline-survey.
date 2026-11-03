import { Suspense } from "react";
import RecipientInboxView from "@/components/notification-center/RecipientInboxView";

export const metadata = {
  title: "Thông báo Khảo thí & Học tập | Cổng Học sinh 360° Sky-Line",
  description:
    "Xem lịch kiểm tra định kỳ, phòng thi, hướng dẫn làm bài trên LMS, đề cương ôn tập từ Giáo viên và kết quả học tập.",
};

export default function StudentNotificationCenterPage() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Đang tải Hộp thư Thông báo Học sinh...
          </div>
        }
      >
        <RecipientInboxView portalRole="STUDENT" />
      </Suspense>
    </div>
  );
}
