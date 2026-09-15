import { DEFAULT_PRESETS } from "@/lib/advisory/defaultPresets"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

// DEFAULT_PRESETS imported from @/lib/advisory/defaultPresets

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const gradeGroup = searchParams.get("gradeGroup")
    const seed = searchParams.get("seed")

    // Check count and seed defaults if empty or requested
    const count = await prisma.goalPreset.count()
    if (count === 0 || seed === "true") {
      if (seed === "true") {
        await prisma.goalPreset.deleteMany({})
      }
      for (const p of DEFAULT_PRESETS) {
        await prisma.goalPreset.create({ data: p })
      }
    }

    const where: any = {}
    if (gradeGroup) where.gradeGroup = gradeGroup

    const presets = await prisma.goalPreset.findMany({
      where,
      orderBy: [{ gradeGroup: 'asc' }, { category: 'asc' }, { sortOrder: 'asc' }]
    })

    return jsonResponse(presets)
  } catch (e: any) {
    console.error("GET /api/admin/advisory/presets error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const body = await req.json()
    if (body.items && Array.isArray(body.items)) {
      const createdList = []
      let baseOrder = Number(body.sortOrder) || 1
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i]
        if (item.goalText && item.goalText.trim()) {
          const created = await prisma.goalPreset.create({
            data: {
              gradeGroup: body.gradeGroup,
              category: body.category,
              goalText: item.goalText.trim(),
              actionPreset: item.actionPreset ? item.actionPreset.trim() : "",
              sortOrder: baseOrder + i,
              status: body.status || "ACTIVE"
            }
          })
          createdList.push(created)
        }
      }
      return jsonResponse({ success: true, data: createdList })
    }

    const { gradeGroup, category, goalText, actionPreset, sortOrder, status } = body

    if (!gradeGroup || !category || !goalText) {
      return jsonResponse({ error: "Vui lòng nhập đầy đủ Khối, Nhóm mục tiêu và Nội dung mục tiêu mẫu" }, 400)
    }

    const created = await prisma.goalPreset.create({
      data: {
        gradeGroup,
        category,
        goalText,
        actionPreset: actionPreset || "",
        sortOrder: Number(sortOrder) || 1,
        status: status || "ACTIVE"
      }
    })

    return jsonResponse({ success: true, data: created })
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const body = await req.json()
    const { id, gradeGroup, category, goalText, actionPreset, sortOrder, status } = body

    if (!id || !goalText) {
      return jsonResponse({ error: "Thiếu ID hoặc Nội dung mục tiêu mẫu" }, 400)
    }

    const updated = await prisma.goalPreset.update({
      where: { id },
      data: {
        gradeGroup,
        category,
        goalText,
        actionPreset,
        sortOrder: Number(sortOrder) || 1,
        status
      }
    })

    return jsonResponse({ success: true, data: updated })
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return jsonResponse({ error: "Thiếu ID mục tiêu mẫu" }, 400)

    await prisma.goalPreset.delete({ where: { id } })
    return jsonResponse({ success: true })
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500)
  }
}
