const fs = require('fs');

function fixSyntaxError(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace('const emailHtml =   return `', 'const emailHtml = `');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Fixed", filePath);
}

fixSyntaxError('src/app/api/admin/send-quick-email/route.ts');
fixSyntaxError('src/app/api/admin/preschool-send-quick-email/route.ts');
