import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studentCode = searchParams.get("studentCode")?.trim()
    const dateOfBirth = searchParams.get("dateOfBirth")?.trim()

    if (!studentCode) {
      return NextResponse.json({ error: "Thiếu Mã học sinh." }, { status: 400 })
    }

    // 1. Check if portal is open
    const portalOpenConfig = await prisma.assessmentConfig.findFirst({
      where: { categoryType: "SYSTEM_SETTING", code: "STUDENT_PHOTO_PORTAL_OPEN" }
    })
    if (!portalOpenConfig || portalOpenConfig.name !== "true") {
      return NextResponse.json({ error: "Cổng thu nhận ảnh hồ sơ hiện đang đóng." }, { status: 403 })
    }

    // Get portal notes for instructions
    const portalNotesConfig = await prisma.assessmentConfig.findFirst({
      where: { categoryType: "SYSTEM_SETTING", code: "STUDENT_PHOTO_PORTAL_NOTES" }
    })
    const notes = portalNotesConfig?.name || ""

    // 2. Query Student
    const defaultYear = await getDefaultAcademicYear(prisma);
    const student = await prisma.student.findFirst({
      where: { 
        studentCode,
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      include: {
        class: true,
        campus: true
      }
    }) || await prisma.student.findFirst({
      where: { studentCode },
      orderBy: { academicYear: { startDate: 'desc' } },
      include: {
        class: true,
        campus: true
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh với mã này." }, { status: 404 })
    }

    // 3. Compare Date of Birth if provided and student has it in DB
    if (dateOfBirth) {
      if (student.dateOfBirth) {
        const dbDate = new Date(student.dateOfBirth)
        const inputDate = new Date(dateOfBirth)
        
        const dbDateStr = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}-${String(dbDate.getDate()).padStart(2, '0')}`
        const inputDateStr = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`
        
        if (dbDateStr !== inputDateStr) {
          return NextResponse.json({ error: "Ngày sinh không chính xác." }, { status: 400 })
        }
      }
    } else if (student.dateOfBirth) {
      // If student has birthdate but no birthdate input was provided
      return NextResponse.json({ error: "Vui lòng cung cấp ngày sinh để xác thực." }, { status: 400 })
    }

    // 4. Check if student already has a photo
    const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
    const filePath = path.join(uploadDir, `${student.id}.jpg`)
    const hasPhoto = fs.existsSync(filePath)
    const photoUrl = hasPhoto ? `/uploads/students/${student.id}.jpg?t=${Date.now()}` : null

    return NextResponse.json({
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.studentName,
      className: student.class?.className || "",
      campusName: student.campus?.campusName || "",
      hasPhoto,
      photoUrl,
      notes
    })
  } catch (error: any) {
    console.error("GET Student Info Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
