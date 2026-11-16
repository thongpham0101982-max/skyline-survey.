// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyK12ApprovalToken,
  verifyBatchApprovalToken
} from "@/lib/k12-approval-service";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { isOfficiallyApprovedConclusion } from "@/lib/entrance-progress/constants";

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
        items.push(`<span class="score-pill"><span>${subName}:</span> <strong>${nonEmpty[0]}</strong></span>`);
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
  const confirm = searchParams.get("confirm") === "1";

  const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  // --- MODE 1: BATCH APPROVAL ---
  if (mode === "batch") {
    const validBatch = verifyBatchApprovalToken(periodId, batchId, isPreschool, email, token);
    if (!validBatch) {
      return new NextResponse(
        renderPageHtml({
          title: "Xác thực không hợp lệ",
          bodyHtml: `<div class="error-box">Liên kết phê duyệt theo đợt không hợp lệ hoặc đã hết hạn. Vui lòng truy cập trực tiếp hệ thống SSM Portal.</div>
          <a href="${baseUrl}/admin/xet-duyet-ket-qua" class="btn-primary">Mở Cổng Xét duyệt SSM &rarr;</a>`
        }),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
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
            <div class="badge-ok">✓ Đã phê duyệt toàn đợt thành công</div>
            <p class="desc">Hệ thống đã ghi nhận quyết định phê duyệt <strong>Đạt - Miễn Học Thử</strong> cho <strong>${targetList.length}</strong> học sinh chờ duyệt trong đợt khảo sát bởi <strong>${approverName}</strong>.</p>
            <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=mam-non&periodId=${encodeURIComponent(periodId)}&batchId=${encodeURIComponent(batchId)}" class="btn-primary">Xem danh sách trên SSM Portal &rarr;</a>
          `
        }),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
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
            <div class="badge-ok">✓ Đã phê duyệt toàn đợt thành công</div>
            <p class="desc">Hệ thống đã ghi nhận quyết định phê duyệt <strong>Đạt chuẩn</strong> cho <strong>${targetList.length}</strong> học sinh chờ duyệt trong đợt khảo sát bởi <strong>${approverName}</strong>.</p>
            <a href="${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&periodId=${encodeURIComponent(periodId)}&batchId=${encodeURIComponent(batchId)}" class="btn-primary">Xem danh sách trên SSM Portal &rarr;</a>
          `
        }),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  // --- MODE 2: SINGLE K-12 STUDENT ---
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
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
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
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const scores = await (prisma as any).studentAssessmentScore.findMany({
    where: { studentId },
    include: { subject: true }
  }).catch(() => []);

  // Immediate 1-click approval when action === "DAT" and confirm === true
  if (confirm && action === "DAT") {
    const approverName = await resolveApproverDisplayName(email);
    const oldResult = student.admissionResult || "Chưa duyệt";
    const newResult = "Đạt";
    const finalNote = buildUpdatedDirectorNote(student.directorNote, approverName, oldResult, newResult, [], "Phê duyệt Đạt chuẩn trực tiếp qua Email");

    await (prisma as any).inputAssessmentStudent.update({
      where: { id: studentId },
      data: {
        admissionResult: newResult,
        signatureName: approverName,
        directorNote: finalNote
      }
    });

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
        admissionResult: newResult,
        note: `GĐCS (${approverName}) phê duyệt qua Email: ${newResult}`,
        actor: {
          id: "gdcs_email_approver",
          fullName: approverName,
          role: "GDCS",
          isSuperAdmin: false
        }
      });
    } catch {}

    return new NextResponse(
      renderStudentSuccessPage({
        student,
        scores,
        finalResult: newResult,
        committedSubjects: [],
        customNote: "Phê duyệt Đạt chuẩn trực tiếp qua Email",
        approverName,
        baseUrl,
        action,
        email,
        token
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Otherwise render interactive Quick-Approve Form for GĐCS (supports Đạt, Đạt cam kết + chọn môn, Học thử, Không đạt + ghi chú)
  return new NextResponse(
    renderInteractiveApprovalForm({
      student,
      scores,
      defaultAction: action,
      email,
      token,
      baseUrl
    }),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function POST(req: NextRequest) {
  const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  try {
    const formData = await req.formData();
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
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
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
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
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
          note: customNote.trim() || `GĐCS (${approverName}) phê duyệt qua Email: ${decision}`,
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
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    return new NextResponse(
      renderPageHtml({
        title: "Lỗi xử lý phê duyệt",
        bodyHtml: `<div class="error-box">Có lỗi xảy ra: ${err?.message || "Lỗi không xác định"}</div>`
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function renderInteractiveApprovalForm(p: {
  student: any;
  scores: any[];
  defaultAction: string;
  email: string;
  token: string;
  baseUrl: string;
}) {
  const { student, scores, defaultAction, email, token, baseUrl } = p;
  const dobStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";
  const genderStr = student.gender === "FEMALE" || student.gender === "Nữ" || student.gender === "F" ? "Nữ" : "Nam";
  const campusLabel = extractCampusShortLabel(student.admissionCampus || student.registeredCampus || student.batch?.name);
  const scoresHtml = summarizeScoresHtml(scores, student);

  let defaultDecision = "Đạt";
  if (defaultAction === "DAT_CAM_KET") defaultDecision = "Đạt cam kết";
  else if (defaultAction === "HOC_THU") defaultDecision = "Học thử";
  else if (defaultAction === "KHONG_DAT") defaultDecision = "Không đạt - Kiểm tra lại";

  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&periodId=${encodeURIComponent(student.periodId || "")}&batchId=${encodeURIComponent(student.batchId || "")}&studentId=${encodeURIComponent(student.id)}`;

  return renderPageHtml({
    title: `Xét duyệt nhanh kết quả khảo sát - ${student.fullName}`,
    bodyHtml: `
      <div class="sub-header">
        <span class="ledger-tag">Sổ cái Xét duyệt Tuyển sinh • Trực tiếp từ Email</span>
        <h3 class="student-title">${student.fullName} <span class="code-pill">${student.studentCode || "—"}</span></h3>
        <div class="meta-line">${student.period?.name || "Kỳ khảo sát"} &bull; ${student.batch?.name || "Khảo sát lẻ"}</div>
      </div>

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
            <td class="mono">${student.studentCode || "—"}</td>
            <td><strong>${student.fullName}</strong></td>
            <td>${dobStr}</td>
            <td>${genderStr}</td>
            <td><strong>Khối ${student.grade || "—"}</strong></td>
            <td>${student.surveyFormType || student.surveySystem || "—"}</td>
            <td><span class="campus-badge">${campusLabel}</span></td>
            <td><span class="status-badge">${student.admissionResult || "Chờ duyệt"}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="section-box">
        <div class="section-label">Kết quả khảo sát các môn</div>
        <div class="pills-wrap">${scoresHtml}</div>
      </div>

      <form method="POST" action="${baseUrl}/api/admin/quick-approve/k12" class="approve-form">
        <input type="hidden" name="studentId" value="${student.id}" />
        <input type="hidden" name="action" value="${defaultAction}" />
        <input type="hidden" name="email" value="${email}" />
        <input type="hidden" name="token" value="${token}" />

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

        <div class="form-group">
          <label class="form-label">2. Chọn môn cần Cam kết / Khảo sát lại (nếu có)</label>
          <div class="checkbox-grid">
            ${["Toán", "Tiếng Việt / Ngữ văn", "Tiếng Anh", "Năng lực tư duy", "Khoa học tự nhiên", "Tâm lý"].map(sub => `
              <label class="check-item">
                <input type="checkbox" name="committedSubjects" value="${sub}" />
                <span>${sub}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">3. Ý kiến & chỉ đạo của Giám đốc Cơ sở</label>
          <textarea name="customNote" rows="3" class="form-textarea" placeholder="Nhập ghi chú chỉ đạo cho bộ phận Tư vấn / Giáo vụ (tùy chọn)..."></textarea>
        </div>

        <button type="submit" class="btn-submit">✓ Xác nhận phê duyệt chính thức</button>
        <a href="${portalUrl}" class="btn-secondary">Mở hồ sơ đầy đủ trên SSM Portal &rarr;</a>
      </form>
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
      <div class="badge-ok">✓ Đã lưu kết quả phê duyệt vào hệ thống</div>
      <p class="desc">Cảm ơn Thầy/Cô <strong>${approverName}</strong>. Quyết định xét duyệt cho học sinh <strong>${student.fullName}</strong> đã được cập nhật tức thời lên Hệ thống Quản trị Khảo sát Sky-Line.</p>

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
        <a href="${adjustUrl}" class="btn-secondary" style="margin-top:0;">✎ Điều chỉnh quyết định / Thêm môn cam kết</a>
        <a href="${portalUrl}" class="btn-primary" style="margin-top:0;">Mở Cổng Xét duyệt SSM &rarr;</a>
      </div>
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
