import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

export default async function TeacherViewResultPage({ params }: any) {
  const { id: classId, formId } = await params
  
  const form = await prisma.surveyForm.findUnique({
    where: { id: formId },
    include: {
      student: true,
      surveyPeriod: true,
      responses: {
        include: {
          question: true
        }
      }
    }
  })

  if (!form || form.classId !== classId) return notFound()

  // Sắp xếp câu trả lời theo sortOrder của câu hỏi
  const sortedResponses = [...form.responses].sort((a, b) => {
    return (a.question?.sortOrder || 0) - (b.question?.sortOrder || 0)
  })

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link 
          href={`/teacher/classes/${classId}`}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kết quả Khảo sát: {form.student.studentName}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Mã HS: {form.student.studentCode} • {form.surveyPeriod.name}
            <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" /> Đã nộp
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-rose-100 overflow-hidden">
        <div className="p-6 text-xs font-semibold">
          <h2 className="font-semibold text-slate-800">Chi tiết câu trả lời</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {sortedResponses.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Không tìm thấy câu trả lời nào cho phiếu khảo sát này.
            </div>
          ) : (
            sortedResponses.map((res, index) => {
              const q = res.question
              if (!q) return null
              
              const isRating = ['RATING', 'NPS', 'LIKERT', 'SATISFACTION'].includes(q.questionType?.toUpperCase() || '')
              const isText = ['TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY'].includes(q.questionType?.toUpperCase() || '')
              const isChoice = ['CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'MULTI_SELECT'].includes(q.questionType?.toUpperCase() || '')
              
              let answerDisplay = "Không có câu trả lời"
              if (isRating && res.numericScore !== null) answerDisplay = `Điểm: ${res.numericScore} / ${q.ratingScaleMax || 5}`
              else if (isChoice && res.choiceAnswer) answerDisplay = res.choiceAnswer
              else if ((isText || q.questionType === 'MC_GRID' || q.questionType === 'CB_GRID') && res.textAnswer) answerDisplay = res.textAnswer
              else if (res.numericScore !== null) answerDisplay = String(res.numericScore)
              
              return (
                <div key={res.id} className="p-6 hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <h3 className="font-medium text-slate-900 leading-relaxed">
                        {q.questionText}
                      </h3>
                      <div className="p-4 shadow-inner text-xs font-semibold">
                        {q.questionType === 'MC_GRID' || q.questionType === 'CB_GRID' ? (
                          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{res.textAnswer}</pre>
                        ) : (
                          <p className="text-slate-800 font-medium">{answerDisplay}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
