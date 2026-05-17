// @ts-nocheck
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ArrowLeft, Send, ClipboardList, Info } from "lucide-react"
import Link from "next/link"

export default async function StudentSurveyFormPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  const periodId = params.id

  // 1. Get student and survey info
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { class: true }
  })
  
  const period = await prisma.surveyPeriod.findUnique({
    where: { id: periodId },
    include: { questions: { orderBy: { sortOrder: 'asc' } } }
  })

  if (!student || !period || period.targetAudience !== 'HocSinh' || period.status !== 'ACTIVE') {
    redirect("/Hocsinh/khaosat")
  }

  // 2. Check if already submitted
  const exists = await prisma.surveyForm.findFirst({
    where: { studentId: student.id, surveyPeriodId: periodId }
  })
  if (exists) {
    redirect("/Hocsinh/khaosat")
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-700">
      <Link href="/Hocsinh/khaosat" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold mb-8 transition-colors group">
         <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay lại danh sách
      </Link>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
         {/* Form Header */}
         <div className="bg-[#BE1E2E] p-10 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="relative z-10 flex items-start justify-between">
               <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/70 text-[10px] font-black uppercase tracking-widest">
                     <ClipboardList className="w-4 h-4" /> Khảo sát Skyline Academy
                  </div>
                  <h1 className="text-3xl font-black tracking-tight">{period.name}</h1>
                  <p className="text-white/80 font-medium text-sm flex items-center gap-2 mt-2">
                     <Info className="w-4 h-4" /> Dành cho học sinh lớp {student.class?.className}
                  </p>
               </div>
               <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-sm hidden sm:block">
                  <ClipboardList className="w-8 h-8" />
               </div>
            </div>
         </div>

         {/* Form Body - Placeholder for Survey Logic */}
         <div className="p-10 space-y-12">
            <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
               <p className="text-slate-400 font-bold">Giao diện bộ câu hỏi đang được tối ưu hóa...</p>
               <p className="text-slate-300 text-xs mt-1">Hệ thống sẽ cập nhật đầy đủ các lựa chọn trả lời trong giây lát.</p>
            </div>

            <button disabled className="w-full py-5 bg-slate-200 text-slate-400 font-black rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed">
               Gửi kết quả khảo sát <Send className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  )
}
