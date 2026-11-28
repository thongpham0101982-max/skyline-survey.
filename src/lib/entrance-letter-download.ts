import crypto from "crypto";
import fs from "fs";
import path from "path";

export type EntranceLetterDocType = "thu_chuc_mung" | "cam_ket_hoc_tap";
export type EntranceLetterLevel = "high" | "preschool";

function getSigningSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.QUICK_APPROVE_SECRET ||
    "skyline-entrance-letter-download-secret-2026"
  );
}

export function generateEntranceLetterDownloadToken(
  studentId: string,
  docType: EntranceLetterDocType,
  level: EntranceLetterLevel
): string {
  const payload = `${String(studentId).trim()}|${docType}|${level}|skyline-letter-v1`;
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("hex").slice(0, 32);
}

export function verifyEntranceLetterDownloadToken(
  studentId: string,
  docType: EntranceLetterDocType,
  level: EntranceLetterLevel,
  token: string
): boolean {
  if (!studentId || !token) return false;
  const expected = generateEntranceLetterDownloadToken(studentId, docType, level);
  const a = Buffer.from(String(token).trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildEntranceLetterDownloadUrl(params: {
  originUrl: string;
  studentId: string;
  docType: EntranceLetterDocType;
  level: EntranceLetterLevel;
}): string {
  const base = String(params.originUrl || "https://ssm.skylineschool.edu.vn").replace(/\/+$/, "");
  const sid = String(params.studentId || "").trim();
  const token = generateEntranceLetterDownloadToken(sid, params.docType, params.level);
  return `${base}/api/public/entrance-letter-download?studentId=${encodeURIComponent(sid)}&docType=${encodeURIComponent(params.docType)}&level=${encodeURIComponent(params.level)}&token=${encodeURIComponent(token)}`;
}

export function extractCommittedSubjectsListFromNote(directorNote?: string | null): string[] {
  const raw = String(directorNote || "")
    .replace(/--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---[\s\S]*$/i, "")
    .trim();
  if (!raw) return [];
  const match = raw.match(/\[?\s*(?:Môn cam kết|Mon cam ket):\s*\[?([^\]\r\n]+)\]?\s*\]?/i);
  if (!match || !match[1]) return [];
  return match[1]
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => Boolean(s) && s !== "—" && s !== "-" && s.toLowerCase() !== "không");
}

