const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(/const \[activeTab, setActiveTab\] = useState/, 
  "const [reviewUnlockPeriod, setReviewUnlockPeriod] = useState<any>(null);\n  const [activeTab, setActiveTab] = useState");

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
