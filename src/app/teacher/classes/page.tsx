import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Users, Building2, CalendarDays } from "lucide-react"

async function getTeacherClasses(userId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return []

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { teachers: { some: { teacherId: teacher.id } } }
      ]
    },
    include: {
      campus: true,
      academicYear: true,
      _count: {
        select: { students: true }
      }
    }
  })

  return classes
}

export default async function TeacherClassesPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ''
  const classes = await getTeacherClasses(userId)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Classes</h1>
      <p className="text-slate-500">Manage your assigned classes and view their satisfaction metrics.</p>
      
      {classes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-slate-100">
          <p className="text-slate-500">No classes have been assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {classes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-slate-900">{c.className}</h3>
                    <p className="text-sm font-medium text-blue-600">{c.classCode}</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {c.status}
                  </span>
                </div>
                
                <div className="space-y-3 mt-6">
                  <div className="flex items-center text-sm text-slate-600">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    {c.campus?.campusName || 'N/A'}
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <CalendarDays className="w-4 h-4 mr-2 text-slate-400" />
                    {c.academicYear?.name || 'N/A'}
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Users className="w-4 h-4 mr-2 text-slate-400" />
                    {c._count?.students || 0} Students
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
                <Link 
                  href={`/teacher/classes/${c.id}`} 
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}