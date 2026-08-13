import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
  }

  try {
    const evals = await prisma.studentTermEvaluation.findMany({
      where: {
        studentId,
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { term: "asc" }
    })

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

    const evaluation = await prisma.studentTermEvaluation.upsert({
      where: {
        studentId_academicYearId_term: {
          studentId,
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
        studentId,
        academicYearId: academicYearId || "",
        term,
        goalCompletionLevel: Number(goalCompletionLevel) || 3,
        initiativeLevel: Number(initiativeLevel) || 3,
        participationAttitude: Number(participationAttitude) || 3,
        recommendations: recommendations || null,
        evaluatedById: (session.user as any)?.id || null
      }
    })

    return NextResponse.json({ success: true, evaluation })
  } catch (error: any) {
    console.error("POST /api/advisory/term-evaluations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
