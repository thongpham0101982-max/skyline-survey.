import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { PieChart, TrendingUp, Users } from "lucide-react"
import { SurveyTabs } from "@/components/SurveyTabs"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export default async function TeacherNpsPage() {
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
        { teachers: { some: { teacherId: teacher.id } } }
      ],
      academicYearId: activeYearId
    },
    select: { id: true, className: true }
  })
  
  const classIds = classes.map(c => c.id)

  const forms = await prisma.surveyForm.findMany({
    where: { 
      classId: { in: classIds },
      status: { in: ['SUBMITTED', 'ĐÃ HOÀN THÀNH'] }
    },
    include: {
      class: true,
      responses: {
        include: { question: { include: { section: true } } }
      }
    }
  })

  let promoters = 0;
  let detractors = 0;
  let passive = 0;
  let classNps: Record<string, {p: number, d: number, pa: number, name: string}> = {};

  classes.forEach(c => {
     classNps[c.id] = { p: 0, d: 0, pa: 0, name: c.className };
  });

  forms.forEach(form => {
    let npsScore = form.npsScoreRaw;
    if (npsScore === null) {
       const npsRes = form.responses.find(r => 
         r.question?.questionType === 'NPS' || 
         (r.question?.section?.name && r.question.section.name.toUpperCase().includes('NPS')) ||
         (r.question?.questionText && r.question.questionText.toUpperCase().includes('NPS'))
       );
       if (npsRes) {
          if (npsRes.numericScore !== null) npsScore = npsRes.numericScore;
          else {
             const strVal = npsRes.choiceAnswer || npsRes.textAnswer || '';
             const match = strVal.match(/\d+/);
             if (match) npsScore = parseInt(match[0], 10);
          }
       }
    }
    
    if (npsScore !== null && npsScore !== undefined) {
       if (npsScore >= 9) {
          promoters++;
          if(classNps[form.classId]) classNps[form.classId].p++;
       }
       else if (npsScore <= 6) {
          detractors++;
          if(classNps[form.classId]) classNps[form.classId].d++;
       }
       else {
          passive++;
          if(classNps[form.classId]) classNps[form.classId].pa++;
       }
    }
  });

  const totalNPS = promoters + detractors + passive;
  const nps = totalNPS > 0 ? Math.round(((promoters - detractors) / totalNPS) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Phân tích NPS</h1>
        <p className="text-slate-500 mt-1">Chỉ số thuộc năm học mặc định: <span className="font-bold text-[#00A19A]">{activeYear?.name || 'N/A'}</span></p>
      </div>
      
      <SurveyTabs activeTab="nps" role="TEACHER" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-violet-100 col-span-1 md:col-span-3 flex flex-col items-center justify-center py-12">
           <h2 className="text-xl font-medium text-slate-500 mb-4">Chỉ số NPS Tổng thể (Các lớp của bạn)</h2>
           <div className="text-6xl font-black text-[#00A19A] mb-4">{nps}</div>
           <div className="flex gap-8 text-sm font-medium">
             <div className="text-green-600 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Promoters (9-10): {promoters}</div>
             <div className="text-slate-500 flex items-center gap-2"><Users className="w-4 h-4"/> Passive (7-8): {passive}</div>
             <div className="text-red-500 flex items-center gap-2"><TrendingUp className="w-4 h-4 rotate-180"/> Detractors (0-6): {detractors}</div>
           </div>
        </div>
        
        {Object.values(classNps).map(cData => {
           const t = cData.p + cData.d + cData.pa;
           const score = t > 0 ? Math.round(((cData.p - cData.d) / t) * 100) : 0;
           return (
             <div key={cData.name} className="bg-white rounded-xl p-6 shadow-sm border-2 border-rose-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{cData.name}</h3>
                <div className="text-4xl font-black text-slate-900 mb-4">{score}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Promoters:</span> <span className="font-semibold text-green-600">{cData.p}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Passive:</span> <span className="font-semibold text-slate-600">{cData.pa}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Detractors:</span> <span className="font-semibold text-red-500">{cData.d}</span></div>
                </div>
             </div>
           )
        })}
      </div>
    </div>
  )
}
