import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetStudentId = searchParams.get("studentId")
  const targetStudentCode = searchParams.get("studentCode")
  const academicYearId = searchParams.get("academicYearId")

  if (!targetStudentId && !targetStudentCode) {
    return NextResponse.json({ error: "Missing studentId or studentCode" }, { status: 400 })
  }

  try {
    let targetStudentIds: string[] = []
    if (targetStudentId) targetStudentIds.push(targetStudentId)

    let codeToLookup = targetStudentCode
    if (!codeToLookup && targetStudentId) {
      const stObj = await prisma.student.findUnique({
        where: { id: targetStudentId },
        select: { studentCode: true }
      }).catch(() => null)
      codeToLookup = stObj?.studentCode
    }

    if (codeToLookup) {
      const sameCodeStudents = await prisma.student.findMany({
        where: { studentCode: codeToLookup },
        select: { id: true }
      }).catch(() => [])
      if (sameCodeStudents.length > 0) {
        targetStudentIds = Array.from(new Set([...targetStudentIds, ...sameCodeStudents.map(s => s.id)]))
      }
    }

    // 1. Try fetching with targetStudentIds & academicYearId
    let evals = await prisma.studentTermEvaluation.findMany({
      where: {
        studentId: { in: targetStudentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

    // 2. Fallback: query without academicYearId filter if empty
    if (evals.length === 0 && targetStudentIds.length > 0) {
      evals = await prisma.studentTermEvaluation.findMany({
        where: {
          studentId: { in: targetStudentIds }
        },
        orderBy: { createdAt: "desc" }
      }).catch(() => [])
    }

    return NextResponse.json(evals)
  } catch (error: any) {
    console.error("GET /api/advisory/term-evaluations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { studentId, academicYearId, term, goalCompletionLevel, initiativeLevel, participationAttitude, recommendations } = body

    if (!studentId || !term) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Lookup all studentIds for the same studentCode
    let targetStudentIds = [studentId]
    const stObj = await prisma.student.findUnique({
      where: { id: studentId },
      select: { studentCode: true }
    }).catch(() => null)

    if (stObj?.studentCode) {
      const sameCodeStudents = await prisma.student.findMany({
        where: { studentCode: stObj.studentCode },
        select: { id: true }
      }).catch(() => [])
      if (sameCodeStudents.length > 0) {
        targetStudentIds = Array.from(new Set([...targetStudentIds, ...sameCodeStudents.map(s => s.id)]))
      }
    }

    const createdEvals = []
    for (const sId of targetStudentIds) {
      const evaluation = await prisma.studentTermEvaluation.upsert({
        where: {
          studentId_academicYearId_term: {
            studentId: sId,
            academicYearId: academicYearId || "",
            term
          }
        },
        update: {
          goalCompletionLevel: Number(goalCompletionLevel) || 3,
          initiativeLevel: Number(initiativeLevel) || 3,
          participationAttitude: Number(participationAttitude) || 3,
          recommendations: recommendations || null,
          evaluatedById: (session.user as any)?.id || null
        },
        create: {
          studentId: sId,
          academicYearId: academicYearId || "",
          term,
          goalCompletionLevel: Number(goalCompletionLevel) || 3,
          initiativeLevel: Number(initiativeLevel) || 3,
          participationAttitude: Number(participationAttitude) || 3,
          recommendations: recommendations || null,
          evaluatedById: (session.user as any)?.id || null
        }
      })
      createdEvals.push(evaluation)
    }

    return NextResponse.json({ success: true, evaluations: createdEvals })
  } catch (error: any) {
    console.error("POST /api/advisory/term-evaluations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
