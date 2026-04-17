const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(/\{periods\.map\(p=>\(/, '{periods.map(p=>{');

// The closing tags for this map should be `}))}</div>` -> `})})}</div>` wait no!
// Original: `))}</div>` -> I need to change it to `})}</div>`
c = c.replace(/\)\)\}<\/div>/, '})}</div>');

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed implicit JSX return');
