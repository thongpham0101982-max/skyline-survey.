import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  verifyPreschoolApprovalToken,
  verifyWorkflowQuickApproveToken,
} from "@/lib/preschool-approval-service"
import {
  appendPreschoolAuditLog,
  ensurePreschoolWorkflowSchema,
  getWorkflowStudentRow,
} from "@/lib/preschool-workflow-db"
import { resolvePreschoolAdmissionResult } from "@/lib/preschool-workflow"
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
    const wt = searchParams.get("wt")

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

    const actionLabel =
      action === "APPROVE_MIEN_HT"
        ? "Đạt - Miễn Học Thử"
        : action === "APPROVE_HOC_THU"
          ? "Đạt - Học Thử"
          : "Chưa đạt"

    return renderHtmlPage({
      title: `Xác nhận phê duyệt: ${actionLabel}`,
      tone: action === "KHONG_DAT" ? "rose" : "emerald",
      bodyHtml: `
        <div class="info-box">
          <div class="row"><span class="label">Họ tên trẻ</span><span class="val">${student.fullName}</span></div>
          <div class="row"><span class="label">Kết quả chọn</span><span class="val">${actionLabel}</span></div>
        </div>
        <form method="POST" action="/api/admin/quick-approve/preschool">
          <input type="hidden" name="studentId" value="${studentId}" />
          <input type="hidden" name="action" value="${action}" />
          <input type="hidden" name="email" value="${email}" />
          <input type="hidden" name="token" value="${token}" />
          <textarea name="comment" placeholder="Ý kiến ghi chú (không bắt buộc)..."></textarea>
          <button type="submit" class="btn">Xác nhận phê duyệt</button>
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
    let wt = ""
    let comment = ""
    let legacyStudentId = ""
    let legacyAction = ""
    let legacyEmail = ""
    let legacyToken = ""
    const wantsJson = contentType.includes("application/json")

    if (wantsJson) {
      const body = await req.json()
      wt = body.wt || ""
      comment = String(body.comment || "").trim()
      legacyStudentId = body.studentId || ""
      legacyAction = body.action || ""
      legacyEmail = body.email || ""
      legacyToken = body.token || ""
    } else {
      const formData = await req.formData()
      wt = String(formData.get("wt") || "")
      comment = String(formData.get("comment") || "").trim()
      legacyStudentId = String(formData.get("studentId") || "")
      legacyAction = String(formData.get("action") || "")
      legacyEmail = String(formData.get("email") || "")
      legacyToken = String(formData.get("token") || "")
    }

    const nowIso = new Date().toISOString()

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
