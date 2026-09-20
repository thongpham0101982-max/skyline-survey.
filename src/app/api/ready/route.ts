import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const startTime = Date.now()
    // Test minimal read query to verify DB connectivity
    await prisma.academicYear.findFirst({
      select: { id: true },
      take: 1
    })
    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      status: "ready",
      database: {
        connected: true,
        latencyMs
      },
      timestamp: new Date().toISOString()
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({
      status: "unready",
      database: {
        connected: false,
        error: "Database connectivity check failed"
      },
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}
