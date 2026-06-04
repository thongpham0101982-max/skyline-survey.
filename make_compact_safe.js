const fs = require('fs');
const clientPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\teacher\\input-assessments\\client.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8');

// 1. Remove the English tabs block EXACTLY
const englishTabsBlock = `{currentAssignment && isEnglishAssignment && relatedEnglishAssignments.length > 0 && (
    <div className="-mt-6 mx-auto w-[92%] bg-white/70 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-300 mb-6 animate-in fade-in slide-in-from-top-4 flex flex-col gap-2 relative z-20">
        <div className="text-xs font-black text-indigo-400 uppercase tracking-widest pl-1">Danh sách Môn Tiếng Anh:</div>
        <div className="flex flex-wrap gap-2">
            {relatedEnglishAssignments.map(a => (
                <button 
                    key={a.id}
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className={\`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 \${selectedAssignmentId === a.id ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-400 ring-offset-1' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}\`}
                >
                    <BookOpen className="w-4 h-4" />
                    {a.subject?.name}
                </button>
            ))}
        </div>
    </div>
)}`;
clientContent = clientContent.replace(englishTabsBlock, '{/* compact */}');

// 2. Compact Header
const oldHeader = `<div className="bg-[#00A19A] rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-black rounded-full mix-blend-overlay filter blur-3xl opacity-10"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div>
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập kết quả Khảo sát</h1>
                <p className="text-teal-50 font-medium mt-1">Xin chào giáo viên <span className="text-white font-bold">{user?.fullName || "ẩn danh"}</span>!</p>
            </div>
                        <p className="text-teal-50 mt-2 flex flex-wrap items-center gap-2 text-sm md:text-base font-medium opacity-90">
                            <span className="bg-white/20 backdrop-blur-md text-white font-bold px-3 py-1 rounded-full shadow-inner shadow-white/10 ring-1 ring-white/30 truncate max-w-[200px] md:max-w-none">
                                👋 {user?.name || "Thầy/Cô"}
                            </span>
                            <span>Cập nhật nhanh chóng, lưu trữ an toàn</span>
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0 flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 ring-1 ring-white/20 shadow-xl">
                            <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Môn học</div>
                            <div className="text-white font-black text-xl">{currentAssignment ? currentAssignment.subject.name : "..."}</div>
                        </div>
                    </div>
                </div>
            </div>`;

const compactHeader = `<div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800">Nhập kết quả Khảo sát</h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Giáo viên: {user?.fullName || "ẩn danh"}</p>
                    </div>
                </div>
            </div>`;

clientContent = clientContent.replace(oldHeader, compactHeader);

// 3. Compact Filters
clientContent = clientContent.replace(
    /<div className="-mt-6 mx-auto w-\[96%\] max-w-\[1200px\] relative z-20 bg-white p-6 rounded-2xl shadow-lg ring-1 ring-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">/g, 
    '<div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">'
);
clientContent = clientContent.replace(/py-3\.5/g, 'py-2 text-sm');
clientContent = clientContent.replace(/rounded-2xl/g, 'rounded-lg');
clientContent = clientContent.replace(/<div className="group lg:col-span-1">/g, '<div className="group">');

// 4. Compact Table Header
const oldTableHeader = `<div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 overflow-hidden mt-6">
                    <div className="px-6 py-4 border-b bg-[#F0FDFA] flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <Users className="w-5 h-5 text-[#00A19A]"/>
                                Form nhập kết quả: {currentAssignment.subject.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5"/> Khối: <span className="font-semibold text-slate-700">{currentAssignment.grade || "Tất cả"}</span> | 
                                Thuộc kỳ khảo sát: <span className="font-semibold text-slate-700">{currentAssignment.period.name} {currentAssignment.batch?.name ? \` - \${currentAssignment.batch.name}\` : ""}</span>
                            </p>
                        </div>`;

const compactTableHeader = `<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-4">
                    <div className="px-4 py-3 border-b bg-slate-50 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#00A19A]"/>
                            <h3 className="font-bold text-slate-700 text-sm">{currentAssignment.subject.name}</h3>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{currentAssignment.period.name} {currentAssignment.batch?.name ? \` - \${currentAssignment.batch.name}\` : ""}</span>
                        </div>`;

clientContent = clientContent.replace(oldTableHeader, compactTableHeader);

// Make inputs even more compact
clientContent = clientContent.replace(/h-\[36px\]/g, 'h-[30px] text-[12px]');
clientContent = clientContent.replace(/py-2/g, 'py-1');
clientContent = clientContent.replace(/py-3/g, 'py-2');
clientContent = clientContent.replace(/px-4 py-4/g, 'px-2 py-2');
clientContent = clientContent.replace(/px-3 py-4/g, 'px-2 py-2');
clientContent = clientContent.replace(/font-bold text-slate-700 text-\[13px\]/g, 'font-bold text-slate-700 text-xs');
clientContent = clientContent.replace(/text-sm whitespace-nowrap/g, 'text-xs whitespace-nowrap');
clientContent = clientContent.replace(/text-sm/g, 'text-xs');

fs.writeFileSync(clientPath, clientContent, 'utf8');
console.log('UI made extremely compact and Skyline standard (safely)');
