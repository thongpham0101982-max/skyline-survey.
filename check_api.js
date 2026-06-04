const fs = require('fs');
const apiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\check-he-thong\\route.ts';
if (fs.existsSync(apiPath)) {
    let apiContent = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n');
    console.log(apiContent.substring(apiContent.indexOf('return NextResponse.json({') - 300, apiContent.indexOf('return NextResponse.json({') + 300));
}
