export const dynamic = "force-dynamic"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { TeacherClassesClient } from "./client"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect"
import { AlertCircle } from "lucide-react"

async function getTeacherClasses(teacherId: string, academicYearId?: string) {
  try {
    let yearId = academicYearId;
    if (yearId) {
      const yearExists = await prisma.academicYear.findUnique({ where: { id: yearId } }).catch(() => null);
      if (!yearExists) yearId = undefined;
    }
    
    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } }).catch(() => null);
      yearId = activeYear?.id;
    }

    const classes = await prisma.class.findMany({
      where: {
        ...(yearId ? { academicYearId: yearId } : {}),
        OR: [
          { homeroomTeacherId: teacherId },
          { homeroomTeacherId: { contains: teacherId } },
          { teachers: { some: { teacherId: teacherId } } }
        ]
      },
      include: {
        campus: true,
        academicYear: true,
        _count: {
          select: { students: true }
        }
      }
    }).catch(() => [])

    return classes.map(c => ({
      ...c,
      isHomeroom: c.homeroomTeacherId === teacherId || 
                  (c.homeroomTeacherId ? c.homeroomTeacherId.includes(teacherId) : false)
    }))
  } catch (err) {
    console.error("Error in getTeacherClasses:", err)
    return []
  }
}

export default async function TeacherClassesPage() {
  let session: any = null
  try {
    session = await auth()
  } catch (err) {
    console.error("Error authenticating TeacherClassesPage:", err)
  }

  if (!session) {
    redirect("/login")
  }

  const userId = (session?.user as any)?.id || ''
  const userEmail = session?.user?.email || ''

  try {
    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } }).catch(() => null)
    }

    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { teacherCode: userEmail },
            { teacherCode: userEmail.split('@')[0] }
          ]
        }
      }).catch(() => null)
    }

    if (!teacher) {
      return (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-amber-100 max-w-2xl mx-auto my-8">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Không tìm thấy thông tin Hồ sơ Giáo viên</h3>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Tài khoản của bạn ({userEmail || 'N/A'}) chưa được liên kết với thông tin Giáo viên trong hệ thống.
            Vui lòng liên hệ với Quản trị viên để kiểm tra và phân quyền hồ sơ.
          </p>
        </div>
      )
    }

    const cookieStore = await cookies()
    const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value

    const classes = await getTeacherClasses(teacher.id, activeYearCookie)
    
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" }
    }).catch(() => [])

    const safeJson = (d: any) => JSON.parse(JSON.stringify(d || []))

    return (
      <TeacherClassesClient 
        initialClasses={safeJson(classes)} 
        academicYears={safeJson(academicYears)} 
        selectedYearCookie={activeYearCookie}
      />
    )
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error loading TeacherClassesPage:", error)
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-red-100 max-w-2xl mx-auto my-8">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-200">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Đã xảy ra lỗi khi tải danh sách Lớp học</h3>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          Hệ thống gặp sự cố tạm thời khi truy vấn dữ liệu lớp học. Vui lòng tải lại trang hoặc liên hệ quản trị viên.
        </p>
      </div>
    )
  }
}
