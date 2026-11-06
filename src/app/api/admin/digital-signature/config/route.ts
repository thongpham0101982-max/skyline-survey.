import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignatureService } from "@/lib/digital-signature/signature-service";
import { DigitalSignatureProviderFactory } from "@/lib/digital-signature/provider-factory";
import { SIGNATURE_PROVIDERS, DigitalSignatureProviderCode } from "@/lib/digital-signature/types";

export const dynamic = "force-dynamic";

function maskSecret(secret?: string | null): string {
  if (!secret) return "";
  if (secret.length <= 6) return "••••••••";
  return secret.substring(0, 3) + "••••••••" + secret.substring(secret.length - 2);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole);

    if (!isAdmin) {
      return NextResponse.json({ error: "Không đủ quyền truy cập" }, { status: 403 });
    }

    const config = await SignatureService.getSystemConfig();

    // Mask secret values in providerSettings
    let providerSettingsObj: any = {};
    try {
      providerSettingsObj = JSON.parse(config.providerSettings || "{}");
      Object.keys(providerSettingsObj).forEach((provKey) => {
        if (providerSettingsObj[provKey]?.clientSecret) {
          providerSettingsObj[provKey].clientSecret = maskSecret(providerSettingsObj[provKey].clientSecret);
        }
        if (providerSettingsObj[provKey]?.apiKey) {
          providerSettingsObj[provKey].apiKey = maskSecret(providerSettingsObj[provKey].apiKey);
        }
      });
    } catch {}

    // Lấy danh sách cơ sở và năm học cho bộ chọn phạm vi
    const [campuses, academicYears] = await Promise.all([
      (prisma as any).campus.findMany({ select: { id: true, campusName: true, campusCode: true } }),
      (prisma as any).academicYear.findMany({ select: { id: true, name: true, status: true } }),
    ]);

    return NextResponse.json({
      config: {
        id: config.id,
        isEnabled: config.isEnabled,
        allowedProviders: JSON.parse(config.allowedProviders || "[]"),
        activeProvider: config.activeProvider,
        providerSettings: providerSettingsObj,
        applicableForms: JSON.parse(config.applicableForms || "[]"),
        signingFlowRules: JSON.parse(config.signingFlowRules || "{}"),
        anchorSettings: JSON.parse(config.anchorSettings || "{}"),
        campusScope: JSON.parse(config.campusScope || "[\"*\"]"),
        academicYearScope: JSON.parse(config.academicYearScope || "[\"*\"]"),
        autoPublishOnCompleted: config.autoPublishOnCompleted,
      },
      availableProviders: Object.values(SIGNATURE_PROVIDERS),
      campuses,
      academicYears,
    });
  } catch (err: any) {
    console.error("Lỗi khi tải cấu hình chữ ký số:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = ((session?.user as any)?.role || "").toUpperCase();
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole);

    if (!isAdmin) {
      return NextResponse.json({ error: "Không đủ quyền quản trị" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // Test connection action
    if (action === "TEST_PROVIDER") {
      const providerCode = body.providerCode as DigitalSignatureProviderCode;
      const settings = body.settings || {};
      const provider = DigitalSignatureProviderFactory.getProvider(providerCode);
      const testResult = await provider.testConnection(settings);
      return NextResponse.json(testResult);
    }

    const {
      isEnabled,
      allowedProviders,
      activeProvider,
      providerSettings,
      applicableForms,
      signingFlowRules,
      anchorSettings,
      campusScope,
      academicYearScope,
      autoPublishOnCompleted,
    } = body;

    const pAny = prisma as any;
    const currentConfig = await SignatureService.getSystemConfig();

    // Preserve existing unmasked secrets if user left masked values untouched
    let mergedSettings = providerSettings || {};
    try {
      const currentSettings = JSON.parse(currentConfig.providerSettings || "{}");
      Object.keys(mergedSettings).forEach((provKey) => {
        const item = mergedSettings[provKey];
        if (item?.clientSecret && item.clientSecret.includes("••••••••")) {
          mergedSettings[provKey].clientSecret = currentSettings[provKey]?.clientSecret || "";
        }
        if (item?.apiKey && item.apiKey.includes("••••••••")) {
          mergedSettings[provKey].apiKey = currentSettings[provKey]?.apiKey || "";
        }
      });
    } catch {}

    const updated = await pAny.digitalSignatureConfig.upsert({
      where: { key: "SYSTEM_CONFIG" },
      create: {
        key: "SYSTEM_CONFIG",
        isEnabled: Boolean(isEnabled),
        allowedProviders: JSON.stringify(allowedProviders || ["MOCK_SANDBOX"]),
        activeProvider: activeProvider || "MOCK_SANDBOX",
        providerSettings: JSON.stringify(mergedSettings),
        applicableForms: JSON.stringify(applicableForms || []),
        signingFlowRules: JSON.stringify(signingFlowRules || {}),
        anchorSettings: JSON.stringify(anchorSettings || {}),
        campusScope: JSON.stringify(campusScope || ["*"]),
        academicYearScope: JSON.stringify(academicYearScope || ["*"]),
        autoPublishOnCompleted: Boolean(autoPublishOnCompleted),
      },
      update: {
        isEnabled: Boolean(isEnabled),
        allowedProviders: JSON.stringify(allowedProviders || ["MOCK_SANDBOX"]),
        activeProvider: activeProvider || "MOCK_SANDBOX",
        providerSettings: JSON.stringify(mergedSettings),
        applicableForms: JSON.stringify(applicableForms || []),
        signingFlowRules: JSON.stringify(signingFlowRules || {}),
        anchorSettings: JSON.stringify(anchorSettings || {}),
        campusScope: JSON.stringify(campusScope || ["*"]),
        academicYearScope: JSON.stringify(academicYearScope || ["*"]),
        autoPublishOnCompleted: Boolean(autoPublishOnCompleted),
        updatedAt: new Date(),
      },
    });

    // Audit log
    await pAny.signatureAuditLog.create({
      data: {
        action: "UPDATE_SYSTEM_CONFIG",
        actorId: (session?.user as any)?.id || "ADMIN",
        actorName: session?.user?.name || "Quản trị viên",
        actorRole: userRole,
        details: JSON.stringify({
          activeProvider,
          isEnabled,
          applicableForms,
        }),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình Chữ ký số thành công.",
      config: updated,
    });
  } catch (err: any) {
    console.error("Lỗi khi lưu cấu hình chữ ký số:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
