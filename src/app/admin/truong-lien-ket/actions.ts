"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getDestinationSchoolsAction() {
  try {
    return await prisma.destinationSchool.findMany({
      orderBy: [
        { level: "desc" },
        { name: "asc" }
      ]
    })
  } catch (e: any) {
    console.error("getDestinationSchoolsAction error:", e)
    return []
  }
}

export async function createDestinationSchoolAction(data: { name: string, code: string, level: string, schoolType: string }) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    const name = data.name.trim()
    const code = data.code.trim().toUpperCase()
    const level = data.level // "PHO_THONG" or "MAM_NON"
    const schoolType = data.schoolType // "PUBLIC" or "PRIVATE"

    if (!name || !code || !level || !schoolType) {
      return { success: false, error: "Thiếu thông tin bắt buộc" }
    }

    // Check existing
    const existing = await prisma.destinationSchool.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    })
    if (existing) {
      return { success: false, error: "Tên hoặc mã trường đã tồn tại trong danh mục!" }
    }

    await prisma.destinationSchool.create({
      data: { name, code, level, schoolType }
    })

    revalidatePath("/admin/truong-lien-ket")
    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("createDestinationSchoolAction error:", e)
    return { success: false, error: e.message }
  }
}

export async function updateDestinationSchoolAction(id: string, data: { name: string, code: string, level: string, schoolType: string }) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    const name = data.name.trim()
    const code = data.code.trim().toUpperCase()
    const level = data.level
    const schoolType = data.schoolType

    if (!name || !code || !level || !schoolType) {
      return { success: false, error: "Thiếu thông tin bắt buộc" }
    }

    // Check existing with different ID
    const existing = await prisma.destinationSchool.findFirst({
      where: {
        id: { not: id },
        OR: [
          { name },
          { code }
        ]
      }
    })
    if (existing) {
      return { success: false, error: "Tên hoặc mã trường đã tồn tại ở bản ghi khác!" }
    }

    await prisma.destinationSchool.update({
      where: { id },
      data: { name, code, level, schoolType }
    })

    revalidatePath("/admin/truong-lien-ket")
    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("updateDestinationSchoolAction error:", e)
    return { success: false, error: e.message }
  }
}

export async function deleteDestinationSchoolAction(id: string) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    await prisma.destinationSchool.delete({
      where: { id }
    })

    revalidatePath("/admin/truong-lien-ket")
    revalidatePath("/admin/student-transfers")
    return { success: true }
  } catch (e: any) {
    console.error("deleteDestinationSchoolAction error:", e)
    return { success: false, error: e.message }
  }
}

export async function seedDestinationSchoolsAction() {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    const defaultSchools = [
      { name: "THPT Quang Trung", code: "QTR", level: "PHO_THONG", schoolType: "PUBLIC" },
      { name: "THPT Khai Trí", code: "KTR", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "THCS & THPT Hiển Nhân", code: "HNH", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Phổ thông Hermann Gmeiner", code: "HGM", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Sky-Line Đà Nẵng", code: "SKL", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Quốc tế Hoa Kỳ APU", code: "APU", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Quốc tế Singapore", code: "SIS", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Việt Nhật", code: "VNH", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "St. Nicholas", code: "STN", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "FPT", code: "FPT", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Anh Quốc", code: "UKA", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Olympia", code: "OLY", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Quảng Nam Academy", code: "QNA", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Quốc tế HAIS", code: "HAI", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Sky-Line Hill", code: "SLH", level: "PHO_THONG", schoolType: "PRIVATE" },
      { name: "Hà Huy Tập", code: "HHT", level: "PHO_THONG", schoolType: "PUBLIC" },
      { name: "Quảng Đông", code: "QDO", level: "PHO_THONG", schoolType: "PUBLIC" }
    ]

    let addedCount = 0
    for (const school of defaultSchools) {
      const existing = await prisma.destinationSchool.findFirst({
        where: {
          OR: [
            { name: school.name },
            { code: school.code }
          ]
        }
      })
      if (!existing) {
        await prisma.destinationSchool.create({ data: school })
        addedCount++
      } else {
        await prisma.destinationSchool.update({
          where: { id: existing.id },
          data: { schoolType: school.schoolType }
        })
      }
    }

    revalidatePath("/admin/truong-lien-ket")
    return { success: true, count: addedCount }
  } catch (e: any) {
    console.error("seedDestinationSchoolsAction error:", e)
    return { success: false, error: e.message }
  }
}

export async function importDestinationSchoolsAction(payload: Array<{ name: string, code: string, level: string, schoolType: string }>) {
  try {
    const session = await auth()
    if (!session) return { success: false, error: "Unauthorized" }

    let addedCount = 0
    await prisma.$transaction(async (tx) => {
      for (const item of payload) {
        const name = item.name.trim()
        const code = item.code.trim().toUpperCase()
        const level = item.level === "MAM_NON" ? "MAM_NON" : "PHO_THONG"
        const schoolType = item.schoolType === "PUBLIC" ? "PUBLIC" : "PRIVATE"

        if (!name || !code) continue

        // Check duplicates inside transaction
        const existing = await tx.destinationSchool.findFirst({
          where: {
            OR: [
              { name },
              { code }
            ]
          }
        })

        if (!existing) {
          await tx.destinationSchool.create({
            data: { name, code, level, schoolType }
          })
          addedCount++
        } else {
          // Update details if it exists
          await tx.destinationSchool.update({
            where: { id: existing.id },
            data: { level, schoolType }
          })
        }
      }
    })

    revalidatePath("/admin/truong-lien-ket")
    revalidatePath("/admin/student-transfers")
    return { success: true, count: addedCount }
  } catch (e: any) {
    console.error("importDestinationSchoolsAction error:", e)
    return { success: false, error: e.message }
  }
}
