const fs = require('fs');
let content = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// Replace fetchSubjects definition with one that includes a useEffect to call it on mount
const searchStr = 'const fetchSubjects=async()=>{const r=await fetch("/api/input-assessment-categories?type=subject");if(r.ok)setSubjectsList(await r.json())};';

const replacement = `const fetchSubjects=async()=>{const r=await fetch("/api/input-assessment-categories?type=subject");if(r.ok)setSubjectsList(await r.json())};
  useEffect(() => {
    fetchSubjects();
  }, []);`;

content = content.replace(searchStr, replacement);
fs.writeFileSync('src/app/admin/input-assessments/client.tsx', content, 'utf8');
console.log("PATCH SUCCESSFUL");
