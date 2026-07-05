const fs = require('fs');
let p = 'src/app/admin/experiential-activities/categories/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\? \/api\/activities\/categories\/ \+ editingId/g, "? '/api/activities/categories/' + editingId");
c = c.replace(/fetch\(\/api\/activities\/categories\/ \+ id/g, "fetch('/api/activities/categories/' + id");
fs.writeFileSync(p, c);