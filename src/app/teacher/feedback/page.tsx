import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { MessageSquare, Quote } from "lucide-react"

export default async function TeacherFeedbackPage() {
  const session = await auth()
  const userId = session?.user?.id
  
  if (!userId) return notFound()

  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return notFound()

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { teachers: { some: { teacherId: teacher.id } } }
      ]
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
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Theo dõi Phản hồi</h1>
        <p className="text-slate-500 mt-1">Các ý kiến đóng góp dạng văn bản từ học sinh và phụ huynh.</p>
      </div>
      
      <div className="grid gap-4 mt-8">
        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Chưa có phản hồi nào</h3>
            <p className="text-slate-500 mt-1">Hiện tại chưa có học sinh nào để lại ý kiến đóng góp bằng chữ.</p>
          </div>
        ) : (
          feedbacks.map(fb => (
            <div key={fb.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
               <Quote className="w-24 h-24 text-slate-50 absolute -top-4 -right-4 rotate-12" />
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <div className="font-bold text-slate-800">{fb.student} <span className="text-slate-400 font-normal">({fb.className})</span></div>
                     <div className="text-xs text-slate-500 mt-0.5">{fb.date ? new Date(fb.date).toLocaleString('vi-VN') : ''}</div>
                   </div>
                   <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold max-w-xs truncate">
                     Câu hỏi: {fb.question}
                   </div>
                 </div>
                 <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-700 italic">
                   "{fb.answer}"
                 </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
