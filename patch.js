const fs = require('fs');
let code = fs.readFileSync('src/app/admin/student-info/client.tsx', 'utf-8');

const targetState = '  const [transferCampusId, setTransferCampusId] = useState("");\n  const [transferClassId, setTransferClassId] = useState("");';
const newState = '  const [transferCampusId, setTransferCampusId] = useState("");\n  const [transferYearId, setTransferYearId] = useState("");\n  const [transferGradeId, setTransferGradeId] = useState("");\n  const [transferClassId, setTransferClassId] = useState("");';

const targetMemo = '  const filteredClasses = useMemo(() => {\n    if (!transferCampusId) return [];\n    return allClasses.filter((c) => c.campusId === transferCampusId);\n  }, [allClasses, transferCampusId]);';
const newMemo = '  const filteredClasses = useMemo(() => {\n    if (!transferCampusId || !transferYearId) return [];\n    return allClasses.filter(c => \n      c.campusId === transferCampusId && \n      c.academicYearId === transferYearId &&\n      (!transferGradeId || c.grade === transferGradeId)\n    );\n  }, [allClasses, transferCampusId, transferYearId, transferGradeId]);';

const targetSync = '        setTransferCampusId("");\n        setTransferClassId("");';
const newSync = '        setTransferCampusId("");\n        setTransferYearId("");\n        setTransferGradeId("");\n        setTransferClassId("");';

const targetUI = \                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Cơ sở *</label>
                              <select
                                required
                                value={transferCampusId}
                                onChange={(e) => {
                                  setTransferCampusId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                  setTargetSystem("");
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Cơ sở --</option>
                                {campuses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.campusName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Lớp học *</label>
                              <select
                                required
                                disabled={!transferCampusId}
                                value={transferClassId}
                                onChange={(e) => {
                                  setTransferClassId(e.target.value);
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer disabled:opacity-50"
                              >
                                <option value="">-- Chọn Lớp học --</option>
                                {filteredClasses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.className}</option>
                                ))}
                              </select>
                            </div>
                          </div>\;

const newUI = \                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Năm học *</label>
                              <select
                                required
                                value={transferYearId}
                                onChange={(e) => {
                                  setTransferYearId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Năm học --</option>
                                {generalPeriods.length > 0 ? academicYears.filter(ay => !ay.isOff).map((y) => (
                                  <option key={y.id} value={y.id}>{y.name}</option>
                                )) : academicYears.filter(ay => !ay.isOff).map((y) => (
                                  <option key={y.id} value={y.id}>{y.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Cơ sở *</label>
                              <select
                                required
                                value={transferCampusId}
                                onChange={(e) => {
                                  setTransferCampusId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                  setTargetSystem("");
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Chọn Cơ sở --</option>
                                {campuses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.campusName}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Khối</label>
                              <select
                                value={transferGradeId}
                                onChange={(e) => {
                                  setTransferGradeId(e.target.value);
                                  setTransferClassId("");
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                              >
                                <option value="">-- Tất cả Khối --</option>
                                {grades.map((g) => (
                                  <option key={g} value={g}>Khối {g}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Lớp học *</label>
                              <select
                                required
                                disabled={!transferCampusId || !transferYearId}
                                value={transferClassId}
                                onChange={(e) => {
                                  setTransferClassId(e.target.value);
                                  setTransferStudents([]);
                                  setSelectedStudentIds([]);
                                }}
                                className="h-10.5 w-full px-3 bg-[#F8FAFC] border border-[#D9E2EC] text-[#1E293B] text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer disabled:opacity-50"
                              >
                                <option value="">-- Chọn Lớp học --</option>
                                {filteredClasses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.className}</option>
                                ))}
                              </select>
                            </div>
                          </div>\;

let changed = false;

if (code.includes(targetState)) { code = code.replace(targetState, newState); changed = true; }
if (code.includes(targetMemo)) { code = code.replace(targetMemo, newMemo); changed = true; }
if (code.includes(targetSync)) { code = code.replace(targetSync, newSync); changed = true; }
if (code.includes(targetUI.trim().split('\n')[0])) {
  code = code.replace(targetUI.replace(/\r\n/g, '\n'), newUI.replace(/\r\n/g, '\n'));
  changed = true;
}

if (changed) {
  fs.writeFileSync('src/app/admin/student-info/client.tsx', code, 'utf-8');
  console.log('SUCCESS');
} else {
  console.log('FAILED TO MATCH');
}
