const fs = require('fs');

const pagePath = 'c:/Users/Windows 11/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/classes/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');
pageCode = pageCode.replace(
  'studentCount: c._count.students,',
  'studentCount: c._count.students,\n    homeroomTeacherId: c.homeroomTeacherId,'
);
pageCode = pageCode.replace(
  'academicYears={academicYears}',
  'academicYears={academicYears}\n        teachers={teachers}'
);
fs.writeFileSync(pagePath, pageCode, 'utf8');

const clientPath = 'c:/Users/Windows 11/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/classes/client.tsx';
let clientCode = fs.readFileSync(clientPath, 'utf8');
clientCode = clientCode.replace(
  'export function AdminClassesClient({ initialClasses, campuses, academicYears, isCampusLocked = false, defaultCampusId = null }: any) {',
  'export function AdminClassesClient({ initialClasses, campuses, academicYears, teachers, isCampusLocked = false, defaultCampusId = null }: any) {'
);
clientCode = clientCode.replace(
  'campusId: editModal.campusId,\n      educationSystem: editModal.educationSystem || \"\"',
  'campusId: editModal.campusId,\n      educationSystem: editModal.educationSystem || \"\",\n      homeroomTeacherId: editModal.homeroomTeacherId || null'
);

const gvcnField =                 <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Giáo viên ch? nhi?m (GVCN)</label>
                  <select value={editModal.homeroomTeacherId || ""} onChange={e => setEditModal({...editModal, homeroomTeacherId: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">-- Chýa phân công --</option>
                    {teachers?.map((t: any) => <option key={t.id} value={t.id}>{t.teacherName}</option>)}
                  </select>
                </div>
;

clientCode = clientCode.replace(
  '<div className="pt-4 flex items-center justify-end gap-3">',
  gvcnField + '                <div className="pt-4 flex items-center justify-end gap-3">'
);

fs.writeFileSync(clientPath, clientCode, 'utf8');

const actionsPath = 'c:/Users/Windows 11/.gemini/antigravity/brain/e243b0d8-3241-4833-8c7a-e612ebbae098/browser/Skyline-survey/src/app/admin/classes/actions.ts';
let actionsCode = fs.readFileSync(actionsPath, 'utf8');
actionsCode = actionsCode.replace(
  'campusId: data.campusId,\n        educationSystem: data.educationSystem || \"\"',
  'campusId: data.campusId,\n        educationSystem: data.educationSystem || \"\",\n        homeroomTeacherId: data.homeroomTeacherId'
);
fs.writeFileSync(actionsPath, actionsCode, 'utf8');

console.log('Update successful!');