export function resolveCampusDisplayInfo(rawCampus?: string | null): {
  actualCampusName: string;
  schoolNameFull: string;
  campusCode: string;
} {
  const clean = String(rawCampus || "").toUpperCase();
  let actualCampusName = String(rawCampus || "").trim() || "Hệ thống Giáo dục Sky-Line";
  let campusCode = "CS1";

  if (clean.includes("CS1") || clean.includes("RIVERSIDE")) {
    actualCampusName = "Sky-Line Riverside";
    campusCode = "CS1";
  } else if (clean.includes("CS2") || clean.includes("CENTRAL")) {
    actualCampusName = "Sky-Line Central";
    campusCode = "CS2";
  } else if (clean.includes("CS3") || clean.includes("GLOBAL")) {
    actualCampusName = "Sky-Line Global";
    campusCode = "CS3";
  } else if (clean.includes("CS4") || clean.includes("HILL")) {
    actualCampusName = "Sky-Line Hill";
    campusCode = "CS4";
  } else if (clean.includes("CS5") || clean.includes("BEACH")) {
    actualCampusName = "Sky-Line Beach";
    campusCode = "CS5";
  } else if (clean.includes("CS6") || clean.includes("QUỐC TẾ") || clean.includes("INTERNATIONAL")) {
    actualCampusName = "Sky-Line International";
    campusCode = "CS6";
  }

  const schoolNameFull =
    actualCampusName === "Sky-Line Hill"
      ? "Trường TH, THCS và THPT Sky-Line Hill"
      : "Trường TH, THCS và THPT Sky-Line";

  return { actualCampusName, schoolNameFull, campusCode };
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getLogoDataUri(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buf.toString("base64")}`;
    }
  } catch {}
  return "";
}

export function sanitizeVietnameseFileNamePart(raw: string): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export interface EntranceLetterRenderInput {
  docType: EntranceLetterDocType;
  level: EntranceLetterLevel;
  fullName: string;
  studentCode?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  grade?: string | null;
  surveyFormType?: string | null;
  academicYear?: string | null;
  admissionCampus?: string | null;
  batchName?: string | null;
  committedSubjects: string[];
  directorName?: string | null;
  directorSignatureUrl?: string | null;
}

export function renderEntranceLetterA4Html(input: EntranceLetterRenderInput): string {
  const { actualCampusName, schoolNameFull } = resolveCampusDisplayInfo(input.admissionCampus);
  const logoUri = getLogoDataUri();

  const now = new Date();
  const dateLine = `Đà Nẵng, ngày ${String(now.getDate()).padStart(2, "0")} tháng ${String(now.getMonth() + 1).padStart(2, "0")} năm ${now.getFullYear()}`;

  const dobStr = input.dateOfBirth
    ? (() => {
        const d = new Date(input.dateOfBirth as any);
        return !isNaN(d.getTime())
          ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
          : String(input.dateOfBirth);
      })()
    : "—";

  const gradeText = input.grade
    ? String(input.grade).replace(/^Khối\s*/i, "").trim()
    : "—";
  const systemText = String(input.surveyFormType || (input.level === "preschool" ? "Mầm non" : "Chất lượng cao")).trim();
  const academicYearText = String(input.academicYear || `${now.getFullYear()}-${now.getFullYear() + 1}`).trim();
  const committedText = input.committedSubjects.length > 0 ? input.committedSubjects.join(", ") : "các môn cần tăng cường";
  const directorDisplayName = String(input.directorName || "Giám đốc Cơ sở").trim();
  const sigImgHtml = input.directorSignatureUrl
    ? `<img src="${escapeHtml(input.directorSignatureUrl)}" alt="Chữ ký" style="max-height: 68px; max-width: 180px; object-fit: contain; display: block; margin: 6px auto;" />`
    : `<div style="height: 58px;"></div>`;

  const isCommitment = input.docType === "cam_ket_hoc_tap";
  const isPreschool = input.level === "preschool";

  const mainTitle = isCommitment ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG";
  const subTitle = isCommitment
    ? "Về việc tăng cường kiến thức trong quá trình học tập"
    : isPreschool
    ? "Về kết quả khảo sát đầu vào Bậc Mầm non"
    : "Về kết quả phỏng vấn định hướng và khảo sát đầu vào";

  let bodyHtml = "";

  if (!isCommitment && !isPreschool) {
    // THƯ CHÚC MỪNG K-12
    bodyHtml = `
      <div class="info-box">
        <div class="info-grid">
          <div><span class="lbl">Học sinh:</span> <strong>${escapeHtml(input.fullName)}</strong></div>
          <div><span class="lbl">Mã HS:</span> <strong style="font-family: Consolas, monospace;">${escapeHtml(input.studentCode || "—")}</strong></div>
          <div><span class="lbl">Ngày sinh:</span> <strong>${escapeHtml(dobStr)}</strong></div>
          <div><span class="lbl">Khối / Hệ:</span> <strong>Lớp ${escapeHtml(gradeText)} – Hệ ${escapeHtml(systemText)}</strong></div>
          <div style="grid-column: span 2;"><span class="lbl">Cơ sở tiếp nhận:</span> <strong>${escapeHtml(actualCampusName)}</strong> &nbsp;&bull;&nbsp; <span class="lbl">Năm học:</span> <strong>${escapeHtml(academicYearText)}</strong></div>
        </div>
      </div>

      <p>Chúc mừng em <strong>${escapeHtml(input.fullName)}</strong> đã hoàn thành quá trình <strong>phỏng vấn định hướng và khảo sát đầu vào</strong> với kết quả tốt đẹp, đánh dấu bước khởi đầu ý nghĩa trên hành trình học tập và phát triển tại Sky-Line.</p>

      <p>Thông qua quá trình phỏng vấn định hướng và trao đổi với phụ huynh, Nhà trường ghi nhận những sở thích, thế mạnh, khả năng học tập của em cùng những chia sẻ và kỳ vọng từ gia đình. Đây là cơ sở để Nhà trường đồng hành, hỗ trợ em phát huy năng lực và phát triển bản thân trong môi trường học tập tại Sky-Line.</p>

      <p>Sky-Line tin rằng mỗi học sinh đều có những tiềm năng và giá trị riêng. Với sự nỗ lực của bản thân cùng sự đồng hành của gia đình và thầy cô, em sẽ có nhiều cơ hội khám phá, trưởng thành và tự tin chinh phục những mục tiêu phía trước.</p>

      <p>Nhà trường vui mừng chào đón em đến với <strong>lớp ${escapeHtml(gradeText)} - hệ ${escapeHtml(systemText)},</strong> năm học <strong>${escapeHtml(academicYearText)},</strong> tại <strong>${escapeHtml(actualCampusName)}</strong> – nơi mỗi học sinh được tôn trọng sự khác biệt, khuyến khích phát huy thế mạnh và phát triển toàn diện.</p>

      <p>Chúc em luôn tự tin, giữ vững niềm vui học tập và có những trải nghiệm thật ý nghĩa tại Sky-Line!</p>

      <p>Để hoàn tất thủ tục nhập học chính thức, kính mời Quý Phụ huynh phối hợp với bộ phận Tuyển sinh thực hiện các bước tiếp theo theo hướng dẫn của Nhà trường.</p>

      <p style="margin-top: 12px;">Trân trọng,</p>
    `;
  } else if (!isCommitment && isPreschool) {
    // THƯ CHÚC MỪNG MẦM NON
    bodyHtml = `
      <div class="info-box">
        <div class="info-grid">
          <div><span class="lbl">Học sinh:</span> <strong>${escapeHtml(input.fullName)}</strong></div>
          <div><span class="lbl">Mã HS:</span> <strong style="font-family: Consolas, monospace;">${escapeHtml(input.studentCode || "—")}</strong></div>
          <div><span class="lbl">Ngày sinh:</span> <strong>${escapeHtml(dobStr)}</strong></div>
          <div><span class="lbl">Lớp / Hệ:</span> <strong>${escapeHtml(gradeText)} – ${escapeHtml(systemText)}</strong></div>
          <div style="grid-column: span 2;"><span class="lbl">Cơ sở tiếp nhận:</span> <strong>${escapeHtml(actualCampusName)}</strong> &nbsp;&bull;&nbsp; <span class="lbl">Năm học:</span> <strong>${escapeHtml(academicYearText)}</strong></div>
        </div>
      </div>

      <p>Chúc mừng con <strong>${escapeHtml(input.fullName)}</strong> đã vượt qua kỳ khảo sát đầu vào lớp <strong>${escapeHtml(gradeText)}</strong> hệ <strong>${escapeHtml(systemText)}</strong> năm học <strong>${escapeHtml(academicYearText)}</strong>. Con đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường Mầm non Sky-Line (Cơ sở <strong>${escapeHtml(actualCampusName)}</strong>) – một cột mốc quan trọng trong hành trình phát triển của con.</p>

      <p>Thầy cô tại Sky-Line vui mừng chào đón con đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp con phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, con sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.</p>

      <p>Nhà trường hy vọng rằng, với sự nhanh nhẹn và đáng yêu của mình, con sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Nơi đây, con sẽ được học hỏi những điều mới lạ, được chơi đùa cùng các bạn và được các cô giáo yêu thương chăm sóc.</p>

      <p>Chúc con có những năm tháng học tập đầy ý nghĩa và trải nghiệm thú vị tại Sky-Line. Hãy luôn giữ vững niềm vui thích học hỏi và khát khao khám phá thế giới xung quanh con nhé!</p>

      <p style="margin-top: 12px;">Trân trọng,</p>
    `;
  } else if (isCommitment && !isPreschool) {
    // BẢN CAM KẾT HỌC TẬP K-12
    bodyHtml = `
      <p style="margin-bottom: 10px;"><strong>Kính gửi:</strong> Phụ huynh học sinh <strong>${escapeHtml(input.fullName)}</strong> (Ngày sinh: ${escapeHtml(dobStr)} &bull; Lớp ${escapeHtml(gradeText)} – Hệ ${escapeHtml(systemText)})</p>

      <p>Hệ thống Giáo dục Sky-Line cảm ơn Quý Phụ huynh đã tin tưởng lựa chọn Sky-Line là nơi gửi gắm con em mình và sẽ đồng hành cùng Nhà trường trong thời gian sắp tới để tạo dựng một môi trường học tập văn minh, hiện đại và thân thiện cho các em học sinh.</p>

      <p>Thông qua khảo sát đầu vào, Nhà trường đã nắm bắt ban đầu tính cách và khả năng của học sinh để xây dựng phương pháp giáo dục phù hợp. Với kết quả khảo sát năng lực đầu vào của em <strong>${escapeHtml(input.fullName)}</strong>, nhà trường đồng ý tiếp nhận em trong năm học <strong>${escapeHtml(academicYearText)}</strong> và học tập tại <strong>${escapeHtml(actualCampusName)}</strong>. Nhưng để đánh giá đúng năng lực của học sinh nên nhà trường sẽ đánh giá sau 01 năm học tập tại trường. Thời gian đến, rất mong sự hỗ trợ, đồng hành của Phụ huynh cùng sự cố gắng của học sinh giúp các em cải thiện kết quả học tập.</p>

      <p>Ban Giám hiệu <strong>${escapeHtml(schoolNameFull)}</strong> mong muốn Phụ huynh cùng cam kết những điều kiện sau khi học sinh <strong>${escapeHtml(input.fullName)}</strong> theo học tại Sky-Line:</p>

      <p class="indent"><strong>1.</strong> Cùng phối hợp, đồng hành cùng Nhà trường tạo môi trường học tập tốt nhất cho học sinh trong việc giáo dục và rèn luyện của học sinh theo đúng Quy định.</p>

      <p class="indent"><strong>2.</strong> Học sinh tham gia các khóa học bổ sung kiến thức do Nhà trường tổ chức đối với các môn học có kết quả học tập chưa cao (<strong style="color: #B45309;">chú ý môn: ${escapeHtml(committedText)}</strong>) và đồng hành cùng học sinh tự rèn luyện tại nhà nhằm tăng cường, bổ sung thêm kiến thức, kỹ năng đảm bảo yêu cầu học tập các môn học tại Sky-Line.</p>

      <p>Nhà trường sẽ tiến hành đánh giá toàn diện năng lực, rèn luyện của học sinh <strong>${escapeHtml(input.fullName)}</strong> và sẽ chính thức tiếp nhận học sinh nếu đạt các yêu cầu về năng lực, rèn luyện. Kính mong Phụ huynh đồng hành và cam kết cùng nhà trường trong việc giáo dục để kết quả học tập, rèn luyện của học sinh đạt được như kỳ vọng.</p>

      <p>Trân trọng./.</p>
    `;
  } else {
    // BẢN CAM KẾT MẦM NON
    bodyHtml = `
      <p style="margin-bottom: 10px;"><strong>Kính gửi:</strong> Phụ huynh học sinh <strong>${escapeHtml(input.fullName)}</strong> (Ngày sinh: ${escapeHtml(dobStr)} &bull; Lớp ${escapeHtml(gradeText)})</p>

      <p>Hệ thống Giáo dục Sky-Line chúc mừng con <strong>${escapeHtml(input.fullName)}</strong> đã vượt qua kỳ khảo sát đầu vào lớp <strong>${escapeHtml(gradeText)}</strong> hệ <strong>${escapeHtml(systemText)}</strong> năm học <strong>${escapeHtml(academicYearText)}</strong>. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết rèn luyện này.</p>

      <p>Gia đình cam kết thực hiện đầy đủ các nội dung sau:</p>

      <p class="indent"><strong>1.</strong> Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và kỹ năng tự phục vụ cơ bản phù hợp với độ tuổi mầm non.</p>
      <p class="indent"><strong>2.</strong> Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý của con và tích cực trao đổi thông tin thường xuyên.</p>
      <p class="indent"><strong>3.</strong> Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.</p>

      <p>Bản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.</p>
    `;
  }

  const signatureBlockHtml = isCommitment
    ? `
      <div class="sig-row two-col">
        <div class="sig-col">
          <div class="sig-title">ĐẠI DIỆN GIA ĐÌNH (PHỤ HUYNH)</div>
          <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
          <div style="height: 68px;"></div>
          <div class="sig-name">................................................</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">ĐẠI DIỆN NHÀ TRƯỜNG</div>
          <div class="sig-sub">GIÁM ĐỐC CƠ SỞ</div>
          ${sigImgHtml}
          <div class="sig-name">${escapeHtml(directorDisplayName)}</div>
        </div>
      </div>
    `
    : `
      <div class="sig-row single-right">
        <div class="sig-col">
          <div class="sig-date">${escapeHtml(dateLine)}</div>
          <div class="sig-title">TM. BAN GIÁM HIỆU</div>
          <div class="sig-sub">GIÁM ĐỐC CƠ SỞ</div>
          ${sigImgHtml}
          <div class="sig-name">${escapeHtml(directorDisplayName)}</div>
        </div>
      </div>
    `;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(mainTitle)} - ${escapeHtml(input.fullName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #FFFFFF;
      color: #0F172A;
      font-family: "Times New Roman", "Segoe UI", Georgia, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 296mm;
      max-height: 296mm;
      margin: 0 auto;
      padding: 13mm 18mm 18mm 20mm;
      position: relative;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #003B3A;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      height: 44px;
      width: auto;
      object-fit: contain;
    }
    .brand-org {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11px;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .brand-campus {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: #00736E;
      margin-top: 2px;
    }
    .brand-right {
      text-align: right;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
    }
    .doc-header {
      text-align: center;
      margin-bottom: 14px;
    }
    .doc-title {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 21px;
      font-weight: 900;
      color: #003B3A;
      letter-spacing: 0.8px;
      margin: 0;
      text-transform: uppercase;
    }
    .doc-subtitle {
      font-size: 13.5px;
      font-style: italic;
      font-weight: 600;
      color: #00736E;
      margin-top: 4px;
    }
    .info-box {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-left: 4px solid #003B3A;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 14px;
    }
    .info-box .lbl {
      color: #0F766E;
      font-weight: 600;
    }
    .content {
      font-size: 13.5px;
      line-height: 1.62;
      text-align: justify;
    }
    .content p {
      margin: 0 0 9px 0;
    }
    .content p.indent {
      padding-left: 14px;
    }
    .sig-row {
      margin-top: 18px;
      display: flex;
    }
    .sig-row.two-col {
      justify-content: space-between;
      gap: 24px;
    }
    .sig-row.single-right {
      justify-content: flex-end;
    }
    .sig-col {
      width: 46%;
      text-align: center;
      font-family: "Segoe UI", Arial, sans-serif;
    }
    .sig-date {
      font-size: 11.5px;
      font-style: italic;
      color: #475569;
      margin-bottom: 4px;
    }
    .sig-title {
      font-size: 12px;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
    }
    .sig-sub {
      font-size: 11px;
      font-style: italic;
      color: #475569;
      margin-top: 2px;
    }
    .sig-name {
      font-size: 13px;
      font-weight: 800;
      color: #003B3A;
      margin-top: 4px;
    }
    .footer-bar {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1.5px solid #00A19A;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 9.5px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="page">
    <div>
      <div class="top-bar">
        <div class="brand-left">
          ${logoUri ? `<img src="${logoUri}" alt="Sky-Line" class="brand-logo" />` : ""}
          <div>
            <div class="brand-org">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
            <div class="brand-campus">${escapeHtml(schoolNameFull)} &bull; ${escapeHtml(actualCampusName)}</div>
          </div>
        </div>
        <div class="brand-right">
          <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
          <div>Độc lập – Tự do – Hạnh phúc</div>
          <div style="margin-top: 2px; font-style: italic;">${escapeHtml(dateLine)}</div>
        </div>
      </div>

      <div class="doc-header">
        <h1 class="doc-title">${escapeHtml(mainTitle)}</h1>
        <div class="doc-subtitle">${escapeHtml(subTitle)}</div>
      </div>

      <div class="content">
        ${bodyHtml}
      </div>

      ${signatureBlockHtml}
    </div>

    <div class="footer-bar">
      <div><strong>Hệ thống Giáo dục Sky-Line</strong> &bull; Văn bản xuất trực tiếp từ Hệ thống Quản lý Khảo sát (Sky-Line SSM)</div>
      <div>Website: skylineschool.edu.vn</div>
    </div>
  </div>
</body>
</html>`;
}
