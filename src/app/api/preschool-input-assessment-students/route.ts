function parseSmartDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const str = String(d).trim();
  if (!str) return null;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const dt = new Date(year, month, day);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

import { sendEmail } from "@/lib/mail"
import {
  getPreschoolDevelopmentSummary,
  renderPreschoolApprovalEmailHtml,
  renderPreschoolBatchApprovalEmailHtml,
  renderPreschoolGdcsResultNotificationEmailHtml,
  resolvePreschoolStakeholderRecipients,
} from "@/lib/preschool-approval-service"

function buildPreschoolLetterHtmlServer(student: any, config: any, isCommitmentFlag: boolean = false, isInvitationFlag: boolean = false) {
  const rawGrade = student?.grade || "Nát";
  const defaultCommitment = `Hệ thống Giáo dục Sky-Line chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết rèn luyện này.\nGia đình cam kết thực hiện đầy đủ các nội dung sau:\n1. Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và kỹ năng tự phục vụ cơ bản phù hợp với độ tuổi mầm non.\n2. Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý của con và tích cực trao đổi thông tin thường xuyên.\n3. Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.\nBản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;
  const defaultCongrats = `Chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Con đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường Mầm non Sky-Line (Cơ sở {{admissionCampus}}) – một cột mốc quan trọng trong hành trình phát triển của con.
Thầy cô tại Sky-Line vui mừng chào đón con đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp con phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, con sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.
Nhà trường hy vọng rằng, với sự nhanh nhẹn và đáng yêu của mình, con sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Nơi đây, con sẽ được học hỏi những điều mới lạ, được chơi đùa cùng các bạn và được các cô giáo yêu thương chăm sóc.
Chúc con có những năm tháng học tập đầy ý nghĩa và trải nghiệm thú vị tại Sky-Line. Hãy luôn giữ vững niềm vui thích học hỏi và khát khao khám phá thế giới xung quanh con nhé!`;

  const defaultInvitation = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.
Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào hệ {{surveyFormType}} năm học {{academicYear}}.
• Thời gian khảo sát: Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.
• Nội dung khảo sát: Đánh giá tư duy ngôn ngữ, tư duy logic tự nhiên và khả năng tương tác xã hội phù hợp theo độ tuổi.
Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.
Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

  const rawContent = config?.content || (isInvitationFlag ? defaultInvitation : isCommitmentFlag ? defaultCommitment : defaultCongrats);
  const renderedContent = rawContent
    .replace(/\{\{fullName\}\}/g, student?.fullName || "")
    .replace(/\{\{grade\}\}/g, rawGrade)
    .replace(/\{\{admissionCampus\}\}/g, student?.admissionCampus || "")
    .replace(/\{\{signatureName\}\}/g, student?.signatureName || config?.directorName || "Trần Thị Thanh")
    .replace(/\{\{academicYear\}\}/g, student?.academicYear || "2025-2026")
    .replace(/\{\{devProfessionalComment\}\}/g, student?.devProfessionalComment || "")
    .replace(/\{\{devPsychologyComment\}\}/g, student?.devPsychologyComment || "")
    .replace(/\{\{devImportantNote\}\}/g, student?.devImportantNote || "")
    .replace(/\{\{devAssessmentResult\}\}/g, student?.devAssessmentResult || "");

  const paragraphs = renderedContent.split("\n").filter(Boolean);
  const bodyHtml = paragraphs.map((para) => {
    const isList = /^\s*[\d•\-*]+/.test(para);
    return isList 
      ? '<p style="padding-left: 24px; font-weight: bold; color: #374151; margin: 4px 0;">' + para + '</p>' 
      : '<p style="text-indent: 10mm; margin: 0 0 14px 0; text-align: justify; text-justify: inter-word; line-height: 1.6; font-size: 13.5pt;">' + para + '</p>';
  }).join("");

  const greetingHtml = isInvitationFlag 
    ? 'Kính gửi Quý Phụ huynh và em <strong style="font-weight: bold; color: #0f172a;">' + student.fullName + '</strong>,'
    : 'Thân gửi con <strong style="font-weight: bold; color: #0f172a;">' + student.fullName + '</strong>,';

  const getImgTag = (src: string, className: string, style: string = "", alt: string = "") => {
    if (!src) return "";
    const styleAttr = style ? ' style="' + style + '"' : "";
    const altAttr = alt ? ' alt="' + alt + '"' : "";
    return '<img class="' + className + '" src="' + src + '"' + styleAttr + altAttr + ' />';
  };

  const logoHtml = config?.logo 
    ? getImgTag(config.logo, "logo-img", "max-height: 48px; object-fit: contain;", "Logo") 
    : '<svg class="logo-svg" style="height: 48px; fill: #48BFE3;" viewBox="0 0 260 50"><text x="0" y="38" font-family="Arial, sans-serif" font-weight="900" font-size="34" letter-spacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>';

  const signatureHtml = config?.signature 
    ? getImgTag(config.signature, "signature-img", "max-height: 60px; object-fit: contain; margin: 8px 0;", "Signature") 
    : '<svg style="height: 60px; max-height: 60px;" viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/></svg>';
  
  const effCampus = student.admissionCampus || "";
  const clean = effCampus.toUpperCase();
  const studentSchoolName = clean.includes("HILL") ? "TRƯỜNG MẦM NON SKY-LINE HILL" : "TRƯỜNG MẦM NON SKY-LINE";
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const formattedLetterDateStr = `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;

  const campusTitleSuffixStr = effCampus.toUpperCase().includes("CS1") || effCampus.toUpperCase().includes("RIVERSIDE") ? "RIVERSIDE"
    : effCampus.toUpperCase().includes("CS2") || effCampus.toUpperCase().includes("CENTRAL") ? "CENTRAL"
    : effCampus.toUpperCase().includes("CS3") || effCampus.toUpperCase().includes("GLOBAL") ? "GLOBAL"
    : effCampus.toUpperCase().includes("CS4") || effCampus.toUpperCase().includes("HILL") ? "HILL"
    : effCampus.toUpperCase().includes("CS5") || effCampus.toUpperCase().includes("BEACH") ? "BEACH" : "GLOBAL";

  const directorName = student?.signatureName || config?.directorName || 
    (effCampus.toUpperCase().includes("CS1") || effCampus.toUpperCase().includes("RIVERSIDE") ? "Tống Thiên Long" :
     effCampus.toUpperCase().includes("CS2") || effCampus.toUpperCase().includes("CENTRAL") ? "Lê Thị Hoàng Yến" :
     effCampus.toUpperCase().includes("CS3") || effCampus.toUpperCase().includes("GLOBAL") ? "Trần Thị Thanh" :
     effCampus.toUpperCase().includes("CS4") || effCampus.toUpperCase().includes("HILL") ? "Cao Thanh Trung" :
     effCampus.toUpperCase().includes("CS5") || effCampus.toUpperCase().includes("BEACH") ? "Đỗ Quang Trung" : "Trần Thị Thanh");

  const subTitleTextStr = `GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusTitleSuffixStr}`;

  const customFooterHtml = config?.footer ? getImgTag(config.footer, "footer-img", "width: 100%; max-height: 100px; object-fit: contain;", "Footer") :
    '<div style="width: 100%; font-family: Arial, sans-serif; box-sizing: border-box; text-align: left;">' +
      '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; width: 100%;">' +
        '<span style="font-weight: bold; color: #48BFE3; white-space: nowrap; text-transform: uppercase; font-size: 9.5pt; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>' +
        '<div style="flex-grow: 1; border-top: 1px solid rgba(0, 166, 169, 0.7); height: 0; margin-top: 2px;"></div>' +
        '<span style="font-weight: 600; color: #48BFE3; white-space: nowrap; text-transform: lowercase; font-size: 9pt;">www.skylineschool.edu.vn</span>' +
      '</div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 7.5pt; color: #555555; position: relative; width: 100%;">' +
        '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
          '<div>' +
            '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Riverside</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Lô A2.4 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>' +
          '</div>' +
          '<div>' +
            '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Central</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Số 48 Nguyễn Du, Q. Hải Châu, TP. Đà Nẵng</p>' +
          '</div>' +
        '</div>' +
        '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
          '<div>' +
            '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Global</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Lô A2 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>' +
          '</div>' +
          '<div>' +
            '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Beach</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Số 199 Trần Anh Tông, Q. Thanh Khê, TP. Đà Nẵng</p>' +
          '</div>' +
        '</div>' +
        '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
          '<div>' +
            '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Hill</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Khối Hà My Đông A, Điện Bàn, Quảng Nam</p>' +
          '</div>' +
          '<div style="display: flex; flex-direction: column; line-height: 1.35; font-weight: 600; color: #1e293b;">' +
            '<p style="margin: 0;">(+84.236) 378 7777</p>' +
            '<p style="margin: 0;">(+84.236) 356 8777</p>' +
          '</div>' +
        '</div>' +
        '<div style="position: absolute; right: -4px; top: -4px; width: 50px; height: 38px; pointer-events: none; display: flex; align-items: center; justify-content: center; color: #48BFE3;">' +
          '<svg viewBox="0 0 120 60" style="width: 100%; height: 100%; fill: currentColor;">' +
            '<path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />' +
          '</svg>' +
        '</div>' +
      '</div>' +
    '</div>';

  const bgHtml = config.background 
    ? getImgTag(config.background, "print-watermark", "", "Watermark") 
    : '<svg class="print-watermark" style="display: block; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 110mm; height: auto; opacity: 0.04; z-index: 1; pointer-events: none;" viewBox="0 0 100 100"><path fill="#48BFE3" d="M10,80 Q50,40 90,20 Q60,50 10,80 Z" /><path fill="#48BFE3" d="M30,80 Q60,55 90,35 Q65,60 30,80 Z" /></svg>';

  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
      '<meta charset="utf-8">' +
      '<title>' + (config?.title || "Tài liệu") + '</title>' +
      '<style>' +
        '@page {' +
          'size: A4 portrait;' +
          'margin: 0mm !important;' +
        '}' +
        'body {' +
          'margin: 0;' +
          'padding: 0;' +
          'background-color: #ffffff;' +
          '-webkit-print-color-adjust: exact !important;' +
          'print-color-adjust: exact !important;' +
          'color-adjust: exact !important;' +
        '}' +
        '.a4-page {' +
          'font-family: "Times New Roman", Times, serif;' +
          'width: 210mm;' +
          'height: 297mm;' +
          'padding: 20mm 20mm 35mm 20mm;' +
          'box-sizing: border-box;' +
          'position: relative;' +
          'display: flex;' +
          'flex-direction: column;' +
          'justify-content: flex-start;' +
          'background-color: #ffffff;' +
          'overflow: hidden;' +
        '}' +
        '.a4-page + .a4-page {' +
          'page-break-before: always !important;' +
          'break-before: page !important;' +
        '}' +
        '.a4-page > div:first-of-type {' +
          'flex: 1 1 auto !important;' +
          'display: flex !important;' +
          'flex-direction: column !important;' +
          'height: auto !important;' +
        '}' +
        'p {' +
          'font-size: 13.5pt;' +
          'line-height: 1.45;' +
          'color: #333333;' +
          'margin: 0 0 14px 0;' +
          'text-align: justify;' +
        '}' +
        'h2 {' +
          'text-align: center;' +
          'font-size: 22pt;' +
          'font-weight: bold;' +
          'color: #0f172a;' +
          'text-transform: uppercase;' +
          'letter-spacing: 2px;' +
          'margin: 16px 0 24px 0;' +
        '}' +
        '.footer-container {' +
          'position: absolute !important;' +
          'bottom: 8mm !important;' +
          'left: 20mm !important;' +
          'right: 20mm !important;' +
          'width: auto !important;' +
          'margin: 0 !important;' +
          'padding: 0 !important;' +
          'z-index: 10;' +
        '}' +
      '</style>' +
    '</head>' +
    '<body>' +
      '<div class="a4-page">' +
        bgHtml +
        '<div style="position: relative; z-index: 10; display: flex; flex-direction: column; flex-grow: 1;">' +
          '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1.5px solid #48BFE3; padding-bottom: 8px; margin-bottom: 24px;">' +
            '<div style="display: flex; align-items: center; justify-content: space-between;">' +
              logoHtml +
            '</div>' +
            '<div style="text-align: left; margin-top: 4px;">' +
              '<h4 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 0;">' + (studentSchoolName || "TRƯỜNG MẦM NON SKY-LINE") + '</h4>' +
            '</div>' +
          '</div>' +
          
          '<h2>' + (config?.title || "THƯ CHÚC MỪNG") + '</h2>' +
          
          '<p style="font-size: 14pt; font-style: italic; margin-bottom: 12px; color: #1e293b; text-indent: 0;">' + greetingHtml + '</p>' +
          
          '<div style="flex-grow: 1; font-family: \'Times New Roman\', Times, serif;">' +
            bodyHtml +
          '</div>' +
          
          (isCommitmentFlag ? 
            '<div style="width: 100%; display: flex; justify-content: space-between; margin-top: auto; padding-top: 20px; page-break-inside: avoid; break-inside: avoid;">' +
              '<div style="display: flex; flex-direction: column; align-items: center; text-align: center; width: 45%;">' +
                '<p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; text-indent: 0; color: #475569;">ĐẠI DIỆN GIA ĐÌNH</p>' +
                '<p style="font-size: 9pt; font-style: italic; color: #64748b; margin-top: 4px; text-indent: 0;">(Ký và ghi rõ họ tên)</p>' +
                '<div style="height: 60px; display: flex; align-items: flex-end; justify-content: center; margin: 8px 0;">' +
                  '<span style="font-size: 10pt; color: #cbd5e1; font-style: italic;">Ký tên</span>' +
                '</div>' +
              '</div>' +
              '<div style="display: flex; flex-direction: column; align-items: center; text-align: center; width: 45%;">' +
                '<p style="font-size: 12pt; font-style: italic; color: #555555; margin-bottom: 4px; text-align: center; text-indent: 0;">' + formattedLetterDateStr + '</p>' +
                '<p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; text-indent: 0; color: #0f172a;">TM. HỘI ĐỒNG TUYỂN SINH</p>' +
                '<p style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #475569; margin: 2px 0 0 0; text-align: center; text-indent: 0;">' + subTitleTextStr + '</p>' +
                '<div style="height: 60px; display: flex; align-items: center; justify-content: center; margin: 8px 0;">' +
                  signatureHtml +
                '</div>' +
                '<p style="font-size: 12pt; font-weight: bold; margin: 0; text-align: center; text-indent: 0; color: #1e293b;">' + directorName + '</p>' +
              '</div>' +
            '</div>'
          :
            '<div style="align-self: flex-end; display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 70mm; margin-top: auto; padding-top: 20px; page-break-inside: avoid; break-inside: avoid;">' +
              '<p style="font-size: 12pt; font-style: italic; color: #555555; margin-bottom: 4px; text-align: center; text-indent: 0;">' + formattedLetterDateStr + '</p>' +
              '<p style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; text-indent: 0; color: #0f172a;">TM. HỘI ĐỒNG TUYỂN SINH</p>' +
              '<p style="font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #475569; margin: 2px 0 0 0; text-align: center; text-indent: 0;">' + subTitleTextStr + '</p>' +
              '<div style="height: 60px; display: flex; align-items: center; justify-content: center; margin: 8px 0;">' +
                signatureHtml +
              '</div>' +
              '<p style="font-size: 13pt; font-weight: bold; margin: 0; text-align: center; text-indent: 0; color: #1e293b;">' + directorName + '</p>' +
            '</div>'
          ) +
        '</div>' +
        
        '<div class="footer-container">' +
          customFooterHtml +
        '</div>' +
      '</div>' +
    '</body>' +
    '</html>';
}



