const fs = require('fs');
const filePath = 'src/app/admin/input-assessments/reports/client.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update getStudentCampusConfigForEmail
content = content.replace(
  'const getStudentCampusConfigForEmail = (student: any) => {',
  'const getStudentCampusConfigForEmail = (student: any, customBaseKey?: string) => {'
);
content = content.replace(
  'const baseKey = \'thu_chuc_mung\';',
  'const baseKey = customBaseKey || \'thu_chuc_mung\';'
);

// 2. Update buildLetterHtmlForEmail
content = content.replace(
  'const buildLetterHtmlForEmail = (student: any, config: any) => {',
  'const buildLetterHtmlForEmail = (student: any, config: any, isCommitmentDoc?: boolean) => {'
);
content = content.replace(
  'const isCommitmentReport = isCommitment || (config?.title?.toUpperCase().includes("CAM KẾT")) || (rcReportType === "cam_ket_hoc_tap");',
  'const isCommitmentReport = isCommitmentDoc || isCommitment || (config?.title?.toUpperCase().includes("CAM KẾT")) || (rcReportType === "cam_ket_hoc_tap");'
);

// 3. Update handleSendEmailsSubmit
const oldSubmitLogic = `            const config = getStudentCampusConfigForEmail(s);
            if (config) {
              currentPdfCount++;
              setEmailSendingStatus(\`Đang tạo PDF (\${currentPdfCount}/\${totalPdfs}): Thư chúc mừng - \${s.fullName}\`);
              const docHtml = buildLetterHtmlForEmail(s, config);
              const currentDate = new Date();
              const yearStr = currentDate.getFullYear().toString();
              const monthStr = "T" + String(currentDate.getMonth() + 1).padStart(2, '0');
              const dayStr = String(currentDate.getDate()).padStart(2, '0');
              const filename = \`\${yearStr}-\${monthStr}.\${dayStr}-TCM-\${s.fullName}.pdf\`;
              const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 1.8, useCORS: true, logging: false, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css'] }
              };

              try {
                const pdfBase64 = await generatePdfBase64(html2pdf, docHtml, opt);
                const base64Data = pdfBase64.split(',')[1];
                
                pdfAttachmentsList.push({
                  filename: filename,
                  base64: base64Data
                });
              } catch (pdfErr) {
                console.error("Client PDF generation failed, falling back to server:", pdfErr);
                pdfAttachmentsList.push({
                  filename: filename,
                  html: docHtml
                });
              }
            }`;

const newSubmitLogic = `            currentPdfCount++;
            const currentDate = new Date();
            const yearStr = currentDate.getFullYear().toString();
            const monthStr = "T" + String(currentDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(currentDate.getDate()).padStart(2, '0');
            const opt = {
              margin: 0,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 1.8, useCORS: true, logging: false, letterRendering: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['avoid-all', 'css'] }
            };

            // Thư chúc mừng
            const configTCM = getStudentCampusConfigForEmail(s, 'thu_chuc_mung');
            if (configTCM) {
              setEmailSendingStatus(\`Đang tạo PDF (\${currentPdfCount}/\${totalPdfs}): Thư chúc mừng - \${s.fullName}\`);
              const docHtmlTCM = buildLetterHtmlForEmail(s, configTCM, false);
              const filenameTCM = \`\${yearStr}-\${monthStr}.\${dayStr}-TCM-\${s.fullName}.pdf\`;
              try {
                const pdfBase64TCM = await generatePdfBase64(html2pdf, docHtmlTCM, { ...opt, filename: filenameTCM });
                pdfAttachmentsList.push({ filename: filenameTCM, base64: pdfBase64TCM.split(',')[1] });
              } catch (pdfErr) {
                console.error("Client PDF generation failed, falling back to server:", pdfErr);
                pdfAttachmentsList.push({ filename: filenameTCM, html: docHtmlTCM });
              }
            }

            // Bản cam kết
            const configCK = getStudentCampusConfigForEmail(s, 'cam_ket_hoc_tap');
            if (configCK) {
              setEmailSendingStatus(\`Đang tạo PDF (\${currentPdfCount}/\${totalPdfs}): Cam kết - \${s.fullName}\`);
              const docHtmlCK = buildLetterHtmlForEmail(s, configCK, true);
              const filenameCK = \`\${yearStr}-\${monthStr}.\${dayStr}-CamKet-\${s.fullName}.pdf\`;
              try {
                const pdfBase64CK = await generatePdfBase64(html2pdf, docHtmlCK, { ...opt, filename: filenameCK });
                pdfAttachmentsList.push({ filename: filenameCK, base64: pdfBase64CK.split(',')[1] });
              } catch (pdfErr) {
                console.error("Client PDF generation failed, falling back to server:", pdfErr);
                pdfAttachmentsList.push({ filename: filenameCK, html: docHtmlCK });
              }
            }`;

content = content.replace(oldSubmitLogic, newSubmitLogic);

// 4. Update the text in the modal
content = content.replace(
  'Hệ thống tự động biên dịch và tạo tệp PDF Thư chúc mừng đính kèm trực tiếp vào mail gửi cho các đối tượng đạt khảo thí.',
  'Hệ thống tự động biên dịch và tạo tệp PDF Thư chúc mừng và Bản cam kết đính kèm trực tiếp vào mail gửi cho các đối tượng đạt khảo thí.'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replacement done");
