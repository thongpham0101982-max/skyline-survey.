const fs = require('fs');
const path = require('path');

function search(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      search(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      // Look for any pattern like: throw new ReferenceError("Cannot access ... before initialization")
      // or search for 'before initialization'
      const pos = code.indexOf('before initialization');
      if (pos !== -1) {
        console.log('Found "before initialization" in:', fullPath);
        console.log(code.substring(Math.max(0, pos - 100), Math.min(code.length, pos + 100)));
      }
    }
  }
}

search('.next');
console.log('Done searching .next');
