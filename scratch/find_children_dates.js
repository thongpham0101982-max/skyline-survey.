const fs = require('fs');
const ts = require('typescript');

const fileContent = fs.readFileSync('src/app/admin/tong-hop-du-gio/client.tsx', 'utf8');
const sourceFile = ts.createSourceFile('client.tsx', fileContent, ts.ScriptTarget.Latest, true);

const childrenExpressions = [];

function visit(node) {
  if (ts.isJsxExpression(node)) {
    // Check if the parent is a JsxElement or JsxFragment
    if (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) {
      if (node.expression) {
        const text = node.expression.getText(sourceFile);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        childrenExpressions.push({ line: line + 1, col: character + 1, text });
      }
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);

console.log(`Total JSX children expressions: ${childrenExpressions.length}`);

// Find expressions that are NOT:
// - string literals or numbers
// - .map(...)
// - boolean expressions with && or ? :
// - functions
// Let's print expressions that directly reference a property or identifier
const simpleExprs = childrenExpressions.filter(item => {
  const t = item.text.trim();
  // Filter out clearly boolean conditions like `cond && ...` or `cond ? ... : ...`
  // But wait! If it's `a ? b : c`, b or c could be a Date!
  return true;
});

// Let's look for anything with date, time, or properties of objects
simpleExprs.forEach(item => {
  const t = item.text.trim();
  if (
    /date/i.test(t) ||
    /time/i.test(t) ||
    /created/i.test(t) ||
    /updated/i.test(t) ||
    /slot\./.test(t) ||
    /reg\./.test(t) ||
    /item\./.test(t) ||
    /d\./.test(t) ||
    /val\./.test(t) ||
    /g\./.test(t) ||
    /s\./.test(t) ||
    /c\./.test(t) ||
    /t\./.test(t)
  ) {
    console.log(`[L${item.line}]: ${t.slice(0, 100).replace(/\n/g, ' ')}`);
  }
});
