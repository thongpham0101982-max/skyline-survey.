import { prisma } from "@/lib/db"
import { UsersClient } from "./client"
import { getAdminSession } from "@/lib/session"
import { getAllUserSubjectAssignmentsMap } from "@/lib/gradebook/subjectPermissions"

export const metadata = { title: "Quản lý Tài khoản (Hệ thống) | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const session = await getAdminSession()

  // Load all users (including PARENT accounts), active subjects, and explicit subject assignments
  const [users, roles, subjects, userSubjectMap] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        campusAssignments: true,
        parent: {
          include: {
            students: {
              include: { student: true }
            }
          }
        },
        teacher: {
          include: {
            mainSubjectRel: { select: { id: true, subjectCode: true, subjectName: true } },
            TeachingAssignment: { select: { subjectId: true } }
          }
        }
      }
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, subjectCode: true, subjectName: true, category: true },
      orderBy: { subjectName: "asc" }
    }).catch(() => []),
    getAllUserSubjectAssignmentsMap()
  ])
  
  // Filter available campuses for selection based on session scope
  const campusWhere = session.isFullAccess ? {} : { id: { in: session.allowedCampusIds } }
  const campuses = await prisma.campus.findMany({
    where: campusWhere,
    orderBy: { campusCode: "asc" }
  })

  // Map users and filter list for restricted admins
  const mappedUsers = users.map((u: any) => {
    const rawCampusIds: string[] = u.campusAssignments.map((a: any) => a.campusId);
    if (u.teacher && u.teacher.campusId) rawCampusIds.push(u.teacher.campusId);
    if (u.parent) {
      u.parent.students.forEach((link: any) => {
        if (link.student?.campusId && !rawCampusIds.includes(link.student.campusId)) {
          rawCampusIds.push(link.student.campusId);
        }
      })
    }
    const campusIds = Array.from(new Set(rawCampusIds.filter(Boolean)));
    const explicitSub = userSubjectMap.get(u.id)?.subjectIds || [];
    const autoTeachingSubIds = Array.from(
      new Set([
        ...(u.teacher?.mainSubjectId ? [u.teacher.mainSubjectId] : []),
        ...((u.teacher?.TeachingAssignment || []).map((ta: any) => ta.subjectId).filter(Boolean))
      ])
    );
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status || "ACTIVE",
      campusIds,
      subjectIds: explicitSub,
      autoSubjectIds: autoTeachingSubIds
    }
  }).filter((u: any) => {
    if (session.isFullAccess) return true;
    return u.campusIds.some((cid: string) => session.allowedCampusIds.includes(cid));
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Tài khoản (Nhân sự)</h1>
        <p className="text-slate-500 mt-1">Cấp tài khoản đăng nhập (Mã NV), gán Nhóm quyền và phân quyền gán môn học (Sổ điểm - Nhận xét & Thống kê).</p>
      </div>
      <UsersClient 
        initialUsers={mappedUsers} 
        roles={roles} 
        campuses={campuses}
        subjects={subjects}
        isCampusLocked={!session.isFullAccess && session.allowedCampusIds.length === 1}
        defaultCampusId={!session.isFullAccess ? session.allowedCampusIds[0] : null}
      />
    </div>
  )
}
