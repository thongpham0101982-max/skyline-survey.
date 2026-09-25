const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'classes', '[id]', 'client.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = '<input required value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />';

const replacement = `<input 
                    required 
                    value={formData.studentName} 
                    onChange={e => setFormData({ ...formData, studentName: e.target.value })} 
                    onBlur={e => setFormData(prev => ({ ...prev, studentName: normalizePersonName(e.target.value) }))}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Hệ thống tự động chuẩn hóa viết hoa chữ cái đầu mỗi từ</p>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('PATCH_SUCCESS');
} else {
  console.log('TARGET_NOT_FOUND');
}
