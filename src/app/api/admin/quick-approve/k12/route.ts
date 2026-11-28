// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateK12ApprovalToken,
  verifyK12ApprovalToken,
  verifyBatchApprovalToken
} from "@/lib/k12-approval-service";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { isOfficiallyApprovedConclusion } from "@/lib/entrance-progress/constants";

const SAFE_HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Robots-Tag": "noindex, nofollow"
};

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractCampusShortLabel(raw?: string | null): string {
  const s = String(raw || "").trim();
  if (!s) return "Sky-Line";
  const upper = s.toUpperCase();
  if (upper.includes("CS1") || upper.includes("RIVERSIDE")) return "CS1";
  if (upper.includes("CS2") || upper.includes("CENTRAL")) return "CS2";
  if (upper.includes("CS3") || upper.includes("GLOBAL") || upper.includes("INTERNATIONAL")) return "CS3";
  if (upper.includes("CS4") || upper.includes("HILL")) return "CS4";
  if (upper.includes("CS5") || upper.includes("BEACH")) return "CS5";
  return s;
}

function summarizeScoresHtml(scores: any[], student: any): string {
  const items: string[] = [];

  if (Array.isArray(scores) && scores.length > 0) {
    for (const sc of scores) {
      const sub = sc?.subject || {};
      const subName = String(sub.name || sc.subjectName || "Môn").trim();
      const sNameLower = subName.toLowerCase().normalize("NFC");
      const sCode = String(sub.code || "").toLowerCase();

      if (sCode.includes("pdh") || sCode.includes("orientation") || sNameLower.includes("định hướng")) {
        continue;
      }

      let vArr: any[] = [];
      try {
        const parsed = Array.isArray(sc.scores) ? sc.scores : JSON.parse(sc.scores || "[]");
        vArr = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        vArr = sc.scores ? [sc.scores] : [];
      }

      if (sCode.includes("tci") || sCode.includes("cpt") || sNameLower.includes("chuẩn phát triển")) {
        let tciMeta: any = null;
        if (sc.comments) {
          try {
            const pc = JSON.parse(sc.comments);
            const cArr = Array.isArray(pc) ? pc : [pc];
            for (const item of cArr) {
              if (typeof item === "string" && item.includes('"_tciMeta"')) {
                const m = JSON.parse(item);
                if (m?._tciMeta) tciMeta = m._tciMeta;
              }
            }
          } catch {}
        }
        const passed = tciMeta?.countDat ?? vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
        const total = vArr.length > 0 ? vArr.length : 16;
        items.push(`<span class="score-pill"><span>${subName}:</span> <strong>${passed}/${total} Đạt</strong></span>`);
        continue;
      }

      if (sCode.includes("tly") || sNameLower.includes("tâm lý")) {
        const scNum = parseFloat(vArr[6] ?? vArr[20] ?? vArr[0] ?? "0");
        if (!isNaN(scNum)) {
          const lvl = scNum <= 15 ? "Bình thường" : scNum <= 31 ? "Dấu hiệu nhẹ" : scNum <= 47 ? "Dấu hiệu vừa" : "Nguy cơ cao";
          items.push(`<span class="score-pill"><span>${subName}:</span> <strong>${lvl} (${scNum}đ)</strong></span>`);
        }
        continue;
      }

      if (sCode.includes("nltd") || sNameLower.includes("năng lực tư duy")) {
        const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
        if (pctVal !== undefined && pctVal !== null && String(pctVal).trim() !== "") {
          items.push(`<span class="score-pill"><span>${subName}:</span> <strong>${pctVal}%</strong></span>`);
        }
        continue;
      }

      const nonEmpty = vArr.filter(x => x !== undefined && x !== null && String(x).trim() !== "");
      if (nonEmpty.length > 0) {
        const isOralNonScoring =
          (sNameLower.includes("tiếng anh") || sCode === "tavd" || sCode.includes("english_speaking")) &&
          !sCode.includes("esl") &&
          !sNameLower.includes("esl") &&
          (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("vd") || sCode.includes("speaking") || sCode.includes("oral"));
        if (isOralNonScoring) {
          items.push(`<span class="score-pill" style="background:#FFFBEB;border-color:#FCD34D;color:#92400E;"><span>${subName}:</span> <strong>${nonEmpty[0]}</strong> <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#FEF3C7;color:#B45309;font-weight:700;margin-left:4px;">Không xét KQ</span></span>`);
        } else {
          items.push(`<span class="score-pill"><span>${subName}:</span> <strong>${nonEmpty[0]}</strong></span>`);
        }
      }
    }
  }

  if (items.length === 0) {
    if (student.mathScore !== null && student.mathScore !== undefined) {
      items.push(`<span class="score-pill"><span>Toán:</span> <strong>${student.mathScore}đ</strong></span>`);
    }
    if (student.literatureScore !== null && student.literatureScore !== undefined) {
      items.push(`<span class="score-pill"><span>Tiếng Việt/Văn:</span> <strong>${student.literatureScore}đ</strong></span>`);
    }
    if (student.writtenEnglishScore !== null && student.writtenEnglishScore !== undefined) {
      items.push(`<span class="score-pill"><span>TA Viết:</span> <strong>${student.writtenEnglishScore}đ</strong></span>`);
    }
    if (student.oralEnglishScore !== null && student.oralEnglishScore !== undefined) {
      items.push(`<span class="score-pill"><span>TA Nói:</span> <strong>${student.oralEnglishScore}đ</strong></span>`);
    }
    if (student.psychologyScore !== null && student.psychologyScore !== undefined) {
      items.push(`<span class="score-pill"><span>Tâm lý:</span> <strong>${student.psychologyScore}đ</strong></span>`);
    }
  }

  return items.length > 0 ? items.join(" ") : "<span style='color:#94A3B8;font-style:italic;'>Chưa ghi nhận điểm chi tiết</span>";
}

async function resolveApproverDisplayName(email: string): Promise<string> {
  let approverName = "Giám đốc Cơ sở (Duyệt qua Email)";
  if (email && email.includes("@")) {
    try {
      const u = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.trim().toLowerCase() },
            { email: email.trim() }
          ]
        }
      });
      if (u?.fullName) {
        approverName = `${u.fullName} (GĐCS)`;
      } else {
        const t = await prisma.teacher.findFirst({
          where: {
            OR: [
              { email: email.trim().toLowerCase() },
              { email: email.trim() }
            ]
          }
        });
        if (t?.fullName) {
          approverName = `${t.fullName} (GĐCS)`;
        }
      }
    } catch {}
  }
  return approverName;
}

