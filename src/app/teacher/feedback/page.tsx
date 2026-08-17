import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { MessageSquare, Quote } from "lucide-react"
import { SurveyTabs } from "@/components/SurveyTabs"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export default async function TeacherFeedbackPage() {
  const session = await auth()
  const userId = session?.user?.id
  
  if (!userId) return notFound()

  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return notFound()

  const activeYear = await getDefaultAcademicYear();
  const activeYearId = activeYear?.id || "";

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { homeroomTeacherId: { contains: teacher.id } },
        { teachers: { some: { teacherId: teacher.id } } }
      ],
      academicYearId: activeYearId
    },
    select: { id: true }
  })
  
  const classIds = classes.map(c => c.id)

  const forms = await prisma.surveyForm.findMany({
    where: { 
      classId: { in: classIds },
      status: { in: ['SUBMITTED', 'ĐÃ HOÀN THÀNH'] }
    },
    include: {
      class: true,
      student: true,
      responses: {
        include: { question: true }
      }
    },
    orderBy: { submissionDateTime: 'desc' }
  })

  const feedbacks: any[] = [];
  
  forms.forEach(form => {
     form.responses.forEach(r => {
        if (r.textAnswer && r.textAnswer.trim().length > 0 && r.textAnswer !== '[]' && r.textAnswer !== '{}') {
           // Ignore MC_GRID JSON
           try {
              JSON.parse(r.textAnswer);
              if (r.textAnswer.includes('{') || r.textAnswer.includes('[')) return;
           } catch(e) {}
           
           feedbacks.push({
              id: r.id,
              student: form.student.studentName,
              className: form.class?.className,
              question: r.question?.questionText,
              answer: r.textAnswer,
              date: form.submissionDateTime
           });
        }
     });
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Theo dõi Phản hồi</h1>
        <p className="text-slate-500 mt-1">Các ý kiến đóng góp thuộc năm học mặc định: <span className="font-bold text-[#36E08F]">{activeYear?.name || 'N/A'}</span></p>
      </div>
      
      <SurveyTabs activeTab="feedback" role="TEACHER" />
      
      <div className="grid gap-4 mt-8">
        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-teal-100">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Chưa có phản hồi nào</h3>
            <p className="text-slate-500 mt-1">Hiện tại chưa có học sinh nào để lại ý kiến đóng góp, hoặc các ý kiến đều là rỗng ("không", "tốt").</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {feedbacks.map(fb => (
               <div key={fb.id} className="flex items-start gap-4 hover:bg-slate-50 transition-colors shadow-sm text-xs font-semibold">
                  <div className="min-w-[120px] pt-1 shrink-0">
                     <span className="text-[#36E08F] text-[10px] font-black tracking-wider uppercase text-xs font-semibold">
                        {fb.className}
                     </span>
                     <div className="text-[11px] font-bold text-slate-700 mt-2">{fb.student}</div>
                     <div className="text-[9px] font-semibold text-slate-400 mt-0.5">{fb.date ? new Date(fb.date).toLocaleDateString('vi-VN') : ''}</div>
                  </div>
                  <div className="w-[1px] self-stretch bg-slate-100 mx-2"></div>
                  <div className="flex-1">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CÂU HỎI: {fb.question}</div>
                     <p className="text-[14px] text-slate-800 leading-relaxed font-medium">"{fb.answer}"</p>
                  </div>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
