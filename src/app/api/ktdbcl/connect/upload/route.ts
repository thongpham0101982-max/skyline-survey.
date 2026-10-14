import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tải lên" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "uploads", "ktdbcl")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const rawName = file.name || "attachment"
    const ext = path.extname(rawName) || ".png"
    const baseName = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, "_")
    const uniqueFileName = `${Date.now()}_${baseName}${ext}`
    const filePath = path.join(uploadDir, uniqueFileName)

    fs.writeFileSync(filePath, buffer)

    const publicUrl = `/uploads/ktdbcl/${uniqueFileName}`

    return NextResponse.json({
      success: true,
      file: {
        name: rawName,
        url: publicUrl,
        size: file.size,
        type: file.type
      }
    })
  } catch (error: any) {
    console.error("[KTDBCL Connect Upload Error]:", error)
    return NextResponse.json({ error: error.message || "Lỗi tải tệp" }, { status: 500 })
  }
}
