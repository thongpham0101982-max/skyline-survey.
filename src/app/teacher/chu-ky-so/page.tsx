import { TeacherChuKySoHubClient } from "./client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chữ ký số & Hồ sơ chờ ký | Sky-Line SSM",
  description: "Trung tâm quản lý chứng thư chữ ký số và phê duyệt hồ sơ học sinh, sổ điểm chờ ký",
};

export default async function TeacherChuKySoPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <TeacherChuKySoHubClient />
    </div>
  );
}
