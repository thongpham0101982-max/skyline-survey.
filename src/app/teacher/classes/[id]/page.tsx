import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Users, Info, TrendingUp, ThumbsUp } from "lucide-react"
import Link from "next/link"

export default async function TeacherClassDetailPage({ params }: any) {
  const { id: classId } = await params
  
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      campus: true,
      academicYear: true,
      students: {
        include: {
          parents: true
        }
      }
    }
  })

  if (!classInfo) return notFound()

  // Calculate metrics

  const totalStudents = classInfo.students.length
  
  const forms = await prisma.surveyForm.findMany({
    where: { classId },
    include: { responses: { include: { question: { include: { section: true } } } } }
  })
  
  const submittedForms = forms.filter(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")
  
  // Total parents is sum of all parent links for students in this class
  const totalParents = classInfo.students.reduce((acc, s) => acc + s.parents.length, 0)
  
  // If no parents are linked, this is a student survey, so we use totalStudents as the target
  const expectedSubmissions = totalParents > 0 ? totalParents : totalStudents
  const completionRate = expectedSubmissions > 0 ? (submittedForms.length / expectedSubmissions) * 100 : 0
  
  // Calculate NPS and Satisfaction directly from responses since they might be null in the form table
  let promoters = 0;
  let detractors = 0;
  let passive = 0;
  let totalSatScore = 0;
  let satCount = 0;

  submittedForms.forEach(form => {
    // If npsScoreRaw exists on form, use it, otherwise find the NPS question in responses
    let npsScore = form.npsScoreRaw;
    if (npsScore === null) {
       const npsRes = form.responses.find(r => 
         r.question?.questionType === 'NPS' || 
         (r.question?.section?.name && r.question.section.name.toUpperCase().includes('NPS')) ||
         (r.question?.section?.code && r.question.section.code.toUpperCase().includes('NPS')) ||
         (r.question?.questionText && r.question.questionText.toUpperCase().includes('NPS'))
       );
       if (npsRes) {
          if (npsRes.numericScore !== null) {
             npsScore = npsRes.numericScore;
          } else {
             const strVal = npsRes.choiceAnswer || npsRes.textAnswer || '';
             const match = strVal.match(/\d+/);
             if (match) npsScore = parseInt(match[0], 10);
          }
       }
    }
    
    if (npsScore !== null && npsScore !== undefined) {
       if (npsScore >= 9) promoters++;
       else if (npsScore <= 6) detractors++;
       else passive++;
    }

    // Average Satisfaction
    let avgScore = form.overallAverageScore;
    if (avgScore === null) {
       // calculate from rating questions
       const ratings: number[] = [];
       form.responses.forEach(r => {
         const qType = r.question?.questionType || '';
         const sName = r.question?.section?.name?.toUpperCase() || '';
         const qText = r.question?.questionText?.toUpperCase() || '';
         const isRating = ['RATING', 'SATISFACTION', 'LIKERT'].includes(qType);
         const isRatingSection = sName.includes('HÀI LÒNG') || sName.includes('SATISFACTION') || sName.includes('ĐÁNH GIÁ');
         const isRatingText = qText.includes('HÀI LÒNG') || qText.includes('ĐÁNH GIÁ') || qText.includes('SATISFACTION');
         
         if (isRating || isRatingSection || isRatingText) {
            if (r.numericScore !== null) {
               ratings.push(r.numericScore);
            } else {
               const strVal = r.choiceAnswer || r.textAnswer || '';
               const match = strVal.match(/\d+/);
               if (match) ratings.push(parseInt(match[0], 10));
            }
         }
       });
       
       if (ratings.length > 0) {
          avgScore = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
       }
    }
    
    if (avgScore !== null && avgScore !== undefined && !isNaN(avgScore)) {
       totalSatScore += avgScore;
       satCount++;
    }
  });

  const totalNPSResponses = promoters + detractors + passive;
  const nps = totalNPSResponses > 0 ? Math.round(((promoters - detractors) / totalNPSResponses) * 100) : 0;
  const averageSatisfaction = satCount > 0 ? (totalSatScore / satCount) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2"><Link href="/teacher/classes" className="text-xs font-bold text-[#00A99D] hover:underline">&larr; Quay lại danh sách lớp</Link></div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{classInfo.className}</h1>
          <p className="text-slate-500 mt-1">Mã lớp: <span className="font-bold text-[#00A99D]">{classInfo.classCode}</span> • Cơ sở: <span className="font-bold text-slate-700">{classInfo.campus?.campusName}</span> • Năm học: <span className="font-bold text-slate-700">{classInfo.academicYear?.name}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-blue-100">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Tổng số Học sinh</h3>
           <div className="text-3xl font-bold text-slate-900">{totalStudents}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-amber-100">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Tỷ lệ Hoàn thành</h3>
           <div className="text-3xl font-bold text-slate-900">{completionRate > 100 ? 100 : completionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-indigo-100">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Hài lòng Trung bình</h3>
           <div className="text-3xl font-bold text-slate-900">{averageSatisfaction.toFixed(1)} / 5.0</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-emerald-100">
           <h3 className="text-sm font-medium text-slate-500 mb-2">Chỉ số NPS</h3>
           <div className="text-3xl font-bold text-slate-900">{nps}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border-2 border-violet-100 p-6 flex flex-col mt-8">
        <h3 className="text-xl font-bold mb-4">Trạng thái Khảo sát theo Học sinh</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-slate-600 text-xs font-semibold">
              <tr>
                <th className="p-2 p-2 font-semibold rounded-tl-lg border border-slate-200">Mã Học sinh</th>
                <th className="p-2 p-2 font-semibold border border-slate-200">Họ và Tên</th>
                <th className="p-2 p-2 font-semibold border border-slate-200">Số TK Phụ huynh</th>
                <th className="p-2 p-2 font-semibold rounded-tr-lg border border-slate-200">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {classInfo.students.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2 text-slate-500 border border-slate-200">Chưa có học sinh nào trong lớp.</td></tr>
              ) : (
                classInfo.students.map((student) => {
                  const studentForms = forms.filter(f => f.studentId === student.id)
                  const hasSubmitted = studentForms.some(f => f.status === "SUBMITTED")
                  
                  return (
                    <tr key={student.id} className="last:border-b-0 hover:bg-slate-50 transition-colors text-xs font-semibold">
                      <td className="p-2 p-2 font-medium text-slate-900 border border-slate-200">{student.studentCode}</td>
                      <td className="p-2 p-2 font-medium text-slate-700 border border-slate-200">{student.studentName}</td>
                      <td className="p-2 p-2 border border-slate-200">{student.parents.length}</td>
                      <td className="p-2 p-2 border border-slate-200">
                        {hasSubmitted ? (
                          <a href={`/teacher/classes/${classId}/${studentForms.find(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")?.id}`} className="inline-block text-[#00A99D] hover:bg-teal-100 hover:text-[#009085] text-xs font-bold tracking-wide transition-colors cursor-pointer text-xs font-semibold">ĐÃ HOÀN THÀNH (XEM)</a>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">CHƯA KHẢO SÁT</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}