function getTuVanEmail(campusName: string | null | undefined): string {
  if (!campusName) return "ktdbcl@skylineschool.edu.vn";
  const campus = campusName.toUpperCase().trim();
  
  if (campus.includes("CS5") || campus.includes("CƠ SỞ 5") || campus.includes("CO SO 5") || campus.includes("GALAXY") || campus.includes("LƯ GIANG") || campus.includes("LU GIANG") || campus.includes("LIÊN CHIỂU") || campus.includes("LIEN CHIEU")) {
    return "tuyensinh.cs5@skylineschool.edu.vn";
  }
  if (campus.includes("CS4") || campus.includes("CƠ SỞ 4") || campus.includes("CO SO 4") || campus.includes("BEACH")) {
    return "tuyensinh.cs4@skylineschool.edu.vn";
  }
  if (campus.includes("CS3") || campus.includes("CƠ SỞ 3") || campus.includes("CO SO 3") || campus.includes("HILL") || campus.includes("LÂM HOÀNH") || campus.includes("LAM HOANH") || campus.includes("QUẬN 3") || campus.includes("QUAN 3")) {
    return "tuyensinh.cs3@skylineschool.edu.vn";
  }
  if (campus.includes("CS2") || campus.includes("CƠ SỞ 2") || campus.includes("CO SO 2") || campus.includes("BẠCH ĐẰNG") || campus.includes("BACH DANG")) {
    return "tuyensinh.cs2@skylineschool.edu.vn";
  }
  if (campus.includes("CS1") || campus.includes("CƠ SỞ 1") || campus.includes("CO SO 1") || campus.includes("CENTRAL") || campus.includes("RIVERSIDE")) {
    return "tuyensinh.cs1@skylineschool.edu.vn";
  }
  
  return "ktdbcl@skylineschool.edu.vn";
}

