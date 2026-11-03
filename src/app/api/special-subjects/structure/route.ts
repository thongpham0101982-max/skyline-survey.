import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectCode = (searchParams.get("subjectCode") || "CXXH").toUpperCase().trim();
    const grade = searchParams.get("grade") || (subjectCode === "GDHN" ? "6" : "1");

    // 1. Find special subject
    const subject = await (prisma as any).specialSubject.findFirst({
      where: { 
        OR: [
          { code: subjectCode },
          { id: subjectCode }
        ],
        status: "ACTIVE" 
      }
    });

    if (!subject) {
      return NextResponse.json({ error: `Không tìm thấy môn học đặc thù mã: ${subjectCode}` }, { status: 404 });
    }

    // 2. Determine target curriculum by grade
    const gNum = parseInt(grade, 10);
    const levelList = (gNum >= 6 && gNum <= 9)
      ? ["SECONDARY", "MIDDLE"]
      : (gNum >= 10)
      ? ["HIGH_SCHOOL", "HIGH"]
      : ["PRIMARY", "ELEMENTARY"];

    const curriculum = await (prisma as any).specialCurriculum.findFirst({
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
      // Fallback check if curriculum targetGrades contains grade
      const fallbackCurriculum = await (prisma as any).specialCurriculum.findFirst({
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

      if (!fallbackCurriculum || !fallbackCurriculum.versions?.[0]) {
        return NextResponse.json({ error: `Chưa tìm thấy chương trình ${subject.name} cho Khối ${grade}` }, { status: 404 });
      }

      const version = fallbackCurriculum.versions[0];
      const gradeConfig = version.gradeConfigs?.[0] || null;

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
        subject: {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          color: subject.color,
          icon: subject.icon
        },
        grade,
        gradeConfig,
        topicsCount: version.topics.length,
        lessonsCount: lessons.length,
        lessons
      });
    }

    const version = curriculum.versions[0];
    const gradeConfig = version.gradeConfigs?.[0] || null;

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
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        color: subject.color,
        icon: subject.icon
      },
      grade,
      gradeConfig,
      topicsCount: version.topics.length,
      lessonsCount: lessons.length,
      lessons
    });
  } catch (error: any) {
    console.error("[Special Subject Structure GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
