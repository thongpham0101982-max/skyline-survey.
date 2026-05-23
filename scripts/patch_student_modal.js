const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

// 1. studentForm state
content = content.replace(
  "const [studentForm, setStudentForm] = useState({studentCode:\"\",fullName:\"\",dateOfBirth:\"\",admissionCriteria:\"\",surveyFormType:\"\",targetType:\"\",hocKy:\"\",kqgdTieuHoc:\"\",kqHocTap:\"\",kqRenLuyen:\"\",periodId:\"\",batchId:\"\"});",
  "const [studentForm, setStudentForm] = useState({studentCode:\"\",fullName:\"\",dateOfBirth:\"\",admissionCriteria:\"\",surveyFormType:\"\",targetType:\"\",hocKy:\"\",kqgdTieuHoc:\"\",kqHocTap:\"\",kqRenLuyen:\"\",periodId:\"\",batchId:\"\",grade:\"\"});"
);

// 2. handleOpenNewStudent
content = content.replace(
  "const handleOpenNewStudent=()=>{setEditingStudentId(null);setStudentForm({studentCode:\"\",fullName:\"\",dateOfBirth:\"\",admissionCriteria:\"\",surveyFormType:\"\",targetType:\"\",hocKy:\"\",kqgdTieuHoc:\"\",kqHocTap:\"\",kqRenLuyen:\"\",periodId:studentPeriodId,batchId:studentBatchId});setIsStudentOpen(true)};",
  "const handleOpenNewStudent=()=>{setEditingStudentId(null);setStudentForm({studentCode:\"\",fullName:\"\",dateOfBirth:\"\",admissionCriteria:\"\",surveyFormType:\"\",targetType:\"\",hocKy:\"\",kqgdTieuHoc:\"\",kqHocTap:\"\",kqRenLuyen:\"\",periodId:studentPeriodId,batchId:studentBatchId,grade:\"\"});setIsStudentOpen(true)};"
);

// 3. Table Header
content = content.replace(
  "<th className=\"px-4 py-3 text-left\">Mã HS KS</th>",
  "<th className=\"px-4 py-3 text-left\">Mã HS KS</th>\n                      <th className=\"px-4 py-3 text-center\">Khối KS</th>"
);

// 4. Table body
content = content.replace(
  "<td className=\"px-4 py-3 font-mono font-bold text-indigo-700\">{s.studentCode}</td>",
  "<td className=\"px-4 py-3 font-mono font-bold text-indigo-700\">{s.studentCode}</td>\n                        <td className=\"px-4 py-3 text-center font-bold text-slate-700\">{s.grade ? 'K'+s.grade : '-'}</td>"
);

// 5. edit button
content = content.replace(
  "kqRenLuyen:s.kqRenLuyen||\"\",periodId:s.periodId,batchId:s.batchId||\"\"",
  "kqRenLuyen:s.kqRenLuyen||\"\",grade:s.grade||\"\",periodId:s.periodId,batchId:s.batchId||\"\""
);

// 6. COLUMN_MAP
content = content.replace(
  "\"NgaySinh\": \"dateOfBirth\", \"dateOfBirth\": \"dateOfBirth\",",
  "\"NgaySinh\": \"dateOfBirth\", \"dateOfBirth\": \"dateOfBirth\",\n    \"Khoi KS\": \"grade\", \"Khoi\": \"grade\", \"Khối\": \"grade\", \"grade\": \"grade\","
);

// 7. Student modal form
const formSearch = "<div><label className=\"block text-sm font-semibold mb-1.5\">Ngày sinh</label>";
const formReplace = `<div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold mb-1.5">Ngày sinh</label><input type="date" value={studentForm.dateOfBirth} onChange={e=>setStudentForm({...studentForm,dateOfBirth:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"/></div>
                <div><label className="block text-sm font-semibold mb-1.5">Khối KS</label><select value={studentForm.grade} onChange={e=>setStudentForm({...studentForm,grade:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn Khối --</option>{grades.map((g)=><option key={g} value={g}>K{g}</option>)}</select></div>
              </div>`;

content = content.replace(
  "<div><label className=\"block text-sm font-semibold mb-1.5\">Ngày sinh</label><input type=\"date\" value={studentForm.dateOfBirth} onChange={e=>setStudentForm({...studentForm,dateOfBirth:e.target.value})} className=\"w-full border rounded-xl px-4 py-2.5\"/></div>",
  formReplace
);

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Patched student modal");
