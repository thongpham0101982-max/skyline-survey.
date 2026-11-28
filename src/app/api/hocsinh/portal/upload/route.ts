import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { checkRateLimit } from "@/lib/security-guard"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

function hasValidImageMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true
  }
  // WEBP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1"
    const rate = checkRateLimit(`student-photo-upload:${clientIp}`, 20, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều lượt tải ảnh. Vui lòng thử lại sau ít phút." },
        { status: 429 }
      )
    }

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
    const studentId = String(formData.get("studentId") || "").trim()
    const studentCode = String(formData.get("studentCode") || "").trim()
    const dateOfBirth = String(formData.get("dateOfBirth") || "").trim()

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

    // Bắt buộc xác thực ngày sinh nếu học sinh có ngày sinh trong CSDL (không cho phép bỏ trống để vượt qua)
    if (student.dateOfBirth) {
      if (!dateOfBirth) {
        return NextResponse.json(
          { error: "Vui lòng cung cấp ngày sinh để xác thực trước khi tải ảnh." },
          { status: 400 }
        )
      }
      const dbDate = new Date(student.dateOfBirth)
      const inputDate = new Date(dateOfBirth)
      if (Number.isNaN(inputDate.getTime())) {
        return NextResponse.json({ error: "Định dạng ngày sinh không hợp lệ." }, { status: 400 })
      }

      const dbDateStr = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}-${String(dbDate.getDate()).padStart(2, '0')}`
      const inputDateStr = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`

      if (dateOfBirth !== dbDateStr && dbDateStr !== inputDateStr) {
        return NextResponse.json({ error: "Xác thực ngày sinh không thành công." }, { status: 400 })
      }
    }

    // 3. Verify file type, size & magic bytes
    if (!file.type || !["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Chỉ chấp nhận file định dạng hình ảnh (PNG, JPG, JPEG, WEBP)." }, { status: 400 })
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return NextResponse.json({ error: "Dung lượng ảnh vượt quá giới hạn tối đa 5MB." }, { status: 400 })
    }

    // 4. Save to StudentPhoto in Turso DB
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length > MAX_PHOTO_SIZE_BYTES || !hasValidImageMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "Nội dung tệp không phải hình ảnh hợp lệ (JPEG/PNG/WEBP)." },
        { status: 400 }
      )
    }
    const base64Data = buffer.toString("base64")
    const mimeType = file.type || "image/jpeg"

    await prisma.studentPhoto.upsert({
      where: { studentId },
      create: {
        studentId,
        photoData: base64Data,
        contentType: mimeType
      },
      update: {
        photoData: base64Data,
        contentType: mimeType,
        updatedAt: new Date()
      }
    })

    // 5. Try local save as fallback in dev
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      const filePath = path.join(uploadDir, `${studentId}.jpg`)
      fs.writeFileSync(filePath, buffer)
    } catch (fsErr) {}

    return NextResponse.json({
      success: true,
      url: `/api/student-photos/${studentId}?t=${Date.now()}`
    })
  } catch (error: any) {
    console.error("Student Upload API Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
