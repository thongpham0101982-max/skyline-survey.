import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { StudentPortalClient } from "./client"
import { Globe } from "lucide-react"

export default async function StudentPortalPage() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login")
  }

  // Fetch system settings
  const settings = await prisma.assessmentConfig.findMany({
    where: { categoryType: "SYSTEM_SETTING" }
  })

  const config: Record<string, string> = {}
  settings.forEach(s => {
    config[s.code] = s.name
  })

  // Fetch active academic years
  const academicYears = await prisma.academicYear.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "desc" }
  })

  // Get some basic stats
  const selectedYearId = config["STUDENT_PHOTO_PORTAL_YEAR"] || (academicYears[0]?.id || "")
  
  let totalStudents = 0
  let uploadedCount = 0

  if (selectedYearId) {
    totalStudents = await prisma.student.count({
      where: { academicYearId: selectedYearId }
    })

    const fs = require("fs")
    const path = require("path")
    const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir)
      const studentIdsWithPhotos = files
        .filter((f: string) => f.endsWith(".jpg"))
        .map((f: string) => f.replace(".jpg", ""))
      
      uploadedCount = await prisma.student.count({
        where: {
          academicYearId: selectedYearId,
          id: { in: studentIdsWithPhotos }
        }
      })
    }
  }

  const initialConfig = {
    isOpen: config["STUDENT_PHOTO_PORTAL_OPEN"] === "true",
    academicYearId: selectedYearId,
    allowUpload: config["STUDENT_PHOTO_PORTAL_ALLOW_UPLOAD"] === "true",
    notes: config["STUDENT_PHOTO_PORTAL_NOTES"] || ""
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#00A99D] rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Cấu hình Cổng Ảnh Học Sinh</h1>
          <p className="text-slate-500 font-medium">Bật/tắt cổng thu thập ảnh hồ sơ học sinh trực tuyến và quản lý tiến trình</p>
        </div>
      </div>

      <StudentPortalClient 
        initialConfig={initialConfig} 
        academicYears={academicYears}
        stats={{ totalStudents, uploadedCount }}
      />
    </div>
  )
}
