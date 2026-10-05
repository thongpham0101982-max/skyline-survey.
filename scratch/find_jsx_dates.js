const fs = require('fs');
const ts = require('typescript');

const fileContent = fs.readFileSync('src/app/admin/tong-hop-du-gio/client.tsx', 'utf8');
const sourceFile = ts.createSourceFile('client.tsx', fileContent, ts.ScriptTarget.Latest, true);

const jsxExpressions = [];

function visit(node) {
  if (ts.isJsxExpression(node)) {
    if (node.expression) {
      const text = node.expression.getText(sourceFile);
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      jsxExpressions.push({ line: line + 1, col: character + 1, text });
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);

console.log(`Total JSX expressions: ${jsxExpressions.length}`);

// Filter for any expression mentioning date, time, createdAt, updatedAt, day, etc.
const suspicious = jsxExpressions.filter(item => {
  const t = item.text.toLowerCase();
  return (
    t.includes('date') ||
    t.includes('time') ||
    t.includes('created') ||
    t.includes('updated') ||
    t.includes('at') ||
    t.includes('slot.') ||
    t.includes('reg.') ||
    t.includes('.day') ||
    t.includes('d.') ||
    t.includes('val') ||
    t.includes('item')
  );
});

console.log(`Suspicious expressions (${suspicious.length}):`);
suspicious.forEach(s => {
  // Check if it's already calling a string method or inside template literal
  const raw = s.text;
  console.log(`Line ${s.line}: ${raw.slice(0, 80)}`);
});
