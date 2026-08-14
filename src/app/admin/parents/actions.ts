"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function getClassStudentsWithParentsAction(classId: string) {
  if (!classId) return []
  const students = await prisma.student.findMany({
    where: { classId },
    include: {
      parents: {
        include: {
          parent: {
            include: {
              user: true,
              students: {
                include: {
                  student: {
                    include: {
                      class: {
                        select: { className: true, classCode: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { studentName: 'asc' }
  })
  return students
}

export async function generateParentAccountsAction(classId: string) {
  if (!classId) return { success: false, error: "Thiếu thông tin lớp học" }

  const students = await prisma.student.findMany({
    where: { classId },
    include: { parents: { include: { parent: true } } }
  })

  let createdCount = 0

  for (const student of students) {
    if (student.parents.length === 0) {
      const studentCodeClean = student.studentCode.trim()
      const username = `P${studentCodeClean}` // Standardized: P0601010418
      const rawPassword = studentCodeClean   // Standardized: 0601010418
      const hashedPassword = await bcrypt.hash(rawPassword, 10)

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: username },
            { email: username.toLowerCase() },
            { email: username.toUpperCase() }
          ]
        }
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            fullName: `Phụ huynh ${student.studentName}`,
            email: username,
            passwordHash: hashedPassword,
            role: "PARENT"
          }
        })
      }

      let parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { parentCode: username }
          ]
        }
      })

      if (!parent) {
        parent = await prisma.parent.create({
          data: {
            userId: user.id,
            parentCode: username,
            parentName: `Phụ huynh ${student.studentName}`
          }
        })
      }

      const existingLink = await prisma.parentStudentLink.findFirst({
        where: {
          parentId: parent.id,
          studentId: student.id
        }
      })

      if (!existingLink) {
        await prisma.parentStudentLink.create({
          data: {
            parentId: parent.id,
            studentId: student.id,
            relationship: "Phụ huynh"
          }
        })
      }

      createdCount++
    }
  }

  revalidatePath('/admin/parents')
  return { success: true, count: createdCount }
}

export async function searchStudentsForLinkingAction(query: string) {
  if (!query || query.trim().length < 2) return []
  const cleanQuery = query.trim()
  
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { studentName: { contains: cleanQuery } },
        { studentCode: { contains: cleanQuery } }
      ]
    },
    include: {
      class: { select: { className: true } },
      campus: { select: { campusName: true } },
      parents: {
        include: {
          parent: { select: { id: true, parentCode: true, parentName: true } }
        }
      }
    },
    take: 15,
    orderBy: { studentName: 'asc' }
  })
  
  return students
}

export async function linkParentStudentAction(parentId: string, studentId: string, relationship = "Phụ huynh") {
  try {
    if (!parentId || !studentId) return { success: false, error: "Thiếu dữ liệu liên kết" }

    const existingLink = await prisma.parentStudentLink.findFirst({
      where: { parentId, studentId }
    })

    if (existingLink) {
      return { success: true, message: "Học sinh đã được liên kết với Phụ huynh này từ trước" }
    }

    await prisma.parentStudentLink.create({
      data: { parentId, studentId, relationship }
    })

    revalidatePath('/admin/parents')
    return { success: true }
  } catch (e: any) {
    console.error('linkParentStudentAction error:', e)
    return { success: false, error: e.message }
  }
}

export async function unlinkParentStudentAction(parentId: string, studentId: string) {
  try {
    if (!parentId || !studentId) return { success: false, error: "Thiếu dữ liệu hủy liên kết" }

    await prisma.parentStudentLink.deleteMany({
      where: { parentId, studentId }
    })

    revalidatePath('/admin/parents')
    return { success: true }
  } catch (e: any) {
    console.error('unlinkParentStudentAction error:', e)
    return { success: false, error: e.message }
  }
}

export async function resetParentPasswordAction(parentId: string, defaultPassword: string) {
  try {
    if (!parentId || !defaultPassword) return { success: false, error: "Thiếu thông tin khôi phục mật khẩu" }

    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: { userId: true, parentCode: true }
    })

    if (!parent || !parent.userId) return { success: false, error: "Không tìm thấy hồ sơ Phụ huynh" }

    const hashedPassword = await bcrypt.hash(defaultPassword.trim(), 10)

    await prisma.user.update({
      where: { id: parent.userId },
      data: { passwordHash: hashedPassword }
    })

    return { success: true }
  } catch (e: any) {
    console.error('resetParentPasswordAction error:', e)
    return { success: false, error: e.message }
  }
}

export async function deleteParentAccountsAction(studentIds: string[]) {
  try {
    if (!studentIds || studentIds.length === 0) return { success: true }

    const parentLinks = await prisma.parentStudentLink.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        parent: {
          include: {
            students: true
          }
        }
      }
    })

    const parentIdsToDelete: string[] = []
    const userIdsToDelete: string[] = []

    await prisma.parentStudentLink.deleteMany({
      where: { studentId: { in: studentIds } }
    })

    for (const link of parentLinks) {
      if (!link.parent) continue
      const remainingLinks = await prisma.parentStudentLink.count({
        where: { parentId: link.parent.id }
      })

      if (remainingLinks === 0) {
        parentIdsToDelete.push(link.parent.id)
        if (link.parent.userId) userIdsToDelete.push(link.parent.userId)
      }
    }

    if (parentIdsToDelete.length > 0) {
      const forms = await prisma.surveyForm.findMany({
        where: { parentId: { in: parentIdsToDelete } },
        select: { id: true }
      })
      const formIds = forms.map(f => f.id)

      if (formIds.length > 0) {
        await prisma.surveyResponse.deleteMany({ where: { formId: { in: formIds } } })
        await prisma.surveyForm.deleteMany({ where: { id: { in: formIds } } })
      }

      if (userIdsToDelete.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: userIdsToDelete } } })
      }

      await prisma.parent.deleteMany({ where: { id: { in: parentIdsToDelete } } })

      if (userIdsToDelete.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } })
      }
    }

    revalidatePath('/admin/parents')
    return { success: true }
  } catch (e: any) {
    console.error('deleteParentAccountsAction error:', e)
    return { success: false, error: e.message }
  }
}
