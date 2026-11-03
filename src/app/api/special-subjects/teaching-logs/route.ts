import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { createClient } from "@libsql/client";
import path from "path";

export const dynamic = "force-dynamic";

const LOCAL_DB_PATH = path.resolve(process.cwd(), "local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const classId = searchParams.get("classId");
    const subjectCode = searchParams.get("subjectCode");

    let targetAssignmentId = assignmentId;

    if (!targetAssignmentId && classId && subjectCode) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
      const assign = await (prisma as any).specialTeachingAssignment.findFirst({
        where: {
          classId,
          subject: { code: subjectCode.toUpperCase() },
          ...(activeYear ? { academicYearId: activeYear.id } : {})
        }
      });
      if (assign) targetAssignmentId = assign.id;
    }

    if (!targetAssignmentId) {
      return NextResponse.json({ error: "Thiếu mã phân công giảng dạy (assignmentId)" }, { status: 400 });
    }

    const assignment = await (prisma as any).specialTeachingAssignment.findUnique({
      where: { id: targetAssignmentId },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, className: true, grade: true } },
        teacher: { select: { id: true, teacherName: true } }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Không tìm thấy thông tin phân công" }, { status: 404 });
    }

    // Fetch curriculum lessons
    const lessons = await (prisma as any).specialLesson.findMany({
      where: {
        grade: assignment.class.grade.toString(),
        version: {
          curriculum: {
            subjectId: assignment.subjectId
          }
        }
      },
      orderBy: { periodIndex: "asc" },
      include: {
        topic: { select: { id: true, name: true, code: true } }
      }
    });

    // Fetch teaching logs
    const logs = await (prisma as any).specialTeachingLog.findMany({
      where: { assignmentId: targetAssignmentId },
      orderBy: { taughtDate: "desc" }
    });

    const logMap = new Map<string, any>(logs.map((l: any) => [l.lessonId, l]));

    const progressItems = lessons.map((les: any) => {
      const log = logMap.get(les.id);
      return {
        lessonId: les.id,
        periodIndex: les.periodIndex,
        lessonName: les.lessonName,
        topicName: les.topic?.name || "Chủ đề",
        isProject: les.isProject,
        isTaught: Boolean(log),
        taughtDate: log?.taughtDate || null,
        completedPeriods: log?.completedPeriods || 1,
        notes: log?.notes || "",
        attendanceCount: log?.attendanceCount || null,
        status: log?.status || "PLANNED"
      };
    });

    const taughtCount = progressItems.filter((p: any) => p.isTaught && p.status === "COMPLETED").length;
    const progressRate = lessons.length > 0 ? Math.round((taughtCount / lessons.length) * 100) : 0;

    return NextResponse.json({
      assignment,
      totalLessons: lessons.length,
      taughtCount,
      progressRate,
      items: progressItems
    });
  } catch (error: any) {
    console.error("[SpecialTeachingLog GET Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { assignmentId, lessonId, taughtDate, completedPeriods, notes, attendanceCount, status } = body;

    if (!assignmentId || !lessonId) {
      return NextResponse.json({ error: "Thiếu assignmentId hoặc lessonId" }, { status: 400 });
    }

    const logId = `log_${assignmentId}_${lessonId}`;
    const dateVal = taughtDate ? new Date(taughtDate).toISOString() : new Date().toISOString();
    const periodsVal = parseInt(completedPeriods || "1", 10);
    const statusVal = status || "COMPLETED";

    // Dual database execution
    const clients = [
      { client: createClient({ url: `file:${LOCAL_DB_PATH}` }), name: "LOCAL SQLite" },
      { client: createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN }), name: "TURSO Cloud" }
    ];

    for (const { client, name } of clients) {
      try {
        await client.execute({
          sql: `INSERT INTO "SpecialTeachingLog" (id, assignmentId, lessonId, taughtDate, completedPeriods, notes, attendanceCount, status, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(assignmentId, lessonId) DO UPDATE SET
                  taughtDate = excluded.taughtDate,
                  completedPeriods = excluded.completedPeriods,
                  notes = excluded.notes,
                  attendanceCount = excluded.attendanceCount,
                  status = excluded.status,
                  updatedAt = CURRENT_TIMESTAMP;`,
          args: [
            logId,
            assignmentId,
            lessonId,
            dateVal,
            periodsVal,
            notes || null,
            attendanceCount != null ? parseInt(attendanceCount, 10) : null,
            statusVal
          ]
        });
      } catch (err: any) {
        console.warn(`[SpecialTeachingLog] Dual write warning on ${name}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật nhật ký và tiến độ giảng dạy thành công",
      logId
    });
  } catch (error: any) {
    console.error("[SpecialTeachingLog POST Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
