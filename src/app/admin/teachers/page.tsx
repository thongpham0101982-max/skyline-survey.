import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { TeacherManagerClient } from "./client"
import { getAdminSession } from "@/lib/session"

export const metadata = { title: "Quản lý Giáo viên | Cổng Quản trị" }

export default async function TeacherManagerPage() {
  const session = await getAdminSession()

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, isOff: true }
  })
  const activeYear = await getDefaultAcademicYear(prisma)
  const defaultYearId = activeYear?.id || years.find(y => y.status === "ACTIVE" && !y.isOff)?.id || years.find(y => !y.isOff)?.id || years[0]?.id || null

  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, blockCM: true }
  })

  const subjects = await prisma.subject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { subjectName: "asc" },
    select: { id: true, subjectCode: true, subjectName: true }
  })

  // Filter campuses based on session
  const campusWhere = session.isFullAccess ? { status: "ACTIVE" } : { id: { in: session.allowedCampusIds }, status: "ACTIVE" }
  const campuses = await prisma.campus.findMany({
    where: campusWhere,
    orderBy: { campusName: "asc" },
    select: { id: true, campusCode: true, campusName: true }
  })

  // Filter teachers based on session
  const teacherWhere = session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } }
  const rawTeachers = await prisma.teacher.findMany({
    where: teacherWhere,
    orderBy: { teacherName: "asc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          campusAssignments: {
            include: {
              campus: { select: { id: true, campusName: true, campusCode: true } }
            }
          }
        }
      },
      departmentRel: { select: { name: true, blockCM: true } },
      departmentAssignments: {
        include: {
          department: { select: { id: true, name: true, blockCM: true, code: true } }
        }
      },
      mainSubjectRel: { select: { subjectName: true } },
      campus: { select: { campusName: true } }
    }
  })

  // Filter classes based on session
  const classWhere = session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } }
  const classes = await prisma.class.findMany({
    where: classWhere,
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }],
    include: {
      academicYear: { select: { id: true, name: true } },
      campus: { select: { campusName: true } }
    }
  })

  const homeroomAssignments = await prisma.$queryRaw`
    SELECT id as classId, homeroomTeacherId, className FROM Class WHERE homeroomTeacherId IS NOT NULL
  ` as { classId: string, homeroomTeacherId: string, className: string }[]

  const classHomeroomMap = new Map<string, any>()
  homeroomAssignments.forEach(a => {
    if (a.homeroomTeacherId) {
      a.homeroomTeacherId.split(",").forEach(id => {
        classHomeroomMap.set(id.trim(), a);
      });
    }
  })

  const teachers = rawTeachers.map(t => ({
    id: t.id,
    teacherCode: t.teacherCode,
    teacherName: t.teacherName,
    dateOfBirth: t.dateOfBirth || null,
    department: t.departmentRel?.name || null,
    departmentId: t.departmentId || null,
    departmentBlockCM: t.departmentRel?.blockCM || null,
    departmentAssignments: (t.departmentAssignments || []).map(da => ({
      id: da.id,
      departmentId: da.departmentId,
      departmentName: da.department?.name || "",
      departmentCode: da.department?.code || "",
      blockCM: da.department?.blockCM || null,
      position: da.position || "GV",
      isPrimary: da.isPrimary
    })),
    departmentIds: (t.departmentAssignments || []).map(da => da.departmentId),
    mainSubject: t.mainSubjectRel?.subjectName || null,
    mainSubjectId: t.mainSubjectId || null,
    campus: t.campus?.campusName || null,
    campusId: t.campusId || null,
    additionalCampuses: t.user?.campusAssignments?.map(ca => ({
      id: ca.campus?.id || "",
      campusName: ca.campus?.campusName || ""
    })).filter(ac => ac.id && ac.id !== t.campusId) || [],
    additionalCampusIds: t.user?.campusAssignments?.map(ca => ca.campusId).filter(cid => cid && cid !== t.campusId) || [],
    homeroomClass: t.homeroomClass || null,
    homeroomClassId: classHomeroomMap.get(t.id)?.classId || null,
    email: t.email || null,
    phone: t.phone || null,
    status: t.status,
    position: t.position || "GV",
    user: { email: t.user?.email || t.teacherCode, status: t.user?.status || "ACTIVE" }
  }))

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Giáo viên</h1>
        <p className="text-slate-500 mt-2 text-sm">Thêm, chỉnh sửa thông tin giáo viên và phân công Tổ chuyên môn.</p>
      </div>
      <TeacherManagerClient
        initialTeachers={teachers}
        years={years}
        defaultYearId={defaultYearId}
        classes={classes}
        departments={departments}
        subjects={subjects}
        campuses={campuses}
        isCampusLocked={!session.isFullAccess && session.allowedCampusIds.length === 1}
        defaultCampusId={!session.isFullAccess ? session.allowedCampusIds[0] : null}
        roles={roles}
      />
    </div>
  )
}
