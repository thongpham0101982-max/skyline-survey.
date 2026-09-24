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

export async function getBackupListAction() {
  const fs = require("fs");
  const path = require("path");
  const backupDir = path.join(process.cwd(), "data-backups");

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir);
  const metaList = files
    .filter((f: string) => f.startsWith("skyline_backup_") && f.endsWith("_meta.json"))
    .map((f: string) => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(backupDir, f), "utf8"));
        return content;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return metaList;
}

export async function triggerBackupAction() {
  try {
    const path = require("path");
    const scriptPath = path.join(process.cwd(), "scripts", "backup-db.js");
    const dynamicRequire = eval("require");
    const { runBackup } = dynamicRequire(scriptPath);
    const result = await runBackup({ triggerType: "MANUAL_WEB_ADMIN", force: true });
    revalidatePath("/admin/maintenance");
    return { success: true, result };
  } catch (err: any) {
    console.error("[triggerBackupAction Error]:", err);
    return { success: false, error: err.message || "Lỗi tiến trình sao lưu" };
  }
}

export async function syncSurveyStudentTypesAction() {
  try {
    const [k12GiaoLuu, preGiaoLuu] = await Promise.all([
      prisma.inputAssessmentStudent.findMany({
        where: {
          OR: [
            { admissionResult: { contains: "Giao lưu" } },
            { admissionResult: { contains: "giao lưu" } },
            { admissionResult: { contains: "Giao Luu" } },
            { admissionResult: { contains: "giao luu" } }
          ]
        },
        select: {
          id: true,
          studentCode: true,
          enrollmentCode: true,
          fullName: true,
          admissionResult: true,
          enrollmentClassId: true
        }
      }),
      prisma.preschoolInputAssessmentStudent.findMany({
        where: {
          OR: [
            { admissionResult: { contains: "Giao lưu" } },
            { admissionResult: { contains: "giao lưu" } },
            { admissionResult: { contains: "Giao Luu" } },
            { admissionResult: { contains: "giao luu" } }
          ]
        },
        select: {
          id: true,
          studentCode: true,
          enrollmentCode: true,
          fullName: true,
          admissionResult: true,
          enrollmentClassId: true
        }
      })
    ]);

    const allGiaoLuuCandidates = [...k12GiaoLuu, ...preGiaoLuu];
    let updatedCount = 0;

    for (const cand of allGiaoLuuCandidates) {
      const codes = [cand.enrollmentCode, cand.studentCode].map(c => (c || "").trim().toUpperCase()).filter(Boolean);
      const matchingStudents = await prisma.student.findMany({
        where: {
          OR: [
            { studentCode: { in: codes } },
            cand.enrollmentClassId && cand.fullName ? {
              classId: cand.enrollmentClassId,
              studentName: cand.fullName.trim()
            } : undefined
          ].filter(Boolean) as any
        }
      });

      for (const student of matchingStudents) {
        if (student.studentType !== "GIAO_LUU") {
          await prisma.student.update({
            where: { id: student.id },
            data: {
              studentType: "GIAO_LUU",
              studentTypeNote: student.studentTypeNote || "Học giao lưu theo kết quả khảo sát đầu vào"
            }
          });
          updatedCount++;
        }
      }
    }

    try {
      revalidatePath("/admin/maintenance");
      revalidatePath("/admin/classes");
    } catch {}
    return {
      success: true,
      message: `Đã rà soát ${allGiaoLuuCandidates.length} hồ sơ khảo sát Đạt - Giao lưu. Cập nhật thành công ${updatedCount} học sinh sang diện Giao lưu.`,
      updatedCount
    };
  } catch (err: any) {
    console.error("[syncSurveyStudentTypesAction Error]:", err);
    return { success: false, error: err.message || "Lỗi khi đồng bộ diện học sinh" };
  }
}

