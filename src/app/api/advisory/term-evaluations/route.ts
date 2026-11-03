import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"
import { appendAdvisoryAuditLog } from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const caller = await resolveAdvisoryCaller()
  if (!caller.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const targetStudentId = searchParams.get("studentId") || (caller.actorRole === "STUDENT" ? caller.studentId : null)
  const targetStudentCode = searchParams.get("studentCode") || (caller.actorRole === "STUDENT" ? caller.studentCode : null)
  const classId = searchParams.get("classId")
  const academicYearId = searchParams.get("academicYearId")

  if (!targetStudentId && !targetStudentCode && !classId) {
    return NextResponse.json({ error: "Missing studentId, studentCode or classId" }, { status: 400 })
  }

  try {
    let targetStudentIds: string[] = []

    if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const classStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: { id: true, studentCode: true }
        })
        .catch(() => [])
      targetStudentIds = classStudents.map(s => s.id)
    }

    if (targetStudentId || targetStudentCode) {
      const rel = await verifyStudentRelationship(
        caller,
        (targetStudentId || targetStudentCode) as string
      )
      if (!rel.allowed) {
        return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
      }
      targetStudentIds = Array.from(new Set([...targetStudentIds, ...rel.allStudentIds]))
    }

    // 1. Try fetching with targetStudentIds & academicYearId
    let evals = await prisma.studentTermEvaluation
      .findMany({
        where: {
          studentId: { in: targetStudentIds },
          ...(academicYearId ? { academicYearId } : {})
        },
        orderBy: { createdAt: "desc" }
      })
      .catch(() => [])

    // 2. Fallback: query without academicYearId filter if empty
    if (evals.length === 0 && targetStudentIds.length > 0 && !classId) {
      evals = await prisma.studentTermEvaluation
        .findMany({
          where: {
            studentId: { in: targetStudentIds }
          },
          orderBy: { createdAt: "desc" }
        })
        .catch(() => [])
    }

    return NextResponse.json(evals)
  } catch (error: any) {
    console.error("GET /api/advisory/term-evaluations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const caller = await resolveAdvisoryCaller()
  if (!caller.authenticated || (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      studentId,
      academicYearId,
      term,
      goalCompletionLevel,
      initiativeLevel,
      participationAttitude,
      recommendations
    } = body

    if (!studentId || !term) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return NextResponse.json({ error: rel.reason || "Forbidden" }, { status: 403 })
    }

    const targetStudentIds = rel.allStudentIds

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
          evaluatedById: caller.userId || null
        },
        create: {
          studentId: sId,
          academicYearId: academicYearId || "",
          term,
          goalCompletionLevel: Number(goalCompletionLevel) || 3,
          initiativeLevel: Number(initiativeLevel) || 3,
          participationAttitude: Number(participationAttitude) || 3,
          recommendations: recommendations || null,
          evaluatedById: caller.userId || null
        }
      })
      createdEvals.push(evaluation)
    }

    await appendAdvisoryAuditLog({
      studentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "TERM_EVAL",
      entityId: `${studentId}_${term}`,
      action: "UPSERT_TERM_EVALUATION",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `CVHT lưu đánh giá Rubric học kỳ ${term}`,
      changes: { term, goalCompletionLevel, initiativeLevel, participationAttitude }
    })

    return NextResponse.json({ success: true, evaluations: createdEvals })
  } catch (error: any) {
    console.error("POST /api/advisory/term-evaluations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
