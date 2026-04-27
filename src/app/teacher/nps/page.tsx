import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Construction } from "lucide-react"

export default async function TeacherPage() {
  const session = await auth()
  const userId = session?.user?.id
  
  // Here we will eventually fetch data filtered by the teacher's assigned classes
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Phân tích NPS</h1>
        <p className="text-slate-500 mt-1">Xem báo cáo phân tích chỉ số NPS từ các đợt khảo sát của lớp bạn phụ trách.</p>
      </div>
      
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <Construction className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-indigo-900 mb-2">Tính năng đang phát triển</h2>
        <p className="text-indigo-700/80 max-w-md mx-auto">
          Mô-đun Phân tích NPS cấp độ lớp học đang được hoàn thiện. Dữ liệu sẽ được trích xuất và liên kết với các lớp do bạn chủ nhiệm hoặc giảng dạy trong các bản cập nhật tới.
        </p>
      </div>
    </div>
  )
}
