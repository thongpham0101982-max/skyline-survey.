import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "Admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const { action, codes } = await req.json()
      if (action === "validate" && Array.isArray(codes)) {
        const cleanCodes = codes.map((c: any) => String(c || "").trim()).filter(Boolean)
        const students = await prisma.student.findMany({
          where: { studentCode: { in: cleanCodes } },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            class: { select: { className: true } },
            campus: { select: { campusName: true } },
            academicYear: { select: { startDate: true } }
          }
        })
        const studentIds = students.map(s => s.id)
        const existingPhotos = await prisma.studentPhoto.findMany({
          where: { studentId: { in: studentIds } },
          select: { studentId: true }
        }).catch(() => [])
        const photoSet = new Set(existingPhotos.map(p => p.studentId))

        // Group by studentCode and select the one with the latest academic year
        const groupedMap = new Map<string, typeof students[0]>()
        for (const s of students) {
          const existing = groupedMap.get(s.studentCode)
          if (!existing) {
            groupedMap.set(s.studentCode, s)
          } else {
            const dateExisting = existing.academicYear?.startDate ? new Date(existing.academicYear.startDate).getTime() : 0
            const dateCurrent = s.academicYear?.startDate ? new Date(s.academicYear.startDate).getTime() : 0
            if (dateCurrent > dateExisting) {
              groupedMap.set(s.studentCode, s)
            }
          }
        }

        const results = Array.from(groupedMap.values()).map(s => ({
          id: s.id,
          studentCode: s.studentCode,
          studentName: s.studentName,
          className: s.class?.className || "",
          campusName: s.campus?.campusName || "",
          hasPhoto: photoSet.has(s.id)
        }))
        return NextResponse.json({ success: true, students: results })
      }
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File
      const studentCode = (formData.get("studentCode") as string || "").trim()
      const studentId = (formData.get("studentId") as string || "").trim()

      if (!file || (!studentCode && !studentId)) {
        return NextResponse.json({ error: "Thiếu dữ liệu tệp hoặc mã học sinh" }, { status: 400 })
      }

      // Find matching student records
      let matchingStudents: any[] = []
      if (studentId) {
        const direct = await prisma.student.findUnique({
          where: { id: studentId },
          include: { academicYear: true }
        })
        if (direct) {
          matchingStudents = await prisma.student.findMany({
            where: { studentCode: direct.studentCode },
            include: { academicYear: true }
          })
          if (matchingStudents.length === 0) {
            matchingStudents = [direct]
          }
        }
      }

      if (matchingStudents.length === 0 && studentCode) {
        matchingStudents = await prisma.student.findMany({
          where: { studentCode },
          include: { academicYear: true }
        })
      }

      if (matchingStudents.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy học sinh trong hệ thống" }, { status: 404 })
      }

      // Sort matching students so the primary student is from the latest academic year
      matchingStudents.sort((a, b) => {
        const dateA = a.academicYear?.startDate ? new Date(a.academicYear.startDate).getTime() : 0
        const dateB = b.academicYear?.startDate ? new Date(b.academicYear.startDate).getTime() : 0
        return dateB - dateA
      })

      const primaryStudent = matchingStudents[0]

      const fileName = file.name || ""
      const isImage = (file.type && file.type.startsWith("image/")) || 
        /\.(jpe?g|png|webp|gif|bmp|svg|avif|heic)$/i.test(fileName)

      if (!isImage) {
        return NextResponse.json({ error: "Tệp phải là hình ảnh (JPG, PNG, WebP...)" }, { studentId: primaryStudent.id, status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Data = buffer.toString("base64")
      
      let mimeType = file.type
      if (!mimeType || !mimeType.startsWith("image/")) {
        const ext = fileName.split('.').pop()?.toLowerCase()
        if (ext === 'png') mimeType = 'image/png'
        else if (ext === 'webp') mimeType = 'image/webp'
        else if (ext === 'gif') mimeType = 'image/gif'
        else if (ext === 'svg') mimeType = 'image/svg+xml'
        else mimeType = 'image/jpeg'
      }

      // Upsert photo for all matching student records for this studentCode
      for (const st of matchingStudents) {
        await prisma.studentPhoto.upsert({
          where: { studentId: st.id },
          create: {
            studentId: st.id,
            photoData: base64Data,
            contentType: mimeType
          },
          update: {
            photoData: base64Data,
            contentType: mimeType,
            updatedAt: new Date()
          }
        })
      }

      // Try local save as fallback in dev
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
        for (const st of matchingStudents) {
          fs.writeFileSync(path.join(uploadDir, `${st.id}.jpg`), buffer)
        }
      } catch (fErr) {}

      return NextResponse.json({
        success: true,
        studentId: primaryStudent.id,
        studentName: primaryStudent.studentName,
        url: `/api/student-photos/${primaryStudent.id}?t=${Date.now()}`
      })
    }

    return NextResponse.json({ error: "Unsupported Content-Type" }, { studentId: null, status: 400 })
  } catch (error: any) {
    console.error("Bulk Upload API Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { studentId: null, status: 500 })
  }
}
