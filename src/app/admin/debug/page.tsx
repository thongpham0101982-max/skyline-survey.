import { prisma } from "@/lib/db"

export default async function DebugPage() {
  try {
    const campuses = await prisma.campus.findMany()
    const academicYears = await prisma.academicYear.findMany()
    
    // Check specific IDs from the user's error report
    const targetCampusId = "cmnofie8h0003uhvsggzaehkk"
    const targetAYId = "AY-2026"
    
    const campusExists = campuses.find(c => c.id === targetCampusId)
    const ayExists = academicYears.find(ay => ay.id === targetAYId)
    
    return (
      <div className="p-10 font-mono text-xs whitespace-pre bg-white min-h-screen text-slate-800">
        <h1 className="text-xl font-bold mb-4">Database Schema Debug (Production)</h1>
        
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
           <div className={`p-6 rounded-xl border-2 ${campusExists ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200 text-red-600"}`}>
              <b>Campus ID ({targetCampusId}):</b> {campusExists ? `KHỚP (${campusExists.campusName})` : "KHÔNG TỒN TẠI TRONG DB!"}
           </div>
           <div className={`p-6 rounded-xl border-2 ${ayExists ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200 text-red-600"}`}>
              <b>AcademicYear ID ({targetAYId}):</b> {ayExists ? "KHỚP" : "KHÔNG TỒN TẠI TRONG DB!"}
           </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200 mb-8">
           <h2 className="font-bold mb-2">Toàn bộ Năm học trong DB:</h2>
           {JSON.stringify(academicYears, null, 2)}
        </div>
        
        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200">
           <h2 className="font-bold mb-2">Toàn bộ Cơ sở trong DB:</h2>
           {JSON.stringify(campuses, null, 2)}
        </div>
      </div>
    )
  } catch (err: any) {
    return <div className="p-10 text-red-500 font-bold">Debug Error: {err.message}</div>
  }
}