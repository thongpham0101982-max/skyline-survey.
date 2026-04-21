import { prisma } from "@/lib/db"

export default async function DebugPage() {
  try {
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(SurveyForm)`)
    const campuses = await prisma.campus.findMany()
    const studentCount = await prisma.student.count()
    const classCount = await prisma.class.count()
    
    // Check for "Campus 4" specifically
    const campus4 = campuses.find(c => c.campusName.includes("4"))
    let campus4Issues: any[] = []
    
    if (campus4) {
       const c4Classes = await prisma.class.findMany({ where: { campusId: campus4.id } })
       for (const cls of c4Classes) {
          if (!cls.academicYearId) campus4Issues.push(`Lớp ${cls.className} thiếu academicYearId`)
       }
    }

    return (
      <div className="p-10 font-mono text-xs whitespace-pre bg-white min-h-screen text-slate-800">
        <h1 className="text-xl font-bold mb-4">Database Schema Debug (Production)</h1>
        
        {campus4Issues.length > 0 && (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl mb-8 border-2 border-red-200">
            <h2 className="font-black">PHÁT HIỆN LỖI DỮ LIỆU CƠ SỞ 4:</h2>
            <ul className="list-disc ml-5">
              {campus4Issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-slate-100 p-4 rounded-xl">Students: {studentCount}</div>
           <div className="bg-slate-100 p-4 rounded-xl">Classes: {classCount}</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200 mb-8">
          <h2 className="font-bold mb-2">SurveyForm Columns:</h2>
          {JSON.stringify(tableInfo, null, 2)}
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200">
          <h2 className="font-bold mb-2">Campuses:</h2>
          {JSON.stringify(campuses, null, 2)}
        </div>
      </div>
    )
  } catch (err: any) {
    return <div className="p-10 text-red-500 font-bold">Debug Error: {err.message}</div>
  }
}