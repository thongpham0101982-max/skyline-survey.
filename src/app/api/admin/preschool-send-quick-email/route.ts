// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { isApprovedPassResult } from "@/lib/entrance-progress/constants";
import {
  buildQuickReportEmailHtml,
  extractCommittedSubjectsFromStudent,
  formatShortDate,
} from "@/lib/quick-report-email";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { to, cc, subject, periodName, batchName, batchDateRange, campusName, students, baseUrl, previewOnly } = await req.json();
    if ((!previewOnly && !to) || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const originUrl = String(
      baseUrl ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "https://ssm.skylineschool.edu.vn"
    ).replace(/\/+$/, "");

    const uniqueStudentPeriodNames = Array.from(
      new Set(students.map((s: any) => s?.period?.name || s?.periodName || "").filter(Boolean))
    );
    const uniqueStudentBatchNames = Array.from(
      new Set(students.map((s: any) => s?.batch?.name || s?.batchName || "").filter(Boolean))
    );

    const effectivePeriodName =
      (!periodName || periodName === "Kỳ khảo sát" || periodName === "Tất cả các kỳ") && uniqueStudentPeriodNames.length > 0
        ? uniqueStudentPeriodNames.join(" • ")
        : periodName || "Kỳ khảo sát";

    const effectiveBatchName =
      (!batchName || batchName === "Tất cả các đợt" || batchName === "Đợt khảo sát" || batchName === "Đợt") && uniqueStudentBatchNames.length > 0
        ? uniqueStudentBatchNames.join(" • ")
        : batchName || "Đợt khảo sát";

    let resolvedBatchDateRange = batchDateRange || "";
    if (!resolvedBatchDateRange) {
      const firstBatchWithDates = students.find((s: any) => s?.batch?.startDate || s?.batch?.endDate)?.batch;
      if (firstBatchWithDates) {
        const sD = formatShortDate(firstBatchWithDates.startDate);
        const eD = formatShortDate(firstBatchWithDates.endDate);
        resolvedBatchDateRange = sD && eD && sD !== eD ? `${sD} - ${eD}` : (sD || eD);
      }
    }

    const resolvedCampusName =
      campusName ||
      Array.from(new Set(students.map((s: any) => s?.admissionCampus || s?.registeredCampus || "").filter(Boolean))).join(", ") ||
      "Hệ thống Giáo dục Sky-Line";

    const finalSubject =
      subject && !subject.includes("Kỳ: Kỳ khảo sát - Đợt: Tất cả các đợt")
        ? subject
        : `[Báo cáo nhanh] Kết quả Khảo sát đầu vào Mầm non - Kỳ: ${effectivePeriodName} - Đợt: ${effectiveBatchName}`;

    const totalStudents = students.length;
    const emailHtml = buildQuickReportEmailHtml({
      level: "preschool",
      subject: finalSubject,
      periodName: effectivePeriodName,
      batchName: effectiveBatchName,
      batchDateRange: resolvedBatchDateRange,
      campusName: resolvedCampusName,
      originUrl,
      students,
    });

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: {
          subject: finalSubject,
          to: to || "",
          cc: cc || "",
          html: emailHtml,
          studentCount: totalStudents,
        },
      });
    }

    try {
      const mailRes = await sendEmail({ to, cc, subject: finalSubject, html: emailHtml, attachments: [] });
      if (!mailRes.success) {
        return NextResponse.json({ success: false, sent: false, error: mailRes.error || "SMTP error", html: emailHtml });
      }

      // Đồng bộ Tiến độ & Nhật ký Công đoạn 7 (Bàn giao kết quả cho Tư vấn - Bậc Mầm non)
      let syncedCount = 0;
      const syncedAt = new Date().toISOString();
      const user = session.user as any;
      const actor = {
        id: user?.id || "tuvan_sender",
        fullName: user?.fullName || user?.name || "Cán bộ Khảo thí / Giáo vụ",
        role: user?.role || "GIAO_VU",
        isSuperAdmin: true,
      };

      try {
        const validStudents = students.filter((s: any) => Boolean(s?.id));
        const chunkSize = 15;
        for (let i = 0; i < validStudents.length; i += chunkSize) {
          const chunk = validStudents.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (s: any) => {
              const r = String(s.admissionResult || s.devAssessmentResult || (s.probationaryResult === "DAT" ? "Đạt" : "")).trim();
              const isPassed =
                isApprovedPassResult(r) ||
                ((r.includes("Dat") || r.includes("Đạt")) && !r.includes("Không") && !r.includes("Khong")) ||
                r.includes("DAT") ||
                r.includes("MIEN") ||
                r.includes("MIỄN") ||
                s.probationaryResult === "DAT";
              const committedSubjectsText = extractCommittedSubjectsFromStudent(s);
              const hasCommitment =
                isPassed &&
                (r.toLowerCase().includes("cam kết") ||
                  r.toLowerCase().includes("cam ket") ||
                  (committedSubjectsText && committedSubjectsText !== "—"));

              const docTypes = isPassed
                ? hasCommitment
                  ? ["Thư chúc mừng", "Bản cam kết", "Phiếu kết quả khảo sát"]
                  : ["Thư chúc mừng", "Phiếu kết quả khảo sát"]
                : ["Thông báo kết quả khảo sát"];

              const sPeriodLabel = s?.period?.name || s?.periodName || effectivePeriodName;
              const sBatchLabel = s?.batch?.name || s?.batchName || effectiveBatchName;
              const logNote = `Đã gửi email trả kết quả & bàn giao Tư vấn Mầm non (Kỳ: ${sPeriodLabel} • Đợt: ${sBatchLabel}) tới: ${to}${cc ? ` (CC: ${cc})` : ""} — Văn bản: ${docTypes.join(", ")}`;

              const wfRes = await executeEntranceWorkflowAction({
                action: "CONFIRM",
                targetScope: "STUDENT",
                isPreschool: true,
                periodId: s.periodId || "PERIOD_PRESCHOOL_QUICK_EMAIL",
                batchId: s.batchId || null,
                studentIds: [String(s.id)],
                stageNumber: 7,
                status: "COMPLETED",
                deliveryStatus: "SENT",
                admissionResult: r || "Đạt",
                documentTypes: docTypes,
                note: logNote,
                actor,
              });
              if (wfRes?.success) {
                syncedCount++;
              }
            })
          );
        }
      } catch (wfErr) {
        console.warn("Preschool workflow stage 7 sync warning:", wfErr);
      }

      return NextResponse.json({
        success: true,
        sent: true,
        messageId: mailRes.messageId,
        handoverSync: {
          syncedCount,
          syncedAt,
          actorName: actor.fullName,
          actorRole: actor.role,
          to,
          cc: cc || "",
          periodName: effectivePeriodName,
          batchName: effectiveBatchName,
        },
      });
    } catch (err) {
      console.error("SMTP SEND ERROR:", err);
      return NextResponse.json({ success: false, sent: false, error: err.message || "SMTP error", html: emailHtml });
    }
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
