const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\components\\AcademicYearSelector.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const targetStr = `            const active = data.find(y => y.status === "ACTIVE");
            if (active) setSelectedYear(active.id);
            else if (data.length > 0) setSelectedYear(data[0].id);`;

const newStr = `            const active = data.find(y => y.status === "ACTIVE");
            const defaultId = active ? active.id : (data.length > 0 ? data[0].id : null);
            if (defaultId) {
              setSelectedYear(defaultId);
              if (!localStorage.getItem("selectedAcademicYear")) {
                 localStorage.setItem("selectedAcademicYear", defaultId);
                 window.dispatchEvent(new Event("academicYearChanged"));
              }
            }`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Fixed AcademicYearSelector");
} else {
    console.log("NOT FOUND in AcademicYearSelector");
}