function buildUpdatedDirectorNote(
  existingNote: string | null | undefined,
  approverName: string,
  oldResult: string,
  newResult: string,
  committedSubjects: string[],
  customNote: string
): string {
  const now = new Date();
  const formattedTime = now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const raw = String(existingNote || "");
  const parts = raw.split("--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---");
  let cleanBase = (parts[0] || "")
    .replace(/\[Môn cam kết:[^\]]*\]/gi, "")
    .trim();

  if (customNote.trim()) {
    cleanBase = customNote.trim();
  } else if (!cleanBase) {
    cleanBase = `Phê duyệt qua Email: ${newResult}`;
  }

  if (committedSubjects.length > 0 && (newResult.includes("cam kết") || newResult.includes("Kiểm tra lại"))) {
    cleanBase = `[Môn cam kết: ${committedSubjects.join(", ")}] ${cleanBase}`.trim();
  }

  const historyLines = (parts[1] || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const newHistoryEntry = `• ${formattedTime} | ${approverName} | ${oldResult || "Chưa duyệt"} ➔ ${newResult} | Lý do: ${
    customNote.trim() || (committedSubjects.length > 0 ? `Môn: ${committedSubjects.join(", ")}` : "Xét duyệt trực tiếp qua Email")
  }`;

  const mergedHistory = [newHistoryEntry, ...historyLines].join("\n");
  return `${cleanBase}\n\n--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---\n${mergedHistory}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "student";
  const studentId = searchParams.get("studentId") || "";
  const periodId = searchParams.get("periodId") || "";
  const batchId = searchParams.get("batchId") || "";
  const isPreschool = searchParams.get("isPreschool") === "1";
  const action = searchParams.get("action") || "DAT";
  const email = searchParams.get("email") || "gdcs@skylineschool.edu.vn";
  const token = searchParams.get("token") || "";
  const preselect = searchParams.get("preselect") || "";

  const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  // IMPORTANT: HTTP GET MUST NEVER MUTATE THE DATABASE.
  // Email security scanners (Microsoft Defender Safe Links, Outlook Copilot / link prefetchers,
  // Proofpoint, mobile mail previews) automatically send GET requests to all links in an email
  // the moment the email is delivered or opened. All database writes happen ONLY on POST.

  // --- MODE 1: BATCH APPROVAL (READ-ONLY CONFIRMATION PAGE ON GET) ---
  if (mode === "batch") {
    const validBatch = verifyBatchApprovalToken(periodId, batchId, isPreschool, email, token);
    if (!validBatch) {
      return new NextResponse(
        renderPageHtml({
          title: "Xác thực không hợp lệ",
          bodyHtml: `<div class="error-box">Liên kết phê duyệt theo đợt không hợp lệ hoặc đã hết hạn. Vui lòng truy cập trực tiếp hệ thống SSM Portal.</div>
          <a href="${baseUrl}/admin/xet-duyet-ket-qua" class="btn-primary">Mở Cổng Xét duyệt SSM &rarr;</a>`
        }),
        { status: 400, headers: SAFE_HTML_HEADERS }
      );
    }

    const approverName = await resolveApproverDisplayName(email);
    const whereClause: any = { periodId };
    if (batchId && batchId !== "all") whereClause.batchId = batchId;

    const list = isPreschool
      ? await (prisma as any).preschoolInputAssessmentStudent.findMany({ where: whereClause })
      : await (prisma as any).inputAssessmentStudent.findMany({ where: whereClause });
    const targetList = list.filter((s: any) => !s.isAbsent && !s.admissionResult);

    return new NextResponse(
      renderBatchConfirmPage({
        targetList,
        isPreschool,
        periodId,
        batchId,
        email,
        token,
        approverName,
        baseUrl
      }),
      { status: 200, headers: SAFE_HTML_HEADERS }
    );
  }

  // --- MODE 2: SINGLE K-12 STUDENT (READ-ONLY CONFIRMATION PAGE ON GET) ---
  const isValid = verifyK12ApprovalToken(studentId, action, email, token);
  if (!isValid) {
    return new NextResponse(
      renderPageHtml({
        title: "Xác thực không hợp lệ",
        bodyHtml: `
          <div class="error-box">Liên kết phê duyệt không hợp lệ hoặc đã bị thay đổi vì lý do bảo mật.</div>
          <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&studentId=${encodeURIComponent(studentId)}" class="btn-primary">Mở Cổng Xét duyệt SSM &rarr;</a>
        `
      }),
      { status: 400, headers: SAFE_HTML_HEADERS }
    );
  }

  const student = await (prisma as any).inputAssessmentStudent.findUnique({
    where: { id: studentId },
    include: { period: true, batch: true }
  });

  if (!student) {
    return new NextResponse(
      renderPageHtml({
        title: "Không tìm thấy hồ sơ học sinh",
        bodyHtml: `
          <div class="error-box">Hồ sơ học sinh không tồn tại hoặc đã được chuyển khỏi hệ thống.</div>
          <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=k12" class="btn-primary">Mở Cổng Xét duyệt SSM &rarr;</a>
        `
      }),
      { status: 404, headers: SAFE_HTML_HEADERS }
    );
  }

  const scores = await (prisma as any).studentAssessmentScore.findMany({
    where: { studentId },
    include: { subject: true }
  }).catch(() => []);

  // Always render safe interactive confirmation form (pre-selected with the tapped option & subjects)
  // so email security scanners/prefetchers can never trigger unintended approvals.
  return new NextResponse(
    renderInteractiveApprovalForm({
      student,
      scores,
      defaultAction: action,
      email,
      token,
      baseUrl,
      preselect
    }),
    { status: 200, headers: SAFE_HTML_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  try {
    const formData = await req.formData();
    const mode = String(formData.get("mode") || "student");

    // --- MODE 1: BATCH APPROVAL EXECUTION (POST ONLY) ---
    if (mode === "batch") {
      const periodId = String(formData.get("periodId") || "");
      const batchId = String(formData.get("batchId") || "");
      const isPreschool = String(formData.get("isPreschool") || "") === "1";
      const email = String(formData.get("email") || "gdcs@skylineschool.edu.vn");
      const token = String(formData.get("token") || "");

      const validBatch = verifyBatchApprovalToken(periodId, batchId, isPreschool, email, token);
      if (!validBatch) {
        return new NextResponse(
          renderPageHtml({
            title: "Xác thực không hợp lệ",
            bodyHtml: `<div class="error-box">Phiên xác thực phê duyệt theo đợt không hợp lệ hoặc đã hết hạn. Vui lòng truy cập trực tiếp hệ thống SSM Portal.</div>
            <a href="${baseUrl}/admin/xet-duyet-ket-qua" class="btn-primary">Mở Cổng Xét duyệt SSM &rarr;</a>`
          }),
          { status: 400, headers: SAFE_HTML_HEADERS }
        );
      }

      const approverName = await resolveApproverDisplayName(email);
      const whereClause: any = { periodId };
      if (batchId && batchId !== "all") whereClause.batchId = batchId;

      if (isPreschool) {
        const list = await (prisma as any).preschoolInputAssessmentStudent.findMany({ where: whereClause });
        const targetList = list.filter((s: any) => !s.isAbsent && !s.admissionResult);
        for (const st of targetList) {
          await (prisma as any).preschoolInputAssessmentStudent.update({
            where: { id: st.id },
            data: {
              gdcsApprovalStatus: "DAT_MIEN_HOC_THU",
              gdcsApprovalUser: approverName,
              gdcsApprovalDate: new Date(),
              admissionResult: "Đạt - Miễn Học Thử"
            }
          });
        }
        return new NextResponse(
          renderPageHtml({
            title: "Phê duyệt đợt khảo sát thành công",
            bodyHtml: `
              <div class="badge-ok">✓ Hệ thống đã ghi nhận kết quả xét duyệt trên SSM</div>
              <p class="desc">Hệ thống đã ghi nhận quyết định phê duyệt <strong>Đạt - Miễn Học Thử</strong> cho <strong>${targetList.length}</strong> học sinh chờ duyệt trong đợt khảo sát bởi <strong>${escapeHtml(approverName)}</strong>.</p>
              <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=mam-non&periodId=${encodeURIComponent(periodId)}&batchId=${encodeURIComponent(batchId)}" class="btn-primary">Xem danh sách trên SSM Portal &rarr;</a>
            `
          }),
          { status: 200, headers: SAFE_HTML_HEADERS }
        );
      } else {
        const list = await (prisma as any).inputAssessmentStudent.findMany({ where: whereClause });
        const targetList = list.filter((s: any) => !s.isAbsent && !s.admissionResult);
        for (const st of targetList) {
          const updatedNote = buildUpdatedDirectorNote(st.directorNote, approverName, st.admissionResult || "", "Đạt", [], "Duyệt Đạt toàn đợt qua Email");
          await (prisma as any).inputAssessmentStudent.update({
            where: { id: st.id },
            data: {
              admissionResult: "Đạt",
              signatureName: approverName,
              directorNote: updatedNote
            }
          });
        }
        return new NextResponse(
          renderPageHtml({
            title: "Phê duyệt đợt khảo sát thành công",
            bodyHtml: `
              <div class="badge-ok">✓ Hệ thống đã ghi nhận kết quả xét duyệt trên SSM</div>
              <p class="desc">Hệ thống đã ghi nhận quyết định phê duyệt <strong>Đạt chuẩn</strong> cho <strong>${targetList.length}</strong> học sinh chờ duyệt trong đợt khảo sát bởi <strong>${escapeHtml(approverName)}</strong>.</p>
              <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&periodId=${encodeURIComponent(periodId)}&batchId=${encodeURIComponent(batchId)}" class="btn-primary">Xem danh sách trên SSM Portal &rarr;</a>
            `
          }),
          { status: 200, headers: SAFE_HTML_HEADERS }
        );
      }
    }

    // --- MODE 2: SINGLE K-12 STUDENT EXECUTION (POST ONLY) ---
    const studentId = String(formData.get("studentId") || "");
    const action = String(formData.get("action") || "DAT");
    const email = String(formData.get("email") || "gdcs@skylineschool.edu.vn");
    const token = String(formData.get("token") || "");
    const decision = String(formData.get("decision") || "Đạt");
    const customNote = String(formData.get("customNote") || "");
    const committedSubjects = formData.getAll("committedSubjects").map(s => String(s).trim()).filter(Boolean);

    const isValid = verifyK12ApprovalToken(studentId, action, email, token);
    if (!isValid) {
      return new NextResponse(
        renderPageHtml({
          title: "Xác thực không hợp lệ",
          bodyHtml: `<div class="error-box">Phiên xác thực phê duyệt không hợp lệ. Vui lòng thử lại từ email hoặc đăng nhập hệ thống.</div>`
        }),
        { status: 400, headers: SAFE_HTML_HEADERS }
      );
    }

    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id: studentId },
      include: { period: true, batch: true }
    });

    if (!student) {
      return new NextResponse(
        renderPageHtml({
          title: "Không tìm thấy học sinh",
          bodyHtml: `<div class="error-box">Không tìm thấy hồ sơ học sinh.</div>`
        }),
        { status: 404, headers: SAFE_HTML_HEADERS }
      );
    }

    const approverName = await resolveApproverDisplayName(email);
    const oldResult = student.admissionResult || "Chưa duyệt";
    const finalNote = buildUpdatedDirectorNote(
      student.directorNote,
      approverName,
      oldResult,
      decision,
      committedSubjects,
      customNote
    );

    await (prisma as any).inputAssessmentStudent.update({
      where: { id: studentId },
      data: {
        admissionResult: decision,
        signatureName: approverName,
        directorNote: finalNote
      }
    });

    if (isOfficiallyApprovedConclusion(decision)) {
      try {
        await executeEntranceWorkflowAction({
          action: "CONFIRM",
          targetScope: "STUDENT",
          isPreschool: false,
          periodId: student.periodId || "PERIOD_APPROVAL",
          batchId: student.batchId || null,
          studentIds: [student.id],
          stageNumber: 6,
          status: "COMPLETED",
          admissionResult: decision,
          note: customNote.trim() || `GĐCS (${approverName}) phê duyệt qua Email: ${decision}${committedSubjects.length > 0 ? ` (${committedSubjects.join(", ")})` : ""}`,
          actor: {
            id: "gdcs_email_approver",
            fullName: approverName,
            role: "GDCS",
            isSuperAdmin: false
          }
        });
      } catch {}
    }

    const scores = await (prisma as any).studentAssessmentScore.findMany({
      where: { studentId },
      include: { subject: true }
    }).catch(() => []);

    return new NextResponse(
      renderStudentSuccessPage({
        student,
        scores,
        finalResult: decision,
        committedSubjects,
        customNote,
        approverName,
        baseUrl,
        action,
        email,
        token
      }),
      { status: 200, headers: SAFE_HTML_HEADERS }
    );
  } catch (err: any) {
    return new NextResponse(
      renderPageHtml({
        title: "Lỗi xử lý phê duyệt",
        bodyHtml: `<div class="error-box">Có lỗi xảy ra: ${escapeHtml(err?.message || "Lỗi không xác định")}</div>`
      }),
      { status: 500, headers: SAFE_HTML_HEADERS }
    );
  }
}

function renderBatchConfirmPage(p: {
  targetList: any[];
  isPreschool: boolean;
  periodId: string;
  batchId: string;
  email: string;
  token: string;
  approverName: string;
  baseUrl: string;
}) {
  const { targetList, isPreschool, periodId, batchId, email, token, approverName, baseUrl } = p;
  const tab = isPreschool ? "mam-non" : "k12";
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=${tab}&periodId=${encodeURIComponent(periodId)}&batchId=${encodeURIComponent(batchId)}`;
  const decisionLabel = isPreschool ? "Đạt - Miễn Học Thử" : "Đạt chuẩn";

  if (targetList.length === 0) {
    return renderPageHtml({
      title: "Không còn học sinh chờ duyệt",
      bodyHtml: `
        <div class="badge-ok">✓ Toàn bộ học sinh trong đợt đã có kết quả xét duyệt</div>
        <p class="desc">Hiện không còn hồ sơ nào ở trạng thái chờ duyệt trong đợt khảo sát này.</p>
        <a href="${portalUrl}" class="btn-primary">Xem danh sách trên SSM Portal &rarr;</a>
      `
    });
  }

  const previewRows = targetList.slice(0, 30).map((s: any, idx: number) => `
    <tr>
      <td class="mono">${idx + 1}</td>
      <td class="mono">${escapeHtml(s.studentCode || "—")}</td>
      <td><strong>${escapeHtml(s.fullName || "—")}</strong></td>
      <td>${escapeHtml(s.grade ? `Khối ${s.grade}` : "—")}</td>
      <td><span class="campus-badge">${escapeHtml(extractCampusShortLabel(s.admissionCampus || s.registeredCampus))}</span></td>
    </tr>
  `).join("");
  const extraCount = targetList.length > 30 ? targetList.length - 30 : 0;

  return renderPageHtml({
    title: `Xác nhận duyệt Đạt toàn đợt (${targetList.length} HS)`,
    bodyHtml: `
      <div class="confirm-banner" style="background:#ECFDF5;border:1.5px solid #059669;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#065F46;margin-bottom:6px;">
          Xác nhận phê duyệt theo đợt — Người duyệt: ${escapeHtml(approverName)}
        </div>
        <div style="font-size:16px;font-weight:800;color:#003B3A;margin-bottom:12px;">
          Phê duyệt <span style="color:#059669;">${decisionLabel}</span> cho <strong>${targetList.length} học sinh</strong> đang chờ duyệt
        </div>
        <form method="POST" action="${baseUrl}/api/admin/quick-approve/k12">
          <input type="hidden" name="mode" value="batch" />
          <input type="hidden" name="periodId" value="${escapeHtml(periodId)}" />
          <input type="hidden" name="batchId" value="${escapeHtml(batchId)}" />
          <input type="hidden" name="isPreschool" value="${isPreschool ? "1" : "0"}" />
          <input type="hidden" name="email" value="${escapeHtml(email)}" />
          <input type="hidden" name="token" value="${escapeHtml(token)}" />
          <button type="submit" class="btn-submit" style="background-color:#059669;margin-right:10px;">
            ✓ Xác nhận &amp; Ghi nhận ${targetList.length} học sinh ngay
          </button>
          <a href="${portalUrl}" class="btn-secondary" style="margin-top:0;">Xem chi tiết trên SSM Portal &rarr;</a>
        </form>
        <div style="margin-top:10px;font-size:11.5px;color:#475569;">
          Bước xác nhận này bảo vệ dữ liệu khỏi trình quét bảo mật tự động của Email (Outlook Safe Links).
        </div>
      </div>

      <div class="table-scroll">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã HS</th>
              <th>Học sinh</th>
              <th>Khối</th>
              <th>Cơ sở</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows}
            ${extraCount > 0 ? `<tr><td colspan="5" style="text-align:center;color:#64748B;font-style:italic;">... và ${extraCount} học sinh chờ duyệt khác</td></tr>` : ""}
          </tbody>
        </table>
      </div>
    `
  });
}

