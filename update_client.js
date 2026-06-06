const fs = require('fs');

// 1. Update client.tsx (fix {{academicYear}} and fallback logic)
const clientPath = 'src/app/admin/input-assessments/reports/client.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Fix fallback logic in getStudentCampusConfigForEmail
const oldFallbackLogic = `      const defaultText = selectedLevel === "preschool"
        ? defaultPreschoolCongratulations
        : defaultThuChucMung;

      const mergedContent = globalData.content || campusData.content || defaultText;`;

const newFallbackLogic = `      let defaultText = "";
      let defaultTitle = "THƯ CHÚC MỪNG";
      if (selectedLevel === "preschool") {
         if (customBaseKey === "cam_ket_hoc_tap") { defaultText = defaultPreschoolCommitment || ""; defaultTitle = "BẢN CAM KẾT HỌC TẬP"; }
         else if (customBaseKey === "thu_moi") { defaultText = defaultPreschoolInvitation || ""; defaultTitle = "THƯ MỜI"; }
         else defaultText = defaultPreschoolCongratulations;
      } else {
         if (customBaseKey === "cam_ket_hoc_tap") { defaultText = defaultCamKet || ""; defaultTitle = "BẢN CAM KẾT HỌC TẬP"; }
         else if (customBaseKey === "thu_moi") { defaultText = defaultThuMoi || ""; defaultTitle = "THƯ MỜI"; }
         else defaultText = defaultThuChucMung;
      }
      const mergedContent = globalData.content || campusData.content || defaultText;`;

clientContent = clientContent.replace(oldFallbackLogic, newFallbackLogic);

// Fix mergedTitle logic
clientContent = clientContent.replace(
  'const mergedTitle = globalData.title || campusData.title || "THƯ CHÚC MỪNG";',
  'const mergedTitle = globalData.title || campusData.title || defaultTitle;'
);

// Fix academicYear replacement
const oldReplace = `.replace(/{{fullName}}/g, student?.fullName || "")
      .replace(/{{grade}}/g, numericGrade)`;

const newReplace = `.replace(/{{fullName}}/g, student?.fullName || "")
      .replace(/{{academicYear}}/g, student?.academicYear || activePeriod?.academicYear?.name || "2025-2026")
      .replace(/{{grade}}/g, numericGrade)`;

clientContent = clientContent.replace(oldReplace, newReplace);

fs.writeFileSync(clientPath, clientContent, 'utf8');
console.log("Updated client.tsx");

