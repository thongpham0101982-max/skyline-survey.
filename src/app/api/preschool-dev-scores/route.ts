import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const periodId = searchParams.get("periodId")
    const batchId = searchParams.get("batchId")

    // Mode 1: Get all scores for a specific student
    if (studentId) {
      const scores = await (prisma as any).preschoolDevScore.findMany({
        where: { studentId },
        include: { criteria: { include: { area: true } } }
      })
      return NextResponse.json(scores)
    }

    // Mode 2: Get summary for all students in a period
    if (periodId) {
      const where: any = { periodId }
      if (batchId) where.batchId = batchId

      const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where,
        select: { id: true, studentCode: true, fullName: true, grade: true, gender: true, dateOfBirth: true, admissionCampus: true, batchId: true }
      })

      const studentIds = students.map((s: any) => s.id)
      
      // Count scores per student
      const scoreCounts = await (prisma as any).preschoolDevScore.groupBy({
        by: ["studentId"],
        where: { studentId: { in: studentIds } },
        _count: { id: true }
      })

      const scoreMap: Record<string, number> = {}
      for (const sc of scoreCounts) {
        scoreMap[sc.studentId] = sc._count.id
      }

      // Get total criteria count per ageGroup
      const criteriaCounts = await (prisma as any).preschoolDevCriteria.groupBy({
        by: ["ageGroup"],
        where: { status: "ACTIVE" },
        _count: { id: true }
      })
      const criteriaMap: Record<string, number> = {}
      for (const cc of criteriaCounts) {
        criteriaMap[cc.ageGroup] = cc._count.id
      }

      const result = students.map((s: any) => ({
        ...s,
        scoredCount: scoreMap[s.id] || 0,
        totalCriteria: criteriaMap[s.grade || ""] || 0
      }))

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Need studentId or periodId" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { studentId, scores } = body

    if (!studentId || !Array.isArray(scores)) {
      return NextResponse.json({ error: "Cần studentId và mảng scores" }, { status: 400 })
    }

    // Upsert each score
    const results = []
    for (const s of scores) {
      if (!s.criteriaId || !s.result) continue
      const upserted = await (prisma as any).preschoolDevScore.upsert({
        where: {
          studentId_criteriaId: { studentId, criteriaId: s.criteriaId }
        },
        create: {
          studentId,
          criteriaId: s.criteriaId,
          result: s.result,
          note: s.note || null,
          assessorId: s.assessorId || null
        },
        update: {
          result: s.result,
          note: s.note || null,
          assessorId: s.assessorId || null
        }
      })
      results.push(upserted)
    }

    return NextResponse.json({ success: true, count: results.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    
    if (studentId) {
      await (prisma as any).preschoolDevScore.deleteMany({ where: { studentId } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Need studentId" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
