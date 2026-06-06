const fs = require('fs');
const path = 'src/app/admin/input-assessments/reports/client.tsx';
let content = fs.readFileSync(path, 'utf8');

// FIX 1: Move defaultTitle/defaultText declaration BEFORE mergedTitle (used-before-declared bug)
const oldBlock = `      let campusData: any = {};
      let globalData: any = {};
      if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch (e) {} }
      if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch (e) {} }

      const mergedTitle = globalData.title || campusData.title || defaultTitle;
      const mLogo = localStorage.getItem('report_config_master_logo') || "";
      const mBg = localStorage.getItem('report_config_master_background') || "";
      const mFooter = localStorage.getItem('report_config_master_footer') || "";
      const mSig = localStorage.getItem('report_config_master_signature') || "";

      const mergedLogo = mLogo || globalData.logo || campusData.logo || "";
      const mergedBackground = mBg || globalData.background || campusData.background || "";
      
      let defaultText = "";
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
      const mergedContent = globalData.content || campusData.content || defaultText;
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";`;

const newBlock = `      let campusData: any = {};
      let globalData: any = {};
      if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch (e) {} }
      if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch (e) {} }

      // MUST declare defaults BEFORE using them (let is not hoisted like var)
      let defaultText = "";
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

      const mergedTitle = globalData.title || campusData.title || defaultTitle;
      const mLogo = localStorage.getItem('report_config_master_logo') || "";
      const mBg = localStorage.getItem('report_config_master_background') || "";
      const mFooter = localStorage.getItem('report_config_master_footer') || "";
      const mSig = localStorage.getItem('report_config_master_signature') || "";

      const mergedLogo = mLogo || globalData.logo || campusData.logo || "";
      const mergedBackground = mBg || globalData.background || campusData.background || "";
      const mergedContent = globalData.content || campusData.content || defaultText;
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  console.log("FIX 1 applied: defaultTitle hoisting bug fixed");
} else {
  console.log("FIX 1: pattern not found - checking manually...");
  // Check key parts
  console.log("Has mergedTitle before defaultTitle:", content.includes('const mergedTitle = globalData.title || campusData.title || defaultTitle;\n      const mLogo'));
}

// FIX 2: Pass academicYear name properly into buildLetterHtmlForEmail
const oldRender = `    const renderedContent = (config.content || "")
      .replace(/{{fullName}}/g, student?.fullName || "")
      .replace(/{{academicYear}}/g, student?.academicYear || activePeriod?.academicYear?.name || "2025-2026")
      .replace(/{{grade}}/g, numericGrade)`;

const newRender = `    const academicYearNameForEmail = activePeriod?.academicYear?.name || "2025-2026";
    const renderedContent = (config.content || "")
      .replace(/{{fullName}}/g, student?.fullName || "")
      .replace(/{{academicYear}}/g, student?.academicYear || academicYearNameForEmail)
      .replace(/{{grade}}/g, numericGrade)`;

if (content.includes(oldRender)) {
  content = content.replace(oldRender, newRender);
  console.log("FIX 2 applied: academicYear in buildLetterHtmlForEmail fixed");
} else {
  console.log("FIX 2: pattern not found");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Done.");
