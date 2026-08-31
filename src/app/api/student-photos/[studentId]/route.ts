import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params
    if (!studentId) {
      return new NextResponse("Missing studentId", { status: 400 })
    }

    // 1. Try fetching from Database (StudentPhoto)
    const photo = await prisma.studentPhoto.findUnique({
      where: { studentId }
    })

    if (photo && photo.photoData) {
      let cleanBase64 = photo.photoData
      if (cleanBase64.includes(",")) {
        cleanBase64 = cleanBase64.split(",")[1]
      }
      const buffer = Buffer.from(cleanBase64, "base64")
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": photo.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
        }
      })
    }

    // 2. Fallback to local filesystem if exists
    try {
      const localPath = path.join(process.cwd(), "public", "uploads", "students", `${studentId}.jpg`)
      if (fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath)
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
          }
        })
      }
    } catch (e) {}

    return new NextResponse("Photo not found", { status: 404 })
  } catch (error: any) {
    console.error("Serve Student Photo Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
