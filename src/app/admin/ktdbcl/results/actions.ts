"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

// 1. Batch Save Exam Results in an Excel-like grid
export async function saveExamResultsGridAction(
  examId: string,
  academicYearId: string,
  rows: {
    studentId: string
    name: string
    type: string // "CA_NHAN" | "DONG_DOI"
    category: string // "GIAI_THUONG" | "HUY_CHUONG" | "CHUNG_NHAN" | "KHAC" | ""
    level: string // "NHAT" | "NHI" | "BA" | "KHUYEN_KHICH" | "VANG" | "BAC" | "DONG" | "KHAC" | ""
    teacherId: string | null
    teacherName: string | null
  }[]
) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.");
  }
  if (!examId || !academicYearId) return

  await prisma.$transaction(async (tx) => {
    // 1. Delete all existing achievements for this exam (cascades to StudentAchievement)
    await tx.achievement.deleteMany({
      where: { examId }
    })

    // 2. Filter rows that have valid achievements (both category and level set, and name is not empty)
    const validRows = rows.filter(
      r => r.category !== "" && r.level !== "" && r.name.trim() !== ""
    )

    const individualRows = validRows.filter(r => r.type === "CA_NHAN")
    const teamRows = validRows.filter(r => r.type === "DONG_DOI")

    // 3. Save individual achievements
    for (const row of individualRows) {
      await tx.achievement.create({
        data: {
          name: row.name.trim(),
          type: "CA_NHAN",
          category: row.category,
          level: row.level,
          academicYearId,
          teacherId: row.teacherId || null,
          teacherName: row.teacherName || null,
          examId,
          students: {
            create: {
              studentId: row.studentId
            }
          }
        }
      })
    }

    // 4. Save team achievements (grouped by name, level, category, teacherId, teacherName)
    const teamGroups: Record<string, typeof teamRows> = {}
    for (const row of teamRows) {
      const key = `${row.name.trim()}|${row.category}|${row.level}|${row.teacherId || ''}|${row.teacherName || ''}`
      if (!teamGroups[key]) {
        teamGroups[key] = []
      }
      teamGroups[key].push(row)
    }

    for (const [key, groupedRows] of Object.entries(teamGroups)) {
      const first = groupedRows[0]
      await tx.achievement.create({
        data: {
          name: first.name.trim(),
          type: "DONG_DOI",
          category: first.category,
          level: first.level,
          academicYearId,
          teacherId: first.teacherId || null,
          teacherName: first.teacherName || null,
          examId,
          students: {
            create: groupedRows.map(r => ({
              studentId: r.studentId
            }))
          }
        }
      })
    }
  })

  revalidatePath("/admin/ktdbcl/results")
}

// 2. Fetch students with results for an exam
export async function getStudentsWithResultsAction(examId: string) {
  const session = await getAdminSession();
  if (!session.userId) return [];
  if (!examId) return []

  const examStudents = await prisma.examStudent.findMany({
    where: { examId },
    include: {
      student: {
        include: {
          class: true,
          campus: true
        }
      }
    },
    orderBy: {
      student: {
        studentName: "asc"
      }
    }
  })

  const achievements = await prisma.achievement.findMany({
    where: { examId },
    include: {
      students: {
        select: {
          studentId: true
        }
      },
      teacher: {
        select: {
          teacherName: true,
          id: true
        }
      }
    }
  })

  const resultRows: any[] = []

  for (const es of examStudents) {
    if (!es.student) continue;
    const studentAchs = achievements.filter(a => 
      a.students.some(s => s.studentId === es.studentId)
    )

    if (studentAchs.length === 0) {
      resultRows.push({
        id: es.student.id,
        studentCode: es.student.studentCode,
        studentName: es.student.studentName,
        gender: es.student.gender || "Chưa xác định",
        className: es.student.class?.className || "N/A",
        campusName: es.student.campus?.campusName || "N/A",
        achievementId: null,
        achievementName: "",
        type: "CA_NHAN",
        category: "",
        level: "",
        teacherId: "",
        teacherName: ""
      })
    } else {
      for (const ach of studentAchs) {
        resultRows.push({
          id: es.student.id,
          studentCode: es.student.studentCode,
          studentName: es.student.studentName,
          gender: es.student.gender || "Chưa xác định",
          className: es.student.class?.className || "N/A",
          campusName: es.student.campus?.campusName || "N/A",
          achievementId: ach.id,
          achievementName: ach.name,
          type: ach.type,
          category: ach.category,
          level: ach.level,
          teacherId: ach.teacherId || "",
          teacherName: ach.teacherName || ach.teacher?.teacherName || ""
        })
      }
    }
  }

  return resultRows
}

