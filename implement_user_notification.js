const fs = require('fs');

// ==== 1. Update API to include assignedUser ====
let apiRoute = fs.readFileSync('src/app/api/teacher-assessments/route.ts', 'utf8');
apiRoute = apiRoute.replace(/period: true\s*\n\s*\}/, "period: { include: { assignedUser: true } }\n            }");
fs.writeFileSync('src/app/api/teacher-assessments/route.ts', apiRoute, 'utf8');

// ==== 2. Update Teacher UI ====
let clientFile = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const warningMsg = `
    {isLocked && (
        <div className="mx-auto w-[92%] -mt-2 mb-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
                <div className="pt-0.5">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-red-800 mb-1">Kỳ khảo sát đã bị khóa điểm</h3>
                    <p className="text-sm text-red-700 leading-relaxed">
                        Kỳ khảo sát này đã được thiết lập sang trạng thái <strong>KHÓA</strong>. <br/>
                        Trường hợp các thầy cô cần điều chỉnh, xin liên hệ người Phụ trách đợt khảo sát: <strong>{currentAssignment.period.assignedUser?.fullName || "Chưa phân công"}</strong>.
                    </p>
                </div>
            </div>
        </div>
    )}
    <div className="bg-white rounded-3xl p-0 md:p-2 shadow-sm border border-slate-200 overflow-hidden relative z-10 w-full mb-10">
`;

// Replace the table container opening tag
const containerRegex = /<div className="bg-white rounded-3xl p-0 md:p-2 shadow-sm border border-slate-200 overflow-hidden relative z-10 w-full mb-10">/;
clientFile = clientFile.replace(containerRegex, warningMsg);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', clientFile, 'utf8');
console.log('User notification integrated for locked state.');
