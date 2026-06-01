import { sendEmail } from "@/lib/mail"

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
    .replace(/\{\{academicYear\}\}/g, student?.academicYear || "2025-2026");

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
    : '<svg class="logo-svg" style="height: 48px; fill: #00A6A9;" viewBox="0 0 260 50"><text x="0" y="38" font-family="Arial, sans-serif" font-weight="900" font-size="34" letter-spacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>';

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
        '<span style="font-weight: bold; color: #00A6A9; white-space: nowrap; text-transform: uppercase; font-size: 9.5pt; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>' +
        '<div style="flex-grow: 1; border-top: 1px solid rgba(0, 166, 169, 0.7); height: 0; margin-top: 2px;"></div>' +
        '<span style="font-weight: 600; color: #00A6A9; white-space: nowrap; text-transform: lowercase; font-size: 9pt;">www.skylineschool.edu.vn</span>' +
      '</div>' +
      '<div style="display: flex; justify-content: space-between; font-size: 7.5pt; color: #555555; position: relative; width: 100%;">' +
        '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
          '<div>' +
            '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Riverside</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Lô A2.4 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>' +
          '</div>' +
          '<div>' +
            '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Central</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Số 48 Nguyễn Du, Q. Hải Châu, TP. Đà Nẵng</p>' +
          '</div>' +
        '</div>' +
        '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
          '<div>' +
            '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Global</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Lô A2 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>' +
          '</div>' +
          '<div>' +
            '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Beach</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Số 199 Trần Anh Tông, Q. Thanh Khê, TP. Đà Nẵng</p>' +
          '</div>' +
        '</div>' +
        '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
          '<div>' +
            '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Hill</p>' +
            '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Khối Hà My Đông A, Điện Bàn, Quảng Nam</p>' +
          '</div>' +
          '<div style="display: flex; flex-direction: column; line-height: 1.35; font-weight: 600; color: #1e293b;">' +
            '<p style="margin: 0;">(+84.236) 378 7777</p>' +
            '<p style="margin: 0;">(+84.236) 356 8777</p>' +
          '</div>' +
        '</div>' +
        '<div style="position: absolute; right: -4px; top: -4px; width: 50px; height: 38px; pointer-events: none; display: flex; align-items: center; justify-content: center; color: #00A6A9;">' +
          '<svg viewBox="0 0 120 60" style="width: 100%; height: 100%; fill: currentColor;">' +
            '<path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />' +
          '</svg>' +
        '</div>' +
      '</div>' +
    '</div>';

  const bgHtml = config.background 
    ? getImgTag(config.background, "print-watermark", "", "Watermark") 
    : '<svg class="print-watermark" style="display: block; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 110mm; height: auto; opacity: 0.04; z-index: 1; pointer-events: none;" viewBox="0 0 100 100"><path fill="#00A6A9" d="M10,80 Q50,40 90,20 Q60,50 10,80 Z" /><path fill="#00A6A9" d="M30,80 Q60,55 90,35 Q65,60 30,80 Z" /></svg>';

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
          '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1.5px solid #00A6A9; padding-bottom: 8px; margin-bottom: 24px;">' +
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
  if (!campusName) return "bankhaothi@skylineschool.edu.vn";
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
  
  return "bankhaothi@skylineschool.edu.vn";
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
    
    const where: any = periodId ? { periodId } : {};
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
      include: { batch: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(students);
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
            <td style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #1e293b;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; background-color: ${area.bg}; color: ${area.color}; font-size: 12px; font-weight: 800; border: 1px solid ${area.color}20;">
                ${area.name}
              </span>
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #475569; text-align: center;">
              ${total}
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #10b981; text-align: center;">
              ${dat}
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; font-weight: bold; color: #ef4444; text-align: center;">
              ${khongDat}
            </td>
            <td align="center" style="padding: 14px 15px; font-size: 13px; text-align: center;">
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
      <html>
      <head>
        <meta charset="utf-8">
        <title>Kết Quả Khảo Sát Năng Lực Đầu Vào Mầm Non</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 25px 0;">
          <tr>
            <td align="center">
              <table width="700" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #ec4899 60%, #f59e0b 100%); padding: 35px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 21px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; line-height: 1.3;">KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO</h1>
                    <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Bậc Mầm non - Hệ thống Trường Sky-Line</p>
                  </td>
                </tr>
                
                <!-- Intro -->
                <tr>
                  <td style="padding: 25px 30px 15px 30px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #334155;">
                      Kính gửi bộ phận Tuyển sinh,
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Hội đồng tuyển sinh xin gửi báo cáo kết quả khảo sát năng lực đầu vào mầm non của học sinh <strong>${student.fullName}</strong>. Chi tiết báo cáo như sau:
                    </p>
                  </td>
                </tr>
                
                <!-- Student Profile Table -->
                <tr>
                  <td style="padding: 0 30px 15px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <tr style="background-color: #f8fafc;">
                        <td colspan="4" style="padding: 10px 15px; font-weight: bold; font-size: 13px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
                          Thông tin học sinh
                        </td>
                      </tr>
                      <tr>
                        <td width="20%" style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">Mã học sinh:</td>
                        <td width="30%" style="padding: 12px 15px; font-size: 13px; color: #1e293b; font-weight: bold; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">${student.studentCode}</td>
                        <td width="20%" style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">Họ và tên:</td>
                        <td width="30%" style="padding: 12px 15px; font-size: 13px; color: #1e293b; font-weight: bold; border-bottom: 1px solid #f1f5f9;">${student.fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">Ngày sinh:</td>
                        <td style="padding: 12px 15px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">${dobStr}</td>
                        <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9;">Giới tính:</td>
                        <td style="padding: 12px 15px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${genderStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #64748b; border-right: 1px solid #f1f5f9;">Lớp/Nhóm tuổi:</td>
                        <td style="padding: 12px 15px; font-size: 13px; color: #1e293b; border-right: 1px solid #f1f5f9;">${student.grade || "-"}</td>
                        <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; color: #64748b; border-right: 1px solid #f1f5f9;">Cơ sở đăng ký:</td>
                        <td style="padding: 12px 15px; font-size: 13px; color: #1e293b; font-weight: 600;">${student.admissionCampus || "-"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Physical Measurements and BMI Card -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 15px;">
                      <tr>
                        <td width="33%" style="text-align: center; border-right: 1px solid #e2e8f0; padding: 5px 0;">
                          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Chiều cao</div>
                          <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 4px;">${heightStr}</div>
                        </td>
                        <td width="33%" style="text-align: center; border-right: 1px solid #e2e8f0; padding: 5px 0;">
                          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Cân nặng</div>
                          <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 4px;">${weightStr}</div>
                        </td>
                        <td width="34%" style="text-align: center; padding: 5px 0;">
                          <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Chỉ số BMI</div>
                          <div style="font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${bmiVal ? bmiVal : "-"}</div>
                          ${bmiBadgeHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Developmental Criteria Table -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <thead>
                        <tr style="background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%); color: #ffffff;">
                          <th align="left" style="padding: 12px 15px; font-size: 13px; font-weight: bold; width: 45%;">Lĩnh vực phát triển</th>
                          <th align="center" style="padding: 12px 15px; font-size: 13px; font-weight: bold; width: 15%; text-align: center;">Tổng tiêu chí</th>
                          <th align="center" style="padding: 12px 15px; font-size: 13px; font-weight: bold; width: 13%; text-align: center; color: #a7f3d0;">Đạt</th>
                          <th align="center" style="padding: 12px 15px; font-size: 13px; font-weight: bold; width: 13%; text-align: center; color: #fecdd3;">K.Đạt</th>
                          <th align="center" style="padding: 12px 15px; font-size: 13px; font-weight: bold; width: 14%; text-align: center;">Kết quả</th>
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
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <tr style="background-color: #f8fafc;">
                        <td style="padding: 10px 15px; font-weight: bold; font-size: 13px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
                          Nhận xét của Giáo viên khảo sát
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px; font-size: 13px; color: #334155; line-height: 1.6;">
                          <div style="margin-bottom: 10px;">
                            <strong style="color: #1e293b;">• Nhận xét Chuyên môn:</strong>
                            <div style="margin-top: 3px; color: #475569; padding-left: 10px; border-left: 2px solid #e2e8f0;">${proComment}</div>
                          </div>
                          <div style="margin-bottom: 10px;">
                            <strong style="color: #1e293b;">• Nhận xét Tâm lý:</strong>
                            <div style="margin-top: 3px; color: #475569; padding-left: 10px; border-left: 2px solid #e2e8f0;">${psyComment}</div>
                          </div>
                          <div>
                            <strong style="color: #1e293b;">• Lưu ý đặc biệt:</strong>
                            <div style="margin-top: 3px; color: #b45309; font-weight: 500; padding-left: 10px; border-left: 2px solid #f59e0b;">${impNote}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- 2-Step Approval Segment -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                      <tr style="background-color: #f8fafc;">
                        <td colspan="2" style="padding: 10px 15px; font-weight: bold; font-size: 13px; color: #4f46e5; border-bottom: 1px solid #e2e8f0; text-transform: uppercase;">
                          Ý kiến Phê duyệt &amp; Đề xuất
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" valign="top" style="padding: 15px; font-size: 13px; color: #334155; border-right: 1px solid #e2e8f0; line-height: 1.6;">
                          <div style="margin-bottom: 8px;">
                            <strong style="color: #1e293b;">Ban Giám hiệu Mầm non:</strong>
                          </div>
                          <div style="margin-bottom: 8px;">
                            ${bghBadge}
                          </div>
                          <div>
                            <span style="font-size: 12px; color: #64748b; font-style: italic;">Ý kiến:</span>
                            <div style="margin-top: 2px; color: #475569; font-size: 13px;">${bghComment}</div>
                          </div>
                        </td>
                        <td width="50%" valign="top" style="padding: 15px; font-size: 13px; color: #334155; line-height: 1.6;">
                          <div style="margin-bottom: 8px;">
                            <strong style="color: #1e293b;">Giám đốc Cơ sở:</strong>
                          </div>
                          <div style="margin-bottom: 8px;">
                            ${gdcsBadge}
                          </div>
                          <div>
                            <span style="font-size: 12px; color: #64748b; font-style: italic;">Ý kiến:</span>
                            <div style="margin-top: 2px; color: #475569; font-size: 13px;">${gdcsComment}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Final Result & Call to Action -->
                <tr>
                  <td style="padding: 10px 30px 35px 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                    <div style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">KẾT LUẬN CUỐI CÙNG</div>
                    <div style="margin-bottom: 25px;">
                      ${finalResultBadgeHtml}
                    </div>
                    <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b; font-style: italic; line-height: 1.5;">
                      Báo cáo này được tự động định tuyến đến Tư vấn Tuyển sinh của Cơ sở dựa trên hồ sơ nhập học của bé. Vui lòng liên hệ phụ huynh để thông báo kết quả.
                    </p>
                    <a href="${baseUrl}/admin/preschool-input-assessments" style="display: inline-block; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%); text-decoration: none; border: 1px solid #d946ef; box-shadow: 0 4px 10px -1px rgba(236, 72, 153, 0.35);">
                      Quản lý trên Hệ thống Portal
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; font-size: 11px; color: #64748b;">
                    <p style="margin: 0;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #334155;">HỘI ĐỒNG TUYỂN SINH - HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                    <p style="margin: 8px 0 0 0; color: #4f46e5; font-weight: 600;">Mọi thắc mắc vui lòng liên hệ Ban Khảo thí qua email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #4f46e5; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a></p>
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
          replyTo: "bankhaothi@skylineschool.edu.vn"
        });
        return NextResponse.json({ success: true, email: resolvedEmail });
      } catch (err) {
        return NextResponse.json({ error: "Gửi email thất bại: " + err.message }, { status: 500 });
      }
    }

    if (action === "SEND_APPROVAL_NOTIFICATION") {
      const { studentId } = body;
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

      const campusName = student.admissionCampus;
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

      let resolvedUsers = [];

      if (campus) {
        // Find all users assigned to this campus
        const assignments = await (prisma as any).userCampusAssignment.findMany({
          where: { campusId: campus.id },
          include: { user: true }
        });

        const assignedUsers = assignments.map((a: any) => a.user);

        // Filter users by BGH or GDCS roles
        resolvedUsers = assignedUsers.filter((u: any) => {
          const role = (u.role || "").toUpperCase();
          const isBgh = ["KT_DBCL", "BGH MN", "BGH_MN", "ADMIN"].includes(role);
          const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS", "ADMIN"].includes(role);
          return isBgh || isGdcs;
        });
      }

      // If no specific campus assignments found, fallback to system admins and BGH users
      if (resolvedUsers.length === 0) {
        const allUsers = await (prisma as any).user.findMany();
        resolvedUsers = allUsers.filter((u: any) => {
          const role = (u.role || "").toUpperCase();
          return ["ADMIN", "KT_DBCL", "BGH MN", "BGH_MN"].includes(role);
        });
      }

      // Create Notification records and Send Alert Emails in parallel
      let notificationCount = 0;
      let emailSentCount = 0;

      const title = `[Preschool-Survey] Yêu cầu phê duyệt kết quả đầu vào - Bé ${student.fullName}`;
      const message = `Kính gửi thầy/cô, học sinh ${student.fullName} (${student.studentCode}) thuộc Cơ sở ${campusName} đã hoàn thành khảo sát đầu vào. Kính đề xuất thầy/cô truy cập hệ thống để tiến hành phê duyệt học thử cho bé.`;

      const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      // 1. Send personalized emails to dynamic campus BGH & GĐCS users, and create in-app notifications
      for (const u of resolvedUsers) {
        try {
          // Insert in-app Notification
          await (prisma as any).notification.create({
            data: {
              userId: u.id,
              title,
              message
            }
          });
          notificationCount++;

          // Send Email Alert
          if (u.email && u.email.includes("@")) {
            const emailBody = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
              </head>
              <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', sans-serif; background-color: #f1f5f9; color: #1e293b;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; padding: 25px;">
                  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
                     <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">Yêu Cầu Phê Duyệt Khảo Sát</h2>
                     <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Bậc Mầm non - Hệ thống Trường Sky-Line</p>
                  </div>
                  <p style="font-size: 14px; line-height: 1.6;">Kính gửi thầy/cô <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 14px; line-height: 1.6;">Học sinh <strong>${student.fullName}</strong> (Mã HS: <strong>${student.studentCode}</strong>) thuộc <strong>Cơ sở ${campusName}</strong> đã hoàn thành các bài khảo sát năng lực đầu vào và nhận xét từ giáo viên chuyên môn.</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #d97706; font-weight: bold; background-color: #fffbeb; padding: 10px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                     ⚠️ Kính đề xuất Ban Giám Hiệu và Giám Đốc Cơ sở tiến hành xem xét phê duyệt trực tuyến để Tuyển sinh có thể xuất báo cáo kết quả gửi phụ huynh.
                  </p>
                  <div style="text-align: center; margin: 25px 0;">
                    <a href="${baseUrl}/admin/preschool-input-assessments" style="display: inline-block; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); text-decoration: none; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                      Đi tới phê duyệt trên Portal
                    </a>
                  </div>
                  <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                  <p style="font-size: 11px; color: #64748b; margin: 0; text-align: center;">Email được gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                </div>
              </body>
              </html>
            `;

            await sendEmail({
              to: u.email,
              subject: `[Preschool-Approval] Yêu cầu duyệt kết quả khảo sát đầu vào - Bé ${student.fullName} (${campusName})`,
              html: emailBody,
              replyTo: "bankhaothi@skylineschool.edu.vn"
            });
            emailSentCount++;
          }
        } catch (err) {
          console.error("Lỗi khi gửi thông báo tới user:", u.id, err);
        }
      }

      // 2. Also send a copy to bankhaothi@skylineschool.edu.vn if not already in the resolved list
      const hasBankKhaoThi = resolvedUsers.some((u) => u.email && u.email.toLowerCase() === "bankhaothi@skylineschool.edu.vn");
      if (!hasBankKhaoThi) {
        try {
          const emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', sans-serif; background-color: #f1f5f9; color: #1e293b;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; padding: 25px;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
                   <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">Yêu Cầu Phê Duyệt Khảo Sát (Bản sao)</h2>
                   <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Bậc Mầm non - Hệ thống Trường Sky-Line</p>
                </div>
                <p style="font-size: 14px; line-height: 1.6;">Kính gửi Ban Khảo Thí và các cán bộ liên quan,</p>
                <p style="font-size: 14px; line-height: 1.6;">Học sinh <strong>${student.fullName}</strong> (Mã HS: <strong>${student.studentCode}</strong>) thuộc <strong>Cơ sở ${campusName}</strong> đã hoàn thành các bài khảo sát năng lực đầu vào và nhận xét từ giáo viên chuyên môn.</p>
                <p style="font-size: 14px; line-height: 1.6; color: #d97706; font-weight: bold; background-color: #fffbeb; padding: 10px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                   ⚠️ Kính đề xuất Ban Giám Hiệu và Giám Đốc Cơ sở tiến hành xem xét phê duyệt trực tuyến để Tuyển sinh có thể xuất báo cáo kết quả gửi phụ huynh.
                </p>
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${baseUrl}/admin/preschool-input-assessments" style="display: inline-block; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: bold; color: #ffffff; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); text-decoration: none; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                    Đi tới phê duyệt trên Portal
                  </a>
                </div>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                <p style="font-size: 11px; color: #64748b; margin: 0; text-align: center;">Email được gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
              </div>
            </body>
            </html>
          `;

          await sendEmail({
            to: "bankhaothi@skylineschool.edu.vn",
            subject: `[Preschool-Approval] Yêu cầu duyệt kết quả khảo sát đầu vào - Bé ${student.fullName} (${campusName})`,
            html: emailBody,
            replyTo: "bankhaothi@skylineschool.edu.vn"
          });
          emailSentCount++;
        } catch (err) {
          console.error("Lỗi khi gửi email bản sao tới bankhaothi:", err);
        }
      }

      return NextResponse.json({
        success: true,
        notificationsSent: notificationCount,
        emailsSent: emailSentCount,
        campus: campusName
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
        email: "bankhaothi@skylineschool.edu.vn",
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
      const allUsers = await (prisma as any).user.findMany();
      const allAssignments = await (prisma as any).userCampusAssignment.findMany({
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
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; background-color: #f8fafc; color: #1e293b;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="680" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; padding: 40px 30px;">
                <tr>
                  <td align="left" style="border-bottom: 2px solid #00A6A9; padding-bottom: 15px; margin-bottom: 20px;">
                    <div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; color: #00A6A9; letter-spacing: -0.5px;">SKY-LINE SYSTEM</div>
                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; margin-top: 3px;">Hệ thống Giáo dục Sky-Line</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 25px 0;">
                    <h2 style="font-size: 24px; font-weight: bold; color: #1e1b4b; text-transform: uppercase; margin: 0; letter-spacing: 1px; font-family: 'Times New Roman', Times, serif;">
                      THƯ CHÚC MỪNG NHẬP HỌC
                    </h2>
                  </td>
                </tr>
                ${additionalNote ? `
                <tr>
                  <td style="padding: 12px 15px; background-color: #f0fdfa; border-left: 4px solid #00A6A9; border-radius: 6px; font-family: Arial, sans-serif; font-size: 13px; color: #0f766e; margin-bottom: 20px; line-height: 1.5;">
                    <strong>Lời nhắn từ Tuyển sinh:</strong> ${additionalNote}
                  </td>
                </tr>
                <tr style="height: 20px;"><td></td></tr>
                ` : ''}
                <tr>
                  <td style="font-size: 16px; line-height: 1.6; color: #334155; text-align: justify;">
                    <p style="margin: 0 0 15px 0; font-style: italic;">Kính gửi Quý Phụ huynh và em <strong>${student.fullName}</strong>,</p>
                    <p style="margin: 0 0 15px 0; text-indent: 1.2cm;">
                      Ban Giám Hiệu Hệ thống Giáo dục Mầm non Sky-Line trân trọng gửi lời chúc mừng nồng nhiệt nhất đến Gia đình và Bé. Dựa trên kết quả Khảo sát phát triển toàn diện của trẻ và kết quả phê duyệt chính thức từ Hội đồng Tuyển sinh, Nhà trường trân trọng gửi đến Quý phụ huynh <strong>Thư chúc mừng nhập học</strong> chính thức dành cho bé tại Cơ sở <strong>${student.admissionCampus || ""}</strong>.
                    </p>
                    <p style="margin: 0 0 15px 0; text-indent: 1.2cm;">
                      Nhà trường hy vọng rằng, với sự chăm sóc tận tình và tình yêu thương vô bờ bến từ tập thể giáo viên và nhân viên Sky-Line, con sẽ nhanh chóng hòa nhập, có những trải nghiệm tuổi thơ tuyệt vời, được vui chơi thỏa thích và phát huy tối đa các năng lực bẩm sinh của mình.
                    </p>
                    <p style="margin: 0 0 15px 0; text-indent: 1.2cm;">
                      Chúc con luôn giữ vững niềm vui thích học hỏi, luôn tràn đầy năng lượng khám phá thế giới xung quanh con nhé!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="right" style="padding-top: 30px; padding-right: 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="text-align: center; min-width: 240px; font-family: Arial, sans-serif;">
                      <tr>
                        <td style="font-size: 11px; font-style: italic; color: #64748b; padding-bottom: 5px;">Đà Nẵng, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; font-weight: bold; color: #1e1b4b; text-transform: uppercase;">TM. HỘI ĐỒNG TUYỂN SINH</td>
                      </tr>
                      <tr>
                        <td style="font-size: 10px; font-weight: bold; color: #4338ca; text-transform: uppercase; padding-bottom: 40px;">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusSuffix}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; font-weight: bold; color: #334155; padding-top: 10px;">${directorName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 35px; border-top: 1px solid #e2e8f0; margin-top: 30px;">
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Bạn có thể xem chi tiết hồ sơ học sinh trên hệ thống Portal Tuyển sinh.</p>
                    <a href="${baseUrl}/admin/preschool-input-assessments" style="display: inline-block; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: bold; color: #ffffff; background-color: #00A6A9; text-decoration: none; border: 1px solid #008f91;">
                      Xem chi tiết trên Portal
                    </a>
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
              replyTo: "bankhaothi@skylineschool.edu.vn"
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
          recipients.push("bankhaothi@skylineschool.edu.vn");
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
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; background-color: #f8fafc; color: #1e293b;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 0;">
            <tr>
              <td align="center">
                <table width="680" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; padding: 40px 30px;">
                  <tr>
                    <td align="left" style="border-bottom: 2px solid #00A6A9; padding-bottom: 15px; margin-bottom: 20px;">
                      <div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; color: #00A6A9; letter-spacing: -0.5px;">SKY-LINE SYSTEM</div>
                      <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; margin-top: 3px;">Hệ thống Giáo dục Sky-Line</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 25px 0;">
                      <h2 style="font-size: 24px; font-weight: bold; color: #1e1b4b; text-transform: uppercase; margin: 0; letter-spacing: 1px; font-family: 'Times New Roman', Times, serif;">
                        THƯ CHÚC MỪNG NHẬP HỌC
                      </h2>
                    </td>
                  </tr>
                  \${additionalNote ? \`
                  <tr>
                    <td style="padding: 12px 15px; background-color: #f0fdfa; border-left: 4px solid #00A6A9; border-radius: 6px; font-family: Arial, sans-serif; font-size: 13px; color: #0f766e; margin-bottom: 20px; line-height: 1.5;">
                      <strong>Lời nhắn từ Tuyển sinh:</strong> \${additionalNote}
                    </td>
                  </tr>
                  <tr style="height: 20px;"><td></td></tr>
                  \` : ''}
                  <tr>
                    <td style="font-size: 16px; line-height: 1.6; color: #334155; text-align: justify;">
                      <p style="margin: 0 0 15px 0; font-style: italic;">Kính gửi Quý Phụ huynh và em <strong>\${student.fullName}</strong>,</p>
                      <p style="margin: 0 0 15px 0; text-indent: 1.2cm;">
                        Ban Giám Hiệu Hệ thống Giáo dục Mầm non Sky-Line trân trọng gửi lời chúc mừng nồng nhiệt nhất đến Gia đình và Bé. Dựa trên kết quả Khảo sát phát triển toàn diện của trẻ và kết quả phê duyệt chính thức từ Hội đồng Tuyển sinh, Nhà trường trân trọng gửi đến Quý phụ huynh <strong>Thư chúc mừng nhập học</strong> chính thức dành cho bé tại Cơ sở <strong>\${student.admissionCampus || ""}</strong>.
                      </p>
                      <p style="margin: 0 0 15px 0; text-indent: 1.2cm;">
                        Nhà trường hy vọng rằng, với sự chăm sóc tận tình và tình yêu thương vô bờ bến từ tập thể giáo viên và nhân viên Sky-Line, con sẽ nhanh chóng hòa nhập, có những trải nghiệm tuổi thơ tuyệt vời, được vui chơi thỏa thích và phát huy tối đa các năng lực bẩm sinh của mình.
                      </p>
                      <p style="margin: 0 0 15px 0; text-indent: 1.2cm;">
                        Chúc con luôn giữ vững niềm vui thích học hỏi, luôn tràn đầy năng lượng khám phá thế giới xung quanh con nhé!
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="right" style="padding-top: 30px; padding-right: 20px;">
                      <table border="0" cellspacing="0" cellpadding="0" style="text-align: center; min-width: 240px; font-family: Arial, sans-serif;">
                        <tr>
                          <td style="font-size: 11px; font-style: italic; color: #64748b; padding-bottom: 5px;">Đà Nẵng, ngày \${new Date().getDate()} tháng \${new Date().getMonth() + 1} năm \${new Date().getFullYear()}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: bold; color: #1e1b4b; text-transform: uppercase;">TM. HỘI ĐỒNG TUYỂN SINH</td>
                        </tr>
                        <tr>
                          <td style="font-size: 10px; font-weight: bold; color: #4338ca; text-transform: uppercase; padding-bottom: 40px;">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE \${campusSuffix}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 14px; font-weight: bold; color: #334155; padding-top: 10px;">\${directorName}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 35px; border-top: 1px solid #e2e8f0; margin-top: 30px;">
                      <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Bạn có thể xem chi tiết hồ sơ học sinh trên hệ thống Portal Tuyển sinh.</p>
                      <a href="\${baseUrl}/admin/preschool-input-assessments" style="display: inline-block; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: bold; color: #ffffff; background-color: #00A6A9; text-decoration: none; border: 1px solid #008f91;">
                        Xem chi tiết trên Portal
                      </a>
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
                replyTo: "bankhaothi@skylineschool.edu.vn"
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
           dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
           gender: data.gender || null,
           grade: data.grade || null,
           admissionCriteria: null,
           admissionCampus: data.admissionCampus || null,
           surveySystem: data.surveySystem || null,
           surveyFormType: data.surveyFormType || null,
           signatureName: data.signatureName || null,
           periodId: data.periodId,
           batchId: data.batchId || null,
           admissionResult: data.admissionResult || null,
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
         dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
         gender: data.gender || null,
         grade: data.grade || null,
         admissionCriteria: null,
         admissionCampus: data.admissionCampus || null,
         surveySystem: data.surveySystem || null,
         surveyFormType: data.surveyFormType || null,
         signatureName: data.signatureName || null,
         batchId: data.batchId || null,
         ...(data.admissionResult !== undefined && { admissionResult: data.admissionResult }),
         ...(data.directorNote !== undefined && { directorNote: data.directorNote }),
      }
    });
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
