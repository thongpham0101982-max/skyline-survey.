// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { isApprovedPassResult } from "@/lib/entrance-progress/constants";

function extractCommittedSubjectsFromStudent(s: any): string {
  if (Array.isArray(s?.committedSubjectsList) && s.committedSubjectsList.length > 0) {
    return s.committedSubjectsList.join(", ");
  }
  if (Array.isArray(s?.committedSubjects) && s.committedSubjects.length > 0) {
    return s.committedSubjects.join(", ");
  }
  if (typeof s?.committedSubjects === "string" && s.committedSubjects.trim()) {
    return s.committedSubjects.trim();
  }
  const note = String(s?.directorNote || "");
  const match = note.match(/^Môn cam kết:\s*\[(.*?)\]/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return "—";
}

function formatGenderLabel(g: any): string {
  const val = String(g || "").trim().toUpperCase();
  if (val === "M" || val === "MALE" || val === "NAM") return "Nam";
  if (val === "F" || val === "FEMALE" || val === "NỮ" || val === "NU") return "Nữ";
  return "—";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { to, cc, subject, periodName, batchName, batchDateRange, campusName, students, baseUrl } = await req.json();
    if (!to || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const originUrl = String(
      baseUrl ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "https://ssm.skylineschool.edu.vn"
    ).replace(/\/+$/, "");

    // Resolve actual Period & Batch names from student records if generic fallback was passed
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

    const formatShortDate = (d: any) => {
      if (!d) return "";
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
      }
      return String(d);
    };

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
        : `[Báo cáo nhanh] Kết quả Khảo sát đầu vào KSNL - Kỳ: ${effectivePeriodName} - Đợt: ${effectiveBatchName}`;

    const totalStudents = students.length;
    const totalPassed = students.filter(s => {
      const r = String(s.admissionResult || s.devAssessmentResult || "").trim();
      return (
        (r.includes("Đạt") && !r.includes("Không")) ||
        (r.includes("Dat") && !r.includes("Khong")) ||
        r.includes("DAT") ||
        r.includes("MIEN") ||
        r.includes("MIỄN") ||
        s.probationaryResult === "DAT"
      );
    }).length;
    const totalPendingOrFailed = totalStudents - totalPassed;

    const rowsHtml = students.map((s, idx) => {
      const gender = formatGenderLabel(s.gender);
      const gradeLabel = s.grade ? (String(s.grade).startsWith("K") ? s.grade : `K${s.grade}`) : "—";
      const systemLabel = s.surveyFormType || "—";
      const studentBatchLabel = s?.batch?.name || s?.batchName || effectiveBatchName || "—";
      const r = String(s.admissionResult || s.devAssessmentResult || (s.probationaryResult === "DAT" ? "Đạt" : "")).trim();
      let resText = r || "Chưa duyệt";
      let resColor = "#4b5563", resBg = "#f3f4f6", resBorder = "#e5e7eb";
      if ((r.includes("Dat") && r.includes("cam ket")) || (r.includes("Đạt") && r.includes("cam kết"))) {
        resText = r;
        resColor = "#b45309";
        resBg = "#fef3c7";
        resBorder = "#fde68a";
      } else if (
        ((r.includes("Dat") || r.includes("Đạt")) && !r.includes("Không") && !r.includes("Khong")) ||
        r.includes("DAT") ||
        r.includes("MIEN") ||
        r.includes("MIỄN")
      ) {
        resText = r;
        resColor = "#047857";
        resBg = "#ecfdf5";
        resBorder = "#a7f3d0";
      } else if (r.includes("Khong dat") || r.includes("KHONG DAT") || r.includes("Không đạt") || r.includes("KHÔNG ĐẠT")) {
        resText = r;
        resColor = "#b91c1c";
        resBg = "#fef2f2";
        resBorder = "#fecaca";
      } else if (r.includes("Hoc thu") || r.includes("Học thử")) {
        resText = r;
        resColor = "#0284c7";
        resBg = "#f0f9ff";
        resBorder = "#bae6fd";
      }

      const isPassed =
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

      const studentKey = encodeURIComponent(String(s.id || s.studentCode || ""));
      const periodParam = s.periodId ? `&periodId=${encodeURIComponent(String(s.periodId))}` : "";
      const batchParam = s.batchId ? `&batchId=${encodeURIComponent(String(s.batchId))}` : "";

      const thuChucMungUrl = `${originUrl}/admin/input-assessments/reports?tab=letters&studentId=${studentKey}&docType=thu_chuc_mung&level=high${periodParam}${batchParam}`;
      const camKetUrl = `${originUrl}/admin/input-assessments/reports?tab=letters&studentId=${studentKey}&docType=cam_ket_hoc_tap&level=high${periodParam}${batchParam}`;

      const thuMoiCell = isPassed
        ? `<a href="${thuChucMungUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; color:#047857; background-color:#ecfdf5; border:1px solid #6ee7b7; text-decoration:none; white-space:nowrap;">🔗 Thư chúc mừng</a>`
        : "—";

      const camKetCell = hasCommitment
        ? `<a href="${camKetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; color:#b45309; background-color:#fef3c7; border:1px solid #fcd34d; text-decoration:none; white-space:nowrap;">🔗 Bản cam kết</a>`
        : "—";

      const dobStr = formatShortDate(s.dateOfBirth);
      const campusStr = s.admissionCampus || s.registeredCampus || "";
      const studentSubInfo = [dobStr ? `NS: ${dobStr}` : "", campusStr ? `CS: ${campusStr}` : ""].filter(Boolean).join(" • ");

      return `<tr bgcolor="${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"}" style="border-bottom:1px solid #e2e8f0;">
        <td align="center" style="padding:10px 6px; font-size:12px; font-weight:700; color:#64748b; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;">${idx + 1}</td>
        <td align="center" style="padding:10px 8px; font-size:12px; font-weight:700; color:#00736E; font-family:Consolas, monospace; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;">${s.studentCode || "—"}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; min-width:170px;">
          <div style="font-size:13px; font-weight:800; color:#003B3A; white-space:nowrap;">${s.fullName || "—"}</div>
          ${studentSubInfo ? `<div style="font-size:10.5px; font-weight:600; color:#64748b; margin-top:2px; white-space:nowrap;">${studentSubInfo}</div>` : ""}
        </td>
        <td align="center" style="padding:10px 6px; font-size:12px; font-weight:600; color:#334155; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;">${gender}</td>
        <td align="center" style="padding:10px 6px; font-size:12px; font-weight:700; color:#334155; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;">${gradeLabel}</td>
        <td align="center" style="padding:10px 8px; font-size:12px; font-weight:600; color:#334155; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;">${systemLabel}</td>
        <td style="padding:10px 10px; font-size:11.5px; font-weight:700; color:#0F766E; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; min-width:140px;">${studentBatchLabel}</td>
        <td align="center" style="padding:10px 8px; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;"><span style="display:inline-block; padding:4px 10px; border-radius:50px; font-size:11px; font-weight:800; color:${resColor}; background-color:${resBg}; border:1px solid ${resBorder}; white-space:nowrap;">${resText}</span></td>
        <td style="padding:10px 10px; font-size:12px; font-weight:700; color:#b45309; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">${committedSubjectsText}</td>
        <td align="center" style="padding:10px 8px; font-size:12px; color:#64748b; border-bottom:1px solid #e2e8f0; border-right:1px solid #e2e8f0; white-space:nowrap;">${thuMoiCell}</td>
        <td align="center" style="padding:10px 8px; font-size:12px; color:#64748b; border-bottom:1px solid #e2e8f0; white-space:nowrap;">${camKetCell}</td>
      </tr>`;
    }).join("");

    const emailHtml = buildEmailHtml(
      finalSubject,
      effectivePeriodName,
      effectiveBatchName,
      resolvedBatchDateRange,
      resolvedCampusName,
      totalStudents,
      totalPassed,
      totalPendingOrFailed,
      rowsHtml
    );

    try {
      const mailRes = await sendEmail({ to, cc, subject: finalSubject, html: emailHtml, attachments: [] });
      if (!mailRes.success) {
        return NextResponse.json({ success: false, sent: false, error: mailRes.error || "SMTP error", html: emailHtml });
      }

      // Đồng bộ Tiến độ & Nhật ký Công đoạn 7 (Bàn giao kết quả cho Tư vấn)
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
              const logNote = `Đã gửi email trả kết quả & bàn giao Tư vấn (Kỳ: ${sPeriodLabel} • Đợt: ${sBatchLabel}) tới: ${to}${cc ? ` (CC: ${cc})` : ""} — Văn bản: ${docTypes.join(", ")}`;

              const wfRes = await executeEntranceWorkflowAction({
                action: "CONFIRM",
                targetScope: "STUDENT",
                isPreschool: false,
                periodId: s.periodId || "PERIOD_QUICK_EMAIL",
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
        console.warn("Workflow stage 7 sync warning:", wfErr);
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

function buildEmailHtml(
  subject: string,
  periodName: string,
  batchName: string,
  batchDateRange: string,
  campusName: string,
  totalStudents: number,
  totalPassed: number,
  totalPendingOrFailed: number,
  rowsHtml: string
) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9; padding:24px 0;">
  <tr>
    <td align="center">
      <table width="1020" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:1020px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">
        
        <!-- HEADER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #00A19A 100%); padding:26px 32px; color:#FFFFFF; border-bottom:4px solid #00A19A; text-align:center;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px auto;">
              <tr>
                <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #00A19A; border-radius:20px; padding:3px 12px; font-size:10.5px; font-weight:800; color:#5EEAD4; letter-spacing:1px; text-transform:uppercase;">
                  🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                </td>
              </tr>
            </table>
            <h1 style="margin:0; font-size:20px; font-weight:900; line-height:1.3; color:#FFFFFF; text-transform:uppercase;">
              BÁO CÁO KẾT QUẢ KHẢO SÁT ĐẦU VÀO THEO ĐỢT
            </h1>
            <div style="font-size:12px; color:#E0F2FE; margin-top:6px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
              HỆ THỐNG KHẢO SÁT NĂNG LỰC ĐẦU VÀO SKY-LINE
            </div>
          </td>
        </tr>

        <!-- THONG TIN KY & DOT KHAO SAT -->
        <tr>
          <td style="padding:18px 28px; background-color:#F8FAFC; border-bottom:1px solid #E2E8F0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="35%" style="vertical-align:top; padding-right:12px;">
                  <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Kỳ khảo sát</div>
                  <div style="font-size:14px; font-weight:800; color:#003B3A; margin-top:3px;">${periodName}</div>
                  ${campusName ? `<div style="font-size:11px; font-weight:600; color:#0F766E; margin-top:2px;">Cơ sở: ${campusName}</div>` : ""}
                </td>
                <td width="65%" align="right" style="vertical-align:top;">
                  <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px;">Thông tin Đợt khảo sát</div>
                  <div style="font-size:14px; font-weight:800; color:#003B3A; margin-top:3px;">${batchName}</div>
                  ${batchDateRange ? `<div style="font-size:11px; font-weight:600; color:#0F766E; margin-top:2px;">Thời gian khảo sát: ${batchDateRange}</div>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- THONG KE (3-Column KPI cards) -->
        <tr>
          <td style="padding:20px 28px 10px 28px; background-color:#FFFFFF;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="32%" bgcolor="#F0FDFA" style="padding:12px 10px; background-color:#F0FDFA; border-radius:12px; border:1px solid #CCFBF1; text-align:center;">
                  <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0F766E;">Tổng số học sinh</div>
                  <div style="font-size:22px; font-weight:900; color:#003B3A; margin-top:4px;">${totalStudents}</div>
                </td>
                <td width="2%"></td>
                <td width="32%" bgcolor="#ECFDF5" style="padding:12px 10px; background-color:#ECFDF5; border-radius:12px; border:1px solid #A7F3D0; text-align:center;">
                  <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#065F46;">Đạt / Trúng tuyển</div>
                  <div style="font-size:22px; font-weight:900; color:#047857; margin-top:4px;">${totalPassed}</div>
                </td>
                <td width="2%"></td>
                <td width="32%" bgcolor="#FEF2F2" style="padding:12px 10px; background-color:#FEF2F2; border-radius:12px; border:1px solid #FECACA; text-align:center;">
                  <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#991B1B;">Chưa đạt / Chờ duyệt</div>
                  <div style="font-size:22px; font-weight:900; color:#DC2626; margin-top:4px;">${totalPendingOrFailed}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BANG CHI TIET -->
        <tr>
          <td style="padding:16px 24px 28px 24px; background-color:#FFFFFF;">
            <h2 style="font-size:14px; font-weight:800; color:#003B3A; border-left:4px solid #00A19A; padding-left:10px; margin:0 0 14px 0;">
              Thông tin kết quả từng học sinh theo đợt (${totalStudents} học sinh)
            </h2>
            <div style="border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF;">
                    <th style="padding:10px 6px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:34px; border-right:1px solid #065F46; white-space:nowrap;">STT</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:92px; border-right:1px solid #065F46; white-space:nowrap;">Mã HS</th>
                    <th style="padding:10px 12px; text-align:left; font-size:11px; font-weight:700; color:#FFFFFF; min-width:165px; border-right:1px solid #065F46; white-space:nowrap;">Học sinh</th>
                    <th style="padding:10px 6px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:58px; border-right:1px solid #065F46; white-space:nowrap;">Giới tính</th>
                    <th style="padding:10px 6px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:46px; border-right:1px solid #065F46; white-space:nowrap;">Khối</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:56px; border-right:1px solid #065F46; white-space:nowrap;">Hệ</th>
                    <th style="padding:10px 10px; text-align:left; font-size:11px; font-weight:700; color:#FFFFFF; min-width:140px; border-right:1px solid #065F46; white-space:nowrap;">Đợt khảo sát</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:115px; border-right:1px solid #065F46; white-space:nowrap;">Kết quả Phê duyệt</th>
                    <th style="padding:10px 10px; text-align:left; font-size:11px; font-weight:700; color:#FFFFFF; width:105px; border-right:1px solid #065F46; white-space:nowrap;">Môn Cam kết</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:115px; border-right:1px solid #065F46; white-space:nowrap;">Thư mời</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#FFFFFF; width:105px; white-space:nowrap;">Cam kết</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; border-top:3px solid #00A19A; padding:20px 28px; text-align:center; font-size:11px; color:#CCFBF1; line-height:1.6;">
            <div style="font-weight:800; color:#FFFFFF; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
              HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
            </div>
            <div style="color:#99F6E4; font-weight:600; margin-top:3px;">
              BAN ĐÀO TẠO &amp; KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
            </div>
            <div style="color:#5EEAD4; margin-top:6px; font-size:10.5px;">
              Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">skylineschool.edu.vn</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
