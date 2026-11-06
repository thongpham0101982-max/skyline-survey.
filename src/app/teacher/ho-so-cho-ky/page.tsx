import { TeacherHoSoChoKyClient } from "./client";

export const metadata = {
  title: "Hồ sơ chờ ký số | Sky-Line SSM",
  description: "Danh sách hồ sơ học sinh, phiếu nhận xét và đánh giá chờ ký số của giáo viên",
};

export default function TeacherHoSoChoKyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <TeacherHoSoChoKyClient />
    </div>
  );
}
