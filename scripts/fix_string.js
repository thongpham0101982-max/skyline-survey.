const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(`if (res.errors?.length > 0) msg += "\nLoi "`, `if (res.errors?.length > 0) msg += "\\nLoi "`);
c = c.replace(`.join("\n");`, `.join("\\n");`);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
