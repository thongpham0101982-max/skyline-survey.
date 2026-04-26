import { prisma } from "@/lib/db"
import { UsersClient } from "./client"
import { getAdminSession } from "@/lib/session"

export const metadata = { title: "Quản lý Tài khoản (Hệ thống) | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const session = await getAdminSession()

  // Load all users but filter them based on campus scope if restricted
  const users = await prisma.user.findMany({
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
      teacher: true
    }
  })
  
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" }
  })
  
  // Filter available campuses for selection based on session scope
  const campusWhere = session.isFullAccess ? {} : { id: { in: session.allowedCampusIds } }
  const campuses = await prisma.campus.findMany({
    where: campusWhere,
    orderBy: { campusCode: "asc" }
  })

  // Map users and filter list for restricted admins
  const mappedUsers = users.map((u: any) => {
    let campusIds: string[] = u.campusAssignments.map((a: any) => a.campusId);
    if (u.teacher && u.teacher.campusId) campusIds.push(u.teacher.campusId);
    if (u.parent) {
      u.parent.students.forEach((link: any) => {
        if (link.student.campusId && !campusIds.includes(link.student.campusId)) {
          campusIds.push(link.student.campusId);
        }
      })
    }
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      campusIds
    }
  }).filter((u: any) => {
    // If ADMIN, see everyone
    if (session.isFullAccess) return true;
    // If restricted, only see users who belong to the same campus(es)
    // or system users (no campus) if the admin role allows (but usually GDCS only manages their campus)
    return u.campusIds.some((cid: string) => session.allowedCampusIds.includes(cid));
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Tài khoản (Nhân sự)</h1>
        <p className="text-slate-500 mt-1">Cấp tài khoản đăng nhập (Mã NV) và gán Nhóm quyền cho nhân viên vào hệ thống.</p>
      </div>
      <UsersClient 
        initialUsers={mappedUsers} 
        roles={roles} 
        campuses={campuses}
        isCampusLocked={!session.isFullAccess && session.allowedCampusIds.length === 1}
        defaultCampusId={!session.isFullAccess ? session.allowedCampusIds[0] : null}
      />
    </div>
  )
}
