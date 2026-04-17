const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const warningMsg = `
                    <div className="overflow-x-auto`; // Start of existing line

const injection = `
                    {isLocked && (
                        <div className="px-5 py-4 bg-red-50 border-y border-red-100 flex items-start gap-3">
                            <div className="pt-0.5">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-800 mb-1">Kỳ khảo sát đã bị khóa điểm</h3>
                                <p className="text-sm text-red-700 leading-relaxed">
                                    Kỳ khảo sát này đã được thiết lập sang trạng thái <strong>KHÓA</strong> nên mọi thao tác nhập liệu đều bị cấm. <br/>
                                    Trường hợp các thầy cô cần điều chỉnh điểm số, xin vui lòng liên hệ Người phụ trách đợt khảo sát: <strong>{currentAssignment.period.assignedUser?.fullName || "Admin"}</strong>.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto`;

c = c.replace(warningMsg, injection);
fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');

console.log('Banner injected successfully');
