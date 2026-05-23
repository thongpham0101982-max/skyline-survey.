const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const finalDivRegex = /<\/div>\s*\);\s*\n\}\s*$/;
const modalJSX = `
      {isUnlockRequestOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Yêu cầu Mở khóa Form</h3>
              <button onClick={() => setIsUnlockRequestOpen(false)} className="text-slate-400 hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do xin mở khóa bổ sung điểm:</label>
                <textarea 
                    value={unlockReason} 
                    onChange={e => setUnlockReason(e.target.value)} 
                    className="w-full border rounded-xl p-3 text-sm focus:border-indigo-500 outline-none h-32 resize-none" 
                    placeholder="VD: Cần chỉnh sửa lại điểm cột Hành vi cho một số học sinh..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsUnlockRequestOpen(false)} className="px-5 py-2 hover:bg-slate-100 rounded-xl font-medium text-slate-600">Hủy</button>
                <button onClick={handleUnlockRequestSubmit} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700">Gửi Yêu Cầu</button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
    );
}
`;
c = c.replace(finalDivRegex, modalJSX);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed Modal');
