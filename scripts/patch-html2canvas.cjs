const fs = require('fs');
const path = require('path');

const targets = [
  'node_modules/html2canvas/dist/html2canvas.js',
  'node_modules/html2canvas/dist/html2canvas.esm.js',
  'node_modules/html2canvas/dist/lib/css/types/color.js'
];

targets.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const targetStr = 'throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"");';
    if (content.includes(targetStr)) {
      content = content.replace(targetStr, 'return 0;');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Successfully patched:', relPath);
    } else {
      console.log('Already patched or not found in:', relPath);
    }
  }
});

const minFile = path.join(process.cwd(), 'node_modules/html2canvas/dist/html2canvas.min.js');
if (fs.existsSync(minFile)) {
  let content = fs.readFileSync(minFile, 'utf8');
  const minTarget = "throw new Error('Attempting to parse an unsupported color function \"'+e.name+'\"');";
  if (content.includes(minTarget)) {
    content = content.replace(minTarget, 'return 0;');
    fs.writeFileSync(minFile, content, 'utf8');
    console.log('Successfully patched minified file:', minFile);
  } else {
    console.log('Already patched or not found in min file');
  }
}
