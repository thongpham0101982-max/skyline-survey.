import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTeacherMyTextbooks } from "@/lib/textbooks/service";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy danh sách SGK theo Phân công giảng dạy của giáo viên đang đăng nhập (Mục XIII)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: "User session invalid" }, { status: 401 });
    }

    // 1. Tìm thông tin Teacher tương ứng với User
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      select: { id: true, teacherName: true, mainSubjectId: true }
    });

    if (!teacher) {
      // Nếu user là Admin không có teacherId, trả về danh sách sách READY chung
      const allReady = await prisma.textbook.findMany({
        where: { processingStatus: "READY" },
        include: {
          subject: true,
          series: true,
          publisher: true,
          chapters: { include: { lessons: true } }
        },
        take: 12
      });
      return NextResponse.json({ success: true, data: allReady, isTeacher: false });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;

    const myBooks = await getTeacherMyTextbooks(teacher.id, academicYearId);

    return NextResponse.json({
      success: true,
      data: myBooks,
      teacherName: teacher.teacherName,
      isTeacher: true
    });
  } catch (error: any) {
    console.error("GET My Textbooks Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
