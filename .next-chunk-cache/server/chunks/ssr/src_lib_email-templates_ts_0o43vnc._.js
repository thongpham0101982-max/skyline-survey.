module.exports=[260309,a=>{"use strict";let b={teal:{bg:"#00A19A",gradientStart:"#003B3A",gradientEnd:"#00A19A",accent:"#00A19A",badgeBg:"rgba(255, 255, 255, 0.18)",badgeBorder:"rgba(255, 255, 255, 0.35)",badgeText:"#FFFFFF"},emerald:{bg:"#059669",gradientStart:"#064E3B",gradientEnd:"#059669",accent:"#059669",badgeBg:"rgba(255, 255, 255, 0.18)",badgeBorder:"rgba(255, 255, 255, 0.35)",badgeText:"#FFFFFF"},amber:{bg:"#D97706",gradientStart:"#78350F",gradientEnd:"#D97706",accent:"#D97706",badgeBg:"rgba(255, 255, 255, 0.18)",badgeBorder:"rgba(255, 255, 255, 0.35)",badgeText:"#FFFFFF"},rose:{bg:"#E11D48",gradientStart:"#881337",gradientEnd:"#E11D48",accent:"#E11D48",badgeBg:"rgba(255, 255, 255, 0.18)",badgeBorder:"rgba(255, 255, 255, 0.35)",badgeText:"#FFFFFF"},indigo:{bg:"#4F46E5",gradientStart:"#312E81",gradientEnd:"#4F46E5",accent:"#4F46E5",badgeBg:"rgba(255, 255, 255, 0.18)",badgeBorder:"rgba(255, 255, 255, 0.35)",badgeText:"#FFFFFF"}};function c(a){let{headerBadge:c,headerTitle:d,headerSubtitle:e="Hệ thống Quản trị Giáo dục Sky-line SMS",headerTheme:f="teal",recipientName:g,greetingPrefix:h="Kính gửi Thầy/Cô",introMessage:i,details:j=[],detailsTitle:k,noticeBox:l,extraHtml:m,button:n,secondaryNote:o}=a,p=b[f]||b.teal,q=new Date().getFullYear(),r=j.length>0?`
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      ${k?`<div style="font-size: 13px; font-weight: 800; color: #00A19A; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">${k}</div>`:""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.5; border-collapse: collapse;">
        ${j.map((a,b)=>`
          <tr style="${b<j.length-1?"border-bottom: 1px solid #EEF2F6;":""}">
            <td style="padding: 10px 0; color: #64748B; width: 42%; font-weight: 600; vertical-align: top;">
              ${a.icon?`<span style="margin-right: 6px;">${a.icon}</span>`:""}${a.label}:
            </td>
            <td style="padding: 10px 0 10px 10px; color: ${a.color||(a.highlight?"#00A19A":"#0F172A")}; font-weight: ${a.highlight?"800":"600"}; vertical-align: top;">
              ${a.value}
            </td>
          </tr>
        `).join("")}
      </table>
    </div>
  `:"",s="";if(l){let a="#F0FDFA",b="#00A19A",c="#004D47",d="💡";"warning"===l.type?(a="#FFFBEB",b="#F59E0B",c="#92400E",d="⚠️"):"success"===l.type?(a="#F0FDF4",b="#10B981",c="#14532D",d="✅"):"note"===l.type&&(a="#F8FAFC",b="#64748B",c="#334155",d="📌"),s=`
      <div style="background-color: ${a}; border-left: 4px solid ${b}; border-radius: 8px; padding: 12px 16px; margin: 18px 0;">
        ${l.title?`<div style="font-size: 12px; font-weight: 800; color: ${c}; text-transform: uppercase; margin-bottom: 4px;">${d} ${l.title}</div>`:""}
        <div style="font-size: 13px; color: ${c}; line-height: 1.5; ${!l.title?"font-weight: 500;":""}">
          ${!l.title?`<span style="margin-right: 4px;">${d}</span>`:""}${l.content}
        </div>
      </div>
    `}let t=n?`
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto 20px auto; border-collapse: separate;">
      <tr>
        <td align="center" bgcolor="${n.color||p.accent}" style="border-radius: 10px; background-color: ${n.color||p.accent};">
          <a href="${n.url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px; border: 1px solid ${n.color||p.accent};">
            ${n.text}
          </a>
        </td>
      </tr>
    </table>
  `:"";return`
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${d}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; min-width: 100%; padding: 24px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Top Sky-Line Brand Mini Bar -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin-bottom: 12px;">
          <tr>
            <td align="left" style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #00A19A;">
              🏫 HỆ THỐNG GI\xc1O DỤC SKY-LINE
            </td>
            <td align="right" style="font-size: 11px; font-weight: 600; color: #94A3B8;">
              Khảo Th\xed & ĐBCL
            </td>
          </tr>
        </table>

        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          
          <!-- Card Header (Outlook-proof solid bgcolor with gradient overlay) -->
          <tr>
            <td bgcolor="${p.bg}" align="center" style="background-color: ${p.bg}; background: linear-gradient(135deg, ${p.gradientStart} 0%, ${p.gradientEnd} 100%); padding: 30px 24px; text-align: center; border-bottom: 3px solid rgba(255, 255, 255, 0.2);">
              
              ${c?`
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
                  <tr>
                    <td align="center" style="background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${c}
                    </td>
                  </tr>
                </table>
              `:""}

              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.35; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${d}
              </h1>

              ${e?`
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #E6F4F3; opacity: 0.95; font-weight: 500;">
                  ${e}
                </p>
              `:""}
            </td>
          </tr>

          <!-- Card Body Content -->
          <tr>
            <td style="padding: 28px 28px 24px 28px; background-color: #FFFFFF;">
              
              <!-- Recipient Greeting -->
              <p style="font-size: 15px; color: #0F172A; margin: 0 0 12px 0; line-height: 1.5; font-weight: 500;">
                ${h} <strong style="color: #00A19A; font-weight: 800;">${g}</strong>,
              </p>

              <!-- Intro Message -->
              <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 16px;">
                ${i}
              </div>

              <!-- Details Grid -->
              ${r}

              <!-- Extra HTML (Scores, comments, etc.) -->
              ${m||""}

              <!-- Notice Box -->
              ${s}

              <!-- Call To Action Button -->
              ${t}

              <!-- Secondary Note -->
              ${o?`
                <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 20px 0 0 0; line-height: 1.5;">
                  ${o}
                </p>
              `:""}
            </td>
          </tr>

          <!-- Card Footer -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; border-top: 3px solid #00A19A; padding: 22px 24px; text-align: center; font-size: 11px; color: #CCFBF1; line-height: 1.6;">
              <div style="font-weight: 800; color: #FFFFFF; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                HỆ THỐNG GI\xc1O DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </div>
              <div style="color: #CCFBF1; font-weight: 600; font-size: 11px;">
                BAN Đ\xc0O TẠO & KHẢO TH\xcd ĐẢM BẢO CHẤT LƯỢNG GI\xc1O DỤC
              </div>
              <div style="margin-top: 6px; color: rgba(255, 255, 255, 0.75); font-size: 10.5px;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">ktdbcl@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
              </div>
              <div style="margin-top: 6px; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                \xa9 ${q} Sky-Line Education System. All rights reserved.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()}let d="https://ssm.skylineschool.edu.vn/login";a.s(["SKYLINE_SSM_LOGIN_URL",0,d,"renderCthsCampusWorkLogEmail",0,function(a){let b=a.directLink||d,e=!!a.isDraft,f=(a.workItems||[]).map((a,b)=>{let c="COMPLETED"===a.status;return`
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 8px; font-weight: 800; color: #005B58; font-size: 12px; vertical-align: top; text-align: center; width: 28px;">
            ${b+1}
          </td>
          <td style="padding: 10px 10px; font-size: 12px; color: #1E293B; vertical-align: top;">
            <div style="font-weight: 700;">${a.name||"Đầu việc"}</div>
            ${a.followUpNotes?`<div style="font-size: 11px; color: #B45309; margin-top: 3px; font-weight: 600;">⚡ Kế hoạch tiếp tục: ${a.followUpNotes}</div>`:""}
            ${a.notes?`<div style="font-size: 11px; color: #64748B; margin-top: 2px;">📝 Ghi ch\xfa: ${a.notes}</div>`:""}
          </td>
          <td style="padding: 10px 8px; text-align: right; vertical-align: top; width: 120px;">
            ${c?'<span style="background-color: #D1FAE5; color: #047857; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid #A7F3D0;">Hoàn thành</span>':'<span style="background-color: #FEF3C7; color: #92400E; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; border: 1px solid #FDE68A;">Tiếp tục thực hiện</span>'}
          </td>
        </tr>
      `}).join(""),g=`
    <!-- Campus & Periods Summary Badge -->
    <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 14px 18px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">Cơ sở l\xe0m việc:</div>
            <div style="font-size: 16px; font-weight: 900; color: #004D47; margin-top: 2px;">
              ${a.campusName}
              <span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background-color: ${a.isInterCampus?"#EDE9FE":"#E0F2FE"}; color: ${a.isInterCampus?"#6D28D9":"#0369A1"}; margin-left: 6px;">
                ${a.isInterCampus?"Liên cơ sở":"Nội bộ cơ sở"}
              </span>
            </div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px;">Số tiết ghi nhận:</div>
            <span style="font-size: 16px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 4px 12px; border-radius: 8px; display: inline-block;">
              ${a.totalPeriods} tiết thực tế
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Work Items Table -->
    <div style="margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 800; color: #003B3A; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
        📋 Danh s\xe1ch đầu việc (${a.workItems?.length||0} việc)
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
            <th style="padding: 8px 6px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; text-align: center; width: 28px;">#</th>
            <th style="padding: 8px 10px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; text-align: left;">Nội dung đầu việc</th>
            <th style="padding: 8px 8px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; text-align: right; width: 120px;">Trạng th\xe1i</th>
          </tr>
        </thead>
        <tbody>
          ${f||'<tr><td colspan="3" style="padding: 16px; text-align: center; color: #94A3B8; font-size: 12px;">Chưa có danh sách đầu việc</td></tr>'}
        </tbody>
      </table>
    </div>

    ${a.generalNotes?`
    <!-- General Notes -->
    <div style="background-color: #F8FAFC; border-left: 4px solid #00A19A; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
      <div style="font-size: 12px; font-weight: 800; color: #005B58; text-transform: uppercase; margin-bottom: 4px;">📝 Ghi ch\xfa & Đề xuất phối hợp:</div>
      <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line;">${a.generalNotes}</div>
    </div>
    `:""}
  `;return c({headerBadge:e?"📝 LỊCH LÀM VIỆC DỰ KIẾN":"🏢 BIÊN BẢN LÀM VIỆC TẠI CƠ SỞ",headerTitle:e?"ĐĂNG KÝ LỊCH LÀM VIỆC TẠI CƠ SỞ":"BIÊN BẢN LÀM VIỆC TẠI CƠ SỞ",headerSubtitle:"Tổ Công tác Học sinh (CTHS) – Ban HĐNGLL",headerTheme:"teal",recipientName:a.staffName,introMessage:e?`Hệ thống vừa ghi nhận kế hoạch l\xe0m việc tại cơ sở của nh\xe2n sự <strong>${a.staffName}</strong>. Chi tiết kế hoạch:`:`Buổi l\xe0m việc tại cơ sở của nh\xe2n sự <strong>${a.staffName}</strong> đ\xe3 được ghi nhận v\xe0o hệ thống v\xe0 cộng số tiết v\xe0o Ma trận ph\xe2n bổ cơ sở. Chi tiết buổi l\xe0m việc:`,detailsTitle:"Thông tin buổi làm việc",details:[{icon:"👤",label:"Nhân sự CTHS",value:`${a.staffName} ${a.staffCode?`(${a.staffCode})`:""}`,highlight:!0},{icon:"🏫",label:"Cơ sở làm việc",value:a.campusName,highlight:!0},{icon:"📅",label:"Ngày làm việc",value:a.dateStr},{icon:"⏰",label:"Khung thời gian",value:`${a.timeRangeStr} (${a.totalPeriods} tiết l\xe0m việc)`},{icon:"📍",label:"Địa điểm / Phòng",value:a.location||"Phòng CTHS"},{icon:"🎯",label:"Nhóm đầu việc",value:a.taskCategory||"Công tác học sinh"}],customHtml:g,button:{text:"👉 Xem chi tiết trên Hệ thống SSM",url:b,color:"#007068"}})},"renderForeignObservationEvaluationForHost",0,function(a){let b=a.directLink||`${d}/teacher/du-gio-gvnn`,e=`
    <!-- Score & Rating Badge -->
    <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #3730A3; text-transform: uppercase; letter-spacing: 0.5px;">Overall Rating:</div>
            <div style="font-size: 20px; font-weight: 900; color: #312E81; margin-top: 2px;">${a.rating}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #3730A3; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Average Score:</div>
            <span style="font-size: 16px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 6px 16px; border-radius: 8px; display: inline-block;">
              ${a.totalScore} / 4.00
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Qualitative Sections -->
    <div style="margin: 20px 0;">
      ${a.strengths?`
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 Key Strengths & Effective Practices:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${a.strengths}</div>
      </div>
      `:""}

      ${a.challenges?`
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 Key Areas for Growth / Next Steps:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${a.challenges}</div>
      </div>
      `:""}
    </div>
  `;return c({headerBadge:"🌐 FOREIGN TEACHER OBSERVATION (ESL)",headerTitle:"LESSON OBSERVATION EVALUATION",headerSubtitle:"Sky-Line Education System - Academic Quality Assurance",headerTheme:"indigo",recipientName:a.hostName,greetingPrefix:"Dear Teacher ",introMessage:`Your recent lesson observation has been completed and evaluated by <strong>${a.observerName}</strong>. Please find the evaluation summary below:`,detailsTitle:"Observation Details",details:[{icon:"📖",label:"Topic / Lesson",value:a.topic||"English Lesson",highlight:!0},{icon:"📚",label:"Subject & Class",value:`${a.subjectName||"ESL"} (${a.className||"Class"})`},{icon:"📅",label:"Date & Period",value:`${a.dateStr} • ${a.period||"Period"}`,highlight:!0},{icon:"🏫",label:"Campus & Room",value:`${a.campusName||"Sky-Line"} - Room ${a.room||"Phòng học"}`},{icon:"👨‍🏫",label:"Evaluator / Observer",value:a.observerName}],extraHtml:e,button:{text:"👉 View Detailed Evaluation On Skyline Portal",url:b,color:"#4F46E5"}})},"renderForeignObservationEvaluationForObserver",0,function(a){let b=a.directLink||`${d}/teacher/du-gio-gvnn`;return c({headerBadge:"🌐 FOREIGN TEACHER OBSERVATION (ESL)",headerTitle:"OBSERVATION COMPLETED CONFIRMATION",headerSubtitle:"Sky-Line Education System - Academic Quality Assurance",headerTheme:"teal",recipientName:a.observerName,greetingPrefix:"Dear ",introMessage:`You have successfully completed and recorded the lesson observation walkthrough for Teacher <strong>${a.hostName}</strong>. The evaluation details have been stored and sent to the teacher.`,detailsTitle:"Summary Details",details:[{icon:"👨‍🏫",label:"Foreign Teacher",value:a.hostName,highlight:!0},{icon:"📖",label:"Topic / Lesson",value:a.topic||"English Lesson",highlight:!0},{icon:"📚",label:"Class & Subject",value:`${a.className||"Class"} • ${a.subjectName||"ESL"}`},{icon:"📅",label:"Date & Period",value:`${a.dateStr} • ${a.period||"Period"}`},{icon:"⭐",label:"Overall Rating",value:`${a.rating} (${a.totalScore} / 4.00)`,highlight:!0}],button:{text:"👉 Review On Skyline Portal",url:b,color:"#00A19A"}})},"renderObservationEvaluationCompletedForHost",0,function(a){let b=a.directLink||d,e=`
    <!-- Score & Ranking Badge -->
    <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">Tổng điểm đạt được:</div>
            <div style="font-size: 22px; font-weight: 900; color: #004D47; margin-top: 2px;">${a.totalScore}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Xếp loại tiết dạy:</div>
            <span style="font-size: 14px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 5px 14px; border-radius: 8px; display: inline-block;">
              ${a.rating}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Qualitative Comments -->
    <div style="margin: 20px 0;">
      ${a.strengths?`
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 1. Ưu điểm nổi bật:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${a.strengths}</div>
      </div>
      `:""}

      ${a.improvements?`
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 2. Nội dung cần cải thiện / G\xf3p \xfd:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${a.improvements}</div>
      </div>
      `:""}

      ${a.generalComment?`
      <div style="background-color: #F8FAFC; border-left: 4px solid #64748B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">📝 3. Đề xuất & Kiến nghị chuy\xean m\xf4n:</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-line;">${a.generalComment}</div>
      </div>
      `:""}
    </div>
  `;return c({headerBadge:"📊 KẾT QUẢ ĐÁNH GIÁ",headerTitle:"KẾT QUẢ ĐÁNH GIÁ TIẾT DẠY DỰ GIỜ",headerSubtitle:"Phiếu đánh giá tiết dạy chuyên môn đã hoàn tất",headerTheme:"teal",recipientName:a.hostName,introMessage:`Thầy/C\xf4 <strong>${a.observerName}</strong> (${a.observerPosition||"Người dự giờ"}) đ\xe3 ho\xe0n tất nhập <strong>Phiếu đ\xe1nh gi\xe1 dự giờ</strong> cho tiết dạy của Thầy/C\xf4. Dưới đ\xe2y l\xe0 th\xf4ng tin chi tiết:`,details:[{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic||"Tiết dạy",highlight:!0},{icon:"📚",label:"Môn học & Khối lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||""})`},{icon:"📅",label:"Thời gian & Tiết",value:`Tiết ${a.period} • ${a.dateStr}`,highlight:!0},{icon:"🏫",label:"Cơ sở & Địa điểm",value:`${a.campusName||"Sky-Line"} - Ph\xf2ng ${a.room||"học"}`},{icon:"👨‍🏫",label:"Người dự giờ",value:`${a.observerName} ${a.observerCode?`(${a.observerCode})`:""}`}],extraHtml:e,button:{text:"👉 Xem Chi Tiết Phiếu Đánh Giá & Tiếp Thu Góp Ý",url:b},secondaryNote:"Dữ liệu đánh giá đã được lưu trữ an toàn và tính vào chỉ tiêu chuyên môn của Thầy/Cô."})},"renderObservationEvaluationCompletedForObserver",0,function(a){let b=a.directLink||d,e=`
    <!-- Score & Ranking Badge -->
    <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.5px;">Tổng điểm Thầy/C\xf4 đ\xe3 chấm:</div>
            <div style="font-size: 22px; font-weight: 900; color: #004D47; margin-top: 2px;">${a.totalScore}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #0F766E; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Xếp loại:</div>
            <span style="font-size: 14px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 5px 14px; border-radius: 8px; display: inline-block;">
              ${a.rating}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Qualitative Comments -->
    <div style="margin: 20px 0;">
      ${a.strengths?`
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 1. Ưu điểm nổi bật:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${a.strengths}</div>
      </div>
      `:""}

      ${a.improvements?`
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 2. Nội dung cần cải thiện / G\xf3p \xfd:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${a.improvements}</div>
      </div>
      `:""}
    </div>
  `;return c({headerBadge:"✅ ĐÃ NỘP ĐÁNH GIÁ",headerTitle:"XÁC NHẬN HOÀN TẤT ĐÁNH GIÁ TIẾT DỰ GIỜ",headerSubtitle:"Biên bản và phiếu đánh giá đã được lưu vào hệ thống",headerTheme:"teal",recipientName:`${a.observerName} (Người dự giờ)`,introMessage:`Thầy/C\xf4 đ\xe3 ho\xe0n tất v\xe0 nộp th\xe0nh c\xf4ng <strong>Phiếu đ\xe1nh gi\xe1 dự giờ</strong> cho tiết dạy của Thầy/C\xf4 <strong>${a.hostName}</strong>. Dưới đ\xe2y l\xe0 bi\xean bản v\xe0 điểm số Thầy/C\xf4 đ\xe3 ghi nhận:`,details:[{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic||"Tiết dạy",highlight:!0},{icon:"👨‍🏫",label:"Giáo viên dạy",value:`${a.hostName} ${a.hostCode?`(${a.hostCode})`:""}`},{icon:"📚",label:"Môn học & Lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||""})`},{icon:"📅",label:"Thời gian & Tiết",value:`Tiết ${a.period} • ${a.dateStr}`,highlight:!0},{icon:"🏫",label:"Cơ sở & Địa điểm",value:`${a.campusName||"Sky-Line"} - Ph\xf2ng ${a.room||"học"}`}],extraHtml:e,button:{text:"👉 Xem Danh Sách Tiết Tôi Dự Trên Skyline",url:b},secondaryNote:"Tiết dự giờ này đã được tự động cộng vào tiến độ hoàn thành chỉ tiêu dự giờ cá nhân của Thầy/Cô."})},"renderObservationExpiredNotification",0,function(a){let b=a.directLink||d;return c({headerBadge:"⏰ NHẮC LỊCH DẠY / DỰ",headerTitle:a.isHost?"HẾT HẠN ĐĂNG KÝ & NHẮC LỊCH TIẾT DẠY":"NHẮC LỊCH DỰ GIỜ TIẾT HỌC",headerSubtitle:"Tiết dạy chuyên môn sắp diễn ra theo kế hoạch",headerTheme:"teal",recipientName:a.recipientName,introMessage:a.isHost?"Tiết dạy dự giờ của Thầy/Cô đã kết thúc thời hạn đăng ký. Kính mời Thầy/Cô kiểm tra danh sách và chuẩn bị thực hiện tiết dạy theo đúng thời gian đã đăng ký:":`Tiết dạy dự giờ bạn đ\xe3 đăng k\xfd thuộc m\xf4n <strong>${a.subjectName}</strong> của Thầy/C\xf4 <strong>${a.hostName}</strong> đ\xe3 hết hạn đăng k\xfd v\xe0 sẽ diễn ra theo kế hoạch:`,details:[{icon:"👨‍🏫",label:"Giáo viên dạy",value:`${a.hostName} ${a.hostCode?`(${a.hostCode})`:""}`,highlight:!0},{icon:"📖",label:"Bài dạy / Chủ đề",value:a.topic,highlight:!0},{icon:"📚",label:"Môn học & Lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||"Lớp học"})`},{icon:"🏫",label:"Cơ sở & Địa điểm",value:`${a.campusName||"Trường"} - ${a.room||"Phòng học"}`},{icon:"📅",label:"Ngày dạy",value:a.dateStr,highlight:!0},{icon:"⏰",label:"Thời gian / Tiết",value:a.timeStr}],noticeBox:{type:"info",title:"Thời gian diễn ra",content:"Kính mời Quý Thầy/Cô sắp xếp công việc và tham gia đúng giờ theo kế hoạch."},button:{text:"👉 Xem Chi Tiết Tiết Dạy Trên Skyline",url:b}})},"renderObservationPendingEvaluationReminder",0,function(a){let b=a.directLink||d;return c({headerBadge:"⏰ NHẮC NHỞ ĐÁNH GIÁ",headerTitle:"NHẮC NHỞ HOÀN TẤT NHẬP ĐÁNH GIÁ TIẾT DỰ GIỜ",headerSubtitle:"Vui lòng hoàn tất phiếu đánh giá để hệ thống ghi nhận chỉ tiêu",headerTheme:"amber",recipientName:a.observerName,introMessage:`Để ho\xe0n th\xe0nh tiết dự, Qu\xfd Thầy/C\xf4 vui l\xf2ng ho\xe0n tất nhập đ\xe1nh gi\xe1 cho tiết dạy <strong>"${a.topic}"</strong> của Thầy/C\xf4 <strong>${a.hostName}</strong>:`,details:[{icon:"👨‍🏫",label:"Giáo viên dạy",value:`${a.hostName} ${a.hostCode?`(${a.hostCode})`:""}`,highlight:!0},{icon:"📖",label:"Bài dạy / Chủ đề",value:a.topic,highlight:!0},{icon:"📚",label:"Môn & Lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||"Lớp học"})`},{icon:"📅",label:"Thời gian & Tiết",value:`Tiết ${a.period} • ${a.dateStr}`,highlight:!0},{icon:"🏫",label:"Cơ sở & Phòng",value:`${a.campusName||"Sky-Line"} - Ph\xf2ng ${a.room||"học"}`}],noticeBox:{type:"warning",title:"Lưu ý quan trọng",content:"Hệ thống chỉ ghi nhận tiết dạy / tiết dự khi các Thầy/Cô hoàn thành nhập phiếu đánh giá chuyên môn."},button:{text:"✍️ Nhập Phiếu Đánh Giá Ngay Trên Hệ Thống",url:b,color:"#00A19A"}})},"renderObservationReEvaluationApproved",0,function(a){let b=a.directLink||d;return c({headerBadge:"🔓 ĐÃ MỞ LẠI PHIẾU",headerTitle:"PHÊ DUYỆT MỞ LẠI PHIẾU ĐÁNH GIÁ",headerSubtitle:"Yêu cầu đánh giá lại chuyên môn đã được Ban Quản trị phê duyệt",headerTheme:"teal",recipientName:a.teacherName,introMessage:"Hệ thống đã ghi nhận <strong>Admin đã xét duyệt mở lại phiếu đánh giá</strong> theo yêu cầu của Thầy/Cô. Thầy/Cô vui lòng truy cập hệ thống để tiến hành cập nhật lại điểm số và nhận xét cho tiết dự giờ:",details:[...a.hostName?[{icon:"👨‍🏫",label:"Giáo viên dạy",value:a.hostName,highlight:!0}]:[],{icon:"📖",label:"Bài dạy / Chủ đề",value:a.topic||"Tiết dạy chuyên môn",highlight:!0},...a.subjectName?[{icon:"📚",label:"Môn học",value:a.subjectName}]:[],{icon:"📅",label:"Ngày & Tiết",value:`Tiết ${a.period} • ${a.dateStr}`},...a.reason?[{icon:"📝",label:"Lý do xin mở lại",value:a.reason,color:"#0284C7"}]:[],...a.adminNote?[{icon:"💬",label:"Ghi chú từ Admin",value:a.adminNote,color:"#059669"}]:[]],noticeBox:{type:"success",title:"Chỉnh sửa phiếu",content:"Phiếu đánh giá đã được mở khóa. Thầy/Cô có thể chỉnh sửa và cập nhật lại điểm số trực tiếp trên hệ thống."},button:{text:"👉 Mở Phiếu & Đánh Giá Lại Ngay",url:b}})},"renderObservationReEvaluationRejected",0,function(a){return c({headerBadge:"❌ KHÔNG PHÊ DUYỆT",headerTitle:"PHẢN HỒI YÊU CẦU MỞ LẠI PHIẾU",headerSubtitle:"Thông báo kết quả xét duyệt từ Ban Quản trị",headerTheme:"rose",recipientName:a.teacherName,introMessage:`Y\xeau cầu mở lại phiếu đ\xe1nh gi\xe1 tiết dạy <strong>"${a.topic}"</strong> chưa được ph\xea duyệt với l\xfd do sau:`,noticeBox:{type:"warning",title:"Lý do phản hồi",content:a.adminNote||"Không có ghi chú cụ thể từ Ban Quản trị."},secondaryNote:"Nếu cần hỗ trợ thêm, Thầy/Cô vui lòng liên hệ trực tiếp Ban Quản trị / Ban Khảo thí & ĐBCL."})},"renderObservationRequestForHost",0,function(a){let b=a.directLink||d;return c({headerBadge:"📩 ĐỀ XUẤT MỚI",headerTitle:"ĐỀ XUẤT XIN THAM GIA DỰ GIỜ",headerSubtitle:"Có giáo viên gửi đề xuất xin tham dự tiết dạy của Thầy/Cô",headerTheme:"teal",recipientName:a.hostName,introMessage:`Thầy/C\xf4 <strong>${a.observerName}</strong> (${a.observerPosition||"Giáo viên"}) vừa gửi đề xuất xin tham gia dự giờ một tiết dạy của Thầy/C\xf4:`,details:[{icon:"👨‍🏫",label:"Giáo viên dạy được đề xuất",value:`${a.hostName}${a.hostCode?` (${a.hostCode})`:""}${a.hostDept?` - Tổ CM: ${a.hostDept}`:""}`,highlight:!0},{icon:"👤",label:"Người xin dự giờ",value:`${a.observerName}${a.observerCode?` (${a.observerCode})`:""}${a.observerPosition?` (${a.observerPosition})`:""}`},{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic||"Đề xuất xin dự giờ tiết học",highlight:!0},{icon:"📚",label:"Môn học & Khối lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||"Lớp học"})`},{icon:"📅",label:"Ngày dự kiến",value:a.dateStr,highlight:!0},{icon:"⏰",label:"Tiết dạy",value:a.period||"Tiết 1"},...a.notes?[{icon:"📝",label:"Lời nhắn / Ghi chú",value:a.notes,color:"#475569"}]:[]],noticeBox:{type:"note",title:"Lưu ý quan trọng",content:"Sau khi Thầy/Cô bấm phê duyệt trên hệ thống, tiết dạy sẽ được chính thức ghi nhận vào lịch giảng dạy của Thầy/Cô và hệ thống sẽ gửi thông báo xác nhận tới Người dự giờ."},button:{text:"👉 Xem Chi Tiết & Phê Duyệt Tiết Dự Giờ Ngay",url:b}})},"renderObservationRequestResponseForObserver",0,function(a){let b=a.directLink||d;return a.accepted?c({headerBadge:"✅ ĐÃ PHÊ DUYỆT",headerTitle:"ĐỀ XUẤT DỰ GIỜ ĐÃ ĐƯỢC ĐỒNG Ý",headerSubtitle:"Giáo viên dạy đã xác nhận đề xuất tham dự tiết dạy",headerTheme:"teal",recipientName:a.observerName,introMessage:`Thầy/C\xf4 <strong>${a.hostName}</strong> đ\xe3 <strong>x\xe1c nhận đồng \xfd</strong> cho Thầy/C\xf4 tham gia dự giờ tiết dạy chuy\xean m\xf4n theo lịch sau:`,details:[{icon:"👨‍🏫",label:"Giáo viên dạy",value:`${a.hostName} ${a.hostCode?`(${a.hostCode})`:""}`,highlight:!0},{icon:"📖",label:"Bài dạy / Chủ đề",value:a.topic,highlight:!0},{icon:"📚",label:"Môn & Lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||"Lớp"})`},{icon:"📅",label:"Ngày dạy",value:a.dateStr,highlight:!0},{icon:"⏰",label:"Tiết dạy",value:a.period}],noticeBox:{type:"success",title:"Kế hoạch tham dự",content:"Kính mời Thầy/Cô sắp xếp thời gian tham dự đúng giờ và hoàn tất phiếu đánh giá sau khi tiết dạy kết thúc."},button:{text:"👉 Xem Lịch & Thông Tin Tiết Dạy Trên Skyline",url:b}}):c({headerBadge:"⚠️ PHẢN HỒI ĐỀ XUẤT",headerTitle:"PHẢN HỒI ĐỀ XUẤT DỰ GIỜ",headerSubtitle:"Thông tin phản hồi từ Giáo viên dạy",headerTheme:"rose",recipientName:a.observerName,introMessage:`Thầy/C\xf4 <strong>${a.hostName}</strong> chưa thể tiếp nhận đề xuất dự giờ cho tiết dạy <strong>"${a.topic}"</strong> v\xe0o ng\xe0y <strong>${a.dateStr}</strong>.`,noticeBox:{type:"warning",title:"Lý do phản hồi",content:a.reason||"Giáo viên dạy chưa sắp xếp được thời gian phù hợp."},button:{text:"👉 Tìm & Đăng Ký Tiết Dạy Khác",url:b},secondaryNote:"Thầy/Cô có thể lựa chọn các tiết dạy khác trong Tổ chuyên môn hoặc liên hệ trao đổi trực tiếp."})},"renderObservationRequestSubmittedForObserver",0,function(a){let b=a.directLink||d;return c({headerBadge:"✅ ĐÃ GỬI ĐỀ XUẤT",headerTitle:"XÁC NHẬN ĐÃ GỬI ĐỀ XUẤT DỰ GIỜ",headerSubtitle:"Hệ thống Quản lý Dự giờ Chuyên môn Skyline",headerTheme:"teal",recipientName:a.observerName,introMessage:`Thầy/C\xf4 đ\xe3 gửi th\xe0nh c\xf4ng đề xuất xin tham gia dự giờ tiết dạy của Thầy/C\xf4 <strong>${a.hostName}</strong>. Dưới đ\xe2y l\xe0 th\xf4ng tin bi\xean nhận chi tiết:`,details:[{icon:"👨‍🏫",label:"Giáo viên dạy",value:`${a.hostName}${a.hostCode?` (${a.hostCode})`:""}${a.hostDept?` - Tổ CM: ${a.hostDept}`:""}`,highlight:!0},{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic||"Đề xuất xin dự giờ tiết học",highlight:!0},{icon:"📚",label:"Môn học & Khối lớp",value:`${a.subjectName} (${a.level||""} ${a.grade||""} - ${a.className||"Lớp học"})`},{icon:"📅",label:"Ngày dự kiến",value:a.dateStr,highlight:!0},{icon:"⏰",label:"Tiết dạy",value:a.period||"Tiết 1"},{icon:"🏫",label:"Cơ sở & Địa điểm",value:`${a.campusName||"Sky-Line"} - Ph\xf2ng ${a.room||"học"}`}],noticeBox:{type:"info",title:"Trạng thái tiếp nhận",content:"Hệ thống sẽ tự động gửi thông báo đến Thầy/Cô ngay khi Giáo viên dạy xác nhận & phê duyệt yêu cầu này."},button:{text:"👉 Xem Lịch & Danh Sách Tiết Tôi Dự",url:b},secondaryNote:"Quý Thầy/Cô có thể quản lý và theo dõi tiến độ dự giờ trực tiếp trên hệ thống Skyline."})},"renderObservationSlotCreatedForTcm",0,function(a){let b=a.directLink||d,e=a.buttonText||"👉 Xem Chi Tiết & Đăng Ký Dự Giờ Ngay",f=a.period||a.timeStr||"Tiết 1";return c({headerBadge:"📢 TỔ CHUYÊN MÔN",headerTitle:"THÔNG BÁO ĐĂNG KÝ TIẾT DẠY MỚI (TỔ CHUYÊN MÔN)",headerSubtitle:"Kính mời Quý Thầy/Cô đăng nhập hệ thống để xem chi tiết và đăng ký tham gia",headerTheme:"teal",recipientName:a.recipientName||"Quý Thầy/Cô trong Tổ Chuyên Môn",greetingPrefix:"Kính gửi Thầy/Cô",introMessage:`Thầy/C\xf4 <strong>${a.creatorName||a.teacherName}</strong> thuộc Tổ Chuy\xean M\xf4n vừa đăng k\xfd tiết dạy mới. K\xednh mời Thầy/C\xf4 đăng nhập hệ thống để xem chi tiết v\xe0 đăng k\xfd tham gia dự giờ:`,details:[{icon:"👨‍🏫",label:"Giáo viên đăng ký tiết dạy",value:`${a.teacherName}${a.teacherCode?` (${a.teacherCode})`:""}${a.departmentName?` - Tổ CM: ${a.departmentName}`:""}`,highlight:!0},{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic||"Tiết dạy đã đăng ký",highlight:!0},{icon:"📚",label:"Môn học",value:a.subjectName||"Môn học"},...a.level?[{icon:"🏫",label:"Cấp học",value:a.level}]:[],...a.grade?[{icon:"🏷️",label:"Khối lớp",value:a.grade}]:[],...a.className?[{icon:"👥",label:"Lớp",value:a.className}]:[],{icon:"📅",label:"Ngày dạy",value:a.dateStr,highlight:!0},{icon:"⏰",label:"Tiết dạy",value:f},...a.campusName||a.room?[{icon:"📍",label:"Cơ sở & Địa điểm",value:`${a.campusName||"Sky-Line"}${a.room?` - Ph\xf2ng ${a.room}`:""}`}]:[]],noticeBox:{type:"info",title:"LƯU Ý QUAN TRỌNG",content:"Thầy/Cô vui lòng truy cập hệ thống Skyline để xem chi tiết và chọn tiết đăng ký dự giờ. Tiết dạy sẽ được chính thức ghi nhận vào lịch giảng dạy và hệ thống sẽ gửi thông báo xác nhận tới Thầy/Cô."},button:{text:e,url:b},secondaryNote:"Quý Thầy/Cô có thể quản lý, theo dõi lịch và đăng ký dự giờ trực tiếp trên hệ thống Quản lý Dự giờ Skyline."})},"renderObservationSlotRegisteredForHost",0,function(a){let b=a.directLink||d;return c({headerBadge:"📝 ĐĂNG KÝ MỚI",headerTitle:"THÔNG BÁO ĐĂNG KÝ TIẾT DỰ GIỜ",headerSubtitle:"Có giáo viên vừa đăng ký tham dự tiết dạy của Thầy/Cô",headerTheme:"teal",recipientName:a.hostName,introMessage:`Thầy/C\xf4 <strong>${a.observerName}</strong> vừa đăng k\xfd tham gia dự giờ tiết dạy của Thầy/C\xf4. Dưới đ\xe2y l\xe0 th\xf4ng tin chi tiết:`,details:[{icon:"👨‍🏫",label:"Giáo viên xin dự giờ",value:`${a.observerName} ${a.observerCode?`(${a.observerCode})`:""}`,highlight:!0},{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic,highlight:!0},{icon:"📚",label:"Môn học & Khối lớp",value:`${a.subjectName} (${a.level||""} ${a.grade||""} - ${a.className||"Lớp học"})`},{icon:"📅",label:"Ngày dạy",value:a.dateStr,highlight:!0},{icon:"⏰",label:"Tiết dạy",value:a.timeStr}],noticeBox:{type:"info",title:"Xác nhận danh sách",content:"Thầy/Cô vui lòng truy cập hệ thống để kiểm tra danh sách người tham dự và chuẩn bị tiết dạy."},button:{text:"👉 Xem Danh Sách Tiết Dạy & Người Dự",url:b}})},"renderObservationSurpriseCompletedForHost",0,function(a){let b=a.directLink||d,e="";if(a.criteriaScores&&Array.isArray(a.criteriaScores.scores)&&a.criteriaScores.scores.length>0)if("MAMNON"===a.criteriaScores.type){let b=[{id:1,section:"1. Chuẩn bị cho hoạt động",name:"Mục tiêu phù hợp độ tuổi, khả năng trẻ",max:1},{id:2,section:"1. Chuẩn bị cho hoạt động",name:"Phương tiện dạy học kích thích trẻ hoạt động",max:.5},{id:3,section:"1. Chuẩn bị cho hoạt động",name:"Tận dụng sản phẩm của trẻ để hoạt động",max:.5},{id:4,section:"2. Nội dung hoạt động",name:"Trẻ vận động thân thể và các giác quan",max:.5},{id:5,section:"2. Nội dung hoạt động",name:"Chính xác về kiến thức, kỹ năng",max:.5},{id:6,section:"2. Nội dung hoạt động",name:"Kiến thức hệ thống, gần gũi thực tế",max:.5},{id:7,section:"2. Nội dung hoạt động",name:"Thiết kế hợp lý, phát triển tư duy",max:.5},{id:8,section:"2. Nội dung hoạt động",name:"Nội dung tích hợp nhẹ nhàng, phù hợp",max:.5},{id:9,section:"2. Nội dung hoạt động",name:"Hướng dẫn ngắn gọn, gợi ý dẫn dắt trẻ",max:.5},{id:10,section:"3. Phương pháp và tổ chức",name:"Kết hợp linh hoạt phương pháp, thời gian",max:1},{id:11,section:"3. Phương pháp và tổ chức",name:"Tổ chức hỗ trợ đúng lúc, không làm thay",max:.5},{id:12,section:"3. Phương pháp và tổ chức",name:"Tình huống có vấn đề tạo hứng thú",max:.5},{id:13,section:"3. Phương pháp và tổ chức",name:"Bao quát lớp, khen ngợi kịp thời, tình cảm",max:.5},{id:14,section:"3. Phương pháp và tổ chức",name:"Sử dụng hiệu quả đồ dùng và đa dạng hình thức",max:.5},{id:15,section:"4. Kết quả trên trẻ",name:"Trẻ tích cực, hứng thú trên giờ học",max:.5},{id:16,section:"4. Kết quả trên trẻ",name:"Trẻ có nhiều cơ hội khám phá",max:.5},{id:17,section:"4. Kết quả trên trẻ",name:"Mọi trẻ được hỗ trợ và tham gia",max:.5},{id:18,section:"4. Kết quả trên trẻ",name:"Trẻ tự chuẩn bị đồ dùng, không làm thay",max:.5}].map((b,c)=>{let d=Number(a.criteriaScores?.scores[c]??0),e=d>=b.max,f=0===d?"#E11D48":e?"#059669":"#0284C7";return`
          <tr style="border-bottom: 1px solid #F1F5F9; font-size: 12px;">
            <td style="padding: 8px 10px; color: #475569; font-weight: 600; width: 8%; text-align: center;">${b.id}</td>
            <td style="padding: 8px 10px; color: #1E293B; width: 68%;">
              <div style="font-weight: 600;">${b.name}</div>
              <div style="font-size: 10.5px; color: #94A3B8;">${b.section}</div>
            </td>
            <td style="padding: 8px 10px; text-align: right; width: 24%; white-space: nowrap;">
              <span style="font-weight: 800; font-size: 13px; color: ${f};">${d.toFixed(2)}</span>
              <span style="font-size: 11px; color: #94A3B8;"> / ${b.max.toFixed(2)}đ</span>
            </td>
          </tr>
        `}).join("");e=`
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
          <div style="background-color: #FFF1F2; border-bottom: 1px solid #FECDD3; padding: 12px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size: 12px; font-weight: 800; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px;">
                  📋 BẢNG ĐIỂM CHI TIẾT 18 TI\xcaU CH\xcd Đ\xc1NH GI\xc1 (MẦM NON)
                </td>
                <td align="right" style="font-size: 11px; font-weight: 700; color: #BE123C;">
                  Thang điểm 10.00đ
                </td>
              </tr>
            </table>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            ${b}
          </table>
        </div>
      `}else{let b=[{id:1,std:"Tiêu chuẩn 1: Phương tiện",name:"Kế hoạch bài dạy & Chuẩn bị giáo án",max:1.5},{id:2,std:"Tiêu chuẩn 1: Phương tiện",name:"Sử dụng đồ dùng, thiết bị dạy học",max:1.5},{id:3,std:"Tiêu chuẩn 2: Nội dung",name:"Chính xác, khoa học và hấp dẫn",max:2},{id:4,std:"Tiêu chuẩn 2: Nội dung",name:"Hệ thống, đủ chuẩn KT-KN, trọng tâm",max:2},{id:5,std:"Tiêu chuẩn 2: Nội dung",name:"Liên hệ thực tế đời sống & sản xuất",max:1},{id:6,std:"Tiêu chuẩn 3: Phương pháp",name:"Không đọc chép, phát hiện khó khăn của HS",max:2},{id:7,std:"Tiêu chuẩn 3: Phương pháp",name:"Tổ chức HS học tích cực, chủ động, hợp tác",max:3},{id:8,std:"Tiêu chuẩn 3: Phương pháp",name:"Linh hoạt các khâu, phân phối thời gian hợp lý",max:2},{id:9,std:"Tiêu chuẩn 3: Phương pháp",name:"Kết hợp tốt các phương pháp dạy học",max:2},{id:10,std:"Tiêu chuẩn 4: Kết quả",name:"Kiểm tra đánh giá, học sinh hiểu bài",max:2},{id:11,std:"Tiêu chuẩn 4: Kết quả",name:"Nhuần nhuyễn, hấp dẫn, sáng tạo",max:1}].map((b,c)=>{let d=Number(a.criteriaScores?.scores[c]??0),e=d>=b.max,f=0===d?"#E11D48":e?"#059669":"#0284C7";return`
          <tr style="border-bottom: 1px solid #F1F5F9; font-size: 12px;">
            <td style="padding: 9px 10px; color: #475569; font-weight: 600; width: 8%; text-align: center;">${b.id}</td>
            <td style="padding: 9px 10px; color: #1E293B; width: 68%;">
              <div style="font-weight: 600;">${b.name}</div>
              <div style="font-size: 10.5px; color: #94A3B8;">${b.std}</div>
            </td>
            <td style="padding: 9px 10px; text-align: right; width: 24%; white-space: nowrap;">
              <span style="font-weight: 800; font-size: 13px; color: ${f};">${d.toFixed(2)}</span>
              <span style="font-size: 11px; color: #94A3B8;"> / ${b.max.toFixed(2)}đ</span>
            </td>
          </tr>
        `}).join("");e=`
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; overflow: hidden;">
          <div style="background-color: #FFF1F2; border-bottom: 1px solid #FECDD3; padding: 12px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size: 12px; font-weight: 800; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px;">
                  📋 BẢNG ĐIỂM CHI TIẾT 11 TI\xcaU CH\xcd Đ\xc1NH GI\xc1 (K-12)
                </td>
                <td align="right" style="font-size: 11px; font-weight: 700; color: #BE123C;">
                  Thang điểm 20.00đ
                </td>
              </tr>
            </table>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            ${b}
          </table>
        </div>
      `}let f=`
    <!-- Score & Ranking Badge -->
    <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 12px; padding: 16px 20px; margin: 18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #9F1239; text-transform: uppercase; letter-spacing: 0.5px;">Tổng điểm đạt được:</div>
            <div style="font-size: 24px; font-weight: 900; color: #881337; margin-top: 2px;">${a.totalScore}</div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <div style="font-size: 11px; font-weight: 800; color: #9F1239; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Xếp loại tiết dạy:</div>
            <span style="font-size: 14px; font-weight: 900; color: #047857; background-color: #D1FAE5; border: 1px solid #A7F3D0; padding: 6px 16px; border-radius: 8px; display: inline-block;">
              ${a.rating}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Detailed Evaluation Breakdown Table -->
    ${e}

    <!-- Qualitative Comments -->
    <div style="margin: 20px 0;">
      ${a.strengths?`
      <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 4px;">🌟 1. Ưu điểm nổi bật:</div>
        <div style="font-size: 13px; color: #166534; line-height: 1.6; white-space: pre-line;">${a.strengths}</div>
      </div>
      `:""}

      ${a.improvements?`
      <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #B45309; text-transform: uppercase; margin-bottom: 4px;">💡 2. Nội dung cần cải thiện / G\xf3p \xfd ph\xe1t triển:</div>
        <div style="font-size: 13px; color: #92400E; line-height: 1.6; white-space: pre-line;">${a.improvements}</div>
      </div>
      `:""}

      ${a.generalComment?`
      <div style="background-color: #F8FAFC; border-left: 4px solid #64748B; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">📝 3. Đề xuất & Kiến nghị chuy\xean m\xf4n:</div>
        <div style="font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-line;">${a.generalComment}</div>
      </div>
      `:""}
    </div>
  `,g=[a.observerName,a.observerCode?`(${a.observerCode})`:"",a.observerPosition?`• ${a.observerPosition}`:""].filter(Boolean).join(" "),h=[a.observerDepartment?`Bộ phận/Tổ: ${a.observerDepartment}`:"",a.observerEmail?`Email: ${a.observerEmail}`:""].filter(Boolean).join(" • ");return c({headerBadge:"⚡ DỰ GIỜ ĐỘT XUẤT",headerTitle:"KẾT QUẢ ĐÁNH GIÁ DỰ GIỜ ĐỘT XUẤT",headerSubtitle:"Biên bản & phiếu đánh giá dự giờ đột xuất",headerTheme:"rose",recipientName:a.hostName,introMessage:`Thầy/C\xf4 <strong>${a.observerName}</strong> (${a.observerPosition||"Người dự giờ"}) đ\xe3 ho\xe0n tất <strong>Bi\xean bản & Phiếu đ\xe1nh gi\xe1 dự giờ đột xuất</strong> cho tiết dạy của Thầy/C\xf4. Dưới đ\xe2y l\xe0 kết quả chi tiết:`,details:[{icon:"📖",label:"Tên bài dạy / Chủ đề",value:a.topic||"Dự giờ đột xuất",highlight:!0},{icon:"📚",label:"Môn học & Lớp",value:`${a.subjectName} (${a.grade||""} - ${a.className||""})`},{icon:"📅",label:"Thời gian & Tiết",value:`Tiết ${a.period} • ${a.dateStr}`,highlight:!0},{icon:"🏫",label:"Cơ sở & Địa điểm",value:`${a.campusName||"Sky-Line"} - Ph\xf2ng ${a.room||"học"}`},{icon:"👨‍🏫",label:"Người dự giờ đột xuất",value:h?`${g}<div style="font-size: 11px; color: #64748B; font-weight: 500; margin-top: 2px;">${h}</div>`:g,highlight:!0}],extraHtml:f,button:{text:"👉 Xem Chi Tiết Biên Bản Dự Giờ Trên Skyline",url:b,color:"#E11D48"},secondaryNote:"Thầy/Cô vui lòng đăng nhập Skyline SSM để xem đầy đủ biên bản và gửi ý kiến phản hồi 2 chiều."})},"renderObservationTeacherAcknowledged",0,function(a){let b=a.directLink||d,e=`
    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 5px solid #16A34A; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
      <div style="font-size: 12px; font-weight: 800; color: #15803D; text-transform: uppercase; margin-bottom: 6px;">
        💬 Kế hoạch khắc phục & \xdd kiến phản hồi của Gi\xe1o vi\xean:
      </div>
      <div style="font-size: 14px; color: #14532D; line-height: 1.6; font-style: italic; white-space: pre-line;">
        ${a.feedbackText}
      </div>
      <div style="font-size: 11px; color: #166534; font-weight: bold; margin-top: 10px; border-top: 1px dashed #86EFAC; padding-top: 8px;">
        ⏱ Thời gian x\xe1c nhận: ${a.acknowledgedAtStr}
      </div>
    </div>
  `;return c({headerBadge:"💬 PHẢN HỒI 2 CHIỀU",headerTitle:"GIÁO VIÊN ĐÃ TIẾP THU GÓP Ý & PHẢN HỒI",headerSubtitle:"Phản hồi chuyên môn 2 chiều từ Giáo viên dạy",headerTheme:"emerald",recipientName:a.evaluatorName,introMessage:`Gi\xe1o vi\xean dạy <strong>${a.hostName}</strong> đ\xe3 xem bi\xean bản đ\xe1nh gi\xe1 tiết <strong>"${a.topic}"</strong> v\xe0 gửi phản hồi x\xe1c nhận tiếp thu \xfd kiến chuy\xean m\xf4n:`,extraHtml:e,button:{text:"👉 Xem Chi Tiết Tiết Dự Giờ Trên Skyline",url:b}})}])}];

//# sourceMappingURL=src_lib_email-templates_ts_0o43vnc._.js.map