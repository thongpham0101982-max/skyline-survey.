"use server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function syncPortalAccountsAction() {
  const students = await prisma.student.findMany()
  const passwordHashBase = await bcrypt.hash("temp", 10) // We will use studentCode as pass

  let createdCount = 0
  
  for (const s of students) {
    const studentPass = await bcrypt.hash(s.studentCode, 10)

    // 1. Student User
    if (!s.userId) {
      const u = await prisma.user.create({
        data: {
          fullName: s.studentName,
          email: s.studentCode, // Using code as primary identifier
          passwordHash: studentPass,
          role: "STUDENT",
          status: "ACTIVE"
        }
      })
      await prisma.student.update({ where: { id: s.id }, data: { userId: u.id } })
      createdCount++
    }

    // 2. Parent Setup
    const pCode = "P" + s.studentCode
    let parent = await prisma.parent.findUnique({ where: { parentCode: pCode } })
    
    if (!parent) {
      const pu = await prisma.user.create({
        data: {
          fullName: "Phu huynh " + s.studentName,
          email: pCode,
          passwordHash: studentPass, // Using HS code as parent pass too per request
          role: "PARENT",
          status: "ACTIVE"
        }
      })
      parent = await prisma.parent.create({
        data: {
          userId: pu.id,
          parentCode: pCode,
          parentName: "Phu huynh " + s.studentName
        }
      })
      createdCount++
    }

    // 3. Link Student to Parent
    const link = await prisma.parentStudentLink.findFirst({
      where: { parentId: parent.id, studentId: s.id }
    })
    if (!link) {
      await prisma.parentStudentLink.create({
        data: { parentId: parent.id, studentId: s.id }
      })
    }
  }

  revalidatePath("/admin/maintenance")
  return { success: true, count: createdCount }
}
