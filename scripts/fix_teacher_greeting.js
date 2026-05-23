const fs = require('fs');

let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const target = `<h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập điểm Khảo sát</h1>`;
const replacement = `<div>
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập điểm Khảo sát</h1>
                <p className="text-indigo-100 font-medium mt-1">Xin chào giáo viên <span className="text-white font-bold">{user?.fullName || 'ẩn danh'}</span>, chúc bạn một ngày làm việc hiệu quả!</p>
            </div>`;

c = c.replace(target, replacement);
fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
