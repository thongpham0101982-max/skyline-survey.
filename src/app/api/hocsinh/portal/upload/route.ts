import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    // 1. Check portal configuration
    const portalOpenConfig = await prisma.assessmentConfig.findFirst({
      where: { categoryType: "SYSTEM_SETTING", code: "STUDENT_PHOTO_PORTAL_OPEN" }
    })
    const portalUploadConfig = await prisma.assessmentConfig.findFirst({
      where: { categoryType: "SYSTEM_SETTING", code: "STUDENT_PHOTO_PORTAL_ALLOW_UPLOAD" }
    })

    if (!portalOpenConfig || portalOpenConfig.name !== "true") {
      return NextResponse.json({ error: "Cổng thu nhận ảnh hồ sơ hiện đang đóng." }, { status: 403 })
    }
    if (!portalUploadConfig || portalUploadConfig.name !== "true") {
      return NextResponse.json({ error: "Chức năng tải ảnh hiện đang tạm khóa." }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const studentId = formData.get("studentId") as string
    const studentCode = formData.get("studentCode") as string
    const dateOfBirth = formData.get("dateOfBirth") as string

    if (!file || !studentId || !studentCode) {
      return NextResponse.json({ error: "Thiếu dữ liệu tải lên." }, { status: 400 })
    }

    // 2. Re-verify student info
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student || student.studentCode !== studentCode) {
      return NextResponse.json({ error: "Thông tin xác thực học sinh không khớp." }, { status: 400 })
    }

    if (dateOfBirth && student.dateOfBirth) {
      const dbDate = new Date(student.dateOfBirth)
      const inputDate = new Date(dateOfBirth)
      
      const dbDateStr = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}-${String(dbDate.getDate()).padStart(2, '0')}`
      const inputDateStr = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`
      
      if (dbDateStr !== inputDateStr) {
        return NextResponse.json({ error: "Xác thực ngày sinh không thành công." }, { status: 400 })
      }
    }

    // 3. Verify file type is image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Chỉ chấp nhận file định dạng hình ảnh (PNG, JPG, JPEG)." }, { status: 400 })
    }

    // 4. Save file to public/uploads/students/[studentId].jpg
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, `${studentId}.jpg`)
    fs.writeFileSync(filePath, buffer)

    return NextResponse.json({
      success: true,
      url: `/uploads/students/${studentId}.jpg?t=${Date.now()}`
    })
  } catch (error: any) {
    console.error("Student Upload API Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
