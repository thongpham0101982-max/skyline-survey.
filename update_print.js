const fs = require('fs');

const clientPath = 'src/app/admin/input-assessments/reports/client.tsx';
let content = fs.readFileSync(clientPath, 'utf8');

// 1. Update renderTemplate to accept academicYearName
content = content.replace(
  'const renderTemplate = (content: string, student: any) => {',
  'const renderTemplate = (content: string, student: any, academicYearName?: string) => {'
);

// 2. Update the academicYear replacement inside renderTemplate
content = content.replace(
  '.replace(/\\{\\{academicYear\\}\\}/g, student?.academicYear || "2025-2026")',
  '.replace(/\\{\\{academicYear\\}\\}/g, student?.academicYear || academicYearName || "2025-2026")'
);

// 3. Update the call to renderTemplate inside renderPrintPages (which is around line 1885)
const oldRenderCall = `    const fullContent = renderTemplate(
      studentCampusConfig?.content || "",
      {
        ...selectedReportStudent,
        signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
      }
    );`;

const newRenderCall = `    const fullContent = renderTemplate(
      studentCampusConfig?.content || "",
      {
        ...selectedReportStudent,
        signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
      },
      activePeriod?.academicYear?.name
    );`;

content = content.replace(oldRenderCall, newRenderCall);

// 4. Update the call to renderTemplate inside the editor (around line 2475)
const oldEditorCall = `            const tempFullText = renderTemplate(
              previewHtml, 
              { ...previewStudent, signatureName: rcDirectorName || getCampusDefaultManager(previewStudent.admissionCampus) }
            );`;

const newEditorCall = `            const tempFullText = renderTemplate(
              previewHtml, 
              { ...previewStudent, signatureName: rcDirectorName || getCampusDefaultManager(previewStudent.admissionCampus) },
              activePeriod?.academicYear?.name
            );`;

content = content.replace(oldEditorCall, newEditorCall);

// 5. Update studentCampusConfig to have proper fallback (around line 865)
const oldMergedContent = `const mergedBackground = mBg || globalData.background || campusData.background || "";
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";`;

const newMergedContent = `const mergedBackground = mBg || globalData.background || campusData.background || "";
      let defaultText = "";
      if (selectedLevel === "preschool") {
         if (isCommitment) defaultText = defaultPreschoolCommitment;
         else if (isInvitation) defaultText = defaultPreschoolInvitation;
         else defaultText = defaultPreschoolCongratulations;
      } else {
         if (isCommitment) defaultText = defaultCamKet;
         else if (isInvitation) defaultText = defaultThuMoi;
         else defaultText = defaultThuChucMung;
      }
      const mergedContent = globalData.content || campusData.content || defaultText;
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";`;

content = content.replace(oldMergedContent, newMergedContent);

fs.writeFileSync(clientPath, content, 'utf8');
console.log("Replaced successfully!");

