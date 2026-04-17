const fs = require('fs');
const p = 'src/app/admin/input-assessments/client.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Add table headers after Học kỳ header
c = c.replace(
  '<th className="px-4 py-3 text-left">Học kỳ</th>',
  '<th className="px-4 py-3 text-left">Học kỳ</th>\n                        <th className="px-4 py-3 text-left">KQGD Tiểu học</th>\n                        <th className="px-4 py-3 text-left">KQ Học tập</th>\n                        <th className="px-4 py-3 text-left">KQ Rèn luyện</th>'
);

// 2. Add table cells after Học kỳ cell - find the hocKy cell
c = c.replace(
  `{s.hocKy ? <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium border border-emerald-200">{s.hocKy}</span> : <span className="text-slate-400">-</span>}</td>`,
  `{s.hocKy ? <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium border border-emerald-200">{s.hocKy}</span> : <span className="text-slate-400">-</span>}</td>
                          <td className="px-4 py-3">{s.kqgdTieuHoc ? <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-medium border border-rose-200">{s.kqgdTieuHoc}</span> : <span className="text-slate-400">-</span>}</td>
                          <td className="px-4 py-3">{s.kqHocTap ? <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">{s.kqHocTap}</span> : <span className="text-slate-400">-</span>}</td>
                          <td className="px-4 py-3">{s.kqRenLuyen ? <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 font-medium border border-teal-200">{s.kqRenLuyen}</span> : <span className="text-slate-400">-</span>}</td>`
);

// 3. Add form fields in student modal - after the Loại tuyển sinh + Học kỳ row
c = c.replace(
  `{hkOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
              </div>
              <div className="pt-4 flex justify-end gap-3">`,
  `{hkOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-semibold mb-1.5">KQGD Tiểu học</label><select value={studentForm.kqgdTieuHoc} onChange={e=>setStudentForm({...studentForm,kqgdTieuHoc:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn --</option>{kqgdThOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
                <div><label className="block text-sm font-semibold mb-1.5">KQ Học tập</label><select value={studentForm.kqHocTap} onChange={e=>setStudentForm({...studentForm,kqHocTap:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn --</option>{kqhtOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
                <div><label className="block text-sm font-semibold mb-1.5">KQ Rèn luyện</label><select value={studentForm.kqRenLuyen} onChange={e=>setStudentForm({...studentForm,kqRenLuyen:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn --</option>{kqrlOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
              </div>
              <div className="pt-4 flex justify-end gap-3">`
);

fs.writeFileSync(p, c);
console.log('Step 4 done - table + modal fields');