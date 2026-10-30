import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const ALLOWED_ROLES = [
  "ADMIN",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
  "KT_DBCL",
  "KTDBCL",
  "GDCS",
  "GD_CS",
  "GIAO_VU_CS",
  "GIAO_VU",
  "TEACHER",
];

export const DEFAULT_PROFILE_SECTIONS: Record<string, boolean> = {
  parentPortalUnlocked: false,
  advisoryGoals: true,
  moetPeriodicGrades: true,
  moetTermGrades: true,
  specialSubjects: true,
  bilingualGrades: true,
  internationalCertificates: true,
  achievements: true,
  experientialActivities: true,
  homeroomTeacherComment: true,
  subjectCompetencyRadar: true,
  careerOrientation: false, // Bỏ theo chỉ đạo
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");

    const where: any = {
      categoryType: "PROFILE_SECTION_CONFIG",
    };
    if (academicYearId && academicYearId !== "all") {
      where.OR = [
        { academicYearId },
        { academicYearId: null },
      ];
    }

    const configs = await prisma.assessmentConfig.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    const configMap: Record<string, Record<string, boolean>> = {};
    configs.forEach((cfg) => {
      try {
        configMap[cfg.code] = {
          ...DEFAULT_PROFILE_SECTIONS,
          ...JSON.parse(cfg.name),
          careerOrientation: false, // Luôn ẩn
        };
      } catch {
        configMap[cfg.code] = { ...DEFAULT_PROFILE_SECTIONS };
      }
    });

    if (!configMap["DEFAULT"]) {
      configMap["DEFAULT"] = { ...DEFAULT_PROFILE_SECTIONS };
    }
    if (!configMap["ALL_ALL"]) {
      configMap["ALL_ALL"] = {
        ...DEFAULT_PROFILE_SECTIONS,
        ...(configMap["DEFAULT"] || {}),
      };
    }

    return NextResponse.json({
      success: true,
      data: configMap,
      defaultSections: DEFAULT_PROFILE_SECTIONS,
    });
  } catch (error: any) {
    console.error("Error fetching profile section configs:", error);
    return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const role = (session?.user as any)?.role || "";
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Không có quyền cấu hình hồ sơ học sinh" }, { status: 403 });
    }

    const body = await req.json();
    const {
      grade = "ALL",
      educationSystem = "ALL",
      sections = {},
      academicYearId = null,
      toggleParentPortalOnly = false,
      parentPortalUnlocked,
    } = body;

    const targetCode = `${grade}_${educationSystem}`;

    // Find existing target config
    const existing = await prisma.assessmentConfig.findFirst({
      where: {
        categoryType: "PROFILE_SECTION_CONFIG",
        code: targetCode,
        ...(academicYearId ? { academicYearId } : {}),
      },
    });

    let existingParsed: Record<string, any> = {};
    if (existing?.name) {
      try {
        existingParsed = JSON.parse(existing.name);
      } catch {}
    }

    const sanitizedSections = toggleParentPortalOnly
      ? {
          ...DEFAULT_PROFILE_SECTIONS,
          ...existingParsed,
          parentPortalUnlocked: Boolean(parentPortalUnlocked),
          careerOrientation: false,
        }
      : {
          ...DEFAULT_PROFILE_SECTIONS,
          ...existingParsed,
          ...sections,
          careerOrientation: false, // Bỏ hoàn toàn
        };

    if (existing) {
      await prisma.assessmentConfig.update({
        where: { id: existing.id },
        data: {
          name: JSON.stringify(sanitizedSections),
          status: "ACTIVE",
        },
      });
    } else {
      await prisma.assessmentConfig.create({
        data: {
          categoryType: "PROFILE_SECTION_CONFIG",
          code: targetCode,
          name: JSON.stringify(sanitizedSections),
          status: "ACTIVE",
          academicYearId: academicYearId || null,
        },
      });
    }

    // Nếu người dùng chọn lưu ở cấp toàn trường (ALL_ALL) hoặc Mở/Khóa Hồ sơ HS toàn trường
    if (grade === "ALL" && educationSystem === "ALL") {
      const defaultExisting = await prisma.assessmentConfig.findFirst({
        where: {
          categoryType: "PROFILE_SECTION_CONFIG",
          code: "DEFAULT",
          ...(academicYearId ? { academicYearId } : {}),
        },
      });
      if (defaultExisting) {
        await prisma.assessmentConfig.update({
          where: { id: defaultExisting.id },
          data: { name: JSON.stringify(sanitizedSections) },
        });
      } else {
        await prisma.assessmentConfig.create({
          data: {
            categoryType: "PROFILE_SECTION_CONFIG",
            code: "DEFAULT",
            name: JSON.stringify(sanitizedSections),
            status: "ACTIVE",
            academicYearId: academicYearId || null,
          },
        });
      }

      // Đồng bộ trạng thái Mở / Khóa Hồ sơ Phụ huynh xuống tất cả cấu hình khối/hệ đã tạo để không bị xung đột
      if (sanitizedSections.parentPortalUnlocked !== undefined) {
        const allScopedConfigs = await prisma.assessmentConfig.findMany({
          where: {
            categoryType: "PROFILE_SECTION_CONFIG",
          },
        });
        for (const cfg of allScopedConfigs) {
          try {
            const parsed = JSON.parse(cfg.name || "{}");
            if (parsed.parentPortalUnlocked !== Boolean(sanitizedSections.parentPortalUnlocked)) {
              parsed.parentPortalUnlocked = Boolean(sanitizedSections.parentPortalUnlocked);
              await prisma.assessmentConfig.update({
                where: { id: cfg.id },
                data: { name: JSON.stringify(parsed) },
              });
            }
          } catch {}
        }
      }
    }

    // Fetch and return the refreshed map
    const allConfigs = await prisma.assessmentConfig.findMany({
      where: {
        categoryType: "PROFILE_SECTION_CONFIG",
        ...(academicYearId ? { OR: [{ academicYearId }, { academicYearId: null }] } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    const refreshedMap: Record<string, Record<string, boolean>> = {};
    allConfigs.forEach((cfg) => {
      try {
        refreshedMap[cfg.code] = {
          ...DEFAULT_PROFILE_SECTIONS,
          ...JSON.parse(cfg.name),
          careerOrientation: false,
        };
      } catch {
        refreshedMap[cfg.code] = { ...DEFAULT_PROFILE_SECTIONS };
      }
    });

    if (!refreshedMap["DEFAULT"]) {
      refreshedMap["DEFAULT"] = { ...DEFAULT_PROFILE_SECTIONS };
    }
    if (!refreshedMap["ALL_ALL"]) {
      refreshedMap["ALL_ALL"] = {
        ...DEFAULT_PROFILE_SECTIONS,
        ...(refreshedMap["DEFAULT"] || {}),
      };
    }

    return NextResponse.json({
      success: true,
      message: toggleParentPortalOnly
        ? Boolean(sanitizedSections.parentPortalUnlocked)
          ? "Đã MỞ KHÓA Hồ sơ Học sinh cho Phụ huynh truy cập!"
          : "Đã KHÓA Hồ sơ Học sinh đối với Phụ huynh!"
        : `Đã lưu cấu hình hiển thị Hồ sơ cho Khối ${grade === "ALL" ? "Tất cả" : grade} - Hệ ${educationSystem === "ALL" ? "Tất cả" : educationSystem}!`,
      data: refreshedMap,
    });
  } catch (error: any) {
    console.error("Error saving profile section config:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu cấu hình" }, { status: 500 });
  }
}
