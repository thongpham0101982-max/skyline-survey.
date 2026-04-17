import { prisma } from "@/lib/db"
import { UsersClient } from "./client"

export const metadata = { title: "Quản lý Tài khoản (Hệ thống) | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
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
    orderBy: { name: 'asc' }
  })
  
  const campuses = await prisma.campus.findMany({
    orderBy: { campusCode: 'asc' }
  })

  // Map users to include their campus IDs
  const mappedUsers = users.map((u: any) => {
    let campusIds: string[] = [];
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
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Tài khoản (Nhân sự)</h1>
        <p className="text-slate-500 mt-1">Cấp tài khoản đăng nhập (Mã NV) và gán Nhóm quyền cho nhân viên vào hệ thống.</p>
      </div>
      <UsersClient initialUsers={mappedUsers} roles={roles} campuses={campuses} />
    </div>
  )
}
