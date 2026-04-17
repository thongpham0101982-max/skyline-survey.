import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!(prisma as any).studentAchievement) {
       throw new Error("Prisma client does not have 'studentAchievement'. Please restart Next.js server (npm run dev).")
    }
    const result = await (prisma as any).studentAchievement.create({
      data: body
    })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("API POST ERROR:", error.message)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    const result = await (prisma as any).studentAchievement.update({
      where: { id },
      data
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
    
    await (prisma as any).studentAchievement.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
