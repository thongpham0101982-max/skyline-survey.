import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import tc01sMapping from "@/lib/special-subjects/tc01s-mapping.json";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectCode = (searchParams.get("subjectCode") || "CXXH").toUpperCase().trim();
    let grade = searchParams.get("grade") || (subjectCode === "GDHN" ? "6" : "1");
    const classId = searchParams.get("classId") || "";
    let educationSystem = (searchParams.get("educationSystem") || "").toUpperCase().trim();

    if (classId) {
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, className: true, grade: true, educationSystem: true }
      });
      if (targetClass) {
        if (targetClass.grade) grade = String(targetClass.grade).replace(/\D/g, "") || grade;
        if (!educationSystem && targetClass.educationSystem) {
          educationSystem = String(targetClass.educationSystem).toUpperCase().trim();
        }
      }
    }

    // 1. Find special subject
    const subject = await (prisma as any).specialSubject.findFirst({
      where: {
        OR: [{ code: subjectCode }, { id: subjectCode }],
        status: "ACTIVE"
      }
    });

    if (!subject) {
      return NextResponse.json({ error: `Không tìm thấy môn học đặc thù mã: ${subjectCode}` }, { status: 404 });
    }

    // Check Education System compatibility for FIN_EDU Grade 1..5 (TC01S..TC05S are Hệ đào tạo S / HNS)
    // Specifically Requirement 2:
    // "Gán chương trình đúng hệ đào tạo S theo cấu hình hệ thống. Không tự động áp dụng cho hệ khác khi chưa có chương trình tương ứng. Lớp khối 1 chỉ hiển thị chương trình đúng khối và hệ được gán."
    const isGrade1FinEdu = subject.code === "FIN_EDU" && String(grade) === "1";
    const isNonSystemS =
      educationSystem &&
      educationSystem !== "ALL" &&
      educationSystem !== "HNS" &&
      educationSystem !== "S";

    if (isGrade1FinEdu && isNonSystemS) {
      return NextResponse.json({
        subject: {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          color: subject.color,
          icon: subject.icon
        },
        grade: String(grade),
        educationSystem,
        programCode: null,
        hasDurationConfig: false,
        systemMismatch: true,
        systemMismatchNotice: `Lớp thuộc hệ đào tạo ${educationSystem}. Chương trình Giáo dục Tài chính cá nhân Khối 1 hiện chỉ cấu hình cho Hệ đào tạo S (mã chương trình TC01S, sheet KHỐI 1S); không tự động áp dụng cho hệ đào tạo khác khi chưa có chương trình tương ứng.`,
        gradeConfig: null,
        topics: [],
        topicsCount: 0,
        lessonsCount: 0,
        criteriaCount: 0,
        lessons: []
      });
    }

    // 2. Determine target curriculum by grade
    const gNum = parseInt(grade, 10);
    const levelList =
      gNum >= 6 && gNum <= 9
        ? ["SECONDARY", "MIDDLE"]
        : gNum >= 10
        ? ["HIGH_SCHOOL", "HIGH"]
        : ["PRIMARY", "ELEMENTARY"];

    let curriculum = await (prisma as any).specialCurriculum.findFirst({
      where: {
        subjectId: subject.id,
        level: { in: levelList },
        status: "ACTIVE"
      },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          take: 1,
          include: {
            gradeConfigs: {
              where: { grade: grade.toString() },
              take: 1
            },
            topics: {
              where: { grade: grade.toString() },
              orderBy: { sortOrder: "asc" },
              include: {
                lessons: {
                  where: { grade: grade.toString() },
                  orderBy: { periodIndex: "asc" },
                  include: {
                    criteria: {
                      orderBy: { sortOrder: "asc" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!curriculum || !curriculum.versions?.[0]) {
      curriculum = await (prisma as any).specialCurriculum.findFirst({
        where: {
          subjectId: subject.id,
          targetGrades: { contains: grade.toString() },
          status: "ACTIVE"
        },
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            take: 1,
            include: {
              gradeConfigs: {
                where: { grade: grade.toString() },
                take: 1
              },
              topics: {
                where: { grade: grade.toString() },
                orderBy: { sortOrder: "asc" },
                include: {
                  lessons: {
                    where: { grade: grade.toString() },
                    orderBy: { periodIndex: "asc" },
                    include: {
                      criteria: {
                        orderBy: { sortOrder: "asc" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    if (!curriculum || !curriculum.versions?.[0]) {
      return NextResponse.json({ error: `Chưa tìm thấy chương trình ${subject.name} cho Khối ${grade}` }, { status: 404 });
    }

    const version = curriculum.versions[0];
    const gradeConfig = version.gradeConfigs?.[0] || null;
    const hasDurationConfig = Boolean(
      gradeConfig && Number(gradeConfig.totalPeriods) > 0 && Number(gradeConfig.periodMinutes) > 0
    );

    const programCode =
      subject.code === "FIN_EDU" && gNum >= 1 && gNum <= 5
        ? `TC0${gNum}S`
        : subject.code === "FIN_EDU"
        ? `TC0${gNum}`
        : `${subject.code}_K${gNum}`;

    const lessons: any[] = [];
    const topicsSummary: any[] = [];
    let totalCriteriaCount = 0;

    version.topics.forEach((t: any) => {
      let topicCriteriaCount = 0;
      t.lessons.forEach((l: any) => {
        const cLen = l.criteria?.length || 0;
        topicCriteriaCount += cLen;
        totalCriteriaCount += cLen;
        const lessonCode = `${t.code}.${String(l.periodIndex).padStart(4, "0")}`;
        lessons.push({
          id: l.id,
          topicId: t.id,
          topicName: t.name,
          topicCode: t.code,
          lessonCode,
          grade: l.grade,
          periodIndex: l.periodIndex,
          lessonName: l.lessonName,
          objectives: l.objectives,
          hasDurationConfig,
          criteriaCount: cLen,
          criteria: l.criteria.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            description: c.description,
            programLevel: c.programLevel || null,
            competencyGroup: c.competencyGroup || "Chung",
            sortOrder: c.sortOrder,
            hasReviewWarning: subject.code === "FIN_EDU" && String(grade) === "1" && c.code === "TC01S.01.0001.25",
            reviewWarningText:
              subject.code === "FIN_EDU" && String(grade) === "1" && c.code === "TC01S.01.0001.25"
                ? "Nguồn KHỐI 1S ghi Mức 2 nhưng đánh dấu tại cột Vận dụng (đang giữ nguyên theo nguồn, cần rà soát chuyên môn)."
                : null
          }))
        });
      });

      topicsSummary.push({
        id: t.id,
        code: t.code,
        name: t.name,
        sortOrder: t.sortOrder,
        lessonsCount: t.lessons.length,
        criteriaCount: topicCriteriaCount
      });
    });

    lessons.sort((a, b) => a.periodIndex - b.periodIndex);

    return NextResponse.json({
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        color: subject.color,
        icon: subject.icon
      },
      curriculum: {
        id: curriculum.id,
        code: curriculum.code,
        name: curriculum.name,
        versionId: version.id,
        versionCode: version.versionCode
      },
      grade: String(grade),
      educationSystem: educationSystem || "HNS",
      programCode,
      sheetName: subject.code === "FIN_EDU" && gNum >= 1 && gNum <= 5 ? `KHỐI ${gNum}S` : null,
      hasDurationConfig,
      systemMismatch: false,
      gradeConfig,
      topics: topicsSummary,
      topicsCount: version.topics.length,
      lessonsCount: lessons.length,
      criteriaCount: totalCriteriaCount,
      lessons,
      sourceReconciliation: isGrade1FinEdu ? {
        programCode: tc01sMapping.programCode,
        sheetName: tc01sMapping.sheetName,
        durationConfigured: tc01sMapping.durationConfigured,
        durationNote: tc01sMapping.durationNote,
        summary: tc01sMapping.summary,
        anomalyCategories: tc01sMapping.anomalyCategories
      } : null
    });
  } catch (error: any) {
    console.error("[Special Subject Structure GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
