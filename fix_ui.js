const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\teacher\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const targetStr = `      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Tổng quan Công việc</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">Thống kê lớp học và nhiệm vụ phân công của bạn.</p>
        </div>
      </div>`;

const newStr = `      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Tổng quan Công việc</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Năm học đang hoạt động: <span className="font-bold text-[#00A19A]">{finalMetrics.academicYearName || "---"}</span> | Thống kê lớp học và nhiệm vụ phân công của bạn.
          </p>
        </div>
      </div>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Fixed teacher dashboard UI");
} else {
    console.log("NOT FOUND in UI");
}
