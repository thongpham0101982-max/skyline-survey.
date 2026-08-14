import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: {
                  include: {
                    campus: true
                  }
                },
                academicYear: true
              }
            }
          }
        }
      }
    })

    if (!parent) {
      return NextResponse.json([])
    }

    const children = parent.students.map(s => s.student)
    return NextResponse.json(children)
  } catch (error: any) {
    console.error("GET /api/parent/children error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
