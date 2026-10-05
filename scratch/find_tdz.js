const fs = require('fs');

const content = fs.readFileSync('src/app/admin/tong-hop-du-gio/client.tsx', 'utf8');
const lines = content.split('\n');

// Find all top-level declarations inside AdminTongHopClient
const decls = [];
lines.forEach((line, idx) => {
  const m = line.match(/^\s{2}(?:const|let)\s+([a-zA-Z0-9_$]+)\s*=/);
  if (m) {
    decls.push({ name: m[1], line: idx + 1 });
  }
});

console.log('Top-level declarations inside AdminTongHopClient:', decls.length);

// Now check if any useMemo or useState or function executed during render accesses a declaration that appears later!
decls.forEach((decl, i) => {
  const name = decl.name;
  const declLine = decl.line;

  // Search lines before declLine
  for (let l = 0; l < declLine - 1; l++) {
    const lineText = lines[l];
    // check if name is used as an identifier
    const regex = new RegExp(`\\b${name}\\b`);
    if (regex.test(lineText)) {
      // Ignore comments
      if (lineText.trim().startsWith('//') || lineText.trim().startsWith('*')) continue;
      console.log(`Variable [${name}] (declared at L${declLine}) used earlier at L${l + 1}: ${lineText.trim().slice(0, 100)}`);
    }
  }
});
