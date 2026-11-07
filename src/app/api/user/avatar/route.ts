import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureSlcSchema } from "@/lib/skyline-connect/schema-init";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy ảnh đại diện (avatar) của người dùng hiện tại hoặc theo userId
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserId = (session?.user as any)?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId") || currentUserId;

    await ensureSlcSchema();
    const pAny = prisma as any;

    const profile = await pAny.slcCommunityProfile
      ?.findUnique({
        where: { userId: targetUserId },
        select: { avatarUrl: true, updatedAt: true },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      avatarUrl: profile?.avatarUrl || null,
      updatedAt: profile?.updatedAt || null,
    });
  } catch (err: any) {
    console.error("[UserAvatar GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi máy chủ khi tải ảnh đại diện" },
      { status: 500 }
    );
  }
}

/**
 * POST: Cập nhật ảnh đại diện (avatar) của giáo viên / người dùng hiện tại
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawAvatarUrl = body?.avatarUrl;

    let cleanAvatarUrl: string | null = null;

    if (rawAvatarUrl !== null && rawAvatarUrl !== "") {
      if (typeof rawAvatarUrl !== "string") {
        return NextResponse.json(
          { error: "Dữ liệu ảnh đại diện không hợp lệ." },
          { status: 400 }
        );
      }

      const trimmed = rawAvatarUrl.trim();
      if (!trimmed.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Định dạng ảnh không hợp lệ. Vui lòng chọn tệp PNG, JPG hoặc WebP." },
          { status: 400 }
        );
      }

      const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
      if (!match) {
        return NextResponse.json(
          { error: "Hệ thống chỉ hỗ trợ ảnh định dạng PNG, JPG hoặc WebP." },
          { status: 400 }
        );
      }

      const base64Data = trimmed.replace(/^data:image\/\w+;base64,/i, "");
      const buffer = Buffer.from(base64Data, "base64");
      const sizeInMb = buffer.length / (1024 * 1024);

      if (sizeInMb > 2) {
        return NextResponse.json(
          { error: `Dung lượng ảnh (${sizeInMb.toFixed(2)}MB) vượt quá giới hạn 2MB cho phép.` },
          { status: 400 }
        );
      }

      if (buffer.length < 50) {
        return NextResponse.json(
          { error: "Tệp ảnh quá nhỏ hoặc bị hỏng." },
          { status: 400 }
        );
      }

      cleanAvatarUrl = trimmed;
    }

    await ensureSlcSchema();
    const pAny = prisma as any;

    const teacher = await prisma.teacher
      .findUnique({
        where: { userId },
        include: {
          campus: true,
          mainSubjectRel: true,
        },
      })
      .catch(() => null);

    const fullName =
      teacher?.teacherName || (session?.user as any)?.name || "Giáo viên Sky-Line";
    const campusId = teacher?.campusId || null;
    const campusName = teacher?.campus?.campusName || null;
    const mainSubject = teacher?.mainSubjectRel?.subjectName || null;

    const updatedProfile = await pAny.slcCommunityProfile.upsert({
      where: { userId },
      update: {
        avatarUrl: cleanAvatarUrl,
        fullName,
        ...(teacher?.id ? { teacherId: teacher.id } : {}),
        ...(campusId ? { campusId } : {}),
        ...(campusName ? { campusName } : {}),
        ...(mainSubject ? { mainSubject } : {}),
      },
      create: {
        userId,
        teacherId: teacher?.id || null,
        fullName,
        avatarUrl: cleanAvatarUrl,
        campusId,
        campusName,
        mainSubject,
      },
    });

    // Đồng bộ ảnh đại diện sang các bài viết, bình luận, nhóm & dự án của giáo viên
    await Promise.all([
      pAny.slcPost
        ?.updateMany({
          where: { authorId: userId },
          data: { authorAvatar: cleanAvatarUrl },
        })
        .catch(() => null),
      pAny.slcComment
        ?.updateMany({
          where: { authorId: userId },
          data: { authorAvatar: cleanAvatarUrl },
        })
        .catch(() => null),
      pAny.slcGroupMember
        ?.updateMany({
          where: { userId },
          data: { userAvatar: cleanAvatarUrl },
        })
        .catch(() => null),
      pAny.slcProjectMember
        ?.updateMany({
          where: { userId },
          data: { userAvatar: cleanAvatarUrl },
        })
        .catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      avatarUrl: updatedProfile?.avatarUrl ?? cleanAvatarUrl,
      message: cleanAvatarUrl
        ? "Đã cập nhật ảnh đại diện thành công."
        : "Đã gỡ ảnh đại diện.",
    });
  } catch (err: any) {
    console.error("[UserAvatar POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi máy chủ khi lưu ảnh đại diện" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Gỡ ảnh đại diện hiện tại của người dùng
 */
export async function DELETE() {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    await ensureSlcSchema();
    const pAny = prisma as any;

    await pAny.slcCommunityProfile
      ?.update({
        where: { userId },
        data: { avatarUrl: null },
      })
      .catch(() => null);

    await Promise.all([
      pAny.slcPost
        ?.updateMany({
          where: { authorId: userId },
          data: { authorAvatar: null },
        })
        .catch(() => null),
      pAny.slcComment
        ?.updateMany({
          where: { authorId: userId },
          data: { authorAvatar: null },
        })
        .catch(() => null),
      pAny.slcGroupMember
        ?.updateMany({
          where: { userId },
          data: { userAvatar: null },
        })
        .catch(() => null),
      pAny.slcProjectMember
        ?.updateMany({
          where: { userId },
          data: { userAvatar: null },
        })
        .catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      avatarUrl: null,
      message: "Đã gỡ ảnh đại diện về mặc định.",
    });
  } catch (err: any) {
    console.error("[UserAvatar DELETE] Error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi máy chủ khi gỡ ảnh đại diện" },
      { status: 500 }
    );
  }
}
