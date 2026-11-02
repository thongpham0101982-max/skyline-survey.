import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
    createOrCloneParentMeeting,
    listParentMeetingsForActor,
    ParentMeetingError,
    resolveParentMeetingActorContext,
} from "@/lib/parent-meeting/parentMeetingService";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get("academicYearId") || undefined;
        const semester = searchParams.get("semester") || undefined;
        const campusId = searchParams.get("campusId") || undefined;
        const classId = searchParams.get("classId") || undefined;
        const studentId = searchParams.get("studentId") || undefined;
        const status = searchParams.get("status") || undefined;
        const meetingType = searchParams.get("meetingType") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = Number(searchParams.get("page") || "1");
        const pageSize = Number(searchParams.get("pageSize") || "20");
        const includeMeta = searchParams.get("includeMeta") === "true";

        const result = await listParentMeetingsForActor(ctx, {
            academicYearId,
            semester,
            campusId,
            classId,
            studentId,
            status,
            meetingType,
            search,
            page,
            pageSize,
        });

        if (!includeMeta) {
            return NextResponse.json({
                ...result,
                actor: {
                    userId: ctx.userId,
                    userName: ctx.userName,
                    role: ctx.role,
                    isAdmin: ctx.isAdmin,
                    isKTDBCL: ctx.isKTDBCL,
                    isGDCS: ctx.isGDCS,
                    isTeacher: ctx.isTeacher,
                    isParent: ctx.isParent,
                    linkedStudents: ctx.linkedStudents,
                    homeroomClassIds: ctx.homeroomClassIds,
                    subjectClassIds: ctx.subjectClassIds,
                },
            });
        }

        const [academicYearsRaw, campusesRaw, classesRaw] = await Promise.all([
            prisma.academicYear.findMany({
                orderBy: { startDate: "desc" },
                select: { id: true, name: true, status: true },
            }),
            prisma.campus.findMany({
                where:
                    ctx.isGDCS && ctx.allowedCampusIds.length > 0
                        ? { id: { in: ctx.allowedCampusIds } }
                        : {},
                select: { id: true, campusName: true, campusCode: true },
                orderBy: { campusName: "asc" },
            }),
            prisma.class.findMany({
                where:
                    !ctx.isSuperAdmin && !ctx.isAdmin && !ctx.isKTDBCL && !ctx.isGDCS
                        ? {
                              id: {
                                  in: Array.from(
                                      new Set([...ctx.homeroomClassIds, ...ctx.subjectClassIds])
                                  ),
                              },
                          }
                        : ctx.isGDCS && ctx.allowedCampusIds.length > 0
                        ? { campusId: { in: ctx.allowedCampusIds } }
                        : {},
                select: {
                    id: true,
                    className: true,
                    grade: true,
                    level: true,
                    campusId: true,
                    academicYearId: true,
                    homeroomTeacherId: true,
                },
                orderBy: [{ grade: "asc" }, { className: "asc" }],
            }),
        ]);

        const academicYears = academicYearsRaw.map((y) => ({
            id: y.id,
            name: y.name,
            isCurrent: y.status === "ACTIVE",
        }));
        const campuses = campusesRaw.map((c) => ({
            id: c.id,
            name: c.campusName,
            code: c.campusCode,
        }));
        const classes = classesRaw.map((c) => ({
            id: c.id,
            name: c.className,
            grade: c.grade,
            level: c.level,
            campusId: c.campusId,
            academicYearId: c.academicYearId,
            homeroomTeacherId: c.homeroomTeacherId,
        }));

        return NextResponse.json({
            ...result,
            actor: {
                userId: ctx.userId,
                userName: ctx.userName,
                role: ctx.role,
                isAdmin: ctx.isAdmin,
                isKTDBCL: ctx.isKTDBCL,
                isGDCS: ctx.isGDCS,
                isTeacher: ctx.isTeacher,
                isParent: ctx.isParent,
                linkedStudents: ctx.linkedStudents,
                homeroomClassIds: ctx.homeroomClassIds,
                subjectClassIds: ctx.subjectClassIds,
            },
            meta: {
                academicYears,
                campuses,
                classes,
            },
        });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[GET /api/parent-meetings] Error:", err);
        return NextResponse.json(
            { error: "Đã xảy ra lỗi khi tải danh sách cuộc họp phụ huynh." },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ctx = await resolveParentMeetingActorContext({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: (session.user as { role?: string }).role,
            campusIds: (session.user as { campusIds?: string[] }).campusIds,
        });

        const body = await req.json();
        const created = await createOrCloneParentMeeting(ctx, body);

        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        if (err instanceof ParentMeetingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: err.status }
            );
        }
        console.error("[POST /api/parent-meetings] Error:", err);
        return NextResponse.json(
            { error: "Không thể tạo cuộc họp phụ huynh." },
            { status: 500 }
        );
    }
}
