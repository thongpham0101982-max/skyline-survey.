const fs = require('fs');
const path = require('path');

const adminPagePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\admin\\page.tsx';
let content = fs.readFileSync(adminPagePath, 'utf8');

// Replace fetch url
content = content.replace(
  'const r = await fetch("/api/check-he-thong?action=getMetrics")',
  'const yearId = localStorage.getItem("selectedAcademicYear") || "";\n        const r = await fetch("/api/check-he-thong?action=getMetrics&academicYearId=" + yearId)'
);

// Add event listener at the end of useEffect
content = content.replace(
  'fetchMetrics()\n  }, [])',
  'fetchMetrics()\n\n    window.addEventListener("academicYearChanged", fetchMetrics)\n    return () => window.removeEventListener("academicYearChanged", fetchMetrics)\n  }, [])'
);

fs.writeFileSync(adminPagePath, content, 'utf8');
console.log('Updated admin page fetch logic');
