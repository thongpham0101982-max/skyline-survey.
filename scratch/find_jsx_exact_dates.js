const fs = require('fs');
const ts = require('typescript');

const fileContent = fs.readFileSync('src/app/admin/tong-hop-du-gio/client.tsx', 'utf8');
const sourceFile = ts.createSourceFile('client.tsx', fileContent, ts.ScriptTarget.Latest, true);

function visit(node) {
  if (ts.isJsxExpression(node)) {
    if (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) {
      if (node.expression) {
        const text = node.expression.getText(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        if (/date/i.test(text)) {
          console.log(`[L${line + 1}]: ${text.replace(/\s+/g, ' ')}`);
        }
      }
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
