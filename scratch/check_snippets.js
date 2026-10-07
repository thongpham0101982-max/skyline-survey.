const fs = require('fs');
const content = fs.readFileSync('src/app/admin/xet-duyet-ket-qua/k12-client.tsx', 'utf8');

const s1 = 'const [reportsSubTab, setReportsSubTab] = useState("stats"); // stats or results';
console.log('s1 exists:', content.includes(s1));

const s2 = 'latestBatchInfo && (';
console.log('s2 exists:', content.includes(s2));

const s3 = '{/* EXECUTIVE BATCH OVERVIEW KPI CARD FOR GDCS */}';
console.log('s3 exists:', content.includes(s3));

const s4 = '{/* STUDENT EXCEL LIST TABLE */}';
console.log('s4 exists:', content.includes(s4));
