"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function importClassesAction(data: any[]) {
  let count = 0
  for (const item of data) {
    try {
      await prisma.class.upsert({
        where: { classCode: item.classCode },
        update: {
          className: item.className,
          campusId: item.campusId,
          academicYearId: item.academicYearId,
          level: item.level || "",
          grade: item.grade || "",
          educationSystem: item.educationSystem || ""
        },
        create: {
          classCode: item.classCode,
          className: item.className,
          campusId: item.campusId,
          academicYearId: item.academicYearId,
          level: item.level || "",
          grade: item.grade || "",
          educationSystem: item.educationSystem || "",
          status: "ACTIVE"
        }
      })
      count++
    } catch(e) {
      console.error("Import error on row: ", item, e)
    }
  }
  revalidatePath("/admin/classes")
  return { success: true, count }
}

export async function deleteClasses(ids: string[]) {
  try {
    await prisma.class.deleteMany({
      where: { id: { in: ids } }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateClass(id: string, data: any) {
  try {
    await prisma.class.update({
      where: { id },
      data: {
        className: data.className,
        level: data.level,
        grade: data.grade,
        campusId: data.campusId,
        educationSystem: data.educationSystem || "",
        homeroomTeacherId: data.homeroomTeacherId
      }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}

export async function createClassAction(data: any) {
  try {
    // Auto-generate classCode
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId }
    })
    let yearSuffix = String(new Date().getFullYear()).slice(-2) // fallback
    if (academicYear && academicYear.name) {
      const parts = academicYear.name.split("-")
      const yearStr = parts[1] || parts[0]
      if (yearStr && yearStr.trim().length >= 4) {
        yearSuffix = yearStr.trim().slice(-2)
      }
    }

    const isMN = data.level === "Mầm non"
    const prefix = isMN ? `MN-${yearSuffix}-` : `C-${yearSuffix}-`

    const existingClasses = await prisma.class.findMany({
      where: {
        academicYearId: data.academicYearId,
        classCode: { startsWith: prefix }
      },
      select: { classCode: true }
    })

    let maxSeq = 0
    for (const c of existingClasses) {
      const parts = c.classCode.split("-")
      const seqStr = parts[parts.length - 1]
      const seq = parseInt(seqStr, 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    }
    const nextSeq = maxSeq + 1
    const generatedClassCode = `${prefix}${nextSeq}`

    await prisma.class.create({
      data: {
        classCode: generatedClassCode,
        className: data.className,
        level: data.level || "",
        grade: data.grade || "",
        campusId: data.campusId,
        academicYearId: data.academicYearId,
        educationSystem: data.educationSystem || "",
        homeroomTeacherId: data.homeroomTeacherId || null,
        status: "ACTIVE"
      }
    })
    revalidatePath("/admin/classes")
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}

// ─────────────────────────────────────────────────────────────
// KẾT CHUYỂN LỚP HỌC — Preview
// ─────────────────────────────────────────────────────────────
export async function previewClassTransferAction(sourceYearId: string, targetYearId: string) {
  try {
    const [sourceClasses, targetClasses] = await Promise.all([
      prisma.class.findMany({
        where: { academicYearId: sourceYearId },
        include: { campus: true, _count: { select: { students: { where: { status: "ACTIVE" } } } } },
        orderBy: [{ campus: { campusName: "asc" } }, { level: "asc" }, { grade: "asc" }, { className: "asc" }]
      }),
      prisma.class.findMany({
        where: { academicYearId: targetYearId },
        select: { className: true, campusId: true, level: true, grade: true }
      })
    ]);

    const targetSet = new Set(targetClasses.map((c: any) => `${c.className}__${c.campusId}`));

    const preview = sourceClasses.map((c: any) => ({
      id: c.id,
      classCode: c.classCode,
      className: c.className,
      level: c.level,
      grade: c.grade,
      campusId: c.campusId,
      campus: c.campus?.campusName || "",
      educationSystem: c.educationSystem || "",
      studentCount: c._count.students,
      alreadyExists: targetSet.has(`${c.className}__${c.campusId}`)
    }));

    return { success: true, preview };
  } catch (e: any) {
    return { success: false, error: e.message, preview: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// KẾT CHUYỂN LỚP HỌC — Execute
// ─────────────────────────────────────────────────────────────
export async function transferClassesAction(data: {
  sourceYearId: string;
  targetYearId: string;
  classIds: string[];
  mode: "class_only" | "with_subjects" | "with_assignments";
}) {
  try {
    const targetYear = await prisma.academicYear.findUnique({ where: { id: data.targetYearId } });
    let yearSuffix = String(new Date().getFullYear()).slice(-2);
    if (targetYear?.name) {
      const parts = targetYear.name.split("-");
      const yearStr = parts[1] || parts[0];
      if (yearStr && yearStr.trim().length >= 4) yearSuffix = yearStr.trim().slice(-2);
    }

    const sourceClasses = await prisma.class.findMany({
      where: { id: { in: data.classIds } },
      include: {
        teachingAssignments: data.mode === "with_assignments" ? {
          select: { teacherId: true, subjectId: true, semester: true }
        } : false
      }
    });

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const sc of sourceClasses) {
      try {
        const isMN = (sc.level || "").toLowerCase().includes("mầm non") || (sc.level || "").toLowerCase().includes("nhà trẻ") || (sc.level || "").toLowerCase().includes("mẫu giáo");
        const prefix = isMN ? `MN-${yearSuffix}-` : `C-${yearSuffix}-`;

        const existing = await prisma.class.findFirst({
          where: { academicYearId: data.targetYearId, className: sc.className, campusId: sc.campusId }
        });

        let targetClassId: string;

        if (existing) {
          skipped++;
          targetClassId = existing.id;
        } else {
          // Generate unique classCode
          const existingCodes = await prisma.class.findMany({
            where: { academicYearId: data.targetYearId, classCode: { startsWith: prefix } },
            select: { classCode: true }
          });
          let maxSeq = 0;
          for (const ec of existingCodes) {
            const parts = ec.classCode.split("-");
            const seq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }

          const newClass = await prisma.class.create({
            data: {
              classCode: `${prefix}${maxSeq + 1}`,
              className: sc.className,
              level: sc.level || "",
              grade: sc.grade || "",
              campusId: sc.campusId,
              academicYearId: data.targetYearId,
              educationSystem: sc.educationSystem || "",
              homeroomTeacherId: sc.homeroomTeacherId || null,
              status: "ACTIVE"
            }
          });
          created++;
          targetClassId = newClass.id;
        }

        // Copy teaching assignments if requested
        if (data.mode === "with_assignments" && (sc as any).teachingAssignments?.length > 0) {
          for (const ta of (sc as any).teachingAssignments) {
            await prisma.teachingAssignment.upsert({
              where: {
                teacherId_classId_subjectId_academicYearId_semester: {
                  teacherId: ta.teacherId,
                  classId: targetClassId,
                  subjectId: ta.subjectId,
                  academicYearId: data.targetYearId,
                  semester: ta.semester
                }
              },
              update: {},
              create: {
                teacherId: ta.teacherId,
                classId: targetClassId,
                subjectId: ta.subjectId,
                academicYearId: data.targetYearId,
                semester: ta.semester
              }
            });
          }
        }
      } catch (e: any) {
        errors.push(`${sc.className}: ${e.message}`);
      }
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin/teaching-assignments");
    return { success: true, created, skipped, errors };
  } catch (e: any) {
    return { success: false, error: e.message, created: 0, skipped: 0, errors: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// SAO CHÉP HỌC SINH — Preview (check trùng)
// ─────────────────────────────────────────────────────────────
export async function previewStudentCopyAction(sourceYearId: string, targetYearId: string) {
  try {
    const [sourceStudents, targetStudents, sourceClasses, targetClasses] = await Promise.all([
      prisma.student.findMany({
        where: { academicYearId: sourceYearId, status: "ACTIVE" },
        include: { class: { include: { campus: true } } },
        orderBy: [{ class: { className: "asc" } }, { studentName: "asc" }]
      }),
      prisma.student.findMany({
        where: { academicYearId: targetYearId },
        select: { studentCode: true }
      }),
      prisma.class.findMany({
        where: { academicYearId: sourceYearId },
        select: { id: true, className: true, campusId: true }
      }),
      prisma.class.findMany({
        where: { academicYearId: targetYearId },
        select: { id: true, className: true, campusId: true }
      })
    ]);

    const targetCodeSet = new Set(targetStudents.map((s: any) => s.studentCode));

    // Auto-map classes by className + campusId
    const classMap: Record<string, string | null> = {};
    for (const sc of sourceClasses) {
      const match = targetClasses.find((tc: any) => tc.className === sc.className && tc.campusId === sc.campusId);
      classMap[sc.id] = match ? match.id : null;
    }

    const preview = sourceStudents.map((s: any) => ({
      id: s.id,
      studentCode: s.studentCode,
      studentName: s.studentName,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      sourceClassId: s.classId,
      sourceClassName: s.class?.className || "",
      campusId: s.campusId,
      campus: s.class?.campus?.campusName || "",
      targetClassId: classMap[s.classId] || null,
      isDuplicate: targetCodeSet.has(s.studentCode),
      hasTargetClass: !!classMap[s.classId]
    }));

    const classMappingList = sourceClasses.map((sc: any) => ({
      sourceClassId: sc.id,
      sourceClassName: sc.className,
      targetClassId: classMap[sc.id] || null
    }));

    return { success: true, preview, classMappingList };
  } catch (e: any) {
    return { success: false, error: e.message, preview: [], classMappingList: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// SAO CHÉP HỌC SINH — Execute (bỏ qua trùng)
// ─────────────────────────────────────────────────────────────
export async function copyStudentsAction(sourceYearId: string, targetYearId: string) {
  try {
    const [sourceStudents, targetStudents, sourceClasses, targetClasses] = await Promise.all([
      prisma.student.findMany({
        where: { academicYearId: sourceYearId, status: "ACTIVE" },
        include: { class: true }
      }),
      prisma.student.findMany({
        where: { academicYearId: targetYearId },
        select: { studentCode: true }
      }),
      prisma.class.findMany({ where: { academicYearId: sourceYearId }, select: { id: true, className: true, campusId: true } }),
      prisma.class.findMany({ where: { academicYearId: targetYearId }, select: { id: true, className: true, campusId: true } })
    ]);

    const targetCodeSet = new Set(targetStudents.map((s: any) => s.studentCode));
    const classMap: Record<string, string | null> = {};
    for (const sc of sourceClasses) {
      const match = targetClasses.find((tc: any) => tc.className === sc.className && tc.campusId === sc.campusId);
      classMap[sc.id] = match ? match.id : null;
    }

    // Get target campus
    const targetCampusMap: Record<string, string> = {};
    for (const tc of targetClasses) {
      targetCampusMap[tc.id] = (tc as any).campusId;
    }

    let copied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const s of sourceStudents) {
      if (targetCodeSet.has(s.studentCode)) {
        skipped++;
        continue;
      }
      const targetClassId = classMap[s.classId];
      if (!targetClassId) {
        skipped++;
        continue;
      }
      try {
        // Get fresh campus data from target class
        const targetClass = targetClasses.find((tc: any) => tc.id === targetClassId) as any;
        
        await prisma.student.create({
          data: {
            studentCode: s.studentCode,
            studentName: s.studentName,
            dateOfBirth: s.dateOfBirth || null,
            gender: s.gender || null,
            classId: targetClassId,
            campusId: targetClass ? targetClass.campusId : s.campusId,
            academicYearId: targetYearId,
            status: "ACTIVE"
          }
        });
        copied++;
      } catch (e: any) {
        errors.push(`${s.studentCode} (${s.studentName}): ${e.message}`);
      }
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin/student-transfers");
    return { success: true, copied, skipped, errors };
  } catch (e: any) {
    return { success: false, error: e.message, copied: 0, skipped: 0, errors: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// SAO CHÉP PHÂN CÔNG GIẢNG DẠY — Preview
// ─────────────────────────────────────────────────────────────
export async function previewTeachingAssignmentCopyAction(sourceYearId: string, targetYearId: string) {
  try {
    const [sourceAssignments, sourceClasses, targetClasses] = await Promise.all([
      prisma.teachingAssignment.findMany({
        where: { academicYearId: sourceYearId },
        include: {
          teacher: { select: { teacherName: true } },
          subject: { select: { subjectName: true } },
          class: { select: { className: true, campusId: true } }
        },
        orderBy: [{ class: { className: "asc" } }, { subject: { subjectName: "asc" } }]
      }),
      prisma.class.findMany({ where: { academicYearId: sourceYearId }, select: { id: true, className: true, campusId: true } }),
      prisma.class.findMany({ where: { academicYearId: targetYearId }, select: { id: true, className: true, campusId: true } })
    ]);

    // Build class mapping
    const classMap: Record<string, string | null> = {};
    for (const sc of sourceClasses) {
      const match = targetClasses.find((tc: any) => tc.className === sc.className && tc.campusId === sc.campusId);
      classMap[sc.id] = match ? match.id : null;
    }

    // Check existing assignments in target year
    const existingAssignments = await prisma.teachingAssignment.findMany({
      where: { academicYearId: targetYearId },
      select: { teacherId: true, classId: true, subjectId: true, semester: true }
    });
    const existingSet = new Set(existingAssignments.map((a: any) => `${a.teacherId}__${a.classId}__${a.subjectId}__${a.semester}`));

    const preview = sourceAssignments.map((a: any) => {
      const targetClassId = classMap[a.classId];
      const conflictKey = `${a.teacherId}__${targetClassId}__${a.subjectId}__${a.semester}`;
      return {
        id: a.id,
        teacherId: a.teacherId,
        teacherName: a.teacher?.teacherName || "",
        subjectId: a.subjectId,
        subjectName: a.subject?.subjectName || "",
        classId: a.classId,
        className: a.class?.className || "",
        semester: a.semester,
        targetClassId,
        hasTargetClass: !!targetClassId,
        isDuplicate: !!targetClassId && existingSet.has(conflictKey)
      };
    });

    return { success: true, preview };
  } catch (e: any) {
    return { success: false, error: e.message, preview: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// SAO CHÉP PHÂN CÔNG GIẢNG DẠY — Execute
// ─────────────────────────────────────────────────────────────
export async function copyTeachingAssignmentsAction(sourceYearId: string, targetYearId: string) {
  try {
    const [sourceAssignments, sourceClasses, targetClasses] = await Promise.all([
      prisma.teachingAssignment.findMany({
        where: { academicYearId: sourceYearId },
        select: { teacherId: true, classId: true, subjectId: true, semester: true }
      }),
      prisma.class.findMany({ where: { academicYearId: sourceYearId }, select: { id: true, className: true, campusId: true } }),
      prisma.class.findMany({ where: { academicYearId: targetYearId }, select: { id: true, className: true, campusId: true } })
    ]);

    const classMap: Record<string, string | null> = {};
    for (const sc of sourceClasses) {
      const match = targetClasses.find((tc: any) => tc.className === sc.className && tc.campusId === sc.campusId);
      classMap[sc.id] = match ? match.id : null;
    }

    let copied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const a of sourceAssignments) {
      const targetClassId = classMap[a.classId];
      if (!targetClassId) { skipped++; continue; }
      try {
        await prisma.teachingAssignment.upsert({
          where: {
            teacherId_classId_subjectId_academicYearId_semester: {
              teacherId: a.teacherId,
              classId: targetClassId,
              subjectId: a.subjectId,
              academicYearId: targetYearId,
              semester: a.semester
            }
          },
          update: {},
          create: {
            teacherId: a.teacherId,
            classId: targetClassId,
            subjectId: a.subjectId,
            academicYearId: targetYearId,
            semester: a.semester
          }
        });
        copied++;
      } catch (e: any) {
        errors.push(`${a.teacherId}: ${e.message}`);
        skipped++;
      }
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin/teaching-assignments");
    return { success: true, copied, skipped, errors };
  } catch (e: any) {
    return { success: false, error: e.message, copied: 0, skipped: 0, errors: [] };
  }
}
