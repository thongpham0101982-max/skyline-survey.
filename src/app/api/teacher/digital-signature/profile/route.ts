import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DigitalSignatureProviderFactory } from "@/lib/digital-signature/provider-factory";
import { DigitalSignatureProviderCode } from "@/lib/digital-signature/types";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy hồ sơ chữ ký số của giáo viên hiện tại
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const teacher = await (prisma as any).teacher.findUnique({
      where: { userId },
      include: { campus: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ giáo viên tương ứng" }, { status: 404 });
    }

    const profile = await (prisma as any).teacherSignatureProfile.findUnique({
      where: { teacherId: teacher.id },
    }).catch(() => null);

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        teacherCode: teacher.teacherCode,
        teacherName: teacher.teacherName,
        campusName: teacher.campus?.campusName || "Sky-Line School",
        campusId: teacher.campusId,
        position: teacher.position,
      },
      profile: profile || {
        provider: "NOT_CONFIGURED",
        connectionStatus: "NOT_CONNECTED",
        subjectDn: null,
        serialNumber: null,
        issuer: null,
        validFrom: null,
        validTo: null,
        lastVerifiedAt: null,
        visualAppearanceUrl: null,
        appearanceType: "DRAWN",
        appearanceVersion: 1,
        signatureRoleText: "Giáo viên Bộ môn",
      },
    });
  } catch (err: any) {
    console.error("Lỗi khi lấy thông tin chữ ký số:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

/**
 * POST: Lưu mẫu hiển thị chữ ký (Canvas nét vẽ hoặc Ảnh tải lên)
 * Có kiểm tra định dạng tệp, kích thước và nội dung ảnh
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const teacher = await (prisma as any).teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });
    }

    const body = await req.json();
    const { visualAppearanceUrl, appearanceType, signatureRoleText } = body;

    if (!visualAppearanceUrl || typeof visualAppearanceUrl !== "string") {
      return NextResponse.json({ error: "Nội dung mẫu chữ ký không được để trống" }, { status: 400 });
    }

    // 1. Kiểm tra định dạng dữ liệu (Phải là data URI PNG/JPEG/WEBP hoặc URL an toàn)
    const isDataUri = visualAppearanceUrl.startsWith("data:image/");
    if (isDataUri) {
      const match = visualAppearanceUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
      if (!match) {
        return NextResponse.json(
          { error: "Định dạng ảnh không hợp lệ. Hệ thống chỉ chấp nhận định dạng PNG, JPG hoặc WebP." },
          { status: 400 }
        );
      }

      // 2. Kiểm tra dung lượng (Tối đa 2MB)
      const base64Data = visualAppearanceUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const sizeInMb = buffer.length / (1024 * 1024);
      if (sizeInMb > 2) {
        return NextResponse.json(
          { error: `Dung lượng ảnh (${sizeInMb.toFixed(2)}MB) vượt quá giới hạn 2MB cho phép.` },
          { status: 400 }
        );
      }

      // 3. Kiểm tra tính hợp lệ cơ bản của cấu trúc ảnh
      if (buffer.length < 50) {
        return NextResponse.json({ error: "Dữ liệu ảnh không hợp lệ hoặc bị lỗi." }, { status: 400 });
      }
    }

    const existingProfile = await (prisma as any).teacherSignatureProfile.findUnique({
      where: { teacherId: teacher.id },
    }).catch(() => null);

    const nextVersion = (existingProfile?.appearanceVersion || 0) + 1;

    const updatedProfile = await (prisma as any).teacherSignatureProfile.upsert({
      where: { teacherId: teacher.id },
      create: {
        teacherId: teacher.id,
        visualAppearanceUrl,
        appearanceType: appearanceType === "UPLOADED" ? "UPLOADED" : "DRAWN",
        appearanceVersion: 1,
        signatureRoleText: signatureRoleText || "Giáo viên Bộ môn",
      },
      update: {
        visualAppearanceUrl,
        appearanceType: appearanceType === "UPLOADED" ? "UPLOADED" : "DRAWN",
        appearanceVersion: nextVersion,
        signatureRoleText: signatureRoleText || existingProfile?.signatureRoleText || "Giáo viên Bộ môn",
        updatedAt: new Date(),
      },
    });

    // Ghi Audit Log
    await (prisma as any).signatureAuditLog.create({
      data: {
        action: "UPDATE_APPEARANCE",
        actorId: teacher.id,
        actorName: teacher.teacherName,
        actorRole: "TEACHER",
        details: JSON.stringify({
          appearanceType,
          newVersion: nextVersion,
          note: "Cập nhật mẫu hiển thị chữ ký mới (chỉ áp dụng cho các lượt ký sau).",
        }),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Đã lưu mẫu hiển thị chữ ký thành công (phiên bản v" + nextVersion + ")",
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("Lỗi khi lưu mẫu chữ ký:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

/**
 * PUT: Kết nối, kiểm tra kết nối hoặc thay đổi chứng thư số
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const teacher = await (prisma as any).teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });
    }

    const body = await req.json();
    const { action, providerCode } = body; // action: "CONNECT" | "VERIFY" | "DISCONNECT"

    if (action === "DISCONNECT") {
      await (prisma as any).teacherSignatureProfile.upsert({
        where: { teacherId: teacher.id },
        create: {
          teacherId: teacher.id,
          provider: "NOT_CONFIGURED",
          connectionStatus: "NOT_CONNECTED",
        },
        update: {
          connectionStatus: "NOT_CONNECTED",
          lastVerifiedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Đã ngắt kết nối chứng thư số.",
      });
    }

    const chosenProvider = (providerCode as DigitalSignatureProviderCode) || "MOCK_SANDBOX";
    const providerInstance = DigitalSignatureProviderFactory.getProvider(chosenProvider);

    // Tra cứu chứng thư từ Provider
    const certInfo = await providerInstance.lookupCertificate(
      teacher.teacherCode,
      teacher.teacherName
    );

    const updatedProfile = await (prisma as any).teacherSignatureProfile.upsert({
      where: { teacherId: teacher.id },
      create: {
        teacherId: teacher.id,
        provider: chosenProvider,
        connectionStatus: certInfo.connectionStatus,
        subjectDn: certInfo.subjectDn,
        serialNumber: certInfo.serialNumber,
        issuer: certInfo.issuer,
        validFrom: certInfo.validFrom ? new Date(certInfo.validFrom) : null,
        validTo: certInfo.validTo ? new Date(certInfo.validTo) : null,
        lastVerifiedAt: new Date(),
      },
      update: {
        provider: chosenProvider,
        connectionStatus: certInfo.connectionStatus,
        subjectDn: certInfo.subjectDn,
        serialNumber: certInfo.serialNumber,
        issuer: certInfo.issuer,
        validFrom: certInfo.validFrom ? new Date(certInfo.validFrom) : null,
        validTo: certInfo.validTo ? new Date(certInfo.validTo) : null,
        lastVerifiedAt: new Date(),
      },
    });

    // Ghi Audit Log
    await (prisma as any).signatureAuditLog.create({
      data: {
        action: "CONNECT_PROVIDER",
        actorId: teacher.id,
        actorName: teacher.teacherName,
        actorRole: "TEACHER",
        details: JSON.stringify({
          provider: chosenProvider,
          serialNumber: certInfo.serialNumber,
          status: certInfo.connectionStatus,
          isMock: providerInstance.isMock,
        }),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Đã kết nối chứng thư số với nhà cung cấp ${chosenProvider} thành công.`,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("Lỗi khi kết nối chứng thư số:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
