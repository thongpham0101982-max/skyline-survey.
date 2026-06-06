const fs = require('fs');
const clientPath = 'src/app/admin/input-assessments/reports/client.tsx';
let content = fs.readFileSync(clientPath, 'utf8');

const oldCall = `            const tempFullText = renderTemplate(
              rcContent || "",
              { 
                ...previewStudent, 
                signatureName: rcDirectorName || getCampusDefaultManager(previewStudent.admissionCampus) 
              }
            );`;

const newCall = `            const tempFullText = renderTemplate(
              rcContent || "",
              { 
                ...previewStudent, 
                signatureName: rcDirectorName || getCampusDefaultManager(previewStudent.admissionCampus) 
              },
              activePeriod?.academicYear?.name
            );`;

content = content.replace(oldCall, newCall);
fs.writeFileSync(clientPath, content, 'utf8');
