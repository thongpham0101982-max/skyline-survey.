const fs = require('fs');
const ts = require('typescript');

const code = fs.readFileSync('src/app/admin/tong-hop-du-gio/client.tsx', 'utf8');
const sourceFile = ts.createSourceFile('client.tsx', code, ts.ScriptTarget.Latest, true);

function findAdminTongHopClient(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'AdminTongHopClient') {
    return node;
  }
  return ts.forEachChild(node, findAdminTongHopClient);
}

const clientComp = findAdminTongHopClient(sourceFile);
if (!clientComp) {
  console.log('AdminTongHopClient not found');
  process.exit(1);
}

const declaredVars = new Map();
clientComp.body.statements.forEach(stmt => {
  if (ts.isVariableStatement(stmt)) {
    const isConstOrLet = (nodeFlags = stmt.declarationList.flags) => (nodeFlags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) !== 0;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        declaredVars.set(decl.name.text, decl.getStart(sourceFile));
      }
    }
  }
});

// Let's check for any variable declared AFTER a function that is CALLED during render!
// Specifically, which functions are called during render?
// renderTTCMMatrix, renderQADashboard, renderGDCSTrackingSection, etc.
const renderFunctions = ['renderTTCMMatrix', 'renderQADashboard', 'renderGDCSTrackingSection'];

clientComp.body.statements.forEach(stmt => {
  if (ts.isVariableStatement(stmt)) {
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && renderFunctions.includes(decl.name.text)) {
        console.log(`Checking render function: ${decl.name.text} at line ${sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile)).line + 1}`);
        
        function checkIdentifiersInFunc(node) {
          if (ts.isIdentifier(node)) {
            const name = node.text;
            if (declaredVars.has(name)) {
              const declPos = declaredVars.get(name);
              const funcPos = decl.getStart(sourceFile);
              if (declPos > funcPos) {
                const { line: usageLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                const { line: declLine } = sourceFile.getLineAndCharacterOfPosition(declPos);
                console.log(`  Render function [${decl.name.text}] uses "${name}" (L${usageLine + 1}) which is declared AFTER it at L${declLine + 1}`);
              }
            }
          }
          ts.forEachChild(node, checkIdentifiersInFunc);
        }
        checkIdentifiersInFunc(decl.initializer);
      }
    }
  }
});