function parseMetricValue(note: string | null | undefined): number | null {
  if (!note) return null;
  const mainPart = note.includes("|") ? note.split("|")[0] : note;
  const match = mainPart.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

function getBmiClassification(bmi: number): { text: string; bg: string; color: string } {
  if (bmi < 13.5) {
    return { text: "Gầy", bg: "#fef3c7", color: "#b45309" }; // Amber
  } else if (bmi < 17.0) {
    return { text: "Bình thường", bg: "#d1fae5", color: "#065f46" }; // Emerald
  } else if (bmi < 18.5) {
    return { text: "Thừa cân", bg: "#ffedd5", color: "#c2410c" }; // Orange
  } else {
    return { text: "Béo phì", bg: "#fee2e2", color: "#991b1b" }; // Rose
  }
}
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("get_max_code") === "true") {
      const allStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        select: { studentCode: true }
      });
      const nums = allStudents.map((s: any) => {
        const match = String(s.studentCode || "").match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter((n: number) => !isNaN(n));
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
      return NextResponse.json({ nextCode: "MN" + (maxNum + 1).toString().padStart(3, "0") });
    }
    const periodId = searchParams.get("periodId");
    const batchId = searchParams.get("batchId");
    
    if (!periodId && searchParams.get("fetch_all") !== "true") {
       return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
    }
    
    const where: any = (periodId && periodId !== "all") ? { periodId } : {};
    if (batchId && batchId !== "all" && batchId !== "null") {
      where.OR = [
        { batchId: batchId },
        { batchId: null }
      ];
    } else if (batchId === "null") {
      where.batchId = null;
    }
    
        const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
      where,
      include: { period: { select: { id: true, name: true, code: true } }, batch: { select: { id: true, name: true, startDate: true, endDate: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    let enrichedStudents = students;
    try {
      const studentIds = students.map((s: any) => String(s.id)).filter(Boolean);
      if (studentIds.length > 0) {
        const stage7Map = new Map<string, { status: string; sentBy: string; sentAt: string; note: string }>();
        const chunkSize = 80;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const chunk = studentIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");
          const rows: any[] = await (prisma as any).$queryRawUnsafe(
            `SELECT "studentId", "status", "deliveryStatus", "confirmedByName", "confirmedAt", "updatedAt", "note"
             FROM "entrance_workflow_confirmations"
             WHERE "stageNumber" = 7 AND "studentId" IN (${placeholders})
             ORDER BY COALESCE("confirmedAt", "updatedAt") DESC`,
            ...chunk
          );
          for (const row of rows || []) {
            const sid = String(row?.studentId || "");
            if (!sid || stage7Map.has(sid)) continue;
            const isSent =
              String(row?.deliveryStatus || "").toUpperCase() === "SENT" ||
              String(row?.deliveryStatus || "").toUpperCase() === "READ" ||
              String(row?.deliveryStatus || "").toUpperCase() === "CONFIRMED" ||
              String(row?.status || "").toUpperCase() === "COMPLETED";
            if (isSent) {
              stage7Map.set(sid, {
                status: "SENT",
                sentBy: String(row?.confirmedByName || "").trim(),
                sentAt: String(row?.confirmedAt || row?.updatedAt || ""),
                note: String(row?.note || ""),
              });
            }
          }
        }
        enrichedStudents = students.map((s: any) => {
          const s7 = stage7Map.get(String(s.id));
          return {
            ...s,
            resultEmailStatus: s7?.status || "NOT_SENT",
            resultEmailSentBy: s7?.sentBy || null,
            resultEmailSentAt: s7?.sentAt || null,
            resultEmailNote: s7?.note || null,
          };
        });
      }
    } catch {}

    return NextResponse.json(enrichedStudents);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    if (action === "SEND_REPORT_EMAIL") {
      const { studentId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
      }

      // Fetch student details
      const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: {
          batch: true,
          period: true
        }
      });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      // Fetch student's scores
      const scores = await (prisma as any).preschoolDevScore.findMany({
        where: { studentId },
        include: {
          criteria: {
            include: { area: true }
          }
        }
      });

      // Fetch active criteria for this grade to ensure completeness
      const criteriaList = await (prisma as any).preschoolDevCriteria.findMany({
        where: { ageGroup: student.grade || "", status: "ACTIVE" },
        include: { area: true },
        orderBy: { sortOrder: "asc" }
      });

      // 1. Resolve Admissions Consultant Email
      const resolvedEmail = getTuVanEmail(student.admissionCampus);

      // 2. Parse physical measurements & BMI
      let heightVal: number | null = null;
      let weightVal: number | null = null;
      let heightStr = "Chưa đo";
      let weightStr = "Chưa đo";

      const heightCrit = scores.find(s => s.criteria.code.endsWith("_01") || s.criteria.name.toLowerCase().includes("chiều cao"));
      const weightCrit = scores.find(s => s.criteria.code.endsWith("_02") || s.criteria.name.toLowerCase().includes("cân nặng"));

      if (heightCrit) {
        heightVal = parseMetricValue(heightCrit.note);
        heightStr = heightCrit.note || "Chưa đo";
      }
      if (weightCrit) {
        weightVal = parseMetricValue(weightCrit.note);
        weightStr = weightCrit.note || "Chưa đo";
      }

      let bmiVal: number | null = null;
      let bmiBadgeHtml = "";

      if (heightVal && weightVal) {
        const heightM = heightVal / 100;
        bmiVal = parseFloat((weightVal / (heightM * heightM)).toFixed(2));
        const classification = getBmiClassification(bmiVal);
        bmiBadgeHtml = `<span style="background-color: ${classification.bg}; color: ${classification.color}; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; border: 1px solid ${classification.color}30; display: inline-block;">${classification.text}</span>`;
      } else {
        bmiBadgeHtml = `<span style="background-color: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; display: inline-block;">Chưa tính</span>`;
      }

      // Group criteria and scores by developmental area
      const groupedData: Record<string, { areaName: string; items: any[] }> = {
        THE_CHAT: { areaName: "Thể chất", items: [] },
        NHAN_THUC: { areaName: "Nhận thức", items: [] },
        NGON_NGU: { areaName: "Ngôn ngữ", items: [] },
        TINH_CAM_XH_TM: { areaName: "Tình cảm - Kỹ năng XH & Thẩm mỹ", items: [] }
      };

      for (const crit of criteriaList) {
        const areaCode = crit.area.code;
        const studentScore = scores.find(s => s.criteriaId === crit.id);
        
        let resultLabel = "Chưa đánh giá";
        let resultColor = "#64748b";
        let noteText = "";

        if (studentScore) {
          if (studentScore.result === "DAT") {
            resultLabel = "✓ Đạt";
            resultColor = "#10b981";
          } else if (studentScore.result === "KHONG_DAT") {
            resultLabel = "✗ Không đạt";
            resultColor = "#ef4444";
          } else {
            resultLabel = "Chưa thể hiện";
            resultColor = "#f59e0b";
          }

          if (studentScore.note) {
            noteText = studentScore.note.includes("|") ? studentScore.note.split("|")[1]?.trim() || studentScore.note.split("|")[0]?.trim() : studentScore.note;
          }
        }

        const item = {
          criteriaName: crit.name,
          resultLabel,
          resultColor,
          noteText: noteText || "-"
        };

        if (groupedData[areaCode]) {
          groupedData[areaCode].items.push(item);
        } else {
          groupedData[areaCode] = { areaName: crit.area.name, items: [item] };
        }
      }

      // Build HTML Table Rows (refactored to display compact, eye-catching summary statistics cards)
      let devGridHtml = "";
      
      const summaryAreas = [
        { code: "NHAN_THUC", name: "Nhận thức 🧩", color: "#b45309", bg: "#fef3c7" },
        { code: "NGON_NGU", name: "Ngôn ngữ 🗣️", color: "#0369a1", bg: "#e0f2fe" },
        { code: "TINH_CAM_XH_TM", name: "Tình cảm - XH 🎨", color: "#be185d", bg: "#fce7f3" }
      ];

      for (const area of summaryAreas) {
        const group = groupedData[area.code];
        if (!group || group.items.length === 0) continue;

        const total = group.items.length;
        const dat = group.items.filter(item => item.resultLabel.includes("Đạt")).length;
        const khongDat = group.items.filter(item => item.resultLabel.includes("Không đạt")).length;
        const pct = total > 0 ? Math.round((dat / total) * 100) : 0;

        devGridHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #1e293b;" className="p-2 border border-slate-200">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; background-color: ${area.bg}; color: ${area.color}; font-size: 12px; font-weight: 800; border: 1px solid ${area.color}20;">
                ${area.name}
              </span>
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #475569; text-align: center;" className="p-2 border border-slate-200">
              ${total}
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #10b981; text-align: center;" className="p-2 border border-slate-200">
              ${dat}
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #ef4444; text-align: center;" className="p-2 border border-slate-200">
              ${khongDat}
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; text-align: center;" className="p-2 border border-slate-200">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: #ecfdf5; color: #047857; font-weight: 800; font-size: 11px; border: 1px solid #10b98130;">
                ${pct}% Đạt
              </span>
            </td>
          </tr>
        `;
      }

      const proComment = student.devProfessionalComment || "Không có nhận xét.";
      const psyComment = student.devPsychologyComment || "Không có nhận xét.";
      const impNote = student.devImportantNote || "Không có lưu ý đặc biệt.";

      const bghStatus = student.bghApprovalStatus;
      const bghComment = student.bghApprovalComment || "-";
      const gdcsStatus = student.gdcsApprovalStatus;
      const gdcsComment = student.gdcsApprovalComment || "-";

      let bghBadge = `<span style="background-color: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px;">CHƯA DUYỆT</span>`;
      if (bghStatus === "DAT") {
        bghBadge = `<span style="background-color: #d1fae5; color: #065f46; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid #04785730;">ĐẠT</span>`;
      } else if (bghStatus === "KHONG_DAT") {
        bghBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid #b91c1c30;">KHÔNG ĐẠT</span>`;
      } else if (bghStatus === "Y_KIEN_KHAC") {
        bghBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid #b4530930;">Ý KIẾN KHÁC</span>`;
      }

      let gdcsBadge = `<span style="background-color: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px;">CHƯA DUYỆT</span>`;
      if (gdcsStatus === "DAT" || gdcsStatus === "DAT_HOC_THU" || gdcsStatus === "DAT_MIEN_HOC_THU") {
        let label = "ĐẠT";
        let color = "#065f46";
        let bg = "#d1fae5";
        if (gdcsStatus === "DAT_HOC_THU") {
          label = "ĐẠT - HỌC THỬ";
          color = "#3730a3";
          bg = "#e0e7ff";
        } else if (gdcsStatus === "DAT_MIEN_HOC_THU") {
          label = "ĐẠT - MIỄN HỌC THỬ";
          color = "#0f766e";
          bg = "#ccfbf1";
        }
        gdcsBadge = `<span style="background-color: ${bg}; color: ${color}; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid ${color}30;">${label}</span>`;
      } else if (gdcsStatus === "KHONG_DAT") {
        gdcsBadge = `<span style="background-color: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid #b91c1c30;">KHÔNG ĐẠT</span>`;
      } else if (gdcsStatus === "Y_KIEN_KHAC") {
        gdcsBadge = `<span style="background-color: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; border: 1px solid #b4530930;">Ý KIẾN KHÁC</span>`;
      }

      const admissionRes = student.admissionResult || "Chưa duyệt";
      let finalResultBadgeHtml = "";
      if (admissionRes.includes("Miễn Học Thử")) {
        finalResultBadgeHtml = `<span style="background-color: #ccfbf1; color: #0f766e; padding: 6px 18px; border-radius: 12px; font-weight: 800; font-size: 15px; border: 2px solid #0f766e; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">ĐẠT - MIỄN HỌC THỬ</span>`;
      } else if (admissionRes.includes("Học Thử")) {
        finalResultBadgeHtml = `<span style="background-color: #e0e7ff; color: #3730a3; padding: 6px 18px; border-radius: 12px; font-weight: 800; font-size: 15px; border: 2px solid #3730a3; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">ĐẠT - HỌC THỬ</span>`;
      } else if (admissionRes.includes("Đạt") || admissionRes === "DAT") {
        finalResultBadgeHtml = `<span style="background-color: #d1fae5; color: #065f46; padding: 6px 18px; border-radius: 12px; font-weight: 800; font-size: 15px; border: 2px solid #065f46; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">ĐẠT</span>`;
      } else if (admissionRes.includes("Không đạt") || admissionRes === "KHONG_DAT") {
        finalResultBadgeHtml = `<span style="background-color: #fee2e2; color: #991b1b; padding: 6px 18px; border-radius: 12px; font-weight: 800; font-size: 15px; border: 2px solid #991b1b; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">KHÔNG ĐẠT</span>`;
      } else {
        finalResultBadgeHtml = `<span style="background-color: #f1f5f9; color: #475569; padding: 6px 18px; border-radius: 12px; font-weight: 800; font-size: 15px; border: 2px solid #475569; text-transform: uppercase; display: inline-block; letter-spacing: 0.5px;">CHƯA DUYỆT / Ý KIẾN KHÁC</span>`;
      }

      const dobStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "-";
      const genderStr = student.gender === "MALE" ? "Nam" : student.gender === "FEMALE" ? "Nữ" : "-";

      const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      const emailHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kết Quả Khảo Sát Năng Lực Đầu Vào Mầm Non</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="680" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                <!-- Header -->
                <tr>
                  <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 32px 28px; text-align: center;">
                    <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </div>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                      KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                      Bậc Mầm non • Báo cáo Đánh giá Sự Phát triển của Trẻ
                    </p>
                  </td>
                </tr>
                
                <!-- Intro -->
                <tr>
                  <td style="padding: 26px 30px 15px 30px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                      Kính gửi Bộ phận Tuyển sinh,
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Hội đồng Tuyển sinh trân trọng gửi báo cáo kết quả khảo sát năng lực đầu vào mầm non của học sinh <strong>${student.fullName}</strong>. Chi tiết kết quả và đề xuất tiếp nhận như sau:
                    </p>
                  </td>
                </tr>
                
                <!-- Student Profile Table -->
                <tr>
                  <td style="padding: 0 30px 18px 30px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                      <tr bgcolor="#F0FDFA" style="background-color: #F0FDFA;">
                        <td colspan="4" style="padding: 10px 15px; font-weight: 700; font-size: 12px; color: #003B3A; border-bottom: 1px solid #CCFBF1; text-transform: uppercase; letter-spacing: 0.5px;">
                          Hồ sơ học sinh
                        </td>
                      </tr>
                      <tr>
                        <td width="20%" style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Mã học sinh:</td>
                        <td width="30%" style="padding: 10px 14px; font-size: 13px; color: #003B3A; font-weight: 700; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">${student.studentCode}</td>
                        <td width="20%" style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Họ và tên:</td>
                        <td width="30%" style="padding: 10px 14px; font-size: 13px; color: #1E293B; font-weight: 700; border-bottom: 1px solid #F1F5F9;">${student.fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Ngày sinh:</td>
                        <td style="padding: 10px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">${dobStr}</td>
                        <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748B; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">Giới tính:</td>
                        <td style="padding: 10px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #F1F5F9;">${genderStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748B; border-right: 1px solid #F1F5F9;">Lớp/Nhóm tuổi:</td>
                        <td style="padding: 10px 14px; font-size: 13px; color: #334155; border-right: 1px solid #F1F5F9;">${student.grade || "-"}</td>
                        <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748B; border-right: 1px solid #F1F5F9;">Cơ sở đăng ký:</td>
                        <td style="padding: 10px 14px; font-size: 13px; color: #003B3A; font-weight: 700;">${student.admissionCampus || "-"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Physical Measurements and BMI Card -->
                <tr>
                  <td style="padding: 0 30px 18px 30px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; padding: 14px; border-collapse: separate;">
                      <tr>
                        <td width="33%" style="text-align: center; border-right: 1px solid #E2E8F0; padding: 4px 0;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Chiều cao</div>
                          <div style="font-size: 16px; font-weight: 800; color: #003B3A; margin-top: 4px;">${heightStr}</div>
                        </td>
                        <td width="33%" style="text-align: center; border-right: 1px solid #E2E8F0; padding: 4px 0;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Cân nặng</div>
                          <div style="font-size: 16px; font-weight: 800; color: #003B3A; margin-top: 4px;">${weightStr}</div>
                        </td>
                        <td width="34%" style="text-align: center; padding: 4px 0;">
                          <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px;">Chỉ số BMI</div>
                          <div style="font-size: 16px; font-weight: 800; color: #1E293B; margin-bottom: 4px;">${bmiVal ? bmiVal : "-"}</div>
                          ${bmiBadgeHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Developmental Criteria Table -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      🧩 CÁC LĨNH VỰC PHÁT TRIỂN CỦA TRẺ
                    </div>
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; border-collapse: collapse;">
                      <thead>
                        <tr bgcolor="#003B3A" style="background-color: #003B3A; color: #FFFFFF;">
                          <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 45%; text-transform: uppercase; letter-spacing: 0.5px;">Lĩnh vực phát triển</th>
                          <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 15%; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Tổng tiêu chí</th>
                          <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 13%; text-align: center; color: #A7F3D0; text-transform: uppercase; letter-spacing: 0.5px;">Đạt</th>
                          <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 13%; text-align: center; color: #FECDD3; text-transform: uppercase; letter-spacing: 0.5px;">K.Đạt</th>
                          <th align="center" style="padding: 10px 14px; font-size: 11px; font-weight: 700; width: 14%; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${devGridHtml}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Comments Segment -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                      <tr bgcolor="#F0FDFA" style="background-color: #F0FDFA;">
                        <td style="padding: 10px 15px; font-weight: 700; font-size: 12px; color: #003B3A; border-bottom: 1px solid #CCFBF1; text-transform: uppercase; letter-spacing: 0.5px;">
                          Nhận xét của Giáo viên khảo sát
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px; font-size: 13px; color: #334155; line-height: 1.6;">
                          <div style="margin-bottom: 10px;">
                            <strong style="color: #003B3A;">• Nhận xét Chuyên môn:</strong>
                            <div style="margin-top: 3px; color: #475569; padding-left: 10px; border-left: 3px solid #00A19A;">${proComment}</div>
                          </div>
                          <div style="margin-bottom: 10px;">
                            <strong style="color: #003B3A;">• Nhận xét Tâm lý:</strong>
                            <div style="margin-top: 3px; color: #475569; padding-left: 10px; border-left: 3px solid #00A19A;">${psyComment}</div>
                          </div>
                          <div>
                            <strong style="color: #92400E;">• Lưu ý đặc biệt:</strong>
                            <div style="margin-top: 3px; color: #92400E; font-weight: 500; padding-left: 10px; border-left: 3px solid #F59E0B;">${impNote}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- 2-Step Approval Segment -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                      <tr bgcolor="#F0FDFA" style="background-color: #F0FDFA;">
                        <td colspan="2" style="padding: 10px 15px; font-weight: 700; font-size: 12px; color: #003B3A; border-bottom: 1px solid #CCFBF1; text-transform: uppercase; letter-spacing: 0.5px;">
                          Ý kiến Phê duyệt &amp; Đề xuất
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" valign="top" style="padding: 15px; font-size: 13px; color: #334155; border-right: 1px solid #E2E8F0; line-height: 1.6;">
                          <div style="margin-bottom: 8px;">
                            <strong style="color: #003B3A;">Ban Giám hiệu Mầm non:</strong>
                          </div>
                          <div style="margin-bottom: 8px;">
                            ${bghBadge}
                          </div>
                          <div>
                            <span style="font-size: 12px; color: #64748B; font-style: italic;">Ý kiến:</span>
                            <div style="margin-top: 2px; color: #475569; font-size: 13px;">${bghComment}</div>
                          </div>
                        </td>
                        <td width="50%" valign="top" style="padding: 15px; font-size: 13px; color: #334155; line-height: 1.6;">
                          <div style="margin-bottom: 8px;">
                            <strong style="color: #003B3A;">Giám đốc Cơ sở:</strong>
                          </div>
                          <div style="margin-bottom: 8px;">
                            ${gdcsBadge}
                          </div>
                          <div>
                            <span style="font-size: 12px; color: #64748B; font-style: italic;">Ý kiến:</span>
                            <div style="margin-top: 2px; color: #475569; font-size: 13px;">${gdcsComment}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Final Result & Call to Action -->
                <tr>
                  <td style="padding: 10px 30px 24px 30px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">KẾT LUẬN CUỐI CÙNG</div>
                    <div style="margin-bottom: 20px;">
                      ${finalResultBadgeHtml}
                    </div>
                    <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748B; font-style: italic; line-height: 1.5;">
                      Báo cáo này được tự động định tuyến đến Tuyển sinh của Cơ sở để hỗ trợ Quý Phụ huynh hoàn thiện thủ tục nhập học cho bé.
                    </p>

                    <!-- Bulletproof CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                          <a href="${baseUrl}/admin/preschool-input-assessments" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                            Quản lý trên Hệ thống Portal &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                    <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                      BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                      Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      try {
        await sendEmail({
          to: resolvedEmail,
          subject: `[Preschool-Survey] Báo cáo kết quả khảo sát năng lực đầu vào - Bé ${student.fullName} (${student.studentCode})`,
          html: emailHtml,
          replyTo: "ktdbcl@skylineschool.edu.vn"
        });
        return NextResponse.json({ success: true, email: resolvedEmail });
      } catch (err) {
        return NextResponse.json({ error: "Gửi email thất bại: " + err.message }, { status: 500 });
      }
    }

    if (action === "SEND_APPROVAL_NOTIFICATION") {
      const { studentId, targetRole, previewOnly, customSubject, selectedEmails, extraEmails } = body;
      if (!studentId) {
        return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
      }

      // Fetch student details
      const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true }
      });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const campusName = student.admissionCampus || student.registeredCampus;
      if (!campusName) {
        return NextResponse.json({ error: "Học sinh chưa được gán Cơ sở để định tuyến phê duyệt!" }, { status: 400 });
      }

      // Find campus record in database
      const campus = await (prisma as any).campus.findFirst({
        where: {
          OR: [
            { campusName: campusName },
            { campusCode: campusName }
          ]
        }
      });

      // Load saved PRESCHOOL_APPROVAL_ROUTING_V1 (fallback to EMAIL_ROUTING_V1 + Sky-Line defaults)
      const DEFAULT_PRESCHOOL_CAMPUS_EMAILS: Record<string, { bghmn: string; gdcs: string }> = {
        CS1: { bghmn: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn", gdcs: "longtt@skylineschool.edu.vn" },
        CS2: { bghmn: "yenlth@skylineschool.edu.vn, thanhmaitt@skylineschool.edu.vn", gdcs: "khanhpt@skylineschool.edu.vn" },
        CS3: { bghmn: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn", gdcs: "thanhtt@skylineschool.edu.vn" },
        CS4: { bghmn: "quyenlth@skylineschool.edu.vn, chault@skylineschool.edu.vn", gdcs: "trungct@skylineschool.edu.vn" },
        CS5: { bghmn: "monghatn@skylineschool.edu.vn, ngocltb@skylineschool.edu.vn", gdcs: "trungdq1@skylineschool.edu.vn, oanhntk@skylineschool.edu.vn" },
      };

      let configuredKtdbclEmails: string[] = ["ktdbcl@skylineschool.edu.vn"];
      let ktdbclEnabled = true;
      let autoMergeDbStaff = true;
      let parsedPreschoolCfg: any = null;
      let parsedGeneralCfg: any = null;

      try {
        const savedConfigs = await (prisma as any).assessmentConfig.findMany({
          where: {
            categoryType: "APPROVAL_EMAIL_CONFIG",
            code: { in: ["PRESCHOOL_APPROVAL_ROUTING_V1", "EMAIL_ROUTING_V1"] },
          },
          select: { code: true, name: true },
        });
        for (const row of savedConfigs || []) {
          if (!row?.name) continue;
          try {
            if (row.code === "PRESCHOOL_APPROVAL_ROUTING_V1") parsedPreschoolCfg = JSON.parse(row.name);
            if (row.code === "EMAIL_ROUTING_V1") parsedGeneralCfg = JSON.parse(row.name);
          } catch {}
        }
      } catch {}

      const activeCfg = parsedPreschoolCfg || parsedGeneralCfg;
      if (activeCfg) {
        if (typeof activeCfg.autoMergeDbStaff === "boolean") autoMergeDbStaff = activeCfg.autoMergeDbStaff;
        if (typeof activeCfg.includeKtdbclCc === "boolean") ktdbclEnabled = activeCfg.includeKtdbclCc;
        else if (activeCfg?.groups?.ktdbcl?.enabled === false) ktdbclEnabled = false;
        if (typeof activeCfg?.ktdbclEmails === "string") {
          const list = activeCfg.ktdbclEmails
            .split(/[,;\n]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s && s.includes("@"));
          if (list.length > 0) configuredKtdbclEmails = list;
        }
      }

      const normCampus = String(campus?.campusCode || campusName || "").toUpperCase();
      let csKey: "CS1" | "CS2" | "CS3" | "CS4" | "CS5" | null = null;
      if (normCampus.includes("CS1") || normCampus.includes("RIVERSIDE")) csKey = "CS1";
      else if (normCampus.includes("CS2") || normCampus.includes("CENTRAL")) csKey = "CS2";
      else if (normCampus.includes("CS3") || normCampus.includes("GLOBAL")) csKey = "CS3";
      else if (normCampus.includes("CS4") || normCampus.includes("HILL")) csKey = "CS4";
      else if (normCampus.includes("CS5") || normCampus.includes("BEACH")) csKey = "CS5";

      const wantsBgh = !targetRole || targetRole === "ALL" || targetRole === "BGH_MN";
      const wantsGdcs = !targetRole || targetRole === "ALL" || targetRole === "GDCS";

      const splitCfg = (raw?: string) =>
        String(raw || "")
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter((s) => s && s.includes("@"));

      let resolvedUsers: any[] = [];
      if (autoMergeDbStaff && campus) {
        const assignments = await (prisma as any).userCampusAssignment.findMany({
          where: { campusId: campus.id },
          include: {
            user: {
              include: { teacher: { select: { email: true, teacherName: true } } },
            },
          },
        });
        const assignedUsers = assignments.map((a: any) => a.user).filter(Boolean);
        resolvedUsers = assignedUsers.filter((u: any) => {
          const role = (u.role || "").toUpperCase();
          const isBgh = ["BGH MN", "BGH_MN", "BGH_MAM_NON", "BGHMN"].includes(role);
          const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(role);
          if (wantsBgh && isBgh) return true;
          if (wantsGdcs && isGdcs) return true;
          return false;
        });
      }

      // Create Notification records and Send Alert Emails in parallel
      let notificationCount = 0;
      let emailSentCount = 0;

      const roleTitlePrefix =
        targetRole === "BGH_MN"
          ? "BGH Mầm non"
          : targetRole === "GDCS"
            ? "GĐCS"
            : "BGH MN / GĐCS";

      const title = `[Preschool-Survey] Yêu cầu ${roleTitlePrefix} phê duyệt kết quả đầu vào - Bé ${student.fullName}`;
      const message = `Kính gửi thầy/cô, học sinh ${student.fullName} (${student.studentCode}) thuộc Cơ sở ${campusName} đã hoàn thành khảo sát đầu vào. Kính đề xuất thầy/cô truy cập hệ thống để tiến hành phê duyệt cho bé.`;

      const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      const devSummary = await getPreschoolDevelopmentSummary(student.id);
      const emailSubject =
        (typeof customSubject === "string" && customSubject.trim()) ||
        `[Preschool-Approval] Yêu cầu ${roleTitlePrefix} duyệt kết quả khảo sát đầu vào - Bé ${student.fullName} (${campusName})`;

      // Build deduplicated recipient list (Configured emails first, then DB staff resolved via Teacher.email || User.email)
      const recipientMap = new Map<string, { id?: string; fullName: string; email: string; role: string; isArchiveCopy: boolean }>();

      if (csKey) {
        const campusCfg =
          parsedPreschoolCfg?.campuses?.[csKey] ||
          parsedGeneralCfg?.campuses?.[csKey] ||
          DEFAULT_PRESCHOOL_CAMPUS_EMAILS[csKey];
        const fallbackCfg = DEFAULT_PRESCHOOL_CAMPUS_EMAILS[csKey];

        if (wantsBgh) {
          const bghList = splitCfg(campusCfg?.bghmn || fallbackCfg?.bghmn);
          for (const em of bghList) {
            const key = em.toLowerCase();
            if (!recipientMap.has(key)) {
              recipientMap.set(key, {
                fullName: `BGH Mầm non (${csKey})`,
                email: em,
                role: `BGH Mầm non ${csKey}`,
                isArchiveCopy: false,
              });
            }
          }
        }
        if (wantsGdcs) {
          const gdcsList = splitCfg(campusCfg?.gdcs || fallbackCfg?.gdcs);
          for (const em of gdcsList) {
            const key = em.toLowerCase();
            if (!recipientMap.has(key)) {
              recipientMap.set(key, {
                fullName: `GĐCS (${csKey})`,
                email: em,
                role: `GĐCS ${csKey}`,
                isArchiveCopy: false,
              });
            }
          }
        }
      }

      for (const u of resolvedUsers) {
        const resolvedEmail =
          (u.teacher?.email && u.teacher.email.includes("@") ? u.teacher.email : null) ||
          (u.email && u.email.includes("@") ? u.email : null);
        if (resolvedEmail) {
          const key = resolvedEmail.trim().toLowerCase();
          if (!recipientMap.has(key)) {
            recipientMap.set(key, {
              id: u.id,
              fullName: u.teacher?.teacherName || u.fullName || resolvedEmail,
              email: resolvedEmail.trim(),
              role: u.role || "BGH/GĐCS",
              isArchiveCopy: false,
            });
          } else if (!recipientMap.get(key)?.id) {
            const existing = recipientMap.get(key)!;
            existing.id = u.id;
            existing.fullName = u.teacher?.teacherName || u.fullName || existing.fullName;
          }
        }
      }

      const allRecipients = Array.from(recipientMap.values());

      const effectiveEmailRole: "BGH_MN" | "GDCS" = targetRole === "BGH_MN" ? "BGH_MN" : "GDCS";

      if (previewOnly) {
        const primaryRecipient = allRecipients.find((r) => !r.isArchiveCopy) || allRecipients[0];
        const previewHtml = renderPreschoolApprovalEmailHtml({
          student,
          campusName,
          recipientName: primaryRecipient?.fullName || (effectiveEmailRole === "BGH_MN" ? "Ban Giám Hiệu Mầm non" : "Giám đốc Cơ sở"),
          recipientEmail: primaryRecipient?.email || "ktdbcl@skylineschool.edu.vn",
          isArchiveCopy: false,
          targetRole: effectiveEmailRole,
          devSummary,
          baseUrl,
        });

        return NextResponse.json({
          preview: true,
          campus: campusName,
          studentName: student.fullName,
          studentCode: student.studentCode,
          subject: emailSubject,
          recipients: allRecipients,
          html: previewHtml,
        });
      }

      const selectedSet =
        Array.isArray(selectedEmails) && selectedEmails.length > 0
          ? new Set(selectedEmails.map((e: string) => String(e).trim().toLowerCase()))
          : null;

      // Append any extra custom emails entered in preview modal
      if (typeof extraEmails === "string" && extraEmails.trim()) {
        const extras = extraEmails
          .split(/[,;\n]+/)
          .map((e: string) => e.trim())
          .filter((e: string) => e.includes("@"));
        for (const ex of extras) {
          const key = ex.toLowerCase();
          if (!recipientMap.has(key)) {
            recipientMap.set(key, {
              fullName: ex,
              email: ex,
              role: "Người nhận bổ sung",
              isArchiveCopy: false,
            });
          }
          if (selectedSet) selectedSet.add(key);
        }
      }

      const finalRecipients = Array.from(recipientMap.values()).filter((r) =>
        selectedSet ? selectedSet.has(r.email.toLowerCase()) : true
      );

      // Send personalized emails & in-app notifications
      for (const r of finalRecipients) {
        try {
          if (r.id) {
            await (prisma as any).notification.create({
              data: { userId: r.id, title, message },
            });
            notificationCount++;
          }

          const emailBody = renderPreschoolApprovalEmailHtml({
            student,
            campusName,
            recipientName: r.fullName,
            recipientEmail: r.email,
            isArchiveCopy: r.isArchiveCopy,
            targetRole: effectiveEmailRole,
            devSummary,
            baseUrl,
          });

          await sendEmail({
            to: r.email,
            subject: emailSubject,
            html: emailBody,
            replyTo: "ktdbcl@skylineschool.edu.vn",
          });
          emailSentCount++;
        } catch (err) {
          console.error("Lỗi khi gửi thông báo tới:", r.email, err);
        }
      }

      return NextResponse.json({
        success: true,
        notificationsSent: notificationCount,
        emailsSent: emailSentCount,
        campus: campusName
      });
    }

    if (action === "SEND_BATCH_APPROVAL_NOTIFICATION") {
      const { studentIds, targetRole, batchName: reqBatchName, previewOnly, customSubject, selectedEmails, extraEmails } = body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 học sinh trong đợt." }, { status: 400 });
      }

      const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where: { id: { in: studentIds } },
        include: { period: true, batch: true },
        orderBy: { fullName: "asc" },
      });
      if (!students || students.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy danh sách học sinh." }, { status: 404 });
      }

      const firstSt = students[0];
      const campusName = firstSt.admissionCampus || firstSt.registeredCampus || "Sky-Line";
      const batchName = reqBatchName || firstSt.batch?.name || firstSt.period?.name || "Đợt khảo sát Mầm non";
      const effectiveEmailRole: "BGH_MN" | "GDCS" = targetRole === "BGH_MN" ? "BGH_MN" : "GDCS";

      const cUp = String(campusName).toUpperCase();
      const campusCode =
        cUp.includes("CS1") || cUp.includes("RIVERSIDE") ? "CS1"
        : cUp.includes("CS2") || cUp.includes("CENTRAL") ? "CS2"
        : cUp.includes("CS3") || cUp.includes("GLOBAL") ? "CS3"
        : cUp.includes("CS4") || cUp.includes("HILL") ? "CS4"
        : cUp.includes("CS5") || cUp.includes("BEACH") ? "CS5"
        : "";

      const DEFAULT_PRESCHOOL_CAMPUS_EMAILS: Record<string, { bghmn: string; gdcs: string }> = {
        CS1: { bghmn: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn", gdcs: "longtt@skylineschool.edu.vn" },
        CS2: { bghmn: "yenlth@skylineschool.edu.vn, thanhmaitt@skylineschool.edu.vn", gdcs: "khanhpt@skylineschool.edu.vn" },
        CS3: { bghmn: "yenlth@skylineschool.edu.vn, yendhb@skylineschool.edu.vn", gdcs: "thanhtt@skylineschool.edu.vn" },
        CS4: { bghmn: "quyenlth@skylineschool.edu.vn, chault@skylineschool.edu.vn", gdcs: "trungct@skylineschool.edu.vn" },
        CS5: { bghmn: "monghatn@skylineschool.edu.vn, ngocltb@skylineschool.edu.vn", gdcs: "trungdq1@skylineschool.edu.vn, oanhntk@skylineschool.edu.vn" },
      };

      const recipientMap = new Map<string, { id?: string; fullName: string; email: string; role: string; isArchiveCopy: boolean }>();

      try {
        const savedCfg = await (prisma as any).assessmentConfig.findFirst({
          where: { categoryType: "APPROVAL_EMAIL_CONFIG", name: "PRESCHOOL_APPROVAL_ROUTING_V1" },
        });
        const parsed = savedCfg?.content ? JSON.parse(savedCfg.content) : null;
        const configuredStr = campusCode
          ? (effectiveEmailRole === "BGH_MN"
              ? parsed?.campuses?.[campusCode]?.bghmn || DEFAULT_PRESCHOOL_CAMPUS_EMAILS[campusCode]?.bghmn
              : parsed?.campuses?.[campusCode]?.gdcs || DEFAULT_PRESCHOOL_CAMPUS_EMAILS[campusCode]?.gdcs)
          : "";
        for (const rawEmail of String(configuredStr || "").split(/[,;\n]+/)) {
          const e = rawEmail.trim().toLowerCase();
          if (!e.includes("@")) continue;
          const dbUser = await (prisma as any).user.findFirst({ where: { email: e }, select: { id: true, fullName: true } }).catch(() => null);
          recipientMap.set(e, {
            id: dbUser?.id,
            fullName: dbUser?.fullName || (effectiveEmailRole === "BGH_MN" ? `BGH Mầm non ${campusCode}` : `GĐCS ${campusCode}`),
            email: e,
            role: effectiveEmailRole === "BGH_MN" ? `NT Mầm non / BGH ${campusCode}` : `GĐCS ${campusCode}`,
            isArchiveCopy: false,
          });
        }
      } catch {}

      const studentItems = await Promise.all(
        students.map(async (st: any) => ({
          student: st,
          devSummary: await getPreschoolDevelopmentSummary(st.id).catch(() => undefined),
        }))
      );

      const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;
      const defaultSubject =
        effectiveEmailRole === "BGH_MN"
          ? `[Preschool-Batch] Yêu cầu NT Mầm non / BGH xét duyệt theo đợt (${students.length} HS) — ${batchName}`
          : `[Preschool-Batch] Yêu cầu GĐCS phê duyệt B10 theo đợt (${students.length} HS) — ${batchName}`;
      const emailSubject = (typeof customSubject === "string" && customSubject.trim()) || defaultSubject;
      const allRecipients = Array.from(recipientMap.values());

      if (previewOnly) {
        const primaryRec = allRecipients.find((r) => !r.isArchiveCopy) || allRecipients[0];
        const previewHtml = renderPreschoolBatchApprovalEmailHtml({
          students: studentItems,
          batchName,
          campusName,
          recipientName: primaryRec?.fullName || (effectiveEmailRole === "BGH_MN" ? "NT Mầm non / BGH" : "Giám đốc Cơ sở"),
          recipientEmail: primaryRec?.email || "ktdbcl@skylineschool.edu.vn",
          targetRole: effectiveEmailRole,
          isArchiveCopy: false,
          baseUrl,
        });
        return NextResponse.json({
          preview: true,
          campus: campusName,
          studentName: `${students.length} học sinh (${batchName})`,
          studentCode: `${students.length} HS`,
          subject: emailSubject,
          recipients: allRecipients,
          html: previewHtml,
        });
      }

      const selectedSet =
        Array.isArray(selectedEmails) && selectedEmails.length > 0
          ? new Set(selectedEmails.map((e: string) => String(e).trim().toLowerCase()))
          : null;

      if (typeof extraEmails === "string" && extraEmails.trim()) {
        for (const ex of extraEmails.split(/[,;\n]+/).map((e: string) => e.trim()).filter((e: string) => e.includes("@"))) {
          const key = ex.toLowerCase();
          if (!recipientMap.has(key)) {
            recipientMap.set(key, { fullName: ex, email: ex, role: "Người nhận bổ sung", isArchiveCopy: false });
          }
          if (selectedSet) selectedSet.add(key);
        }
      }

      const finalRecipients = Array.from(recipientMap.values()).filter((r) =>
        selectedSet ? selectedSet.has(r.email.toLowerCase()) : true
      );

      let emailSentCount = 0;
      for (const r of finalRecipients) {
        try {
          const emailBody = renderPreschoolBatchApprovalEmailHtml({
            students: studentItems,
            batchName,
            campusName,
            recipientName: r.fullName,
            recipientEmail: r.email,
            targetRole: effectiveEmailRole,
            isArchiveCopy: r.isArchiveCopy,
            baseUrl,
          });
          await sendEmail({
            to: r.email,
            subject: emailSubject,
            html: emailBody,
            replyTo: "ktdbcl@skylineschool.edu.vn",
          });
          emailSentCount++;
        } catch (err) {
          console.error("Batch preschool email error:", r.email, err);
        }
      }

      return NextResponse.json({
        success: true,
        emailsSent: emailSentCount,
        campus: campusName,
        studentCount: students.length,
      });
    }

    if (action === "PREVIEW_GDCS_RESULT_NOTIFICATION") {
      const { studentId, outcome: reqOutcome } = body;
      const student = studentId
        ? await (prisma as any).preschoolInputAssessmentStudent.findUnique({ where: { id: studentId } })
        : await (prisma as any).preschoolInputAssessmentStudent.findFirst({ orderBy: { createdAt: "desc" } });
      if (!student) {
        return NextResponse.json({ error: "Không tìm thấy hồ sơ học sinh để xem trước." }, { status: 404 });
      }
      const outcome: "DAT" | "CHUA_DAT" = reqOutcome === "CHUA_DAT" ? "CHUA_DAT" : "DAT";
      const admissionResult = outcome === "DAT" ? "Đạt" : "Chưa đạt";
      const { campusStr, campusCode, recipients } = await resolvePreschoolStakeholderRecipients(student);
      const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;
      const { subject, html } = renderPreschoolGdcsResultNotificationEmailHtml({
        student,
        outcome,
        admissionResult,
        approverName: student.gdcsApprovalUser || "Giám đốc Điều hành Cơ sở",
        comment: student.gdcsApprovalComment || (outcome === "DAT" ? "Đồng ý tiếp nhận theo đề xuất của BGH Mầm non." : "Cần trao đổi thêm với Phụ huynh."),
        campusStr,
        campusCode,
        baseUrl,
      });
      return NextResponse.json({
        preview: true,
        campus: campusStr || campusCode || "Sky-Line",
        studentName: student.fullName,
        studentCode: student.studentCode,
        subject,
        recipients,
        html,
      });
    }

    if (action === "GET_CAMPUS_RECIPIENTS") {
      const { studentId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
      }

      const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
        where: { id: studentId }
      });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const campusName = student.admissionCampus;
      const campus = campusName ? await (prisma as any).campus.findFirst({
        where: {
          OR: [
            { campusName: campusName },
            { campusCode: campusName }
          ]
        }
      }) : null;

      const tuVanEmail = getTuVanEmail(campusName);
      const recipients = [];

      // 1. Add Default Tư vấn tuyển sinh
      recipients.push({
        name: "Tư vấn Tuyển sinh " + (campusName || ""),
        email: tuVanEmail,
        role: "Tư vấn",
        checked: true
      });

      // 2. Add Default Ban Khảo thí
      recipients.push({
        name: "Ban Khảo thí Hệ thống",
        email: "ktdbcl@skylineschool.edu.vn",
        role: "BGH",
        checked: true
      });

            // 3. Add all active teachers from the same campus (Email nhận thông báo)
      if (campus) {
        const campusTeachers = await (prisma as any).teacher.findMany({
          where: {
            campusId: campus.id,
            status: "ACTIVE",
            email: { not: null }
          },
          include: {
            departmentRel: true,
            mainSubjectRel: true
          },
          orderBy: { teacherName: "asc" }
        });

        for (const t of campusTeachers) {
          if (!t.email || !t.email.includes("@")) continue;
          if (recipients.some((r: any) => r.email.toLowerCase() === t.email.toLowerCase())) continue;

          const deptLabel = t.departmentRel?.name || null;
          const subjectLabel = t.mainSubjectRel?.subjectName || null;
          const infoLabel = [deptLabel, subjectLabel].filter(Boolean).join(" | ");

          recipients.push({
            name: t.teacherName,
            email: t.email,
            role: "Giáo viên",
            info: infoLabel || undefined,
            checked: false
          });
        }
      }

      if (campus) {
        const campusWithManager = await (prisma as any).campus.findUnique({
          where: { id: campus.id },
          include: { manager: true }
        });
        if (campusWithManager?.manager) {
          const m = campusWithManager.manager;
          if (m.email && m.email.includes("@")) {
            recipients.push({
              name: m.fullName + " (GĐCS " + (campusName || "") + ")",
              email: m.email,
              role: "GĐCS",
              checked: true
            });
          }
        }

        const assignments = await (prisma as any).userCampusAssignment.findMany({
          where: { campusId: campus.id },
          include: { user: true }
        });
        const assignedUsers = assignments.map((a: any) => a.user);

        for (const u of assignedUsers) {
          if (!u.email || !u.email.includes("@")) continue;
          if (recipients.some(r => r.email.toLowerCase() === u.email.toLowerCase())) continue;

          const role = (u.role || "").toUpperCase();
          let resolvedRole = "";
          
          if (["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CS"].includes(role)) {
            resolvedRole = "GĐCS";
          } else if (["KT_DBCL", "BGH MN", "BGH_MN", "BGH", "BAN_GIAM_HIEU", "ADMIN"].includes(role)) {
            resolvedRole = "BGH";
          } else if (["GIAO_VU", "GIAO_VU_CS", "GVCS"].includes(role)) {
            resolvedRole = "Giáo vụ";
          } else if (["TU_VAN", "TU_VAN_CS", "TVCS", "TU_VAN_TS"].includes(role)) {
            resolvedRole = "Tư vấn";
          }

          if (resolvedRole) {
            recipients.push({
              name: u.fullName,
              email: u.email,
              role: resolvedRole,
              checked: true
            });
          }
        }
      }

      // Add fallback system users
      const targetRoles = [
        "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CS",
        "KT_DBCL", "BGH MN", "BGH_MN", "BGH", "BAN_GIAM_HIEU",
        "GIAO_VU", "GIAO_VU_CS", "GVCS",
        "TU_VAN", "TU_VAN_CS", "TVCS", "TU_VAN_TS"
      ];
      const searchRoles = [
        ...targetRoles,
        ...targetRoles.map(r => r.toLowerCase()),
        "Gdcs", "Gđcs", "Gd_cs", "Gđ_cs", "Giam_doc_cs",
        "Kt_dbcl", "Bgh mn", "Bgh_mn", "Bgh", "Ban_giam_hieu",
        "Giao_vu", "Giao_vu_cs", "Gvcs",
        "Tu_van", "Tu_van_cs", "Tvcs", "Tu_van_ts"
      ];

      const allUsers = await (prisma as any).user.findMany({
        where: {
          role: { in: searchRoles }
        }
      });
      const userIds = allUsers.map((u: any) => u.id);
      const allAssignments = await (prisma as any).userCampusAssignment.findMany({
        where: {
          userId: { in: userIds }
        },
        include: { campus: true }
      });

      for (const u of allUsers) {
        if (!u.email || !u.email.includes("@")) continue;
        if (recipients.some(r => r.email.toLowerCase() === u.email.toLowerCase())) continue;

        const role = (u.role || "").toUpperCase();
        let resolvedRole = "";

        if (["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CS"].includes(role)) {
          resolvedRole = "GĐCS";
        } else if (["KT_DBCL", "BGH MN", "BGH_MN", "BGH", "BAN_GIAM_HIEU"].includes(role)) {
          resolvedRole = "BGH";
        } else if (["GIAO_VU", "GIAO_VU_CS", "GVCS"].includes(role)) {
          resolvedRole = "Giáo vụ";
        } else if (["TU_VAN", "TU_VAN_CS", "TVCS", "TU_VAN_TS"].includes(role)) {
          resolvedRole = "Tư vấn";
        }

        if (resolvedRole) {
          const uAssignments = allAssignments.filter((a: any) => a.userId === u.id);
          const campusLabels = uAssignments.map((a: any) => a.campus.campusCode).join(", ");
          const labelSuffix = campusLabels ? " - " + campusLabels : "";

          recipients.push({
            name: u.fullName + labelSuffix,
            email: u.email,
            role: resolvedRole,
            checked: false
          });
        }
      }

      return NextResponse.json({ success: true, recipients, studentName: student.fullName, campusName });
    }

    if (action === "SEND_CONGRATS_EMAIL") {
      const { studentId, recipients, additionalNote } = body;
      if (!studentId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: "Missing studentId or recipients" }, { status: 400 });
      }

      const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
        where: { id: studentId }
      });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const campusName = student.admissionCampus || "";
      const campusSuffix = campusName.toUpperCase().includes("CS1") || campusName.toUpperCase().includes("RIVERSIDE") ? "RIVERSIDE" :
                           campusName.toUpperCase().includes("CS2") || campusName.toUpperCase().includes("CENTRAL") ? "CENTRAL" :
                           campusName.toUpperCase().includes("CS3") || campusName.toUpperCase().includes("GLOBAL") ? "GLOBAL" :
                           campusName.toUpperCase().includes("CS4") || campusName.toUpperCase().includes("HILL") ? "HILL" :
                           campusName.toUpperCase().includes("CS5") || campusName.toUpperCase().includes("BEACH") ? "BEACH" : "RIVERSIDE";
      
      const directorName = campusName.toUpperCase().includes("CS1") || campusName.toUpperCase().includes("RIVERSIDE") ? "Tống Thiên Long" :
                           campusName.toUpperCase().includes("CS2") || campusName.toUpperCase().includes("CENTRAL") ? "Lê Thị Hoàng Yến" :
                           campusName.toUpperCase().includes("CS3") || campusName.toUpperCase().includes("GLOBAL") ? "Trần Thị Thanh" :
                           campusName.toUpperCase().includes("CS4") || campusName.toUpperCase().includes("HILL") ? "Cao Thanh Trung" :
                           campusName.toUpperCase().includes("CS5") || campusName.toUpperCase().includes("BEACH") ? "Đỗ Quang Trung" : "Trần Thị Thanh";

      const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      const congratsTemplate = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thư Chúc Mừng Nhập Học - Sky-Line</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="680" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                <!-- Header -->
                <tr>
                  <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 32px 28px; text-align: center;">
                    <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </div>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.3;">
                      THƯ CHÚC MỪNG NHẬP HỌC
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                      Bậc Mầm non • Niên khóa 2025 - 2026
                    </p>
                  </td>
                </tr>

                ${additionalNote ? `
                <tr>
                  <td style="padding: 24px 35px 0 35px;">
                    <div style="padding: 14px 18px; background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 0 8px 8px 0; font-size: 13px; color: #0F766E; line-height: 1.5;">
                      <strong>Lời nhắn từ Tuyển sinh:</strong> ${additionalNote}
                    </div>
                  </td>
                </tr>
                ` : ''}

                <!-- Body Text -->
                <tr>
                  <td style="padding: 28px 35px 20px 35px; font-size: 15px; line-height: 1.7; color: #334155; text-align: justify;">
                    <p style="margin: 0 0 16px 0; font-weight: 700; color: #003B3A;">
                      Kính gửi Quý Phụ huynh và em <strong>${student.fullName}</strong>,
                    </p>
                    <p style="margin: 0 0 16px 0; text-indent: 1.2cm;">
                      Ban Giám Hiệu Hệ thống Giáo dục Mầm non Sky-Line trân trọng gửi lời chúc mừng nồng nhiệt nhất đến Gia đình và Bé. Dựa trên kết quả Khảo sát phát triển toàn diện của trẻ và kết quả phê duyệt chính thức từ Hội đồng Tuyển sinh, Nhà trường trân trọng gửi đến Quý phụ huynh <strong>Thư chúc mừng nhập học</strong> chính thức dành cho bé tại Cơ sở <strong>${student.admissionCampus || ""}</strong>.
                    </p>
                    <p style="margin: 0 0 16px 0; text-indent: 1.2cm;">
                      Nhà trường hy vọng rằng, với sự chăm sóc tận tình và tình yêu thương vô bờ bến từ tập thể giáo viên và nhân viên Sky-Line, con sẽ nhanh chóng hòa nhập, có những trải nghiệm tuổi thơ tuyệt vời, được vui chơi thỏa thích và phát huy tối đa các tiềm năng bẩm sinh của mình.
                    </p>
                    <p style="margin: 0 0 16px 0; text-indent: 1.2cm;">
                      Chúc con luôn giữ vững niềm vui thích học hỏi, luôn tràn đầy năng lượng khám phá thế giới xung quanh con nhé!
                    </p>
                  </td>
                </tr>

                <!-- Signature Section -->
                <tr>
                  <td align="right" style="padding: 10px 35px 25px 35px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="text-align: center; min-width: 250px;">
                      <tr>
                        <td style="font-size: 12px; font-style: italic; color: #64748B; padding-bottom: 6px;">Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase;">TM. HỘI ĐỒNG TUYỂN SINH</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 700; color: #00A19A; text-transform: uppercase; padding-bottom: 30px;">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusSuffix}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; font-weight: 800; color: #1E293B; padding-top: 10px;">${directorName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Call to action button -->
                <tr>
                  <td align="center" style="padding: 15px 35px 30px 35px; border-top: 1px solid #E2E8F0;">
                    <p style="font-size: 12px; color: #64748B; margin: 0 0 15px 0;">Quý Phụ huynh và Thầy/Cô có thể xem chi tiết hồ sơ học sinh trên hệ thống Portal Tuyển sinh.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                          <a href="${baseUrl}/admin/preschool-input-assessments" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                            Xem chi tiết trên Portal &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                    <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                      BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                      Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      let puppeteer;
      try {
        puppeteer = require("puppeteer");
      } catch (e) {
        console.error("Puppeteer import failed:", e);
      }

      let pdfBuffer = null;
      if (puppeteer) {
        try {
          const campusObj = student.admissionCampus ? await (prisma as any).campus.findFirst({
            where: {
              OR: [
                { campusName: student.admissionCampus },
                { campusCode: student.admissionCampus }
              ]
            }
          }) : null;

          const targetConfig = await (prisma as any).preschoolAssessmentConfig.findFirst({
            where: {
              campusId: campusObj?.id || "",
              type: "thu_chuc_mung_preschool"
            }
          });

          const docHtml = buildPreschoolLetterHtmlServer(student, targetConfig, false);

          const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
          });
          const page = await browser.newPage();
          await page.emulateMediaType("screen");
          await page.setContent(docHtml, { waitUntil: "networkidle0", timeout: 15000 });
          pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
          });
          await browser.close();
        } catch (pdfErr) {
          console.error("Failed to generate PDF attachment:", pdfErr);
        }
      }

      const attachments = [];
      if (pdfBuffer) {
        attachments.push({
          filename: `Thu-chuc-mung-${student.fullName}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        });
      }

      let sentCount = 0;
      const errors = [];

      for (const email of recipients) {
        try {
          if (email && email.includes("@")) {
            await sendEmail({
              to: email,
              subject: `[Preschool-Congrats] Thư chúc mừng nhập học - Học sinh ${student.fullName} (${student.studentCode})`,
              html: congratsTemplate,
              attachments,
              replyTo: "ktdbcl@skylineschool.edu.vn"
            });
            sentCount++;
          }
        } catch (err) {
          console.error(`Lỗi khi gửi email tới ${email}:`, err);
          errors.push(`${email}: ${(err as Error).message}`);
        }
      }

      if (sentCount === 0) {
        return NextResponse.json({ error: "Gửi email thất bại: " + errors.join("; ") }, { status: 500 });
      }

      return NextResponse.json({ success: true, sentCount, errors });
    }

    if (action === "SEND_BATCH_CONGRATS_EMAIL") {
      const { studentIds, roles, additionalNote } = body;
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !roles || !Array.isArray(roles) || roles.length === 0) {
        return NextResponse.json({ error: "Missing studentIds or roles" }, { status: 400 });
      }

      const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where: { id: { in: studentIds } }
      });

      let totalSentCount = 0;
      const errors = [];

      let puppeteer;
      try {
        puppeteer = require("puppeteer");
      } catch (e) {
        console.error("Puppeteer import failed:", e);
      }

      let browser = null;
      if (puppeteer) {
        try {
          browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
          });
        } catch (launchErr) {
          console.error("Failed to launch Puppeteer for batch:", launchErr);
        }
      }

      for (const student of students) {
        const campusName = student.admissionCampus;
        const campus = campusName ? await (prisma as any).campus.findFirst({
          where: {
            OR: [
              { campusName: campusName },
              { campusCode: campusName }
            ]
          }
        }) : null;

        const recipients = [];

        // 1. Add Default Tư vấn tuyển sinh
        if (roles.includes("Tư vấn")) {
          const tuVanEmail = getTuVanEmail(campusName);
          recipients.push(tuVanEmail);
        }

        // 2. Add Default Ban Khảo thí
        if (roles.includes("BGH")) {
          recipients.push("ktdbcl@skylineschool.edu.vn");
        }

        // 3. Add Tổ / Môn dạy (Teacher department)
        if (roles.includes("Tổ/Môn")) {
          const teacherName = student.probationaryTeacher;
          if (teacherName) {
            const teacher = await (prisma as any).teacher.findFirst({
              where: { teacherName: teacherName },
              include: { departmentRel: true }
            });
            if (teacher) {
              if (teacher.email && teacher.email.includes("@")) {
                recipients.push(teacher.email);
              }
              if (teacher.departmentId) {
                const deptTeachers = await (prisma as any).teacher.findMany({
                  where: { departmentId: teacher.departmentId }
                });
                for (const dt of deptTeachers) {
                  if (dt.email && dt.email.includes("@") && dt.id !== teacher.id) {
                    recipients.push(dt.email);
                  }
                }
              }
            }
          }
        }

        if (campus) {
          if (roles.includes("GĐCS")) {
            const campusWithManager = await (prisma as any).campus.findUnique({
              where: { id: campus.id },
              include: { manager: true }
            });
            if (campusWithManager?.manager) {
              const m = campusWithManager.manager;
              if (m.email && m.email.includes("@")) {
                recipients.push(m.email);
              }
            }
          }

          const assignments = await (prisma as any).userCampusAssignment.findMany({
            where: { campusId: campus.id },
            include: { user: true }
          });
          const assignedUsers = assignments.map((a: any) => a.user);

          for (const u of assignedUsers) {
            if (!u.email || !u.email.includes("@")) continue;
            if (recipients.some(r => r.toLowerCase() === u.email.toLowerCase())) continue;

            const role = (u.role || "").toUpperCase();
            let resolvedRole = "";
            
            if (["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CS"].includes(role)) {
              resolvedRole = "GĐCS";
            } else if (["KT_DBCL", "BGH MN", "BGH_MN", "BGH", "BAN_GIAM_HIEU", "ADMIN"].includes(role)) {
              resolvedRole = "BGH";
            } else if (["GIAO_VU", "GIAO_VU_CS", "GVCS"].includes(role)) {
              resolvedRole = "Giáo vụ";
            } else if (["TU_VAN", "TU_VAN_CS", "TVCS", "TU_VAN_TS"].includes(role)) {
              resolvedRole = "Tư vấn";
            }

            if (resolvedRole && roles.includes(resolvedRole)) {
              recipients.push(u.email);
            }
          }
        }

        if (recipients.length === 0) continue;

        const campusSuffix = campusName && (campusName.toUpperCase().includes("CS1") || campusName.toUpperCase().includes("RIVERSIDE")) ? "RIVERSIDE" :
                             campusName && (campusName.toUpperCase().includes("CS2") || campusName.toUpperCase().includes("CENTRAL")) ? "CENTRAL" :
                             campusName && (campusName.toUpperCase().includes("CS3") || campusName.toUpperCase().includes("GLOBAL")) ? "GLOBAL" :
                             campusName && (campusName.toUpperCase().includes("CS4") || campusName.toUpperCase().includes("HILL")) ? "HILL" :
                             campusName && (campusName.toUpperCase().includes("CS5") || campusName.toUpperCase().includes("BEACH")) ? "BEACH" : "RIVERSIDE";
        
        const directorName = campusName && (campusName.toUpperCase().includes("CS1") || campusName.toUpperCase().includes("RIVERSIDE")) ? "Tống Thiên Long" :
                             campusName && (campusName.toUpperCase().includes("CS2") || campusName.toUpperCase().includes("CENTRAL")) ? "Lê Thị Hoàng Yến" :
                             campusName && (campusName.toUpperCase().includes("CS3") || campusName.toUpperCase().includes("GLOBAL")) ? "Trần Thị Thanh" :
                             campusName && (campusName.toUpperCase().includes("CS4") || campusName.toUpperCase().includes("HILL")) ? "Cao Thanh Trung" :
                             campusName && (campusName.toUpperCase().includes("CS5") || campusName.toUpperCase().includes("BEACH")) ? "Đỗ Quang Trung" : "Trần Thị Thanh";

        const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
        const protocol = req.headers.get("x-forwarded-proto") || "https";
        const baseUrl = `${protocol}://${host}`;

        const congratsTemplate = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thư Chúc Mừng Nhập Học - Sky-Line</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="680" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 32px 28px; text-align: center;">
                      <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                        🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                      </div>
                      <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.3;">
                        THƯ CHÚC MỪNG NHẬP HỌC
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                        Bậc Mầm non • Niên khóa 2025 - 2026
                      </p>
                    </td>
                  </tr>

                  ${additionalNote ? `
                  <tr>
                    <td style="padding: 24px 35px 0 35px;">
                      <div style="padding: 14px 18px; background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 0 8px 8px 0; font-size: 13px; color: #0F766E; line-height: 1.5;">
                        <strong>Lời nhắn từ Tuyển sinh:</strong> ${additionalNote}
                      </div>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Body Text -->
                  <tr>
                    <td style="padding: 28px 35px 20px 35px; font-size: 15px; line-height: 1.7; color: #334155; text-align: justify;">
                      <p style="margin: 0 0 16px 0; font-weight: 700; color: #003B3A;">
                        Kính gửi Quý Phụ huynh và em <strong>${student.fullName}</strong>,
                      </p>
                      <p style="margin: 0 0 16px 0; text-indent: 1.2cm;">
                        Ban Giám Hiệu Hệ thống Giáo dục Mầm non Sky-Line trân trọng gửi lời chúc mừng nồng nhiệt nhất đến Gia đình và Bé. Dựa trên kết quả Khảo sát phát triển toàn diện của trẻ và kết quả phê duyệt chính thức từ Hội đồng Tuyển sinh, Nhà trường trân trọng gửi đến Quý phụ huynh <strong>Thư chúc mừng nhập học</strong> chính thức dành cho bé tại Cơ sở <strong>${student.admissionCampus || ""}</strong>.
                      </p>
                      <p style="margin: 0 0 16px 0; text-indent: 1.2cm;">
                        Nhà trường hy vọng rằng, với sự chăm sóc tận tình và tình yêu thương vô bờ bến từ tập thể giáo viên và nhân viên Sky-Line, con sẽ nhanh chóng hòa nhập, có những trải nghiệm tuổi thơ tuyệt vời, được vui chơi thỏa thích và phát huy tối đa các tiềm năng bẩm sinh của mình.
                      </p>
                      <p style="margin: 0 0 16px 0; text-indent: 1.2cm;">
                        Chúc con luôn giữ vững niềm vui thích học hỏi, luôn tràn đầy năng lượng khám phá thế giới xung quanh con nhé!
                      </p>
                    </td>
                  </tr>

                  <!-- Signature Section -->
                  <tr>
                    <td align="right" style="padding: 10px 35px 25px 35px;">
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="text-align: center; min-width: 250px;">
                        <tr>
                          <td style="font-size: 12px; font-style: italic; color: #64748B; padding-bottom: 6px;">Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase;">TM. HỘI ĐỒNG TUYỂN SINH</td>
                        </tr>
                        <tr>
                          <td style="font-size: 11px; font-weight: 700; color: #00A19A; text-transform: uppercase; padding-bottom: 30px;">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusSuffix}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 14px; font-weight: 800; color: #1E293B; padding-top: 10px;">${directorName}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Call to action button -->
                  <tr>
                    <td align="center" style="padding: 15px 35px 30px 35px; border-top: 1px solid #E2E8F0;">
                      <p style="font-size: 12px; color: #64748B; margin: 0 0 15px 0;">Quý Phụ huynh và Thầy/Cô có thể xem chi tiết hồ sơ học sinh trên hệ thống Portal Tuyển sinh.</p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                        <tr>
                          <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                            <a href="${baseUrl}/admin/preschool-input-assessments" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                              Xem chi tiết trên Portal &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                      <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                        HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                        BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                        Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `;

        let pdfBuffer = null;
        if (browser) {
          try {
            const targetConfig = await (prisma as any).preschoolAssessmentConfig.findFirst({
              where: {
                campusId: campus?.id || "",
                type: "thu_chuc_mung_preschool"
              }
            });

            const docHtml = buildPreschoolLetterHtmlServer(student, targetConfig, false);

            const page = await browser.newPage();
            await page.emulateMediaType("screen");
            await page.setContent(docHtml, { waitUntil: "networkidle0", timeout: 15000 });
            pdfBuffer = await page.pdf({
              format: "A4",
              printBackground: true,
              margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
            });
            await page.close();
          } catch (pdfErr) {
            console.error(`Failed to generate PDF for student ${student.fullName}:`, pdfErr);
          }
        }

        const mailAttachments = [];
        if (pdfBuffer) {
          mailAttachments.push({
            filename: `Thu-chuc-mung-${student.fullName}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          });
        }

        for (const email of recipients) {
          try {
            if (email && email.includes("@")) {
              await sendEmail({
                to: email,
                subject: `[Preschool-Congrats] Thư chúc mừng nhập học - Học sinh \${student.fullName} (\${student.studentCode})`,
                html: congratsTemplate,
                attachments: mailAttachments,
                replyTo: "ktdbcl@skylineschool.edu.vn"
              });
              totalSentCount++;
            }
          } catch (err) {
            console.error(`Lỗi khi gửi email hàng loạt tới \${email} cho học sinh \${student.fullName}:`, err);
            errors.push(`\${student.fullName} (\${email}): \${(err as Error).message}`);
          }
        }
      }

      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          console.error("Failed to close Puppeteer browser:", closeErr);
        }
      }

      return NextResponse.json({ success: true, sentCount: totalSentCount, errors });
    }


    if (action === "CREATE") {
      const result = await (prisma as any).preschoolInputAssessmentStudent.create({
        data: {
           studentCode: data.studentCode,
           fullName: data.fullName,
           dateOfBirth: parseSmartDate(data.dateOfBirth),
           gender: data.gender || null,
           grade: data.grade || null,
           admissionCriteria: null,
           admissionCampus: data.admissionCampus || null,
           registeredCampus: data.registeredCampus || data.admissionCampus || null,
           surveySystem: data.surveySystem || data.surveyFormType || null,
           surveyFormType: data.surveyFormType || data.surveySystem || null,
           intakeMode: data.intakeMode || "KHAO_SAT_MOI",
           appointmentAt: data.appointmentAt ? new Date(data.appointmentAt) : null,
           signatureName: data.signatureName || null,
           periodId: data.periodId,
           batchId: data.batchId || null,
           admissionResult: data.admissionResult || null,
           isAbsent: data.isAbsent || false,
            cityName: data.cityName || null,
            districtName: data.districtName || null,
            wardName: data.wardName || null,
            countryName: data.countryName || null,
            oldSchoolName: data.oldSchoolName || null,
            oldSchoolType: data.oldSchoolType || null,
        }
      });
      return NextResponse.json(result);
    }
    

    if (action === "BULK_CREATE") {
      const results = [];
      const errors = [];
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        try {
          const existing = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
            where: { studentCode_periodId: { studentCode: d.studentCode, periodId: d.periodId } }
          });

          const studentData = {
            fullName: d.fullName,
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
            gender: d.gender || null,
            grade: d.grade || null,
            admissionCriteria: null,
            admissionCampus: d.admissionCampus || null,
            surveySystem: d.surveySystem || null,
            surveyFormType: d.surveyFormType || null,
            signatureName: d.signatureName || null,
            batchId: d.batchId || null,
            isAbsent: d.isAbsent || false,
          };

          let result;
          if (existing) {
            result = await (prisma as any).preschoolInputAssessmentStudent.update({
              where: { id: existing.id },
              data: studentData
            });
          } else {
            result = await (prisma as any).preschoolInputAssessmentStudent.create({
              data: {
                studentCode: d.studentCode,
                periodId: d.periodId,
                ...studentData
              }
            });
          }
          results.push(result);
        } catch (err) {
          errors.push({ row: i + 1, code: d.studentCode, error: err.message });
        }
      }
      return NextResponse.json({ success: true, created: results.length, errors });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, data } = body;

    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id },
      include: { batch: true }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const isBatchLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED";
    if (isBatchLocked) {
      return NextResponse.json({ error: "Đợt khảo sát này ĐÃ BỊ KHÓA! Mọi tính năng nhập, chỉnh sửa, xét duyệt đều bị vô hiệu hóa." }, { status: 403 });
    }
    
    const result = await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id },
      data: {
         fullName: data.fullName,
         dateOfBirth: parseSmartDate(data.dateOfBirth),
         gender: data.gender || null,
         grade: data.grade || null,
         admissionCriteria: null,
         admissionCampus: data.admissionCampus || null,
         ...(data.registeredCampus !== undefined && { registeredCampus: data.registeredCampus || null }),
         surveySystem: data.surveySystem || data.surveyFormType || null,
         surveyFormType: data.surveyFormType || data.surveySystem || null,
         ...(data.intakeMode !== undefined && { intakeMode: data.intakeMode || null }),
         ...(data.appointmentAt !== undefined && { appointmentAt: data.appointmentAt ? new Date(data.appointmentAt) : null }),
         signatureName: data.signatureName || null,
         batchId: data.batchId || null,
         ...(data.admissionResult !== undefined && { admissionResult: data.admissionResult }),
         ...(data.directorNote !== undefined && { directorNote: data.directorNote }),
         ...(data.isAbsent !== undefined && { isAbsent: data.isAbsent }),
         cityName: data.cityName || null,
         districtName: data.districtName || null,
         wardName: data.wardName || null,
         countryName: data.countryName || null,
         oldSchoolName: data.oldSchoolName || null,
         oldSchoolType: data.oldSchoolType || null,
      }
    });

    // Auto-sync Student.studentType if admissionResult is updated
    if (data.admissionResult !== undefined) {
      try {
        const candidateCodes = [result.enrollmentCode, result.studentCode].map((c: any) => (c || "").trim().toUpperCase()).filter(Boolean);
        const matchingStudents = await prisma.student.findMany({
          where: {
            OR: [
              { studentCode: { in: candidateCodes } },
              result.enrollmentClassId && result.fullName ? {
                classId: result.enrollmentClassId,
                studentName: result.fullName.trim()
              } : undefined
            ].filter(Boolean) as any
          }
        });

        const resLower = String(data.admissionResult || "").toLowerCase();
        const isGiaoLuu = resLower.includes("giao lưu") || resLower.includes("giao luu");

        for (const ms of matchingStudents) {
          if (isGiaoLuu && ms.studentType !== "GIAO_LUU") {
            await prisma.student.update({
              where: { id: ms.id },
              data: {
                studentType: "GIAO_LUU",
                studentTypeNote: "Học giao lưu theo kết quả khảo sát đầu vào"
              }
            });
          } else if (!isGiaoLuu && ms.studentType === "GIAO_LUU" && (ms.studentTypeNote || "").includes("khảo sát")) {
            await prisma.student.update({
              where: { id: ms.id },
              data: {
                studentType: "CHINH_KHOA",
                studentTypeNote: null
              }
            });
          }
        }
      } catch (syncErr) {
        console.error("Auto sync Student.studentType error:", syncErr);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    if (ids) {
      const idArr = ids.split(",");
      await (prisma as any).preschoolInputAssessmentStudent.deleteMany({ where: { id: { in: idArr } } });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await (prisma as any).preschoolInputAssessmentStudent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: any) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, ids, targetPeriodId, targetBatchId } = body;

    if (action === "BULK_UPDATE_BATCH") {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Danh sách học sinh không hợp lệ" }, { status: 400 });
      }

      if (!targetPeriodId) {
        return NextResponse.json({ error: "Vui lòng chọn Kỳ khảo sát đích" }, { status: 400 });
      }

      const result = await (prisma as any).preschoolInputAssessmentStudent.updateMany({
        where: { id: { in: ids } },
        data: {
          periodId: targetPeriodId,
          batchId: targetBatchId || null
        }
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}