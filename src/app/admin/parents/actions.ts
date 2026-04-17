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
            include: { user: true }
          }
        }
      }
    },
    orderBy: { studentName: 'asc' }
  })
  return students
}

export async function generateParentAccountsAction(classId: string) {
  const students = await prisma.student.findMany({
    where: { classId },
    include: { parents: { include: { parent: true } } }
  })

  let createdCount = 0

  for (const student of students) {
    if (student.parents.length === 0) {
      const username = `P_`
      const rawPassword = student.studentCode
      const hashedPassword = await bcrypt.hash(rawPassword, 10)

      const user = await prisma.user.create({
        data: {
          fullName: `Phu huynh ${student.studentName}`,
          email: username,
          passwordHash: hashedPassword,
          role: "PARENT"
        }
      })

      const parent = await prisma.parent.create({
        data: {
          userId: user.id,
          parentCode: `P-${student.studentCode}`,
          parentName: `Phu huynh ${student.studentName}`
        }
      })

      await prisma.parentStudentLink.create({
        data: {
          parentId: parent.id,
          studentId: student.id,
          relationship: "Phu huynh"
        }
      })

      createdCount++
    }
  }

  return { success: true, count: createdCount }
}

export async function deleteParentAccountsAction(studentIds: string[]) {
  try {
    // Find all parent links for these students
    const parentLinks = await prisma.parentStudentLink.findMany({
      where: { studentId: { in: studentIds } },
      include: { parent: { select: { id: true, userId: true } } }
    })

    const parentIds = parentLinks.map(link => link.parent.id)
    const userIds = parentLinks.map(link => link.parent.userId).filter(Boolean) as string[]

    if (parentIds.length === 0) return { success: true }

    // 1. Delete SurveyResponses linked to SurveyForms of these parents
    const forms = await prisma.surveyForm.findMany({
      where: { parentId: { in: parentIds } },
      select: { id: true }
    })
    const formIds = forms.map(f => f.id)

    if (formIds.length > 0) {
      await prisma.surveyResponse.deleteMany({ where: { formId: { in: formIds } } })
      await prisma.surveyForm.deleteMany({ where: { id: { in: formIds } } })
    }

    // 2. Delete ParentStudentLinks
    await prisma.parentStudentLink.deleteMany({ where: { parentId: { in: parentIds } } })

    // 3. Delete Notifications for these users
    if (userIds.length > 0) {
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
    }

    // 4. Delete Parent profiles
    await prisma.parent.deleteMany({ where: { id: { in: parentIds } } })

    // 5. Delete User accounts
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    }

    revalidatePath('/admin/parents')
    return { success: true }
  } catch (e: any) {
    console.error('deleteParentAccountsAction error:', e)
    return { success: false, error: e.message }
  }
}