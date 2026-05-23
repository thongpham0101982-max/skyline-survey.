const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const regexToReplace = /<p className="text-sm text-red-700 leading-relaxed">([\s\S]*?)<\/p>\s*<\/div>\s*<\/div>/;

const replacement = `<p className="text-sm text-red-700 leading-relaxed">$1</p>
                                {currentAssignment.unlockRequestStatus === 'REJECTED' && (
                                    <div className="mt-3 bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg font-bold inline-block shadow-sm">
                                        ❌ Hệ thống không chấp nhận yêu cầu của bạn.
                                    </div>
                                )}
                                {currentAssignment.unlockRequestStatus === 'PENDING' ? (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm inline-flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                            Yêu cầu Mở khóa đang chờ Admin duyệt...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <button onClick={() => setIsUnlockRequestOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-md text-sm font-bold px-4 py-2.5 rounded-xl transition-all">Gửi Yêu cầu Cấp quyền Nhập Điểm</button>
                                    </div>
                                )}
                            </div>
                        </div>`;

c = c.replace(regexToReplace, replacement);
fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Teacher button injected');