// 3. Fetch achievements report based on filters
export async function getAchievementsReportAction(filters: {
  academicYearId?: string
  campusId?: string
  grade?: string
  classId?: string
  category?: string
  level?: string
}) {
  const session = await getAdminSession();
  if (!session.userId) return [];
  const where: any = {}

  if (filters.academicYearId) {
    where.academicYearId = filters.academicYearId
  }
  if (filters.category) {
    where.category = filters.category
  }
  if (filters.level) {
    where.level = filters.level
  }

  const achievements = await prisma.achievement.findMany({
    where,
    include: {
      exam: true,
      teacher: true,
      academicYear: true,
      students: {
        include: {
          student: {
            include: {
              class: true,
              campus: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  const reportRows: any[] = []

  for (const ach of achievements) {
    for (const sa of ach.students) {
      const student = sa.student
      if (!student) continue

      if (filters.campusId && student.campusId !== filters.campusId) {
        continue
      }
      if (filters.classId && student.classId !== filters.classId) {
        continue
      }
      if (filters.grade && student.class?.grade !== filters.grade) {
        continue
      }

      reportRows.push({
        achievementId: ach.id,
        achievementName: ach.name,
        type: ach.type,
        category: ach.category,
        level: ach.level,
        academicYearName: ach.academicYear?.name || "N/A",
        teacherName: ach.teacherName || ach.teacher?.teacherName || "N/A",
        examName: ach.exam?.name || "Ngoài hệ thống",
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.class?.className || "N/A",
        campusName: student.campus?.campusName || "N/A",
        grade: student.class?.grade || "N/A"
      })
    }
  }

  return reportRows
}

// 4. Get student achievement profile
export async function getStudentProfileWithAchievementsAction(studentId: string) {
  if (!studentId) return null

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      campus: true,
      academicYear: true,
      achievements: {
        include: {
          achievement: {
            include: {
              exam: true,
              teacher: true,
              academicYear: true
            }
          }
        }
      }
    }
  })

  if (!student) return null

  return {
    id: student.id,
    studentCode: student.studentCode,
    studentName: student.studentName,
    gender: student.gender || "Chưa xác định",
    className: student.class?.className || "N/A",
    campusName: student.campus?.campusName || "N/A",
    academicYearName: student.academicYear?.name || "N/A",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
    achievements: student.achievements.map(sa => ({
      id: sa.achievement.id,
      name: sa.achievement.name,
      type: sa.achievement.type,
      category: sa.achievement.category,
      level: sa.achievement.level,
      examName: sa.achievement.exam?.name || "Ngoài hệ thống",
      teacherName: sa.achievement.teacherName || sa.achievement.teacher?.teacherName || "Chưa xác định",
      yearName: sa.achievement.academicYear?.name || "N/A"
    }))
  }
}

// 5. Search students for profile lookup
export async function searchStudentsByNameOrCodeAction(query: string) {
  if (!query || query.trim().length < 2) return []

  const students = await prisma.student.findMany({
    where: {
      OR: [
        { studentCode: { contains: query } },
        { studentName: { contains: query } }
      ]
    },
    include: {
      class: true,
      campus: true
    },
    take: 10
  })

  return students.map(s => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    className: s.class?.className || "N/A",
    campusName: s.campus?.campusName || "N/A"
  }))
}

// 6. Get students in a class
export async function getStudentsByClassAction(classId: string) {
  if (!classId) return []

  const students = await prisma.student.findMany({
    where: { classId },
    include: {
      class: true,
      campus: true
    },
    orderBy: {
      studentName: "asc"
    }
  })

  return students.map(s => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    className: s.class?.className || "N/A",
    campusName: s.campus?.campusName || "N/A"
  }))
}

