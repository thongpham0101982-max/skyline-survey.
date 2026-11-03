import { Suspense } from "react";
import NotificationManagementWorkspace from "@/components/notification-center/NotificationManagementWorkspace";

export const metadata = {
  title: "Thông báo Khảo thí & Trung tâm Liên lạc | Ban KT&ĐBCL Sky-Line",
  description:
    "Quản lý thông báo khảo thí, tự động hóa thông báo lịch thi, thay đổi lịch, công bố kết quả đã duyệt và Dashboard 10 KPI.",
};

export default function KtdbclExamNotificationsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Đang tải Trung tâm Thông báo Khảo thí...
          </div>
        }
      >
        <NotificationManagementWorkspace workspaceRole="KTDBCL" />
      </Suspense>
    </div>
  );
}
