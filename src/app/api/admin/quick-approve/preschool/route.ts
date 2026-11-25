import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  notifyPreschoolBghReviewResultToStakeholders,
  notifyPreschoolGdcsResultToStakeholders,
  verifyPreschoolApprovalToken,
  verifyWorkflowQuickApproveToken,
  verifyPreschoolPsychologyToken,
} from "@/lib/preschool-approval-service"
import {
  appendPreschoolAuditLog,
  ensurePreschoolWorkflowSchema,
  generateId,
  getStudentRounds,
  getWorkflowStudentRow,
} from "@/lib/preschool-workflow-db"
import {
  addBusinessDays,
  PRESCHOOL_FORM_REGISTRY,
  resolvePreschoolAdmissionResult,
  validateFollowUpBusinessDays,
} from "@/lib/preschool-workflow"
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine"

function renderHtmlPage(params: {
  title: string
  subtitle?: string
  tone: "pine" | "emerald" | "amber" | "rose"
  bodyHtml: string
  status?: number
}) {
  const accent =
    params.tone === "emerald"
      ? "#059669"
      : params.tone === "amber"
        ? "#D97706"
        : params.tone === "rose"
          ? "#E11D48"
          : "#003B3A"

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${params.title} — Sky-Line SSM</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #F8FAFC; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; box-sizing: border-box; }
    .card { width: 100%; max-width: 520px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.08); }
    .header { background: #003B3A; color: #FFFFFF; padding: 20px 24px; border-bottom: 4px solid ${accent}; }
    .eyebrow { font-size: 12px; color: #5EEAD4; font-weight: 600; margin-bottom: 4px; }
    .title { font-size: 18px; font-weight: 700; margin: 0; }
    .body { padding: 24px; font-size: 14px; line-height: 1.6; }
    .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin: 14px 0; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-bottom: 1px solid #F1F5F9; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748B; }
    .val { font-weight: 600; color: #0F172A; text-align: right; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; padding: 12px 18px; border-radius: 10px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; text-decoration: none; color: #FFFFFF; background: ${accent}; }
    .btn-outline { display: inline-block; width: 100%; box-sizing: border-box; text-align: center; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 13px; border: 1px solid #CBD5E1; color: #334155; background: #FFFFFF; text-decoration: none; margin-top: 10px; }
    textarea { width: 100%; box-sizing: border-box; border: 1px solid #CBD5E1; border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 13px; margin: 8px 0 16px; resize: vertical; min-height: 72px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="eyebrow">Hệ thống Giáo dục Sky-Line · Khảo sát Mầm non 2026</div>
      <h1 class="title">${params.title}</h1>
      ${params.subtitle ? `<div style="font-size:12px;color:#CCFBF1;margin-top:4px;">${params.subtitle}</div>` : ""}
    </div>
    <div class="body">${params.bodyHtml}</div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: params.status || 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

export async function GET(req: NextRequest) {
  try {
    await ensurePreschoolWorkflowSchema()
    const { searchParams } = new URL(req.url)
    const pt = searchParams.get("pt")
    const wt = searchParams.get("wt")

    // Psychologist trial screening confirmation link (?pt=...)
    if (pt) {
      const check = verifyPreschoolPsychologyToken(pt)
      if (!check.valid) {
        return renderHtmlPage({
          title: "Liên kết xác nhận không hợp lệ",
          tone: "rose",
          status: 403,
          bodyHtml: `<p>${check.reason}</p><a class="btn-outline" href="/admin/xet-duyet-ket-qua?tab=preschool">Mở trang Xét duyệt Mầm non</a>`,
        })
      }

      const { payload } = check
      const student = await getWorkflowStudentRow(payload.studentId)
      if (!student) {
        return renderHtmlPage({
          title: "Không tìm thấy hồ sơ trẻ",
          tone: "rose",
          status: 404,
          bodyHtml: `<p>Hồ sơ trẻ không còn tồn tại trong hệ thống.</p>`,
        })
      }

      const currentStatus = String(student.trialPsychologyStatus || "PENDING")
      const currentConclusion = String(student.trialPsychologyConclusion || "")
      const currentFeedback = String(student.trialPsychologyFeedback || "")

      return renderHtmlPage({
        title: "Phản hồi xác nhận Sàng lọc tâm lý",
        subtitle: "Học trải nghiệm Mầm non — Tự động đồng bộ trực tiếp vào phiếu trên SSM",
        tone: "pine",
        bodyHtml: `
          <div class="info-box">
            <div class="row"><span class="label">Họ và tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
            <div class="row"><span class="label">Nhóm tuổi / Cơ sở</span><span class="val">${student.grade || "Mầm non"} · ${student.admissionCampus || "Sky-Line"}</span></div>
            <div class="row"><span class="label">Lớp học trải nghiệm / GV học trải nghiệm</span><span class="val">${student.probationaryClass || "—"} · ${student.probationaryTeacher || "—"}</span></div>
            <div class="row"><span class="label">GV Tâm lý phụ trách</span><span class="val">${payload.psychologistName}</span></div>
          </div>
          <form method="POST" action="/api/admin/quick-approve/preschool">
            <input type="hidden" name="pt" value="${pt}" />
            <label for="psychologyStatus" style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">Trạng thái xác nhận:</label>
            <select id="psychologyStatus" name="psychologyStatus" style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px;background:#fff;">
              <option value="CONFIRMED" ${currentStatus === "CONFIRMED" || currentStatus === "PENDING" ? "selected" : ""}>Xác nhận tiếp nhận đánh giá tâm lý</option>
              <option value="EVALUATED" ${currentStatus === "EVALUATED" ? "selected" : ""}>Đã hoàn thành đánh giá sàng lọc tâm lý</option>
            </select>
            <label for="psychologyConclusion" style="display:block;font-size:12px;font-weight:600;color:#334155;margin-bottom:6px;">Kết luận sàng lọc tâm lý (nếu đã đánh giá):</label>
            <select id="psychologyConclusion" name="psychologyConclusion" style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px;background:#fff;">
              <option value="" ${!currentConclusion ? "selected" : ""}>-- Chưa kết luận / Đang theo dõi --</option>
              <option value="BINH_THUONG" ${currentConclusion === "BINH_THUONG" ? "selected" : ""}>Phát triển tâm lý bình thường</option>
              <option value="CAN_THEO_DOI" ${currentConclusion === "CAN_THEO_DOI" ? "selected" : ""}>Cần theo dõi thêm trong quá trình học trải nghiệm</option>
              <option value="CAN_CAN_THIEP" ${currentConclusion === "CAN_CAN_THIEP" ? "selected" : ""}>Cần hỗ trợ / can thiệp chuyên sâu</option>
            </select>
            <label for="psychologyFeedback" style="display:block;font-size:12px;font-weight:600;color:#334155;">Ý kiến phản hồi / Nhận xét đánh giá tâm lý:</label>
            <textarea id="psychologyFeedback" name="psychologyFeedback" placeholder="Nhập lịch dự kiến tiếp nhận hoặc kết quả quan sát, nhận xét tâm lý của trẻ...">${currentFeedback.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
            <button type="submit" class="btn">Gửi phản hồi xác nhận</button>
          </form>
          <a class="btn-outline" href="/admin/xet-duyet-ket-qua?tab=preschool">Mở trang Xét duyệt trên SSM</a>
        `,
      })
    }

    if (wt) {
      const check = verifyWorkflowQuickApproveToken(wt)
      if (!check.valid) {
        return renderHtmlPage({
          title: "Liên kết phê duyệt không hợp lệ",
          tone: "rose",
          status: 403,
          bodyHtml: `<p>${check.reason}</p><a class="btn-outline" href="/admin/khao-sat-mam-non">Mở phân hệ Khảo sát Mầm non</a>`,
        })
      }

      const { payload } = check
      if (!payload.studentId) {
        return renderHtmlPage({
          title: "Thiếu thông tin hồ sơ",
          tone: "rose",
          status: 400,
          bodyHtml: `<p>Liên kết không chứa mã hồ sơ hợp lệ.</p>`,
        })
      }

      const student = await getWorkflowStudentRow(payload.studentId)
      if (!student) {
        return renderHtmlPage({
          title: "Không tìm thấy hồ sơ trẻ",
          tone: "rose",
          status: 404,
          bodyHtml: `<p>Hồ sơ trẻ không còn tồn tại trong hệ thống.</p>`,
        })
      }

      if (payload.step === "B10" && student.finalApprovedOutcome) {
        const outcomeLabel = student.finalApprovedOutcome === "DAT" ? "Đạt" : "Chưa đạt"
        return renderHtmlPage({
          title: "Hồ sơ đã được phê duyệt trước đó",
          tone: "amber",
          bodyHtml: `
            <p>Hồ sơ của bé <strong>${student.fullName}</strong> đã được phê duyệt, hệ thống không ghi đè để bảo toàn dữ liệu.</p>
            <div class="info-box">
              <div class="row"><span class="label">Kết quả phê duyệt</span><span class="val">${outcomeLabel}</span></div>
              <div class="row"><span class="label">Người duyệt</span><span class="val">${student.gdcsApprovalUser || "GĐCS"}</span></div>
              <div class="row"><span class="label">Trạng thái hiện tại</span><span class="val">${student.workflowStatus}</span></div>
            </div>
            <a class="btn-outline" href="/admin/khao-sat-mam-non?studentId=${encodeURIComponent(student.id)}">Mở hồ sơ trên SSM</a>
          `,
        })
      }

      const decisionLabel =
        payload.decision === "DAT"
          ? "Phê duyệt Đạt"
          : payload.decision === "CHUA_DAT"
            ? "Phê duyệt Chưa đạt"
            : payload.decision === "DE_XUAT_DAT"
              ? "Đề xuất Đạt (B6/B9A)"
              : payload.decision === "DE_XUAT_CHUA_DAT"
                ? "Đề xuất Chưa đạt (B6/B9A)"
                : "Chuyển đánh giá tâm lý (B7A)"

      const tone = payload.decision === "DAT" || payload.decision === "DE_XUAT_DAT" ? "emerald" : "rose"

      return renderHtmlPage({
        title: `Xác nhận ${decisionLabel}`,
        subtitle: "Bước xác nhận an toàn 1 chạm — Tự động cập nhật trạng thái trên SSM",
        tone,
        bodyHtml: `
          <div class="info-box">
            <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
            <div class="row"><span class="label">Nhóm tuổi / Hệ</span><span class="val">${student.grade || "Mầm non"} · ${student.surveySystem || "Hệ S"}</span></div>
            <div class="row"><span class="label">Người thực hiện</span><span class="val">${payload.approverName || payload.approverEmail}</span></div>
            <div class="row"><span class="label">Quyết định</span><span class="val">${decisionLabel}</span></div>
          </div>
          <form method="POST" action="/api/admin/quick-approve/preschool">
            <input type="hidden" name="wt" value="${wt}" />
            <label for="comment" style="font-size:12px;font-weight:600;color:#334155;">Ý kiến ghi chú (không bắt buộc):</label>
            <textarea id="comment" name="comment" placeholder="Nhập ý kiến chỉ đạo hoặc lưu ý cho Giáo vụ / Tư vấn..."></textarea>
            <button type="submit" class="btn">Xác nhận ${decisionLabel}</button>
          </form>
          <a class="btn-outline" href="/admin/khao-sat-mam-non?studentId=${encodeURIComponent(student.id)}">Xem đầy đủ hồ sơ trên SSM</a>
        `,
      })
    }

    // Legacy link compatibility (GET renders safe confirmation page instead of mutating DB directly)
    const studentId = searchParams.get("studentId") || ""
    const action = searchParams.get("action") || ""
    const email = searchParams.get("email") || ""
    const token = searchParams.get("token") || ""

    if (!studentId || !action || !token || !verifyPreschoolApprovalToken(studentId, action, email, token)) {
      return renderHtmlPage({
        title: "Liên kết không hợp lệ hoặc đã hết hạn",
        tone: "rose",
        status: 403,
        bodyHtml: `<p>Không thể xác thực liên kết phê duyệt. Vui lòng đăng nhập SSM để thao tác.</p>`,
      })
    }

    const student = await getWorkflowStudentRow(studentId)
    if (!student) {
      return renderHtmlPage({
        title: "Không tìm thấy hồ sơ",
        tone: "rose",
        status: 404,
        bodyHtml: `<p>Hồ sơ học sinh không tồn tại.</p>`,
      })
    }

    // BGH Mầm non: Hẹn trải nghiệm kết hợp quan sát tâm lý (B7B) — form chọn Khối, Lớp, GV & lịch hẹn (>= 2 ngày làm việc)
    if (action === "BGH_HEN_TRAI_NGHIEM") {
      const campusStr = String(student.admissionCampus || student.registeredCampus || "").trim()
      const campusObj = campusStr
        ? await (prisma as any).campus.findFirst({
            where: { OR: [{ campusCode: campusStr }, { campusName: campusStr }] },
          }).catch(() => null)
        : null

      const rawClasses = await (prisma as any).class.findMany({
        where: campusObj ? { campusId: campusObj.id } : {},
        select: { id: true, className: true, grade: true, homeroomTeacherId: true },
        orderBy: [{ grade: "asc" }, { className: "asc" }],
      }).catch(() => [])

      const rawTeachers = await (prisma as any).teacher.findMany({
        select: { id: true, teacherName: true, departmentRel: { select: { name: true } }, user: { select: { id: true } } },
        orderBy: { teacherName: "asc" },
      }).catch(() => [])

      const grades = Array.from(new Set((rawClasses || []).map((c: any) => c.grade).filter(Boolean))).sort() as string[]
      const minFollowUpIso = addBusinessDays(new Date(), 2).toISOString().slice(0, 16)
      const classesJson = JSON.stringify(
        (rawClasses || []).map((c: any) => ({
          className: c.className,
          grade: c.grade || "",
          homeroomTeacherId: c.homeroomTeacherId || "",
        }))
      ).replace(/</g, "\\u003c")
      const teachersJson = JSON.stringify(
        (rawTeachers || []).map((t: any) => ({
          id: t.id,
          userId: t.user?.id || "",
          teacherName: t.teacherName,
          dept: t.departmentRel?.name || "",
        }))
      ).replace(/</g, "\\u003c")

      const gradeOptions = grades
        .map((g) => `<option value="${String(g).replace(/"/g, "&quot;")}">${String(g).replace(/</g, "&lt;")}</option>`)
        .join("")
      const classOptions = (rawClasses || [])
        .map(
          (c: any) =>
            `<option value="${String(c.className).replace(/"/g, "&quot;")}">${String(c.className).replace(/</g, "&lt;")}${c.grade ? ` (${String(c.grade).replace(/</g, "&lt;")})` : ""}</option>`
        )
        .join("")
      const teacherOptions = (rawTeachers || [])
        .map(
          (t: any) =>
            `<option value="${String(t.teacherName).replace(/"/g, "&quot;")}">${String(t.teacherName).replace(/</g, "&lt;")}${t.departmentRel?.name ? ` (${String(t.departmentRel.name).replace(/</g, "&lt;")})` : ""}</option>`
        )
        .join("")

      return renderHtmlPage({
        title: "B7B: Hẹn trải nghiệm kết hợp quan sát tâm lý (≥ 2 ngày làm việc)",
        subtitle: "Tạo Lần khảo sát mới trên cùng hồ sơ này (giữ nguyên toàn bộ lịch sử và kết quả các lần trước)",
        tone: "pine",
        bodyHtml: `
          <div class="info-box">
            <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
            <div class="row"><span class="label">Nhóm tuổi / Cơ sở</span><span class="val">${student.grade || "Mầm non"} · ${campusStr || "Sky-Line"}</span></div>
            <div class="row"><span class="label">Người thực hiện</span><span class="val">${email || "NT Mầm non / BGH"}</span></div>
          </div>
          <form method="POST" action="/api/admin/quick-approve/preschool">
            <input type="hidden" name="studentId" value="${studentId}" />
            <input type="hidden" name="action" value="${action}" />
            <input type="hidden" name="email" value="${email}" />
            <input type="hidden" name="token" value="${token}" />

            <label for="trialGrade" style="display:block;font-size:12px;font-weight:700;color:#003B3A;margin-bottom:4px;">Khối <span style="color:#E11D48">*</span></label>
            <select id="trialGrade" name="trialGrade" required style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:12px;background:#fff;">
              <option value="">-- Chọn Khối --</option>
              ${gradeOptions}
            </select>

            <label for="trialClass" style="display:block;font-size:12px;font-weight:700;color:#003B3A;margin-bottom:4px;">Lớp trải nghiệm <span style="color:#E11D48">*</span></label>
            <select id="trialClass" name="trialClass" required style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:12px;background:#fff;">
              <option value="">-- Chọn Lớp --</option>
              ${classOptions}
            </select>

            <label for="trialTeacher" style="display:block;font-size:12px;font-weight:700;color:#003B3A;margin-bottom:4px;">Tên GV phụ trách <span style="color:#E11D48">*</span></label>
            <select id="trialTeacher" name="trialTeacher" required style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:12px;background:#fff;">
              <option value="">-- Chọn Giáo viên --</option>
              ${teacherOptions}
            </select>

            <label for="trialPeriod" style="display:block;font-size:12px;font-weight:700;color:#003B3A;margin-bottom:4px;">Thời gian hẹn mới (tối thiểu sau 2 ngày làm việc) <span style="color:#E11D48">*</span></label>
            <input id="trialPeriod" type="datetime-local" name="trialPeriod" min="${minFollowUpIso}" value="${minFollowUpIso}" required style="width:100%;box-sizing:border-box;border:1px solid #CBD5E1;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:12px;background:#fff;" />

            <label for="parentNote" style="display:block;font-size:12px;font-weight:700;color:#003B3A;">Ghi chú thống nhất với phụ huynh</label>
            <textarea id="parentNote" name="parentNote" placeholder="Ghi nhận nội dung đã thống nhất với Phụ huynh về thời gian, lớp trải nghiệm & quan sát tâm lý..."></textarea>

            <label for="comment" style="display:block;font-size:12px;font-weight:700;color:#334155;">Ý kiến rà soát của NT Mầm non / BGH (không bắt buộc)</label>
            <textarea id="comment" name="comment" placeholder="Ý kiến định tuyến của Nhóm trưởng / BGH Mầm non..."></textarea>

            <button type="submit" class="btn" style="background:#008B85;">Xác nhận Hẹn trải nghiệm (B7B)</button>
          </form>
          <a class="btn-outline" href="/admin/xet-duyet-ket-qua?tab=preschool">Mở bảng Xét duyệt trên SSM</a>
          <script>
            (function(){
              var classes = ${classesJson};
              var teachers = ${teachersJson};
              var gSel = document.getElementById('trialGrade');
              var cSel = document.getElementById('trialClass');
              var tSel = document.getElementById('trialTeacher');
              if (!gSel || !cSel || !tSel) return;
              gSel.addEventListener('change', function(){
                var g = gSel.value;
                var list = g ? classes.filter(function(c){ return c.grade === g; }) : classes;
                cSel.innerHTML = '<option value="">-- Chọn Lớp --</option>' + list.map(function(c){
                  return '<option value="' + c.className.replace(/"/g,'&quot;') + '">' + c.className + '</option>';
                }).join('');
              });
              cSel.addEventListener('change', function(){
                var chosen = classes.find(function(c){ return c.className === cSel.value; });
                if (chosen && chosen.homeroomTeacherId) {
                  var fid = String(chosen.homeroomTeacherId).split(',')[0].trim();
                  var hr = teachers.find(function(t){ return t.id === fid || t.userId === fid; });
                  if (hr && hr.teacherName) tSel.value = hr.teacherName;
                }
              });
            })();
          </script>
        `,
      })
    }

    const actionLabel =
      action === "BGH_DE_XUAT_DAT"
        ? "Đề xuất Đạt → Trình B10 (Bước 1)"
        : action === "BGH_DE_XUAT_CHUA_DAT"
          ? "Đề xuất Chưa đạt → B10 (Bước 1)"
          : action === "APPROVE_MIEN_HT"
            ? "Phê duyệt Đạt (B10)"
            : action === "APPROVE_HOC_THU"
              ? "Đạt - Học Trải Nghiệm"
              : "Phê duyệt Chưa đạt (B10)"

    return renderHtmlPage({
      title: `Xác nhận: ${actionLabel}`,
      tone: action === "KHONG_DAT" || action === "BGH_DE_XUAT_CHUA_DAT" ? "rose" : "emerald",
      bodyHtml: `
        <div class="info-box">
          <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
          <div class="row"><span class="label">Người thực hiện</span><span class="val">${email || "Cán bộ duyệt"}</span></div>
          <div class="row"><span class="label">Quyết định</span><span class="val">${actionLabel}</span></div>
        </div>
        <form method="POST" action="/api/admin/quick-approve/preschool">
          <input type="hidden" name="studentId" value="${studentId}" />
          <input type="hidden" name="action" value="${action}" />
          <input type="hidden" name="email" value="${email}" />
          <input type="hidden" name="token" value="${token}" />
          <textarea name="comment" placeholder="Ý kiến ghi chú (không bắt buộc)..."></textarea>
          <button type="submit" class="btn">Xác nhận ${actionLabel}</button>
        </form>
      `,
    })
  } catch (err: any) {
    return renderHtmlPage({
      title: "Lỗi hệ thống",
      tone: "rose",
      status: 500,
      bodyHtml: `<p>${err?.message || "Không thể xử lý yêu cầu."}</p>`,
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePreschoolWorkflowSchema()
    const contentType = req.headers.get("content-type") || ""
    let pt = ""
    let psychologyStatus = ""
    let psychologyConclusion = ""
    let psychologyFeedback = ""
    let wt = ""
    let comment = ""
    let legacyStudentId = ""
    let legacyAction = ""
    let legacyEmail = ""
    let legacyToken = ""
    let trialGrade = ""
    let trialClass = ""
    let trialTeacher = ""
    let trialPeriod = ""
    let parentNote = ""
    const wantsJson = contentType.includes("application/json")

    if (wantsJson) {
      const body = await req.json()
      pt = body.pt || ""
      psychologyStatus = String(body.psychologyStatus || "CONFIRMED").trim()
      psychologyConclusion = String(body.psychologyConclusion || "").trim()
      psychologyFeedback = String(body.psychologyFeedback || body.comment || "").trim()
      wt = body.wt || ""
      comment = String(body.comment || "").trim()
      legacyStudentId = body.studentId || ""
      legacyAction = body.action || ""
      legacyEmail = body.email || ""
      legacyToken = body.token || ""
      trialGrade = String(body.trialGrade || "").trim()
      trialClass = String(body.trialClass || "").trim()
      trialTeacher = String(body.trialTeacher || "").trim()
      trialPeriod = String(body.trialPeriod || "").trim()
      parentNote = String(body.parentNote || "").trim()
    } else {
      const formData = await req.formData()
      pt = String(formData.get("pt") || "")
      psychologyStatus = String(formData.get("psychologyStatus") || "CONFIRMED").trim()
      psychologyConclusion = String(formData.get("psychologyConclusion") || "").trim()
      psychologyFeedback = String(formData.get("psychologyFeedback") || formData.get("comment") || "").trim()
      wt = String(formData.get("wt") || "")
      comment = String(formData.get("comment") || "").trim()
      legacyStudentId = String(formData.get("studentId") || "")
      legacyAction = String(formData.get("action") || "")
      legacyEmail = String(formData.get("email") || "")
      legacyToken = String(formData.get("token") || "")
      trialGrade = String(formData.get("trialGrade") || "").trim()
      trialClass = String(formData.get("trialClass") || "").trim()
      trialTeacher = String(formData.get("trialTeacher") || "").trim()
      trialPeriod = String(formData.get("trialPeriod") || "").trim()
      parentNote = String(formData.get("parentNote") || "").trim()
    }

    const nowIso = new Date().toISOString()

    // Psychologist trial screening confirmation submission
    if (pt) {
      const check = verifyPreschoolPsychologyToken(pt)
      if (!check.valid) {
        if (wantsJson) return NextResponse.json({ error: check.reason }, { status: 403 })
        return renderHtmlPage({ title: "Liên kết không hợp lệ", tone: "rose", status: 403, bodyHtml: `<p>${check.reason}</p>` })
      }

      const { payload } = check
      const student = await getWorkflowStudentRow(payload.studentId)
      if (!student) {
        if (wantsJson) return NextResponse.json({ error: "Not found" }, { status: 404 })
        return renderHtmlPage({ title: "Không tìm thấy hồ sơ", tone: "rose", status: 404, bodyHtml: `<p>Hồ sơ trẻ không tồn tại.</p>` })
      }

      const finalStatus = psychologyStatus === "EVALUATED" ? "EVALUATED" : "CONFIRMED"
      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "trialPsychologyScreening" = 1,
             "trialPsychologyStatus" = ?,
             "trialPsychologyConfirmedAt" = ?,
             "trialPsychologyFeedback" = ?,
             "trialPsychologyConclusion" = ?,
             "devPsychologyComment" = CASE
               WHEN ? != '' THEN ?
               ELSE "devPsychologyComment"
             END,
             "updatedAt" = ?
         WHERE "id" = ?`,
        finalStatus,
        nowIso,
        psychologyFeedback || null,
        psychologyConclusion || null,
        psychologyFeedback,
        psychologyFeedback,
        nowIso,
        student.id
      )

      await appendPreschoolAuditLog({
        studentId: student.id,
        action: finalStatus === "EVALUATED" ? "TRIAL_PSYCHOLOGY_EVALUATED" : "TRIAL_PSYCHOLOGY_CONFIRMED",
        actorName: payload.psychologistName || payload.psychologistEmail,
        actorRole: "PSYCHOLOGIST",
        source: "EMAIL_QUICK_APPROVE",
        detail: {
          status: finalStatus,
          conclusion: psychologyConclusion,
          feedback: psychologyFeedback,
          psychologistEmail: payload.psychologistEmail,
        },
      }).catch(() => {})

      if (wantsJson) {
        return NextResponse.json({
          success: true,
          studentId: student.id,
          trialPsychologyStatus: finalStatus,
          trialPsychologyConclusion: psychologyConclusion,
          trialPsychologyFeedback: psychologyFeedback,
        })
      }

      const statusLabel = finalStatus === "EVALUATED" ? "Đã hoàn thành đánh giá sàng lọc tâm lý" : "Đã xác nhận tiếp nhận đánh giá tâm lý"
      const conclusionLabel =
        psychologyConclusion === "BINH_THUONG"
          ? "Phát triển tâm lý bình thường"
          : psychologyConclusion === "CAN_THEO_DOI"
            ? "Cần theo dõi thêm trong quá trình học trải nghiệm"
            : psychologyConclusion === "CAN_CAN_THIEP"
              ? "Cần hỗ trợ / can thiệp chuyên sâu"
              : "Chưa kết luận"

      return renderHtmlPage({
        title: "Đã ghi nhận phản hồi xác nhận",
        subtitle: "Kết quả đã được đồng bộ trực tiếp vào hệ thống Sky-Line SSM",
        tone: "emerald",
        bodyHtml: `
          <div class="info-box">
            <div class="row"><span class="label">Họ và tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
            <div class="row"><span class="label">GV Tâm lý</span><span class="val">${payload.psychologistName}</span></div>
            <div class="row"><span class="label">Trạng thái</span><span class="val">${statusLabel}</span></div>
            <div class="row"><span class="label">Kết luận sàng lọc</span><span class="val">${conclusionLabel}</span></div>
            ${psychologyFeedback ? `<div class="row"><span class="label">Ý kiến phản hồi</span><span class="val">${psychologyFeedback.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></div>` : ""}
          </div>
          <p style="font-size:13px;color:#334155;">Cảm ơn Cô/Thầy đã phản hồi. Ban Giám Hiệu Mầm non và GV học trải nghiệm có thể xem ngay trạng thái xác nhận trên bảng Xét duyệt kết quả.</p>
          <a class="btn" href="/admin/xet-duyet-ket-qua?tab=preschool">Mở bảng Xét duyệt trên SSM</a>
        `,
      })
    }

    // New B1–B13 signed workflow token
    if (wt) {
      const check = verifyWorkflowQuickApproveToken(wt)
      if (!check.valid) {
        if (wantsJson) return NextResponse.json({ error: check.reason }, { status: 403 })
        return renderHtmlPage({ title: "Token không hợp lệ", tone: "rose", status: 403, bodyHtml: `<p>${check.reason}</p>` })
      }

      const { payload } = check
      if (!payload.studentId) {
        if (wantsJson) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
        return renderHtmlPage({ title: "Thiếu mã hồ sơ", tone: "rose", status: 400, bodyHtml: `<p>Thiếu studentId.</p>` })
      }

      const student = await getWorkflowStudentRow(payload.studentId)
      if (!student) {
        if (wantsJson) return NextResponse.json({ error: "Not found" }, { status: 404 })
        return renderHtmlPage({ title: "Không tìm thấy hồ sơ", tone: "rose", status: 404, bodyHtml: `<p>Hồ sơ không tồn tại.</p>` })
      }

      const approverLabel = payload.approverName || payload.approverEmail || "Giám đốc Điều hành Cơ sở"

      if (payload.step === "B10") {
        if (student.finalApprovedOutcome) {
          if (wantsJson) {
            return NextResponse.json({
              success: true,
              alreadyApproved: true,
              finalApprovedOutcome: student.finalApprovedOutcome,
              workflowStatus: student.workflowStatus,
            })
          }
          return renderHtmlPage({
            title: "Hồ sơ đã được duyệt trước đó",
            tone: "amber",
            bodyHtml: `<p>Hồ sơ của bé <strong>${student.fullName}</strong> đã có kết quả <strong>${student.finalApprovedOutcome === "DAT" ? "Đạt" : "Chưa đạt"}</strong>.</p><a class="btn-outline" href="/admin/khao-sat-mam-non?studentId=${encodeURIComponent(student.id)}">Mở hồ sơ trên SSM</a>`,
          })
        }

        const outcome = payload.decision === "DAT" ? "DAT" : "CHUA_DAT"
        const legacyGdcs = outcome === "DAT" ? "DAT" : "KHONG_DAT"
        const admissionResult = outcome === "DAT" ? "Đạt" : "Chưa đạt"

        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolInputAssessmentStudent"
           SET "workflowStatus" = 'DA_DUYET',
               "finalApprovedOutcome" = ?,
               "gdcsApprovalStatus" = ?,
               "gdcsApprovalComment" = ?,
               "gdcsApprovalUser" = ?,
               "gdcsApprovalDate" = ?,
               "admissionResult" = ?,
               "updatedAt" = ?
           WHERE "id" = ?`,
          outcome,
          legacyGdcs,
          comment || `Phê duyệt 1 chạm qua Email (${approverLabel})`,
          approverLabel,
          nowIso,
          admissionResult,
          nowIso,
          student.id
        )

        if (payload.roundId) {
          await prisma.$executeRawUnsafe(
            `UPDATE "PreschoolAssessmentRound"
             SET "gdcsDecision" = ?,
                 "gdcsComment" = ?,
                 "gdcsUserName" = ?,
                 "gdcsApprovedAt" = ?,
                 "status" = 'COMPLETED',
                 "updatedAt" = ?
             WHERE "id" = ?`,
            outcome,
            comment || null,
            approverLabel,
            nowIso,
            nowIso,
            payload.roundId
          )
        }

        await appendPreschoolAuditLog({
          studentId: student.id,
          roundId: payload.roundId || null,
          action: "APPROVE_B10",
          fromStatus: student.workflowStatus || "CHO_DUYET",
          toStatus: "DA_DUYET",
          actorName: approverLabel,
          actorRole: "GDCS",
          source: "EMAIL_QUICK_APPROVE",
          detail: { outcome, comment: comment || null, approverEmail: payload.approverEmail },
        })

        // Tự động gửi email thông báo kết quả GĐCS duyệt đến Tư vấn, Giáo vụ, BGH / Nhóm trưởng cơ sở
        notifyPreschoolGdcsResultToStakeholders({
          student,
          outcome,
          admissionResult,
          approverName: approverLabel,
          comment,
          baseUrl: req.nextUrl.origin,
        }).catch(() => {})

        // Best-effort sync with Entrance Operations Dashboard
        try {
          if (student.periodId) {
            await executeEntranceWorkflowAction({
              action: "CONFIRM",
              targetScope: student.batchId ? "BATCH" : "STUDENT",
              periodId: student.periodId,
              batchId: student.batchId || null,
              studentId: student.id,
              isPreschool: true,
              stageNumber: 6,
              status: "COMPLETED",
              note: `Phê duyệt 1 chạm qua Email cho bé ${student.fullName}: ${admissionResult}`,
              actor: { id: "email-quick-approve", fullName: approverLabel, role: "GDCS", isSuperAdmin: false },
            })
          }
        } catch {
          // Non-blocking sync
        }

        if (wantsJson) {
          return NextResponse.json({
            success: true,
            studentId: student.id,
            workflowStatus: "DA_DUYET",
            finalApprovedOutcome: outcome,
            admissionResult,
          })
        }

        const nextStepText =
          outcome === "DAT"
            ? "Bộ phận Giáo vụ / Tư vấn đã có thể xuất Thư chúc mừng (BM.KTĐBCL.17) và trả kết quả cho phụ huynh."
            : "Bộ phận Tư vấn / Giáo vụ sẽ ghi nhận nội dung trao đổi với phụ huynh trước khi xuất Thư cảm ơn (BM.KTĐBCL.04)."

        return renderHtmlPage({
          title: `Đã phê duyệt: ${admissionResult}`,
          subtitle: "Trạng thái hồ sơ trên SSM đã được tự động cập nhật sang Đã duyệt",
          tone: outcome === "DAT" ? "emerald" : "rose",
          bodyHtml: `
            <div class="info-box">
              <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName}</span></div>
              <div class="row"><span class="label">Kết quả phê duyệt</span><span class="val">${admissionResult}</span></div>
              <div class="row"><span class="label">Tiến độ mới</span><span class="val">Đã duyệt</span></div>
              <div class="row"><span class="label">Người duyệt</span><span class="val">${approverLabel}</span></div>
            </div>
            <p style="font-size:13px;color:#334155;">${nextStepText}</p>
            <a class="btn-outline" href="/admin/khao-sat-mam-non?studentId=${encodeURIComponent(student.id)}">Mở hồ sơ trên SSM</a>
          `,
        })
      }
    }

    // Legacy POST approval fallback
    if (!legacyStudentId || !legacyAction || !legacyToken || !verifyPreschoolApprovalToken(legacyStudentId, legacyAction, legacyEmail, legacyToken)) {
      if (wantsJson) return NextResponse.json({ error: "Invalid token" }, { status: 403 })
      return renderHtmlPage({ title: "Token không hợp lệ", tone: "rose", status: 403, bodyHtml: `<p>Xác thực thất bại.</p>` })
    }

    const student = await getWorkflowStudentRow(legacyStudentId)
    if (!student) {
      if (wantsJson) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return renderHtmlPage({ title: "Không tìm thấy hồ sơ", tone: "rose", status: 404, bodyHtml: `<p>Không tìm thấy hồ sơ.</p>` })
    }

    // Bước 1 (B6 / B9A): NT Mầm non / BGH rà soát & định tuyến qua Email (Đề xuất Đạt / Chưa đạt / Hẹn trải nghiệm B7B)
    if (
      legacyAction === "BGH_DE_XUAT_DAT" ||
      legacyAction === "BGH_DE_XUAT_CHUA_DAT" ||
      legacyAction === "BGH_HEN_TRAI_NGHIEM"
    ) {
      const emailUser = legacyEmail
        ? await (prisma as any).user.findFirst({
            where: { email: legacyEmail },
            select: { id: true, fullName: true },
          }).catch(() => null)
        : null
      const actorDisplay = emailUser?.fullName || legacyEmail || "NT Mầm non / BGH"

      if (legacyAction === "BGH_HEN_TRAI_NGHIEM") {
        if (!trialClass || !trialTeacher || !trialPeriod) {
          const msg = "Vui lòng chọn đủ Khối, Lớp trải nghiệm, Tên GV phụ trách và Thời gian hẹn mới."
          if (wantsJson) return NextResponse.json({ error: msg }, { status: 400 })
          return renderHtmlPage({
            title: "Thiếu thông tin Hẹn trải nghiệm (B7B)",
            tone: "rose",
            status: 400,
            bodyHtml: `<p>${msg}</p><a class="btn-outline" href="javascript:history.back()">Quay lại điền đầy đủ</a>`,
          })
        }
        const dateCheck = validateFollowUpBusinessDays(new Date(), trialPeriod, 2)
        if (!dateCheck.valid) {
          const msg = dateCheck.message || "Thời gian hẹn trải nghiệm (B7B) phải tối thiểu sau 2 ngày làm việc."
          if (wantsJson) return NextResponse.json({ error: msg }, { status: 400 })
          return renderHtmlPage({
            title: "Thời gian hẹn chưa hợp lệ",
            tone: "amber",
            status: 400,
            bodyHtml: `<p>${msg}</p><a class="btn-outline" href="javascript:history.back()">Quay lại chọn lại thời gian</a>`,
          })
        }

        const formattedPeriod = new Date(trialPeriod).toLocaleString("vi-VN")
        const combinedComment = parentNote || comment || `Hẹn trải nghiệm B7B qua Email (${actorDisplay})`

        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolInputAssessmentStudent"
           SET "bghApprovalStatus" = 'HEN_TRAI_NGHIEM',
               "bghApprovalComment" = ?,
               "bghApprovalUser" = ?,
               "bghApprovalDate" = ?,
               "probationaryClass" = ?,
               "probationaryTeacher" = ?,
               "probationaryPeriod" = ?,
               "probationaryComment" = ?,
               "workflowStatus" = 'CHO_TRAI_NGHIEM',
               "appointmentAt" = ?,
               "updatedAt" = ?
           WHERE "id" = ?`,
          comment || combinedComment,
          actorDisplay,
          nowIso,
          trialClass,
          trialTeacher,
          formattedPeriod,
          combinedComment,
          new Date(trialPeriod).toISOString(),
          nowIso,
          student.id
        )

        const existingRounds = await getStudentRounds(student.id)
        const latestRound = existingRounds[existingRounds.length - 1]
        if (latestRound?.id) {
          await prisma.$executeRawUnsafe(
            `UPDATE "PreschoolAssessmentRound"
             SET "reviewDecision" = 'HEN_TRAI_NGHIEM_BO_SUNG',
                 "reviewComment" = ?,
                 "reviewedByName" = ?,
                 "reviewedAt" = ?,
                 "status" = 'COMPLETED',
                 "updatedAt" = ?
             WHERE "id" = ?`,
            comment || combinedComment,
            actorDisplay,
            nowIso,
            nowIso,
            latestRound.id
          )
        }

        const nextRoundNum = (latestRound?.roundNumber || 1) + 1
        const newRoundId = generateId("ps_rnd")
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PreschoolAssessmentRound"
            ("id", "studentId", "roundNumber", "roundType", "status", "scheduledAt", "campusName",
             "assignedTeacherName", "suggestedFormCode", "formCode", "formVersion", "createdAt", "updatedAt")
           VALUES (?, ?, ?, 'TRAI_NGHIEM_BO_SUNG', 'SCHEDULED', ?, ?, ?, 'BM.KTĐBCL.09', 'BM.KTĐBCL.09', ?, ?, ?)`,
          newRoundId,
          student.id,
          nextRoundNum,
          new Date(trialPeriod).toISOString(),
          student.admissionCampus || student.registeredCampus || null,
          trialTeacher,
          PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].version,
          nowIso,
          nowIso
        )

        await appendPreschoolAuditLog({
          studentId: student.id,
          roundId: newRoundId,
          action: "REVIEW_B6_B9A",
          fromStatus: student.workflowStatus || "DANG_DANH_GIA",
          toStatus: "CHO_TRAI_NGHIEM",
          actorName: actorDisplay,
          actorRole: "BGH_MN",
          source: "EMAIL_QUICK_APPROVE",
          detail: {
            reviewDecision: "HEN_TRAI_NGHIEM_BO_SUNG",
            trialGrade,
            trialClass,
            trialTeacher,
            scheduledAt: new Date(trialPeriod).toISOString(),
            parentNote: parentNote || null,
            comment: comment || null,
            roundNumber: nextRoundNum,
          },
        })

        // Tự động gửi email thông báo kết quả BGH/NT MN duyệt đến Tư vấn, Giáo vụ, Khảo thí tổng hợp & email BGH duyệt
        notifyPreschoolBghReviewResultToStakeholders({
          student,
          decision: "HEN_TRAI_NGHIEM_BO_SUNG",
          approverName: actorDisplay,
          approverEmail: legacyEmail || null,
          comment: combinedComment,
          trialInfo: {
            grade: trialGrade,
            className: trialClass,
            teacherName: trialTeacher,
            period: formattedPeriod,
          },
          baseUrl: req.nextUrl.origin,
        }).catch(() => {})

        if (wantsJson) {
          return NextResponse.json({
            success: true,
            workflowStatus: "CHO_TRAI_NGHIEM",
            roundId: newRoundId,
            roundNumber: nextRoundNum,
          })
        }

        return renderHtmlPage({
          title: "Đã tạo lịch Hẹn trải nghiệm (B7B)",
          subtitle: `Đã tạo Lần khảo sát mới (Lần ${nextRoundNum}) và bảo toàn toàn bộ lịch sử trước đó`,
          tone: "emerald",
          bodyHtml: `
            <div class="info-box">
              <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
              <div class="row"><span class="label">Khối / Lớp trải nghiệm</span><span class="val">${trialGrade ? `${trialGrade} · ` : ""}${trialClass}</span></div>
              <div class="row"><span class="label">GV phụ trách</span><span class="val">${trialTeacher}</span></div>
              <div class="row"><span class="label">Thời gian hẹn mới</span><span class="val">${formattedPeriod}</span></div>
              ${parentNote ? `<div class="row"><span class="label">Ghi chú phụ huynh</span><span class="val">${parentNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></div>` : ""}
              <div class="row"><span class="label">Người định tuyến</span><span class="val">${actorDisplay}</span></div>
            </div>
            <a class="btn-outline" href="/admin/xet-duyet-ket-qua?tab=preschool">Mở bảng Xét duyệt trên SSM</a>
          `,
        })
      }

      // BGH_DE_XUAT_DAT hoặc BGH_DE_XUAT_CHUA_DAT → Trình thẳng GĐCS (B10)
      const bghDecision = legacyAction === "BGH_DE_XUAT_DAT" ? "DE_XUAT_DAT" : "DE_XUAT_CHUA_DAT"
      const bghLabel = bghDecision === "DE_XUAT_DAT" ? "Đề xuất Đạt → Trình B10" : "Đề xuất Chưa đạt → B10"

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "bghApprovalStatus" = ?,
             "bghApprovalComment" = ?,
             "bghApprovalUser" = ?,
             "bghApprovalDate" = ?,
             "workflowStatus" = 'CHO_DUYET',
             "updatedAt" = ?
         WHERE "id" = ?`,
        bghDecision,
        comment || `Định tuyến 1 chạm qua Email (${actorDisplay})`,
        actorDisplay,
        nowIso,
        nowIso,
        student.id
      )

      const existingRounds = await getStudentRounds(student.id)
      const latestRound = existingRounds[existingRounds.length - 1]
      if (latestRound?.id) {
        await prisma.$executeRawUnsafe(
          `UPDATE "PreschoolAssessmentRound"
           SET "reviewDecision" = ?,
               "reviewComment" = ?,
               "reviewedByName" = ?,
               "reviewedAt" = ?,
               "updatedAt" = ?
           WHERE "id" = ?`,
          bghDecision,
          comment || null,
          actorDisplay,
          nowIso,
          nowIso,
          latestRound.id
        )
      }

      await appendPreschoolAuditLog({
        studentId: student.id,
        roundId: latestRound?.id || null,
        action: "REVIEW_B6_B9A",
        fromStatus: student.workflowStatus || "DANG_DANH_GIA",
        toStatus: "CHO_DUYET",
        actorName: actorDisplay,
        actorRole: "BGH_MN",
        source: "EMAIL_QUICK_APPROVE",
        detail: { reviewDecision: bghDecision, comment: comment || null },
      })

      // Tự động gửi email thông báo kết quả BGH/NT MN duyệt đến Tư vấn, Giáo vụ, Khảo thí tổng hợp & email BGH duyệt
      notifyPreschoolBghReviewResultToStakeholders({
        student,
        decision: bghDecision,
        approverName: actorDisplay,
        approverEmail: legacyEmail || null,
        comment: comment || null,
        baseUrl: req.nextUrl.origin,
      }).catch(() => {})

      if (wantsJson) {
        return NextResponse.json({ success: true, workflowStatus: "CHO_DUYET", bghApprovalStatus: bghDecision })
      }

      return renderHtmlPage({
        title: `Đã xác nhận: ${bghLabel}`,
        subtitle: "Hồ sơ đã tự động chuyển sang Bước 2 (Chờ GĐCS phê duyệt B10)",
        tone: bghDecision === "DE_XUAT_DAT" ? "emerald" : "rose",
        bodyHtml: `
          <div class="info-box">
            <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName} (${student.studentCode})</span></div>
            <div class="row"><span class="label">Kết quả Bước 1 (B6/B9A)</span><span class="val">${bghLabel}</span></div>
            <div class="row"><span class="label">Người định tuyến</span><span class="val">${actorDisplay}</span></div>
          </div>
          <a class="btn-outline" href="/admin/xet-duyet-ket-qua?tab=preschool">Mở bảng Xét duyệt trên SSM</a>
        `,
      })
    }

    const gdcsStatus =
      legacyAction === "APPROVE_MIEN_HT"
        ? "DAT_MIEN_HOC_THU"
        : legacyAction === "APPROVE_HOC_THU"
          ? "DAT_HOC_THU"
          : "KHONG_DAT"
    const finalOutcome = gdcsStatus === "KHONG_DAT" ? "CHUA_DAT" : "DAT"
    const admissionResult =
      resolvePreschoolAdmissionResult({ bghStatus: student.bghApprovalStatus, gdcsStatus }) ||
      (finalOutcome === "DAT" ? "Đạt" : "Chưa đạt")

    await prisma.$executeRawUnsafe(
      `UPDATE "PreschoolInputAssessmentStudent"
       SET "workflowStatus" = 'DA_DUYET',
           "finalApprovedOutcome" = ?,
           "gdcsApprovalStatus" = ?,
           "gdcsApprovalComment" = ?,
           "gdcsApprovalUser" = ?,
           "gdcsApprovalDate" = ?,
           "admissionResult" = ?,
           "updatedAt" = ?
       WHERE "id" = ?`,
      finalOutcome,
      gdcsStatus,
      comment || `Phê duyệt qua Email (${legacyEmail})`,
      legacyEmail || "GĐCS",
      nowIso,
      admissionResult,
      nowIso,
      student.id
    )

    await appendPreschoolAuditLog({
      studentId: student.id,
      action: "APPROVE_B10",
      fromStatus: student.workflowStatus || "CHO_DUYET",
      toStatus: "DA_DUYET",
      actorName: legacyEmail || "GĐCS",
      actorRole: "GDCS",
      source: "EMAIL_QUICK_APPROVE",
      detail: { legacyAction, gdcsStatus, admissionResult, comment: comment || null },
    })

    // Tự động gửi email thông báo kết quả GĐCS duyệt đến Tư vấn, Giáo vụ, BGH / Nhóm trưởng cơ sở
    notifyPreschoolGdcsResultToStakeholders({
      student,
      outcome: finalOutcome,
      admissionResult,
      approverName: legacyEmail || "Giám đốc Cơ sở",
      comment,
      baseUrl: req.nextUrl.origin,
    }).catch(() => {})

    if (wantsJson) {
      return NextResponse.json({ success: true, workflowStatus: "DA_DUYET", admissionResult })
    }

    return renderHtmlPage({
      title: `Đã phê duyệt: ${admissionResult}`,
      tone: finalOutcome === "DAT" ? "emerald" : "rose",
      bodyHtml: `<p>Trạng thái hồ sơ của bé <strong>${student.fullName}</strong> đã tự động cập nhật sang <strong>Đã duyệt</strong>.</p><a class="btn-outline" href="/admin/khao-sat-mam-non?studentId=${encodeURIComponent(student.id)}">Mở hồ sơ trên SSM</a>`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 })
  }
}
