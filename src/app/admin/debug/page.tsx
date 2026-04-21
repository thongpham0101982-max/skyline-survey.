import { prisma } from "@/lib/db"

export default async function DebugPage() {
  try {
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(SurveyForm)`)
    
    return (
      <div className="p-10 font-mono text-xs whitespace-pre bg-white min-h-screen text-slate-800">
        <h1 className="text-xl font-bold mb-4">Database Schema Debug (Production)</h1>
        <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-200">
          <h2 className="font-bold mb-2">SurveyForm Columns:</h2>
          {JSON.stringify(tableInfo, null, 2)}
        </div>
      </div>
    )
  } catch (err: any) {
    return <div className="p-10 text-red-500 font-bold">Debug Error: {err.message}</div>
  }
}