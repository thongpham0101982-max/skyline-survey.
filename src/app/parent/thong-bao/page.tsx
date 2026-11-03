import { Suspense } from "react";
import RecipientInboxView from "@/components/notification-center/RecipientInboxView";

export const metadata = {
  title: "Thông báo & Liên lạc Nhà trường | Cổng Phụ huynh Sky-Line",
  description:
    "Trung tâm Thông báo & Liên lạc: Lịch kiểm tra định kỳ, hướng dẫn ôn tập, kết quả học tập và thông báo từ Giáo viên.",
};

export default function ParentNotificationCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-slate-400">
          Đang tải Trung tâm Thông báo Phụ huynh Sky-Line...
        </div>
      }
    >
      <RecipientInboxView portalRole="PARENT" />
    </Suspense>
  );
}
