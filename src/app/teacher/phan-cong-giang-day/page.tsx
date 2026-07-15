import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { TeachingAssignmentClient } from "./client"
import { cookies } from "next/headers"

export default async function TeachingAssignmentsPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ""

  // 1. Get the teacher profile
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      departmentRel: true,
      campus: true,
    }
  })

  if (!teacher) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-16 text-center border-2 border-red-100 max-w-2xl mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy thông tin Giáo viên</h3>
        <p className="text-slate-500 text-xs mt-2">Tài khoản này chưa được liên kết với hồ sơ Giáo viên trong hệ thống. Vui lòng liên hệ với Quản trị viên để kiểm tra lại cấu hình phân quyền.</p>
      </div>
    )
  }

  // 2. Get all academic years
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  // 3. Get my teaching assignments
  const myAssignments = await prisma.teachingAssignment.findMany({
    where: {
      teacherId: teacher.id
    },
    include: {
      class: true,
      subject: true,
      academicYear: true
    },
    orderBy: [
      { academicYear: { startDate: 'desc' } },
      { semester: 'asc' },
      { class: { className: 'asc' } }
    ]
  })

  // 4. Get other teachers in the same department and their assignments
  let departmentTeachers: any[] = []
  if (teacher.departmentId) {
    departmentTeachers = await prisma.teacher.findMany({
      where: {
        departmentId: teacher.departmentId,
        status: "ACTIVE"
      },
      include: {
        departmentRel: true,
        TeachingAssignment: {
          include: {
            class: true,
            subject: true,
            academicYear: true
          },
          orderBy: [
            { academicYear: { startDate: 'desc' } },
            { semester: 'asc' },
            { class: { className: 'asc' } }
          ]
        }
      },
      orderBy: { teacherName: 'asc' }
    })
  }

  const cookieStore = await cookies()
  const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const safeJson = (d: any) => JSON.parse(JSON.stringify(d))

  return (
    <TeachingAssignmentClient
      teacher={safeJson(teacher)}
      initialMyAssignments={safeJson(myAssignments)}
      initialDeptTeachers={safeJson(departmentTeachers)}
      academicYears={safeJson(academicYears)}
      selectedYearCookie={activeYearCookie}
    />
  )
}
