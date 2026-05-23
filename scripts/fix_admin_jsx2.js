const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(/(\s*)(}\)\)}<\/div>\n\s*\)\}\n\s*<\/>\)\})/, "$1})})}</div>\n        )}\n      </>)}");
// Wait, doing replace text perfectly:
// I will just replace the specific block.
// line 386 is `          ))}</div>`
const block = `            </div>
          ))}</div>
        )}
      </>)}`;

const replacement = `            </div>
          )})}</div>
        )}
      </>)}`;

c = c.replace(block, replacement);
fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed block');
