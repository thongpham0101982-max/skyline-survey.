const fs = require('fs');

// ============ 1. Update Prisma Schema ============
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Add User relations
const oldUserEnd = `  taskComments  TaskComment[]  @relation("TaskComments")
  taskAttachments TaskAttachment[] @relation("TaskAttachments")
}`;
const newUserEnd = `  taskComments  TaskComment[]  @relation("TaskComments")
  taskAttachments TaskAttachment[] @relation("TaskAttachments")
  weeklyReports WeeklyReport[]
}`;

if (schema.includes(oldUserEnd) && !schema.includes('weeklyReports')) {
  schema = schema.replace(oldUserEnd, newUserEnd);
  console.log('OK: User relations updated');
}

// Add models at end
if (!schema.includes('WeeklyReport')) {
  schema = schema.trimEnd() + `

model WeeklyReport {
  id             String   @id @default(cuid())
  userId         String
  weekNumber     Int
  month          Int
  year           Int
  academicYearId String?
  status         String   @default("DRAFT")
  managerComment String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id])
  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id])
  items          WeeklyReportItem[]
}

model WeeklyReportItem {
  id               String   @id @default(cuid())
  reportId         String
  mainTask         String
  workContent      String
  progress         String   @default("NOT_STARTED")
  proposedSolution String?
  managerNote      String?
  createdAt        DateTime @default(now())
  report           WeeklyReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
}
`;
  console.log('OK: WeeklyReport models added');
}

// Remove BOM if present
if (schema.charCodeAt(0) === 0xFEFF) schema = schema.substring(1);
fs.writeFileSync('prisma/schema.prisma', schema);

// ============ 2. Create Server Actions ============
const actionsContent = `"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Calculate weeks for a given month/year
export function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // Find first Monday
  let current = new Date(firstDay)
  while (current.getDay() !== 1 && current <= lastDay) {
    current.setDate(current.getDate() + 1)
  }
  
  let weekNum = 1
  while (current <= lastDay) {
    const start = new Date(current)
    const friday = new Date(current)
    friday.setDate(friday.getDate() + 4) // Monday + 4 = Friday
    
    const end = friday > lastDay ? new Date(lastDay) : friday
    
    weeks.push({
      weekNum,
      start: start.toLocaleDateString("vi-VN"),
      end: end.toLocaleDateString("vi-VN"),
      label: "Tuan " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")"
    })
    
    weekNum++
    current.setDate(current.getDate() + 7)
  }
  
  return weeks
}

export async function getWeeklyReport(userId: string, weekNumber: number, month: number, year: number) {
  try {
    const report = await prisma.weeklyReport.findFirst({
      where: { userId, weekNumber, month, year },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { fullName: true, role: true } }
      }
    })
    return { success: true, report: report ? JSON.parse(JSON.stringify(report)) : null }
  } catch (e: any) {
    return { success: false, report: null, error: e.message }
  }
}

export async function getAllWeeklyReports(weekNumber: number, month: number, year: number) {
  try {
    const reports = await prisma.weeklyReport.findMany({
      where: { weekNumber, month, year },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, fullName: true, role: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, reports: JSON.parse(JSON.stringify(reports)) }
  } catch (e: any) {
    return { success: false, reports: [], error: e.message }
  }
}

export async function saveWeeklyReport(data: {
  weekNumber: number; month: number; year: number; academicYearId?: string;
  items: { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution?: string }[]
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chua dang nhap" }
    const userId = session.user.id

    let report = await prisma.weeklyReport.findFirst({
      where: { userId, weekNumber: data.weekNumber, month: data.month, year: data.year }
    })

    if (report) {
      // Delete old items and recreate
      await prisma.weeklyReportItem.deleteMany({ where: { reportId: report.id } })
      report = await prisma.weeklyReport.update({
        where: { id: report.id },
        data: {
          status: "SUBMITTED",
          academicYearId: data.academicYearId || null,
          items: {
            create: data.items.map(item => ({
              mainTask: item.mainTask,
              workContent: item.workContent,
              progress: item.progress,
              proposedSolution: item.proposedSolution || ""
            }))
          }
        },
        include: { items: true }
      })
    } else {
      report = await prisma.weeklyReport.create({
        data: {
          userId,
          weekNumber: data.weekNumber,
          month: data.month,
          year: data.year,
          status: "SUBMITTED",
          academicYearId: data.academicYearId || null,
          items: {
            create: data.items.map(item => ({
              mainTask: item.mainTask,
              workContent: item.workContent,
              progress: item.progress,
              proposedSolution: item.proposedSolution || ""
            }))
          }
        },
        include: { items: true }
      })
    }

    revalidatePath("/admin/weekly-reports")
    return { success: true, report: JSON.parse(JSON.stringify(report)) }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function addManagerComment(reportId: string, managerComment: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chua dang nhap" }
    const role = (session.user as any).role
    if (role !== "ADMIN") return { success: false, error: "Chi quan ly moi co quyen" }

    await prisma.weeklyReport.update({
      where: { id: reportId },
      data: { managerComment, status: "REVIEWED" }
    })

    // Notify the report owner
    const report = await prisma.weeklyReport.findUnique({ where: { id: reportId }, select: { userId: true, weekNumber: true, month: true } })
    if (report) {
      await prisma.notification.create({
        data: {
          userId: report.userId,
          title: "[Nhan xet BC] Tuan " + report.weekNumber + " Thang " + report.month,
          message: "Quan ly da nhan xet bao cao cua ban: " + managerComment.substring(0, 100),
          isRead: false
        }
      })
    }

    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function addManagerItemNote(itemId: string, managerNote: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chua dang nhap" }
    const role = (session.user as any).role
    if (role !== "ADMIN") return { success: false, error: "Chi quan ly moi co quyen" }

    await prisma.weeklyReportItem.update({
      where: { id: itemId },
      data: { managerNote }
    })
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
`;

fs.writeFileSync('src/app/admin/weekly-reports/actions.ts', actionsContent);
console.log('OK: weekly-reports/actions.ts created');

// ============ 3. Create Page ============
const pageContent = `import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WeeklyReportClient } from "./client"

export const metadata = { title: "Bao cao Tuan | SQMS" }
export const dynamic = "force-dynamic"

export default async function WeeklyReportsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true }
  })

  // For admin: get all staff users for filtering
  let staffUsers: any[] = []
  if (role === "ADMIN") {
    staffUsers = await prisma.user.findMany({
      where: { role: { not: "PARENT" }, status: "ACTIVE" },
      select: { id: true, fullName: true, role: true, email: true },
      orderBy: { fullName: "asc" }
    })
  }

  return (
    <div className="space-y-6">
      <WeeklyReportClient
        currentRole={role}
        currentUserId={userId}
        currentUserName={user?.name || user?.fullName || ""}
        years={years}
        staffUsers={staffUsers}
      />
    </div>
  )
}
`;

// Create directory
fs.mkdirSync('src/app/admin/weekly-reports', { recursive: true });
fs.writeFileSync('src/app/admin/weekly-reports/page.tsx', pageContent);
console.log('OK: weekly-reports/page.tsx created');

console.log('\\nAll base files created! Now creating client.tsx...');
