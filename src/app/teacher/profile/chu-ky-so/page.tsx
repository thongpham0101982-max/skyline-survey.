import { TeacherSignatureProfileClient } from "./client";

export const metadata = {
  title: "Chữ ký số của tôi | Sky-Line SSM",
  description: "Thiết lập kết nối chứng thư số và mẫu hiển thị chữ ký số giáo viên",
};

export default function TeacherSignatureProfilePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <TeacherSignatureProfileClient />
    </div>
  );
}
