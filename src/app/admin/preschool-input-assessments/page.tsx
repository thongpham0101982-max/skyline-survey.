import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { PreschoolInputAssessmentsClient } from "./client"

export const metadata = { title: "KSNL Đầu vào Mầm non | Admin" }
export const dynamic = "force-dynamic";

export default async function PreschoolInputAssessmentsPage() {
  let session: any = null;
  try { session = await auth(); } catch (e) { console.error("Auth error:", e); }
  
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  let liveCampusIds = [...allowedCampusIds];
  try {
    if (user?.id) {
      const dbA = await prisma.userCampusAssignment.findMany({ where: { userId: user.id } });
      if (dbA.length > 0) liveCampusIds = dbA.map((a: any) => a.campusId);
    }
  } catch (e) { console.error("campusIds error:", e); }
  
  const grades = ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
  let academicYears: any[] = [], campuses: any[] = [], giaoVuCSUsers: any[] = [], teachers: any[] = [], departments: any[] = [];
  
  try {
    const p = prisma as any;
    if (p.academicYear) academicYears = await p.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []);
    if (p.campus) campuses = await p.campus.findMany({ 
      where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" }, 
      include: { 
        manager: true
      },
      orderBy: { campusName: "asc" } 
    }).catch(() => []);
    if (p.user) giaoVuCSUsers = await p.user.findMany({ 
      where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } }, 
      select: { id: true, fullName: true } 
    }).catch(() => []);
    if (p.department) departments = await p.department.findMany({ 
      where: { status: "ACTIVE" }, orderBy: { name: "asc" } 
    }).catch(() => []);
    if (p.teacher) teachers = await p.teacher.findMany({ 
      where: { status: "ACTIVE" }, 
      include: { departmentRel: true, campus: true, user: true }, 
      orderBy: { teacherName: "asc" } 
    }).catch(() => []);
  } catch (error) { console.error("Preschool page fetch error:", error); }
  
  const sj = (d: any) => { try { if (!d) return []; return JSON.parse(JSON.stringify(d)); } catch (e) { return []; } }
  
  return (
    <div className="p-3 sm:p-4 lg:p-5">
      <PreschoolInputAssessmentsClient
        academicYears={sj(academicYears)}
        campuses={sj(campuses)}
        giaoVuCSUsers={sj(giaoVuCSUsers)}
        grades={grades}
        teachers={sj(teachers)}
        departments={sj(departments)}
        currentUser={session?.user ? { id: session.user.id, role: (session.user as any).role, campusIds: liveCampusIds, fullName: session.user.name || '' } : null}
      />
    </div>
  )
}
