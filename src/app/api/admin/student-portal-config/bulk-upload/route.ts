import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = req.headers.get("content-type") || ""

    // Case 1: Validation Request (JSON)
    if (contentType.includes("application/json")) {
      const { action, codes } = await req.json()
      if (action === "validate" && Array.isArray(codes)) {
        // Query database for student information
        const students = await prisma.student.findMany({
          where: {
            studentCode: { in: codes }
          },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            class: { select: { className: true } },
            campus: { select: { campusName: true } }
          }
        })

        // Check which students already have photos
        const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
        const results = students.map(s => {
          const filePath = path.join(uploadDir, `${s.id}.jpg`)
          const hasPhoto = fs.existsSync(filePath)
          return {
            id: s.id,
            studentCode: s.studentCode,
            studentName: s.studentName,
            className: s.class?.className || "",
            campusName: s.campus?.campusName || "",
            hasPhoto
          }
        })

        return NextResponse.json({ success: true, students: results })
      }
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Case 2: File Upload (FormData)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File
      const studentCode = formData.get("studentCode") as string

      if (!file || !studentCode) {
        return NextResponse.json({ error: "Missing file or studentCode" }, { status: 400 })
      }

      // Find student ID
      const student = await prisma.student.findUnique({
        where: { studentCode }
      })

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const filePath = path.join(uploadDir, `${student.id}.jpg`)
      fs.writeFileSync(filePath, buffer)

      return NextResponse.json({ success: true, studentId: student.id, studentName: student.studentName })
    }

    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 400 })
  } catch (error: any) {
    console.error("Bulk Upload API Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
