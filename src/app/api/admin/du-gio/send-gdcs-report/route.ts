// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleCode = (session.user as any)?.role || "";
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "KT_DBCL",
      "GDCS",
      "GĐCS",
      "GD_CS",
      "GĐ_CS",
      "GIAO_VU_CS",
      "SUPER_ADMIN",
      "BGH"
    ].includes(roleCode);

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true, position: true, departmentAssignments: true }
    }).catch(() => null);

    const isTTCM =
      currentTeacher?.position === "TTCM" ||
      (currentTeacher?.departmentAssignments || []).some(
        (da: any) => da.position === "TTCM"
      );

    if (!isAdmin && !isTTCM) {
      return NextResponse.json(
        { error: "Bạn không có quyền gửi báo cáo tiến độ Giám đốc Cơ sở" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      mode = "single", // "single" | "batch" | "summary"
      gdcs,
      gdcsList,
      overallStats,
      toEmail,
      customCc,
      month = "all",
      notes = ""
    } = body;

    const monthLabel = month === "all" ? "Toàn bộ năm học" : `Tháng ${month.split("-")[1]}/${month.split("-")[0]}`;

    // Helper: Parse CC list
    const parseCc = (rawCc?: string): string[] => {
      if (!rawCc) return [];
      return rawCc
        .split(",")
        .map(e => e.trim())
        .filter(e => e.includes("@"));
    };

    // Helper: Build single GĐCS Email HTML
    const buildSingleGdcsHtml = (item: any, customNote?: string) => {
      const progressColor = item.progressPct >= 100 ? "#059669" : (item.progressPct > 0 ? "#0284C7" : "#DC2626");
      const detailsRows = (item.details || []).map((d: any, idx: number) => {
        const isCross = d.isCross;
        const isSurprise = d.isSurprise;
        const scoreText = d.evalScore !== null && d.evalScore !== undefined ? `${d.evalScore}/20đ` : "—";
        const ratingBadge = d.evalRating ? `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:bold;background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;">${d.evalRating}</span>` : `<span style="color:#94A3B8;">—</span>`;
        const originBadge = isCross 
          ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;">Dự chéo CS</span>`
          : `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;">Nội bộ CS</span>`;
        const surpriseBadge = isSurprise
          ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;margin-left:4px;">Đột xuất</span>`
          : "";

        return `
          <tr style="border-bottom: 1px solid #E2E8F0; font-size: 12px;">
            <td style="padding: 10px; text-align: center; color: #64748B;">${idx + 1}</td>
            <td style="padding: 10px;">
              <strong>${d.date || "—"}</strong><br/>
              <span style="color: #64748B; font-size: 11px;">Tiết ${d.period || "—"}</span>
            </td>
            <td style="padding: 10px;">
              <strong style="color: #0F172A;">${d.hostTeacherName || "—"}</strong><br/>
              <span style="color: #64748B; font-size: 11px; font-family: monospace;">${d.hostTeacherCode || ""}</span>
            </td>
            <td style="padding: 10px;">
              <span style="font-weight: 600; color: #1E293B;">${d.subjectName || "—"}</span><br/>
              <span style="color: #64748B; font-size: 11px;">Lớp ${d.className || "—"}</span>
            </td>
            <td style="padding: 10px; text-align: center; color: #334155; font-weight: 500;">
              ${d.campusName || "—"}
            </td>
            <td style="padding: 10px; text-align: center;">
              ${originBadge} ${surpriseBadge}
            </td>
            <td style="padding: 10px; text-align: center;">
              <strong style="color: #0F172A;">${scoreText}</strong><br/>
              ${ratingBadge}
            </td>
            <td style="padding: 10px; text-align: center;">
              ${d.evalStatus === "FINAL" || d.evalStatus === "COMPLETED" 
                ? '<span style="color:#059669;font-weight:bold;font-size:11px;">✓ Đã nộp</span>' 
                : '<span style="color:#D97706;font-weight:bold;font-size:11px;">⏳ Chờ nộp</span>'}
            </td>
          </tr>
        `;
      }).join("");

      return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Báo Cáo Tiến Độ Dự Giờ & Dạy - Giám Đốc Cơ Sở</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
        <div style="max-width: 820px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #003B3A 0%, #005A56 100%); padding: 28px 32px; color: #FFFFFF;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #48BFE3; margin-bottom: 6px;">
              SKY-LINE EDUCATION SYSTEM • BAN ĐIỀU HÀNH CHUYÊN MÔN
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
              BÁO CÁO TIẾN ĐỘ DỰ GIỜ & DẠY - GIÁM ĐỐC CƠ SỞ
            </h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #CCFBF1;">
              Kỳ báo cáo: <strong>${monthLabel}</strong> &bull; Đơn vị: <strong>${item.campus || "Cơ sở"}</strong>
            </p>
          </div>

          <!-- Body Content -->
          <div style="padding: 28px 32px;">
            
            <!-- Greeting & Info Card -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 22px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td>
                    <div style="font-size: 15px; font-weight: bold; color: #0F172A;">
                      Kính gửi: Thầy/Cô ${item.name}
                    </div>
                    <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
                      Chức vụ: <strong style="color: #003B3A;">${item.position || "Giám đốc Cơ sở"}</strong> &bull; Mã NV: <strong>${item.teacherCode || "—"}</strong> &bull; Cơ sở: <strong>${item.campus || "—"}</strong>
                    </div>
                  </td>
                  <td style="text-align: right; vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; background: ${item.progressPct >= 100 ? '#ECFDF5' : '#FFFBEB'}; color: ${item.progressPct >= 100 ? '#059669' : '#B45309'}; border: 1px solid ${item.progressPct >= 100 ? '#A7F3D0' : '#FDE68A'};">
                      ${item.statusLabel || (item.progressPct >= 100 ? "Đạt chỉ tiêu" : "Chưa đạt chỉ tiêu")}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            ${customNote ? `
            <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 12.5px; color: #92400E; line-height: 1.5;">
              <strong>Ghi chú / Nhắc nhở từ Ban ĐHCM:</strong><br/>
              ${customNote.replace(/\n/g, '<br/>')}
            </div>
            ` : ""}

            <!-- 4 KPI Stat Boxes -->
            <div style="margin-bottom: 28px;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-left: -10px; margin-right: -10px;">
                <tr>
                  <!-- Card 1: Tiết dự giờ -->
                  <td style="width: 25%; background: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0D9488;">Tiết đã dự</div>
                    <div style="font-size: 22px; font-weight: 900; color: #003B3A; margin: 4px 0;">
                      ${item.totalAttended} <span style="font-size: 12px; font-weight: normal; color: #64748B;">/ ${item.reqObserved} tiết</span>
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: ${progressColor};">
                      Đạt ${item.progressPct}% chỉ tiêu
                    </div>
                  </td>

                  <!-- Card 2: Tiết dạy -->
                  <td style="width: 25%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B;">Tiết đã dạy</div>
                    <div style="font-size: 22px; font-weight: 900; color: #0F172A; margin: 4px 0;">
                      ${item.totalTaught || 0} <span style="font-size: 12px; font-weight: normal; color: #64748B;">tiết</span>
                    </div>
                    <div style="font-size: 11px; color: #64748B;">
                      ${item.reqTaught ? `Chỉ tiêu: ${item.reqTaught} tiết` : "Hoàn thành"}
                    </div>
                  </td>

                  <!-- Card 3: Phân bổ dự chéo -->
                  <td style="width: 25%; background: #EEF2FF; border: 1px solid #E0E7FF; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4338CA;">Dự chéo cơ sở</div>
                    <div style="font-size: 22px; font-weight: 900; color: #3730A3; margin: 4px 0;">
                      ${item.crossCount || 0} <span style="font-size: 12px; font-weight: normal; color: #64748B;">/ ${item.totalAttended} tiết</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #4338CA;">
                      Nội bộ: ${item.internalCount || 0} &bull; Chéo: ${item.totalAttended > 0 ? Math.round(((item.crossCount || 0) / item.totalAttended) * 100) : 0}%
                    </div>
                  </td>

                  <!-- Card 4: Phiếu đánh giá -->
                  <td style="width: 25%; background: ${item.pendingCount > 0 ? '#FFFBEB' : '#F0FDF4'}; border: 1px solid ${item.pendingCount > 0 ? '#FDE68A' : '#BBF7D0'}; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${item.pendingCount > 0 ? '#B45309' : '#15803D'};">Phiếu đánh giá</div>
                    <div style="font-size: 22px; font-weight: 900; color: ${item.pendingCount > 0 ? '#B45309' : '#15803D'}; margin: 4px 0;">
                      ${item.evaluatedCount || 0} <span style="font-size: 12px; font-weight: normal; color: #64748B;">đã nộp</span>
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: ${item.pendingCount > 0 ? '#DC2626' : '#15803D'};">
                      ${item.pendingCount > 0 ? `⚠️ Còn ${item.pendingCount} phiếu chờ chấm` : (item.avgScore ? `ĐTB: ${item.avgScore}/20đ` : "100% hoàn tất")}
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Detailed Observation Table -->
            <div style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0F172A; letter-spacing: 0.5px;">
                  Bảng chi tiết các tiết dự giờ (${(item.details || []).length} tiết)
                </h3>
              </div>

              ${(item.details || []).length === 0 ? `
                <div style="padding: 24px; text-align: center; background: #F8FAFC; border-radius: 10px; border: 1px dashed #CBD5E1; color: #94A3B8; font-size: 12px;">
                  Chưa ghi nhận tiết dự giờ nào trong kỳ báo cáo này.
                </div>
              ` : `
                <div style="overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 12px;">
                  <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                      <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">
                        <th style="padding: 10px; text-align: center; width: 36px;">STT</th>
                        <th style="padding: 10px; width: 90px;">Ngày & Tiết</th>
                        <th style="padding: 10px;">Giáo viên được dự</th>
                        <th style="padding: 10px;">Môn & Lớp</th>
                        <th style="padding: 10px; text-align: center;">Cơ sở</th>
                        <th style="padding: 10px; text-align: center;">Hình thức</th>
                        <th style="padding: 10px; text-align: center;">Điểm / Xếp loại</th>
                        <th style="padding: 10px; text-align: center;">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${detailsRows}
                    </tbody>
                  </table>
                </div>
              `}
            </div>

            <!-- Notes & Guidelines -->
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 18px; font-size: 11.5px; color: #166534; line-height: 1.5;">
              <strong>Quy chế dự giờ cấp Giám đốc Cơ sở:</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                <li>Định mức dự giờ tối thiểu đối với GĐCS là <strong>4 tiết/tháng</strong> (hoặc tương đương 36 tiết/năm).</li>
                <li>Khuyến khích kết hợp giữa dự giờ nội bộ tại cơ sở và <strong>dự giờ chéo liên cơ sở</strong> để tăng cường học hỏi, chuẩn hóa chất lượng chuyên môn.</li>
                <li>Phiếu dự giờ cần được hoàn thiện đánh giá và nộp trên hệ thống trong vòng <strong>48 giờ</strong> sau khi tiết dạy kết thúc.</li>
              </ul>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 11.5px; color: #64748B; text-align: center; line-height: 1.6;">
            Email này được gửi tự động từ <strong>Hệ thống Quản lý Giáo dục Sky-Line (Sky-line SMS)</strong>.<br/>
            Mọi thắc mắc hoặc cần hỗ trợ về dữ liệu dự giờ, vui lòng liên hệ Ban Đào tạo & Khảo thí ĐBCL qua email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #003B3A; font-weight: bold; text-decoration: none;">bankhaothi@skylineschool.edu.vn</a>.
          </div>

        </div>
      </body>
      </html>
      `;
    };

    // Helper: Build Summary Email of All 5 GĐCS to Leadership
    const buildSummaryHtml = (list: any[], overall: any, customNote?: string) => {
      const rows = list.map((g: any, idx: number) => {
        const progressColor = g.progressPct >= 100 ? "#059669" : (g.progressPct > 0 ? "#0284C7" : "#DC2626");
        return `
          <tr style="border-bottom: 1px solid #E2E8F0; font-size: 12px;">
            <td style="padding: 10px; text-align: center; color: #64748B;">${idx + 1}</td>
            <td style="padding: 10px;">
              <strong style="color: #0F172A;">${g.name}</strong><br/>
              <span style="color: #64748B; font-size: 11px;">${g.teacherCode || ""} &bull; ${g.email || ""}</span>
            </td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #003B3A;">
              ${g.campus}
            </td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #334155;">
              ${g.reqObserved} tiết
            </td>
            <td style="padding: 10px; text-align: center;">
              <strong style="font-size: 13px; color: #003B3A;">${g.totalAttended} tiết</strong><br/>
              <span style="font-size: 10.5px; color: #64748B;">NB: ${g.internalCount} | Chéo: ${g.crossCount}</span>
            </td>
            <td style="padding: 10px; text-align: center;">
              <strong style="color: #059669;">${g.evaluatedCount} tiết</strong><br/>
              <span style="font-size: 10.5px; color: #64748B;">${g.avgScore ? `ĐTB: ${g.avgScore}đ` : "Đạt"}</span>
            </td>
            <td style="padding: 10px; text-align: center;">
              ${g.pendingCount > 0 
                ? `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:bold;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;">⚠️ ${g.pendingCount} phiếu</span>`
                : `<span style="color:#059669;font-weight:bold;font-size:11px;">✓ 0</span>`}
            </td>
            <td style="padding: 10px; text-align: center;">
              <strong style="font-size: 13px; color: ${progressColor};">${g.progressPct}%</strong>
            </td>
            <td style="padding: 10px; text-align: center;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10.5px; font-weight: bold; background: ${g.progressPct >= 100 ? '#ECFDF5' : '#FFFBEB'}; color: ${g.progressPct >= 100 ? '#059669' : '#B45309'}; border: 1px solid ${g.progressPct >= 100 ? '#A7F3D0' : '#FDE68A'};">
                ${g.statusLabel}
              </span>
            </td>
          </tr>
        `;
      }).join("");

      return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Báo Cáo Tổng Hợp Tiến Độ Dự Giờ 5 Giám Đốc Cơ Sở</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #1E293B;">
        <div style="max-width: 860px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <div style="background: linear-gradient(135deg, #003B3A 0%, #005A56 100%); padding: 28px 32px; color: #FFFFFF;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #48BFE3; margin-bottom: 6px;">
              SKY-LINE EDUCATION SYSTEM • TRUNG TÂM ĐIỀU HÀNH DỰ GIỜ
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
              BÁO CÁO TỔNG HỢP TIẾN ĐỘ DỰ GIỜ 5 GIÁM ĐỐC CƠ SỞ (GĐCS)
            </h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #CCFBF1;">
              Kỳ báo cáo: <strong>${monthLabel}</strong> &bull; Quy mô: <strong>5 Cơ sở toàn hệ thống</strong>
            </p>
          </div>

          <div style="padding: 28px 32px;">
            ${customNote ? `
            <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 12.5px; color: #92400E; line-height: 1.5;">
              <strong>Ghi chú / Chỉ đạo:</strong><br/>
              ${customNote.replace(/\n/g, '<br/>')}
            </div>
            ` : ""}

            <!-- Summary KPI -->
            <div style="margin-bottom: 28px;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-left: -10px; margin-right: -10px;">
                <tr>
                  <td style="width: 25%; background: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0D9488;">Tổng tiết đã dự</div>
                    <div style="font-size: 22px; font-weight: 900; color: #003B3A; margin: 4px 0;">
                      ${overall.totalAttended} <span style="font-size: 12px; font-weight: normal; color: #64748B;">/ ${overall.totalTarget} tiết</span>
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: ${overall.overallProgress >= 100 ? '#059669' : '#D97706'};">
                      Đạt ${overall.overallProgress}% toàn khối
                    </div>
                  </td>
                  <td style="width: 25%; background: #EEF2FF; border: 1px solid #E0E7FF; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4338CA;">Dự chéo cơ sở</div>
                    <div style="font-size: 22px; font-weight: 900; color: #3730A3; margin: 4px 0;">
                      ${overall.totalCross} <span style="font-size: 12px; font-weight: normal; color: #64748B;">/ ${overall.totalAttended} tiết</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #4338CA;">
                      Tỷ lệ chéo: ${overall.crossRate}%
                    </div>
                  </td>
                  <td style="width: 25%; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #15803D;">Đã đánh giá</div>
                    <div style="font-size: 22px; font-weight: 900; color: #166534; margin: 4px 0;">
                      ${overall.totalEvaluated} <span style="font-size: 12px; font-weight: normal; color: #64748B;">tiết</span>
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: #15803D;">
                      ${overall.avgScore ? `ĐTB: ${overall.avgScore}/20đ` : "Đạt chuẩn"}
                    </div>
                  </td>
                  <td style="width: 25%; background: ${overall.totalPending > 0 ? '#FEF2F2' : '#F0FDF4'}; border: 1px solid ${overall.totalPending > 0 ? '#FECACA' : '#BBF7D0'}; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${overall.totalPending > 0 ? '#DC2626' : '#15803D'};">Phiếu chờ hoàn tất</div>
                    <div style="font-size: 22px; font-weight: 900; color: ${overall.totalPending > 0 ? '#DC2626' : '#15803D'}; margin: 4px 0;">
                      ${overall.totalPending} <span style="font-size: 12px; font-weight: normal; color: #64748B;">phiếu</span>
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: ${overall.totalPending > 0 ? '#DC2626' : '#15803D'};">
                      ${overall.totalPending > 0 ? "Cần hoàn tất chấm" : "100% hoàn thành"}
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Table of 5 GDCS -->
            <div style="margin-bottom: 24px; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569;">
                    <th style="padding: 10px; text-align: center; width: 36px;">STT</th>
                    <th style="padding: 10px;">Giám đốc Cơ sở</th>
                    <th style="padding: 10px; text-align: center;">Cơ sở</th>
                    <th style="padding: 10px; text-align: center;">Chỉ tiêu</th>
                    <th style="padding: 10px; text-align: center;">Đã tham gia</th>
                    <th style="padding: 10px; text-align: center;">Đã đánh giá</th>
                    <th style="padding: 10px; text-align: center;">Phiếu chưa nộp</th>
                    <th style="padding: 10px; text-align: center;">Tiến độ</th>
                    <th style="padding: 10px; text-align: center;">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          </div>

          <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 11.5px; color: #64748B; text-align: center; line-height: 1.6;">
            Email này được gửi tự động từ <strong>Hệ thống Quản lý Giáo dục Sky-Line (Sky-line SMS)</strong>.
          </div>
        </div>
      </body>
      </html>
      `;
    };

    // MODE 1: SINGLE GĐCS
    if (mode === "single") {
      if (!gdcs) {
        return NextResponse.json({ error: "Thiếu dữ liệu Giám đốc Cơ sở" }, { status: 400 });
      }

      const recipient = toEmail || gdcs.email;
      if (!recipient || !recipient.includes("@")) {
        return NextResponse.json(
          { error: `Giám đốc Cơ sở "${gdcs.name}" chưa có địa chỉ email hợp lệ` },
          { status: 400 }
        );
      }

      const html = buildSingleGdcsHtml(gdcs, notes);
      const subject = `[Sky-line SMS - Dự Giờ] Báo cáo tiến độ dự giờ & dạy - GĐCS ${gdcs.name} (${gdcs.campus}) - ${monthLabel}`;

      const mailRes = await sendEmail({
        to: recipient,
        cc: parseCc(customCc),
        subject,
        html
      });

      if (!mailRes.success) {
        return NextResponse.json(
          { error: mailRes.error || "Gửi email thất bại" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã gửi email báo cáo thành công đến GĐCS ${gdcs.name} (${recipient})`
      });
    }

    // MODE 2: BATCH SEND TO ALL 5 GDCS INDIVIDUALLY
    if (mode === "batch") {
      if (!gdcsList || !Array.isArray(gdcsList) || gdcsList.length === 0) {
        return NextResponse.json({ error: "Danh sách GĐCS trống" }, { status: 400 });
      }

      const results = [];
      const errors = [];

      for (const item of gdcsList) {
        const recipient = item.email;
        if (!recipient || !recipient.includes("@")) {
          errors.push(`${item.name} (${item.campus}): Chưa có email`);
          continue;
        }

        const html = buildSingleGdcsHtml(item, notes);
        const subject = `[Sky-line SMS - Dự Giờ] Báo cáo tiến độ dự giờ & dạy - GĐCS ${item.name} (${item.campus}) - ${monthLabel}`;

        try {
          const res = await sendEmail({
            to: recipient,
            cc: parseCc(customCc),
            subject,
            html
          });

          if (res.success) {
            results.push(`${item.name} (${recipient})`);
          } else {
            errors.push(`${item.name}: ${res.error || "Lỗi gửi mail"}`);
          }
        } catch (err: any) {
          errors.push(`${item.name}: ${err.message || "Lỗi ngoại lệ"}`);
        }
      }

      return NextResponse.json({
        success: results.length > 0,
        sentCount: results.length,
        totalCount: gdcsList.length,
        results,
        errors,
        message: `Đã gửi email thành công cho ${results.length}/${gdcsList.length} Giám đốc Cơ sở.`
      });
    }

    // MODE 3: SUMMARY REPORT TO LEADERSHIP
    if (mode === "summary") {
      if (!toEmail || !toEmail.includes("@")) {
        return NextResponse.json({ error: "Địa chỉ email người nhận báo cáo tổng hợp không hợp lệ" }, { status: 400 });
      }

      const list = gdcsList || [];
      const stats = overallStats || {
        totalAttended: 0,
        totalTarget: 20,
        totalCross: 0,
        crossRate: 0,
        totalEvaluated: 0,
        totalPending: 0,
        overallProgress: 0,
        avgScore: null
      };

      const html = buildSummaryHtml(list, stats, notes);
      const subject = `[Sky-line SMS - Dự Giờ] Báo cáo tổng hợp tiến độ dự giờ 5 Giám đốc Cơ sở - ${monthLabel}`;

      const mailRes = await sendEmail({
        to: toEmail,
        cc: parseCc(customCc),
        subject,
        html
      });

      if (!mailRes.success) {
        return NextResponse.json(
          { error: mailRes.error || "Gửi email tổng hợp thất bại" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã gửi email báo cáo tổng hợp thành công đến ${toEmail}`
      });
    }

    return NextResponse.json({ error: "Chế độ gửi không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in send-gdcs-report route:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