// 7. Upsert Exam Results (Differential Sync)
export async function upsertExamResultsAction(
  examId: string,
  academicYearId: string,
  changedRows: {
    achievementId?: string | null
    studentId: string
    name: string
    type: string
    category: string
    level: string
    teacherId: string | null
    teacherName: string | null
  }[]
) {
  const session = await getAdminSession();
  if (!session.userId || !session.isFullAccess) {
    throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.");
  }
  if (!examId || !academicYearId || !changedRows || changedRows.length === 0) return

  await prisma.$transaction(async (tx) => {
    const emptyRows = changedRows.filter(r => r.category === "" || r.level === "" || r.name.trim() === "");
    const validRows = changedRows.filter(r => r.category !== "" && r.level !== "" && r.name.trim() !== "");
    const individualRows = validRows.filter(r => r.type === "CA_NHAN");
    const teamRows = validRows.filter(r => r.type === "DONG_DOI");

    // 1. Process Empty Rows (Delete)
    const targetLinks = emptyRows
      .filter(r => r.achievementId)
      .map(r => ({
        studentId: r.studentId,
        achievementId: r.achievementId
      }));

    if (targetLinks.length > 0) {
      const linksToDelete = await tx.studentAchievement.findMany({
        where: {
          OR: targetLinks
        }
      });
      if (linksToDelete.length > 0) {
        await tx.studentAchievement.deleteMany({
          where: {
            id: { in: linksToDelete.map(l => l.id) }
          }
        });
      }
    }

    const achievementsWithNoStudents = await tx.achievement.findMany({
      where: {
        examId,
        students: {
          none: {}
        }
      },
      select: {
        id: true
      }
    });

    if (achievementsWithNoStudents.length > 0) {
      await tx.achievement.deleteMany({
        where: {
          id: { in: achievementsWithNoStudents.map(a => a.id) }
        }
      });
    }

    // 2. Process Individual Rows (Upsert)
    for (const row of individualRows) {
      if (row.achievementId) {
        const existingAch = await tx.achievement.findUnique({ where: { id: row.achievementId } });
        if (existingAch) {
          if (existingAch.type === "CA_NHAN") {
            await tx.achievement.update({
              where: { id: row.achievementId },
              data: {
                name: row.name.trim(),
                category: row.category,
                level: row.level,
                teacherId: row.teacherId,
                teacherName: row.teacherName,
              }
            });
          } else {
             // Was team, now individual. Create new individual achievement and unlink from team.
             const existingLink = await tx.studentAchievement.findFirst({
               where: { studentId: row.studentId, achievementId: row.achievementId }
             });
             if (existingLink) {
               await tx.studentAchievement.delete({ where: { id: existingLink.id } });
               const remaining = await tx.studentAchievement.count({ where: { achievementId: row.achievementId } });
               if (remaining === 0) await tx.achievement.delete({ where: { id: row.achievementId } });
             }
             
             await tx.achievement.create({
              data: {
                name: row.name.trim(), type: "CA_NHAN", category: row.category, level: row.level,
                academicYearId, teacherId: row.teacherId, teacherName: row.teacherName, examId,
                students: { create: { studentId: row.studentId } }
              }
            });
          }
        }
      } else {
        await tx.achievement.create({
          data: {
            name: row.name.trim(), type: "CA_NHAN", category: row.category, level: row.level,
            academicYearId, teacherId: row.teacherId, teacherName: row.teacherName, examId,
            students: { create: { studentId: row.studentId } }
          }
        });
      }
    }

    // 3. Process Team Rows (Group and Upsert)
    const teamGroups: Record<string, typeof teamRows> = {};
    for (const row of teamRows) {
      const key = `${row.name.trim()}|${row.category}|${row.level}|${row.teacherId || ''}|${row.teacherName || ''}`;
      if (!teamGroups[key]) teamGroups[key] = [];
      teamGroups[key].push(row);
    }

    for (const [key, groupedRows] of Object.entries(teamGroups)) {
      const first = groupedRows[0];
      
      const existingTeamAch = await tx.achievement.findFirst({
        where: {
          examId, type: "DONG_DOI", name: first.name.trim(), category: first.category, level: first.level,
          teacherId: first.teacherId || null
        }
      });

      if (existingTeamAch) {
        for (const row of groupedRows) {
          if (row.achievementId && row.achievementId !== existingTeamAch.id) {
             const existingLink = await tx.studentAchievement.findFirst({
               where: { studentId: row.studentId, achievementId: row.achievementId }
             });
             if (existingLink) {
               await tx.studentAchievement.delete({ where: { id: existingLink.id } });
               const remaining = await tx.studentAchievement.count({ where: { achievementId: row.achievementId } });
               if (remaining === 0) await tx.achievement.delete({ where: { id: row.achievementId } });
             }
          }
          
          const alreadyLinked = await tx.studentAchievement.findFirst({
            where: { studentId: row.studentId, achievementId: existingTeamAch.id }
          });
          
          if (!alreadyLinked) {
            await tx.studentAchievement.create({
              data: { studentId: row.studentId, achievementId: existingTeamAch.id }
            });
          }
        }
      } else {
        // Create new team achievement
        for (const row of groupedRows) {
          if (row.achievementId) {
             const existingLink = await tx.studentAchievement.findFirst({
               where: { studentId: row.studentId, achievementId: row.achievementId }
             });
             if (existingLink) {
               await tx.studentAchievement.delete({ where: { id: existingLink.id } });
               const remaining = await tx.studentAchievement.count({ where: { achievementId: row.achievementId } });
               if (remaining === 0) await tx.achievement.delete({ where: { id: row.achievementId } });
             }
          }
        }
        await tx.achievement.create({
          data: {
            name: first.name.trim(), type: "DONG_DOI", category: first.category, level: first.level,
            academicYearId, teacherId: first.teacherId, teacherName: first.teacherName, examId,
            students: { create: groupedRows.map(r => ({ studentId: r.studentId })) }
          }
        });
      }
    }
  });

  revalidatePath("/admin/ktdbcl/results");
}
