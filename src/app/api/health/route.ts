import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime())
  const memoryUsage = process.memoryUsage()

  return NextResponse.json({
    status: "ok",
    service: "SSM — Sky-Line Educational Quality Management System",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "production",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
    }
  }, { status: 200 })
}