function renderInteractiveApprovalForm(p: {
  student: any;
  scores: any[];
  defaultAction: string;
  email: string;
  token: string;
  baseUrl: string;
  preselect?: string;
}) {
  const { student, scores, defaultAction, email, token, baseUrl, preselect = "" } = p;
  const dobStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";
  const genderStr = student.gender === "FEMALE" || student.gender === "Nữ" || student.gender === "F" ? "Nữ" : "Nam";
  const campusLabel = extractCampusShortLabel(student.admissionCampus || student.registeredCampus || student.batch?.name);
  const scoresHtml = summarizeScoresHtml(scores, student);

  let defaultDecision = "Đạt";
  if (defaultAction === "DAT_CAM_KET") defaultDecision = "Đạt cam kết";
  else if (defaultAction === "HOC_THU") defaultDecision = "Học thử";
  else if (defaultAction === "KHONG_DAT") defaultDecision = "Không đạt - Kiểm tra lại";

  // Xây dựng danh sách môn khảo sát thực tế của HS để GĐCS chọn môn cam kết / KS lại (loại trừ Định hướng, NLTD & TA vấn đáp không xét KQ)
  const canonicalizeName = (raw: string) => {
    const clean = String(raw || "").trim().replace(/\s+/g, " ");
    const lower = clean.toLowerCase().normalize("NFC").replace(/[–—]/g, "-");
    if (lower === "toán" || lower === "toán học") return "Toán học";
    if (lower === "ngữ văn" || lower === "văn") return "Ngữ Văn";
    if (lower === "tiếng việt") return "Tiếng Việt";
    if (lower === "tiếng anh (viết)" || lower === "tiếng anh viết" || lower === "ta viết") return "Tiếng Anh (viết)";
    if (lower.includes("chuẩn phát triển")) return "Bộ chuẩn phát triển trẻ em 5-6 tuổi";
    if (lower.includes("tâm lý")) return "Tâm lý";
    return clean;
  };
  const selectableSubjects: { name: string; scoreLabel?: string }[] = [];
  const seenNames = new Set<string>();
  if (Array.isArray(scores) && scores.length > 0) {
    for (const sc of scores) {
      const sub = sc?.subject || {};
      const subName = String(sub.name || sc.subjectName || "").trim();
      if (!subName) continue;
      const lower = subName.toLowerCase().normalize("NFC");
      const sCode = String(sub.code || "").toLowerCase();
      if (sCode.includes("pdh") || sCode.includes("orientation") || lower.includes("định hướng")) continue;
      if (sCode.includes("nltd") || lower.includes("năng lực tư duy")) continue;
      const isOralNonScoring =
        (lower.includes("tiếng anh") || sCode === "tavd" || sCode.includes("english_speaking")) &&
        !sCode.includes("esl") &&
        !lower.includes("esl") &&
        (lower.includes("vấn đáp") || lower.includes("nói") || sCode.includes("vd") || sCode.includes("speaking") || sCode.includes("oral"));
      if (isOralNonScoring) continue;
      const canonical = canonicalizeName(subName);
      const canonKey = canonical.toLowerCase().normalize("NFC");
      if (seenNames.has(canonKey)) continue;
      seenNames.add(canonKey);

      let scoreLabel = "";
      try {
        const parsed = Array.isArray(sc.scores) ? sc.scores : JSON.parse(sc.scores || "[]");
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const firstVal = arr.find((x: any) => x !== undefined && x !== null && String(x).trim() !== "");
        if (firstVal !== undefined) scoreLabel = String(firstVal);
      } catch {
        if (sc.scores) scoreLabel = String(sc.scores);
      }
      selectableSubjects.push({ name: canonical, scoreLabel });
    }
  }
  // Luôn bổ sung đầy đủ các môn chuẩn theo Khối + Hệ + Kỳ để không bị thiếu môn khi HS chưa đủ điểm
  const gradeNum = parseInt(String(student?.grade || "0").replace(/\D/g, ""), 10) || 1;
  const sysRaw = `${student?.surveyFormType || ""} ${student?.surveySystem || ""}`.toUpperCase();
  const isTransfer =
    !!student?.isChuyenHe ||
    String(student?.period?.name || "").toLowerCase().normalize("NFC").includes("chuyển hệ") ||
    String(student?.batch?.name || "").toLowerCase().normalize("NFC").includes("chuyển hệ");
  const isSystemI = sysRaw.includes("HNG") || sysRaw.includes("SB") || sysRaw.includes("SONG BẰNG") || sysRaw.includes("HỆ I");
  const defaults = isTransfer
    ? ["EPT", "ESL (vấn đáp)"]
    : isSystemI
    ? gradeNum === 1
      ? ["Bộ chuẩn phát triển trẻ em 5-6 tuổi", "ESL (vấn đáp)", "Tâm lý"]
      : gradeNum <= 5
      ? ["Toán học", "Tiếng Việt", "EPT", "ESL (vấn đáp)"]
      : ["Toán học", "Ngữ Văn", "EPT", "ESL (vấn đáp)"]
    : gradeNum === 1
    ? ["Bộ chuẩn phát triển trẻ em 5-6 tuổi", "Tâm lý"]
    : gradeNum <= 5
    ? ["Toán học", "Tiếng Việt", "Tiếng Anh (viết)"]
    : ["Toán học", "Ngữ Văn", "Tiếng Anh (viết)"];
  defaults.forEach(name => {
    const canonKey = canonicalizeName(name).toLowerCase().normalize("NFC");
    if (!seenNames.has(canonKey)) {
      seenNames.add(canonKey);
      selectableSubjects.push({ name: canonicalizeName(name) });
    }
  });

  const preselectSet = new Set<string>(
    preselect
      .split(/[,;]+/)
      .map(s => canonicalizeName(s).toLowerCase().normalize("NFC").replace(/[–—-]/g, "-").replace(/\s+/g, " "))
      .filter(Boolean)
  );
  // If no explicit preselect was passed and student already has committed subjects recorded, pre-check them
  if (preselectSet.size === 0 && defaultDecision === "Đạt cam kết" && student.directorNote) {
    const m = String(student.directorNote).match(/\[Môn cam kết:\s*([^\]]+)\]/i);
    if (m?.[1]) {
      m[1]
        .split(/[,;]+/)
        .map(s => canonicalizeName(s).toLowerCase().normalize("NFC").replace(/[–—-]/g, "-").replace(/\s+/g, " "))
        .filter(Boolean)
        .forEach(k => preselectSet.add(k));
    }
  }
  const initialSelectedSubjects = selectableSubjects
    .filter(sub => preselectSet.has(sub.name.toLowerCase().normalize("NFC").replace(/[–—-]/g, "-").replace(/\s+/g, " ")))
    .map(sub => sub.name);

  const showSubjectPickerInitially = defaultDecision === "Đạt cam kết" || defaultDecision === "Không đạt - Kiểm tra lại";
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&periodId=${encodeURIComponent(student.periodId || "")}&batchId=${encodeURIComponent(student.batchId || "")}&studentId=${encodeURIComponent(student.id)}`;
  const pvdhToken = generateK12ApprovalToken(String(student.id), "VIEW_PVDH", email);
  const viewPvdhUrl = `${baseUrl}/api/admin/quick-approve/pvdh?studentId=${encodeURIComponent(student.id)}&email=${encodeURIComponent(email)}&token=${pvdhToken}`;

  const bannerTheme =
    defaultDecision === "Đạt"
      ? { bg: "#ECFDF5", border: "#059669", accent: "#059669", label: "Đạt chuẩn" }
      : defaultDecision === "Đạt cam kết"
      ? { bg: "#FFFBEB", border: "#D97706", accent: "#D97706", label: "Đạt cam kết" }
      : defaultDecision === "Học thử"
      ? { bg: "#F0FDFA", border: "#00736E", accent: "#00736E", label: "Học thử" }
      : { bg: "#FFF1F2", border: "#E11D48", accent: "#E11D48", label: defaultDecision };

  return renderPageHtml({
    title: `Xác nhận phê duyệt - ${student.fullName}`,
    bodyHtml: `
      <div class="sub-header">
        <span class="ledger-tag">Sổ cái Xét duyệt Tuyển sinh • Xác nhận an toàn từ Email</span>
        <h3 class="student-title">${escapeHtml(student.fullName)} <span class="code-pill">${escapeHtml(student.studentCode || "—")}</span></h3>
        <div class="meta-line">${escapeHtml(student.period?.name || "Kỳ khảo sát")} &bull; ${escapeHtml(student.batch?.name || "Khảo sát lẻ")}</div>
      </div>

      <form method="POST" action="${baseUrl}/api/admin/quick-approve/k12" class="approve-form" id="quick-approve-form">
        <input type="hidden" name="mode" value="student" />
        <input type="hidden" name="studentId" value="${escapeHtml(student.id)}" />
        <input type="hidden" name="action" value="${escapeHtml(defaultAction)}" />
        <input type="hidden" name="email" value="${escapeHtml(email)}" />
        <input type="hidden" name="token" value="${escapeHtml(token)}" />

        <!-- INSTANT CONFIRM BANNER (ABOVE THE FOLD — 1 TAP CONFIRM, SAFE FROM EMAIL SCANNERS) -->
        <div id="instant-confirm-banner" style="background:${bannerTheme.bg};border:1.5px solid ${bannerTheme.border};border-radius:12px;padding:16px 18px;margin-bottom:18px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <span style="font-size:12px;font-weight:700;color:#003B3A;">Lựa chọn Thầy/Cô vừa chạm trên Email:</span>
            <span style="font-size:11.5px;font-weight:600;color:#475569;">Trạng thái hiện tại trên SSM: <strong>${escapeHtml(student.admissionResult || "Chờ duyệt")}</strong></span>
          </div>
          <div id="instant-confirm-summary" style="font-size:16px;font-weight:800;color:${bannerTheme.accent};margin-bottom:12px;">
            ${escapeHtml(bannerTheme.label)}${initialSelectedSubjects.length > 0 ? ` — Môn: ${escapeHtml(initialSelectedSubjects.join(", "))}` : ""}
          </div>
          <button type="submit" id="instant-confirm-btn" class="btn-submit" style="background-color:${bannerTheme.accent};width:100%;text-align:center;margin:0;padding:13px 20px;font-size:14px;">
            ✓ Xác nhận &amp; Ghi nhận kết quả vào SSM ngay
          </button>
          <div style="margin-top:8px;font-size:11px;color:#475569;line-height:1.45;">
            Bước xác nhận nhanh (không cần đăng nhập) giúp chống trình quét bảo mật Email (Outlook Safe Links) tự động lưu nhầm khi mới mở thư. Thầy/Cô cũng có thể điều chỉnh môn hoặc thêm ghi chú bên dưới trước khi bấm Xác nhận.
          </div>
        </div>

        <div class="table-scroll">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Mã HS</th>
              <th>Học sinh</th>
              <th>Ngày sinh</th>
              <th>Giới tính</th>
              <th>Khối</th>
              <th>Hệ</th>
              <th>Cơ sở</th>
              <th>KQ hiện tại</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono">${escapeHtml(student.studentCode || "—")}</td>
              <td><strong>${escapeHtml(student.fullName)}</strong></td>
              <td>${dobStr}</td>
              <td>${genderStr}</td>
              <td><strong>Khối ${escapeHtml(student.grade || "—")}</strong></td>
              <td>${escapeHtml(student.surveyFormType || student.surveySystem || "—")}</td>
              <td><span class="campus-badge">${escapeHtml(campusLabel)}</span></td>
              <td><span class="status-badge">${escapeHtml(student.admissionResult || "Chờ duyệt")}</span></td>
            </tr>
          </tbody>
        </table>
        </div>

        <div class="section-box">
          <div class="section-label">Kết quả khảo sát các môn</div>
          <div class="pills-wrap">${scoresHtml}</div>
        </div>

        <div class="section-box" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;background:#F0FDFA;border-color:#99F6E4;">
          <div>
            <div class="section-label" style="margin-bottom:2px;color:#003B3A;">Phiếu phỏng vấn định hướng</div>
            <div style="font-size:12px;color:#475569;">Xem toàn bộ nội dung phỏng vấn học sinh, trao đổi phụ huynh và định hướng của giáo viên.</div>
          </div>
          <a href="${viewPvdhUrl}" target="_blank" class="btn-primary" style="margin-top:0;padding:8px 14px;font-size:12.5px;">Xem Phiếu PVĐH &rarr;</a>
        </div>

        <div class="form-group">
          <label class="form-label">1. Quyết định xét duyệt của Giám đốc Cơ sở</label>
          <div class="radio-grid">
            <label class="radio-card ${defaultDecision === "Đạt" ? "active-emerald" : ""}">
              <input type="radio" name="decision" value="Đạt" ${defaultDecision === "Đạt" ? "checked" : ""} />
              <span>✓ Đạt chuẩn</span>
            </label>
            <label class="radio-card ${defaultDecision === "Đạt cam kết" ? "active-amber" : ""}">
              <input type="radio" name="decision" value="Đạt cam kết" ${defaultDecision === "Đạt cam kết" ? "checked" : ""} />
              <span>⚠ Đạt cam kết</span>
            </label>
            <label class="radio-card ${defaultDecision === "Học thử" ? "active-teal" : ""}">
              <input type="radio" name="decision" value="Học thử" ${defaultDecision === "Học thử" ? "checked" : ""} />
              <span>✦ Học thử</span>
            </label>
            <label class="radio-card ${defaultDecision === "Không đạt - Kiểm tra lại" ? "active-rose" : ""}">
              <input type="radio" name="decision" value="Không đạt - Kiểm tra lại" ${defaultDecision === "Không đạt - Kiểm tra lại" ? "checked" : ""} />
              <span>↻ Không đạt - KS lại</span>
            </label>
            <label class="radio-card">
              <input type="radio" name="decision" value="Không đạt - Không kiểm tra lại" />
              <span>✕ Không đạt</span>
            </label>
          </div>
        </div>

        <div id="commit-subjects-group" class="form-group" style="display: ${showSubjectPickerInitially ? "block" : "none"}; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 14px 16px;">
          <label class="form-label" style="color: #92400E;">2. Chọn môn Cam kết / Khảo sát lại (theo các môn xét kết quả của HS)</label>
          <div class="checkbox-grid">
            ${selectableSubjects.map(sub => {
              const normSub = sub.name.toLowerCase().normalize("NFC").replace(/[–—-]/g, "-").replace(/\s+/g, " ");
              const isChecked = preselectSet.has(normSub);
              return `
              <label class="check-item" style="background: #FFFFFF; border-color: ${isChecked ? "#D97706" : "#FCD34D"};">
                <input type="checkbox" name="committedSubjects" value="${escapeHtml(sub.name)}" ${isChecked ? "checked" : ""} />
                <span><strong>${escapeHtml(sub.name)}</strong>${sub.scoreLabel ? ` <span style="color:#00736E;font-weight:700;">(${escapeHtml(sub.scoreLabel)})</span>` : ""}</span>
              </label>
            `;
            }).join("")}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">3. Ý kiến & chỉ đạo của Giám đốc Cơ sở</label>
          <textarea name="customNote" rows="3" class="form-textarea" placeholder="Nhập ghi chú chỉ đạo cho bộ phận Tư vấn / Giáo vụ (tùy chọn)..."></textarea>
        </div>

        <button type="submit" class="btn-submit">✓ Xác nhận phê duyệt chính thức</button>
        <a href="${portalUrl}" class="btn-secondary">Mở hồ sơ đầy đủ trên SSM Portal &rarr;</a>
      </form>
      <script>
        (function() {
          var radios = document.querySelectorAll('input[name="decision"]');
          var checks = document.querySelectorAll('input[name="committedSubjects"]');
          var group = document.getElementById('commit-subjects-group');
          var banner = document.getElementById('instant-confirm-banner');
          var summary = document.getElementById('instant-confirm-summary');
          var topBtn = document.getElementById('instant-confirm-btn');
          if (!group || !radios.length) return;
          function sync() {
            var checked = document.querySelector('input[name="decision"]:checked');
            var val = checked ? checked.value : 'Đạt';
            var needSubjects = (val === 'Đạt cam kết' || val === 'Không đạt - Kiểm tra lại');
            group.style.display = needSubjects ? 'block' : 'none';
            var selectedSubs = [];
            if (needSubjects) {
              checks.forEach(function(cb) { if (cb.checked) selectedSubs.push(cb.value); });
            }
            var theme = val === 'Đạt'
              ? { bg: '#ECFDF5', border: '#059669', accent: '#059669', label: 'Đạt chuẩn' }
              : val === 'Đạt cam kết'
              ? { bg: '#FFFBEB', border: '#D97706', accent: '#D97706', label: 'Đạt cam kết' }
              : val === 'Học thử'
              ? { bg: '#F0FDFA', border: '#00736E', accent: '#00736E', label: 'Học thử' }
              : { bg: '#FFF1F2', border: '#E11D48', accent: '#E11D48', label: val };
            if (banner) { banner.style.background = theme.bg; banner.style.borderColor = theme.border; }
            if (summary) {
              summary.style.color = theme.accent;
              summary.textContent = theme.label + (selectedSubs.length ? ' — Môn: ' + selectedSubs.join(', ') : '');
            }
            if (topBtn) { topBtn.style.backgroundColor = theme.accent; }
          }
          radios.forEach(function(r) { r.addEventListener('change', sync); });
          checks.forEach(function(cb) { cb.addEventListener('change', sync); });
          sync();
        })();
      </script>
    `
  });
}

function renderStudentSuccessPage(p: {
  student: any;
  scores: any[];
  finalResult: string;
  committedSubjects: string[];
  customNote: string;
  approverName: string;
  baseUrl: string;
  action: string;
  email: string;
  token: string;
}) {
  const { student, scores, finalResult, committedSubjects, customNote, approverName, baseUrl, action, email, token } = p;
  const dobStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";
  const genderStr = student.gender === "FEMALE" || student.gender === "Nữ" || student.gender === "F" ? "Nữ" : "Nam";
  const campusLabel = extractCampusShortLabel(student.admissionCampus || student.registeredCampus || student.batch?.name);
  const scoresHtml = summarizeScoresHtml(scores, student);
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&periodId=${encodeURIComponent(student.periodId || "")}&batchId=${encodeURIComponent(student.batchId || "")}&studentId=${encodeURIComponent(student.id)}`;
  const adjustUrl = `${baseUrl}/api/admin/quick-approve/k12?studentId=${encodeURIComponent(student.id)}&action=${encodeURIComponent(action)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const isPass = finalResult === "Đạt" || finalResult === "Học thử";
  const isCommitted = finalResult.includes("cam kết");
  const badgeStyle = isPass
    ? "background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;"
    : isCommitted
    ? "background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;"
    : "background:#FEF2F2;color:#E11D48;border:1px solid #FECACA;";

  return renderPageHtml({
    title: `Đã phê duyệt: ${student.fullName}`,
    bodyHtml: `
      <div class="badge-ok">✓ Hệ thống đã ghi nhận kết quả xét duyệt trên SSM</div>
      <p class="desc">Cảm ơn Thầy/Cô <strong>${escapeHtml(approverName)}</strong>. Quyết định xét duyệt cho học sinh <strong>${escapeHtml(student.fullName)}</strong> đã được cập nhật tức thời lên Hệ thống Quản trị Khảo sát Sky-Line.</p>

      <table class="ledger-table">
        <thead>
          <tr>
            <th>Mã HS</th>
            <th>Học sinh</th>
            <th>Ngày sinh</th>
            <th>Giới tính</th>
            <th>Khối</th>
            <th>Hệ</th>
            <th>Cơ sở</th>
            <th>Kết quả khảo sát</th>
            <th>KQ đã xét duyệt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="mono">${student.studentCode || "—"}</td>
            <td><strong>${student.fullName}</strong></td>
            <td>${dobStr}</td>
            <td>${genderStr}</td>
            <td><strong>Khối ${student.grade || "—"}</strong></td>
            <td>${student.surveyFormType || student.surveySystem || "—"}</td>
            <td><span class="campus-badge">${campusLabel}</span></td>
            <td>${scoresHtml}</td>
            <td>
              <span style="display:inline-block;padding:4px 10px;border-radius:6px;font-weight:700;font-size:12px;${badgeStyle}">
                ${finalResult === "Đạt" ? "Đạt chuẩn" : finalResult}
              </span>
              ${committedSubjects.length > 0 ? `<div style="font-size:11px;color:#D97706;margin-top:4px;font-weight:600;">Môn: ${committedSubjects.join(", ")}</div>` : ""}
              ${customNote ? `<div style="font-size:11px;color:#475569;margin-top:3px;font-style:italic;">${customNote}</div>` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px;">
        <button type="button" onclick="window.close()" class="btn-primary" style="margin-top:0;border:none;cursor:pointer;">✓ Đã ghi nhận — Đóng cửa sổ</button>
        <a href="${baseUrl}/api/admin/quick-approve/pvdh?studentId=${encodeURIComponent(student.id)}&email=${encodeURIComponent(email)}&token=${generateK12ApprovalToken(String(student.id), "VIEW_PVDH", email)}" target="_blank" class="btn-secondary" style="margin-top:0;">📋 Xem Phiếu PVĐH</a>
        <a href="${adjustUrl}" class="btn-secondary" style="margin-top:0;">✎ Điều chỉnh quyết định / Chọn thêm môn</a>
      </div>
      <p style="text-align:center;font-size:11.5px;color:#64748B;margin-top:10px;">
        Kết quả đã được đồng bộ trực tiếp vào hồ sơ khảo sát trên hệ thống SSM. Thầy/Cô có thể đóng tab này ngay.
      </p>
    `
  });
}

function renderPageHtml(p: { title: string; bodyHtml: string }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${p.title} - Sky-Line SSM</title>
  <style>
    * { box-sizing: border-box; font-variant-numeric: tabular-nums; }
    body {
      margin: 0;
      padding: 28px 16px;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    .container {
      max-width: 880px;
      width: 100%;
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      border-left: 5px solid #003B3A;
      box-shadow: 0 10px 30px rgba(0, 59, 58, 0.08);
      overflow: hidden;
    }
    .masthead {
      background-color: #003B3A;
      color: #FFFFFF;
      padding: 20px 28px;
      border-bottom: 3px solid #00A19A;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .masthead-title {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }
    .masthead-sub {
      font-size: 12px;
      color: #99F6E4;
      font-weight: 600;
    }
    .content { padding: 26px 28px; }
    .sub-header { margin-bottom: 18px; }
    .ledger-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #00736E;
      background: #F0FDFA;
      border: 1px solid #CCFBF1;
      padding: 3px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .student-title {
      margin: 4px 0;
      font-size: 20px;
      font-weight: 800;
      color: #003B3A;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .code-pill {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 13px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #003B3A;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .meta-line { font-size: 12.5px; color: #64748B; font-weight: 500; }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px 0;
      font-size: 12.5px;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
    }
    .ledger-table thead tr {
      background-color: #003B3A;
      color: #FFFFFF;
    }
    .ledger-table th {
      padding: 10px 10px;
      text-align: left;
      font-size: 11.5px;
      font-weight: 700;
      white-space: nowrap;
    }
    .ledger-table td {
      padding: 11px 10px;
      border-top: 1px solid #E2E8F0;
      vertical-align: middle;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-weight: 700; color: #003B3A; }
    .campus-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      background: #F0FDFA;
      color: #00736E;
      border: 1px solid #CCFBF1;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      background: #FFFBEB;
      color: #D97706;
      border: 1px solid #FDE68A;
    }
    .section-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .section-label {
      font-size: 12px;
      font-weight: 700;
      color: #003B3A;
      margin-bottom: 8px;
    }
    .pills-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
    .score-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      color: #475569;
    }
    .score-pill strong { color: #003B3A; }
    .form-group { margin-bottom: 18px; text-align: left; }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #003B3A;
      margin-bottom: 8px;
    }
    .radio-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }
    .radio-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      background: #FFFFFF;
      font-size: 12.5px;
      font-weight: 700;
      color: #1E293B;
      cursor: pointer;
    }
    .radio-card:hover { border-color: #008B85; background: #F0FDFA; }
    .checkbox-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .check-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #F8FAFC;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .form-textarea {
      width: 100%;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
    }
    .form-textarea:focus { border-color: #00A19A; }
    .btn-submit, .btn-primary {
      display: inline-block;
      background-color: #003B3A;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 13.5px;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      text-decoration: none;
      cursor: pointer;
      margin-right: 10px;
    }
    .btn-submit:hover, .btn-primary:hover { background-color: #005854; }
    .btn-secondary {
      display: inline-block;
      background-color: #FFFFFF;
      color: #003B3A;
      font-weight: 700;
      font-size: 13px;
      padding: 11px 20px;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      text-decoration: none;
      cursor: pointer;
      margin-top: 10px;
    }
    .badge-ok {
      display: inline-block;
      background: #ECFDF5;
      color: #059669;
      border: 1px solid #A7F3D0;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 10px;
    }
    .error-box {
      background: #FEF2F2;
      color: #E11D48;
      border: 1px solid #FECACA;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .desc { font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0 0 16px 0; }
    .footer {
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 14px 28px;
      font-size: 11.5px;
      color: #64748B;
      text-align: center;
    }
    .table-scroll {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 14px 0 18px 0;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
    }
    .table-scroll .ledger-table {
      margin: 0;
      border: none;
      border-radius: 0;
      min-width: 560px;
    }
    @media (max-width: 640px) {
      body { padding: 12px 8px !important; }
      .container { border-radius: 12px !important; }
      .masthead { padding: 16px !important; }
      .masthead-title { font-size: 15px !important; line-height: 1.35; }
      .masthead-sub { font-size: 11.5px !important; margin-top: 4px; }
      .content { padding: 16px !important; }
      .student-title { font-size: 17px !important; gap: 6px; }
      .radio-grid { grid-template-columns: 1fr !important; }
      .radio-card { min-height: 44px; padding: 10px 14px; font-size: 13px; }
      .checkbox-grid { display: grid !important; grid-template-columns: 1fr !important; gap: 8px; }
      .check-item { width: 100%; min-height: 42px; padding: 9px 12px; font-size: 13px; }
      .btn-submit, .btn-primary, .btn-secondary {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        margin: 0 0 10px 0 !important;
        min-height: 44px;
        box-sizing: border-box;
      }
      .footer { padding: 12px 16px !important; font-size: 11px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="masthead">
      <div>
        <h2 class="masthead-title">Hệ thống Giáo dục Sky-Line • Xét duyệt Khảo sát Đầu vào</h2>
        <div class="masthead-sub">Cổng phê duyệt nhanh qua Email dành cho Giám đốc Cơ sở</div>
      </div>
    </div>
    <div class="content">
      ${p.bodyHtml}
    </div>
    <div class="footer">
      Hệ thống Quản trị Giáo dục Sky-Line (SSM) &bull; Ban Đào tạo &amp; Khảo thí Đảm bảo Chất lượng Giáo dục
    </div>
  </div>
</body>
</html>`;
}
