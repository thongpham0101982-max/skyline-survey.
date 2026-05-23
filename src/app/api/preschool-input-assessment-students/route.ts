import { sendEmail } from "@/lib/mail"

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
    if (batchId) where.batchId = batchId;
    
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

      return NextResponse.json({
        success: true,
        notificationsSent: notificationCount,
        emailsSent: emailSentCount,
        campus: campusName
      });
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
      where: { id }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    
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
