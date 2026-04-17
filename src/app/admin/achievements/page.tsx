import { prisma } from "@/lib/db"
import { AchievementsClient } from "./client"

export const metadata = { title: "Danh mục Kỳ thi/Thành tích | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  // We force a dynamic fetch and catch errors to show a clearer message if the DB is not updated
  let achievements = [];
  try {
    achievements = await (prisma as any).studentAchievement.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("DB Fetch Error:", error);
    return (
      <div className="p-8 bg-white rounded-2xl shadow-sm border border-red-200">
        <h1 className="text-xl font-bold text-red-600 mb-4">Lỗi Kết nối Cơ sở dữ liệu</h1>
        <p className="text-slate-600 mb-6">
          Hệ thống ghi nhận bạn chưa khởi động lại máy chủ (Server) sau khi cập nhật cấu trúc dữ liệu mới.
        </p>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm font-mono text-red-800">
          Cách khắc phục:<br/>
          1. Quay lại cửa sổ Terminal đang chạy `npm run dev`<br/>
          2. Ấn phím <span className="font-bold underline">Ctrl + C</span><br/>
          3. Chạy lại lệnh <span className="font-bold underline">npm run dev</span><br/>
          4. Tải lại trang này (F5)
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Danh mục Kỳ thi - Cuộc thi</h1>
        <p className="text-slate-500 mt-1">Quản lý các danh mục kỳ thi, lĩnh vực và tính chất.</p>
      </div>
      <AchievementsClient initialData={achievements} />
    </div>
  )
}
