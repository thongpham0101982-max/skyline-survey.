import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade") || "1";

    const isPrimary = parseInt(grade, 10) <= 5;
    const curriculumCode = isPrimary ? "CURR_CXXH_PRIMARY" : "CURR_CXXH_SECONDARY";

    const curriculum = await (prisma as any).specialCurriculum.findFirst({
      where: { code: curriculumCode, status: "ACTIVE" },
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
      return NextResponse.json({ error: `Chưa tìm thấy chương trình CXXH cho Khối ${grade}` }, { status: 404 });
    }

    const version = curriculum.versions[0];
    const gradeConfig = version.gradeConfigs?.[0] || null;

    // Flatten lessons list for easy sequential navigation
    const lessons: any[] = [];
    version.topics.forEach((t: any) => {
      t.lessons.forEach((l: any) => {
        lessons.push({
          id: l.id,
          topicId: t.id,
          topicName: t.name,
          topicCode: t.code,
          grade: l.grade,
          periodIndex: l.periodIndex,
          lessonName: l.lessonName,
          objectives: l.objectives,
          criteriaCount: l.criteria?.length || 0,
          criteria: l.criteria.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            description: c.description,
            programLevel: c.programLevel || null,
            competencyGroup: c.competencyGroup || "Chung",
            sortOrder: c.sortOrder
          }))
        });
      });
    });

    lessons.sort((a, b) => a.periodIndex - b.periodIndex);

    return NextResponse.json({
      grade,
      gradeConfig,
      topicsCount: version.topics.length,
      lessonsCount: lessons.length,
      lessons
    });
  } catch (error: any) {
    console.error("[CXXH Structure GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
