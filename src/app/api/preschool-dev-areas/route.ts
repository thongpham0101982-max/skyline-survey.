import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ageGroup = searchParams.get("ageGroup")
    
    const areas = await (prisma as any).preschoolDevArea.findMany({
      where: { status: "ACTIVE" },
      include: {
        criteria: {
          where: {
            status: "ACTIVE",
            ...(ageGroup ? { ageGroup } : {})
          },
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { sortOrder: "asc" }
    })
    return NextResponse.json(areas)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "CREATE_AREA") {
      const { code, name, description, color } = body
      if (!code || !name) return NextResponse.json({ error: "Cần nhập Mã và Tên" }, { status: 400 })
      const count = await (prisma as any).preschoolDevArea.count()
      const area = await (prisma as any).preschoolDevArea.create({
        data: { code, name, description: description || null, color: color || null, sortOrder: count }
      })
      return NextResponse.json(area)
    }

    if (action === "CREATE_CRITERIA") {
      const { areaId, code, name, ageGroup } = body
      if (!areaId || !code || !name || !ageGroup) return NextResponse.json({ error: "Cần nhập đầy đủ Lĩnh vực, Mã, Tên, Nhóm tuổi" }, { status: 400 })
      const count = await (prisma as any).preschoolDevCriteria.count({ where: { areaId } })
      const criteria = await (prisma as any).preschoolDevCriteria.create({
        data: { areaId, code, name, ageGroup, sortOrder: count }
      })
      return NextResponse.json(criteria)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Mã đã tồn tại" }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, id } = body
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    if (action === "UPDATE_AREA") {
      const updated = await (prisma as any).preschoolDevArea.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.color !== undefined ? { color: body.color } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        }
      })
      return NextResponse.json(updated)
    }

    if (action === "UPDATE_CRITERIA") {
      const updated = await (prisma as any).preschoolDevCriteria.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.ageGroup !== undefined ? { ageGroup: body.ageGroup } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        }
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")
    const ids = searchParams.get("ids")

    if (type === "area") {
      if (ids) {
        const idList = ids.split(",").filter(Boolean)
        await (prisma as any).preschoolDevArea.deleteMany({ where: { id: { in: idList } } })
      } else if (id) {
        await (prisma as any).preschoolDevArea.delete({ where: { id } })
      }
      return NextResponse.json({ success: true })
    }

    if (type === "criteria") {
      if (ids) {
        const idList = ids.split(",").filter(Boolean)
        await (prisma as any).preschoolDevCriteria.deleteMany({ where: { id: { in: idList } } })
      } else if (id) {
        await (prisma as any).preschoolDevCriteria.delete({ where: { id } })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
