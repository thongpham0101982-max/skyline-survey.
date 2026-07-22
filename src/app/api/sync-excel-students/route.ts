import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const SYNC_API_SECRET = process.env.SYNC_API_SECRET || "skyline_sync_secret_token_2026"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader || authHeader !== `Bearer ${SYNC_API_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await req.json()
    const { academicYearName, className, students } = body

    if (!academicYearName || !className || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: "Invalid payload. Required: academicYearName, className, students (array)" },
        { status: 400 }
      )
    }

    const rawYearName = String(academicYearName).trim()
    const rawClassName = String(className).trim()

    let campusCode = "CS1"
    if (rawClassName.includes("_")) {
      const parts = rawClassName.split("_")
      campusCode = parts[parts.length - 1].trim().toUpperCase()
    }

    let academicYear = await prisma.academicYear.findFirst({
      where: { name: rawYearName }
    })

    if (!academicYear) {
      let startYear = new Date().getFullYear()
      let endYear = startYear + 1

      const match = rawYearName.match(/(\d{4})\s*[-–]\s*(\d{4})/)
      if (match) {
        startYear = parseInt(match[1])
        endYear = parseInt(match[2])
      }

      academicYear = await prisma.academicYear.create({
        data: {
          name: rawYearName,
          startDate: new Date(`${startYear}-07-01T00:00:00.000Z`),
          endDate: new Date(`${endYear}-06-30T23:59:59.999Z`),
          status: "ACTIVE"
        }
      })
    }

    let campus = await prisma.campus.findUnique({
      where: { campusCode }
    })

    if (!campus) {
      campus = await prisma.campus.create({
        data: {
          campusCode,
          campusName: `Cơ sở ${campusCode}`,
          status: "ACTIVE"
        }
      })
    }

    let targetClass = await prisma.class.findUnique({
      where: { classCode: rawClassName }
    })

    if (!targetClass) {
      targetClass = await prisma.class.create({
        data: {
          classCode: rawClassName,
          className: rawClassName,
          campusId: campus.id,
          academicYearId: academicYear.id,
          status: "ACTIVE"
        }
      })
    }

    let count = 0
    let skipped = 0
    const errors: string[] = []

    await prisma.$transaction(async (tx) => {
      for (const s of students) {
        try {
          if (!s.studentCode || !s.studentName) {
            skipped++
            continue
          }

          const sCode = String(s.studentCode).trim().toUpperCase()
          const sName = String(s.studentName).trim()
          
          let parsedDate = null
          if (s.dateOfBirth) {
            const d = new Date(s.dateOfBirth)
            if (!isNaN(d.getTime())) {
              parsedDate = d
            }
          }

          await tx.student.upsert({
            where: {
              studentCode_academicYearId: {
                studentCode: sCode,
                academicYearId: academicYear.id
              }
            },
            update: {
              studentName: sName,
              gender: s.gender || null,
              dateOfBirth: parsedDate,
              classId: targetClass.id,
              campusId: campus.id,
              status: "ACTIVE"
            },
            create: {
              studentCode: sCode,
              studentName: sName,
              gender: s.gender || null,
              dateOfBirth: parsedDate,
              classId: targetClass.id,
              campusId: campus.id,
              academicYearId: academicYear.id,
              status: "ACTIVE"
            }
          })
          count++
        } catch (err: any) {
          skipped++
          errors.push(`Error on student code ${s.studentCode}: ${err.message}`)
        }
      }
    })

    return NextResponse.json({
      success: true,
      count,
      skipped,
      errors,
      details: {
        academicYear: academicYear.name,
        class: targetClass.className,
        campus: campus.campusCode
      }
    })
  } catch (error: any) {
    console.error("Sync API Error:", error)
    return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 })
  }
}