const fs = require('fs');
const clientPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\teacher\\input-assessments\\client.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8').replace(/\r\n/g, '\n');

const targetStr = `<div className="bg-[#00A19A] rounded-lg p-6 md:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-black rounded-full mix-blend-overlay filter blur-3xl opacity-10"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div>
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập kết quả Khảo sát</h1>
                <p className="text-teal-50 font-medium mt-1">Xin chào giáo viên <span className="text-white font-bold">{user?.fullName || "ẩn danh"}</span>!</p>
            </div>
                        <p className="text-teal-50 mt-2 flex flex-wrap items-center gap-2 text-xs md:text-base font-medium opacity-90">
                            <span className="bg-white/20 backdrop-blur-md text-white font-bold px-3 py-1 rounded-full shadow-inner shadow-white/10 ring-1 ring-white/30 truncate max-w-[200px] md:max-w-none">
                                👋 {user?.name || "Thầy/Cô"}
                            </span>
                            <span>Cập nhật nhanh chóng, lưu trữ an toàn</span>
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0 flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 ring-1 ring-white/20 shadow-xl">
                            <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Môn học</div>
                            <div className="text-white font-black text-xl">{currentAssignment ? currentAssignment.subject.name : "..."}</div>
                        </div>
                    </div>
                </div>
            </div>`;

const compactHeader = `<div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-800">Nhập kết quả Khảo sát</h1>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Giáo viên: <span className="font-bold text-slate-700">{user?.fullName || user?.name || "ẩn danh"}</span></p>
                    </div>
                </div>
            </div>`;

if(clientContent.includes(targetStr)) {
    clientContent = clientContent.replace(targetStr, compactHeader);
    fs.writeFileSync(clientPath, clientContent, 'utf8');
    console.log('REPLACED SUCCESSFULLY THIS TIME.');
} else {
    console.log('TARGET STRING NOT FOUND! Line endings issue?');
    // Regex fallback just in case spaces are weird
    const fallbackRegex = /<div className="bg-\[#00A19A\] rounded-lg p-6 md:p-8[\s\S]*?<\/div>\n            <\/div>/;
    if(fallbackRegex.test(clientContent)) {
        clientContent = clientContent.replace(fallbackRegex, compactHeader);
        fs.writeFileSync(clientPath, clientContent, 'utf8');
        console.log('REPLACED VIA REGEX!');
    } else {
         console.log('REGEX FAILED TOO!');
    }
}
