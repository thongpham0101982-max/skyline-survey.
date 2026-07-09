import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch system settings
    const settings = await prisma.assessmentConfig.findMany({
      where: { categoryType: "SYSTEM_SETTING" }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => {
      config[s.code] = s.name
    })

    // Fetch active academic years to let admin select one
    const academicYears = await prisma.academicYear.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "desc" }
    })

    return NextResponse.json({
      isOpen: config["STUDENT_PHOTO_PORTAL_OPEN"] === "true",
      academicYearId: config["STUDENT_PHOTO_PORTAL_YEAR"] || "",
      allowUpload: config["STUDENT_PHOTO_PORTAL_ALLOW_UPLOAD"] === "true",
      notes: config["STUDENT_PHOTO_PORTAL_NOTES"] || "",
      academicYears
    })
  } catch (error: any) {
    console.error("GET Config Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isOpen, academicYearId, allowUpload, notes } = await req.json()

    const settingsData = [
      { code: "STUDENT_PHOTO_PORTAL_OPEN", value: String(!!isOpen) },
      { code: "STUDENT_PHOTO_PORTAL_YEAR", value: String(academicYearId || "") },
      { code: "STUDENT_PHOTO_PORTAL_ALLOW_UPLOAD", value: String(!!allowUpload) },
      { code: "STUDENT_PHOTO_PORTAL_NOTES", value: String(notes || "") }
    ]

    for (const item of settingsData) {
      const existing = await prisma.assessmentConfig.findFirst({
        where: {
          categoryType: "SYSTEM_SETTING",
          code: item.code
        }
      })

      if (existing) {
        await prisma.assessmentConfig.update({
          where: { id: existing.id },
          data: { name: item.value }
        })
      } else {
        await prisma.assessmentConfig.create({
          data: {
            categoryType: "SYSTEM_SETTING",
            code: item.code,
            name: item.value,
            status: "ACTIVE",
            sortOrder: 0
          }
        })
      }
    }

    // Log action to AuditLog
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id || "ADMIN",
        userEmail: session.user.email || "admin@system",
        action: "UPDATE_STUDENT_PORTAL_CONFIG",
        targetTable: "AssessmentConfig",
        targetId: "SYSTEM_SETTING",
        newValues: JSON.stringify({ isOpen, academicYearId, allowUpload, notes })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("POST Config Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
