import { prisma } from "@/lib/db"

export default async function DebugPage() {
  try {
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(SurveyForm)`)
    const campuses = await prisma.campus.findMany()
    const academicYears = await prisma.academicYear.findMany()
    const studentCount = await prisma.student.count()
    const classCount = await prisma.class.count()
    
    // Check for "9S_CS4" class
    const class9S = await prisma.class.findFirst({
       where: { className: "9S_CS4" },
       include: { 
          campus: true,
          academicYear: true,
          students: { take: 1 }
       }
    })

    return (
      <div className="p-10 font-mono text-xs whitespace-pre bg-white min-h-screen text-slate-800">
        <h1 className="text-xl font-bold mb-4">Database Schema Debug (Production)</h1>
        
        <div className="bg-blue-50 p-6 rounded-xl mb-8 border-2 border-blue-200">
          <h2 className="font-black mb-2">Dữ liệu lớp 9S_CS4:</h2>
          {class9S ? JSON.stringify(class9S, null, 2) : "KHÔNG TÌM THẤY LỚP 9S_CS4"}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-slate-100 p-4 rounded-xl">Students: {studentCount}</div>
           <div className="bg-slate-100 p-4 rounded-xl">Classes: {classCount}</div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200 mb-8">
          <h2 className="font-bold mb-2">Danh sách Năm học (AcademicYear) trong DB:</h2>
          {JSON.stringify(academicYears, null, 2)}
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