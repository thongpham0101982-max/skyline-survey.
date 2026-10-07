const fs = require('fs');

const k12Path = 'src/app/admin/xet-duyet-ket-qua/k12-client.tsx';
let raw = fs.readFileSync(k12Path, 'utf8');
const isCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

console.log('Original size:', content.length, 'CRLF:', isCRLF);

// 1. Add Zap, CheckSquare, Square to imports
const importAnchor = '  Phone, Printer, Lock\n} from "lucide-react"';
if (!content.includes(importAnchor)) {
  console.error('Import anchor not found!');
  process.exit(1);
}
content = content.replace(
  importAnchor,
  '  Phone, Printer, Lock, Zap, CheckSquare, Square\n} from "lucide-react"'
);

// 2. Change reportsSubTab default to "results" and add state variables
const stateAnchor = `  const [reportsSubTab, setReportsSubTab] = useState("stats"); // stats or results`;
if (!content.includes(stateAnchor)) {
  console.error('State anchor not found!');
  process.exit(1);
}

const newState = `  const [reportsSubTab, setReportsSubTab] = useState("results"); // Mặc định mở tab Xét duyệt KQ (Workflow-first)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [inlineApprovalLoadingId, setInlineApprovalLoadingId] = useState<string | null>(null);`;

content = content.replace(stateAnchor, newState);

// 3. Add handler functions before handleSaveReportResult
const handlerAnchor = `  const handleSaveReportResult = async () => {`;
if (!content.includes(handlerAnchor)) {
  console.error('Handler anchor not found!');
  process.exit(1);
}

const newHandlers = `  // Handler duyệt nhanh 1 học sinh ngay trên dòng
  const handleQuickApproveStudent = async (student: any, resultType: "Đạt" | "Đạt cam kết" | "Không đạt") => {
    if (!student) return;
    if (resultType === "Đạt cam kết") {
      setReportStudentId(student.id);
      setReportForm(f => ({ ...f, admissionResult: "Đạt cam kết" }));
      return;
    }

    setInlineApprovalLoadingId(student.id);
    try {
      const userRole = (currentUser?.role || "").toUpperCase();
      const approverName = currentUser?.fullName || "Giám đốc Cơ sở";
      const finalCampus = resolvedStudentCampusObj?.campusName || (campuses.find(c => c.id === reportCampusFilter)?.campusName) || student.admissionCampus || "";

      const res = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          data: {
            admissionResult: resultType,
            admissionCampus: finalCampus,
            signatureName: approverName,
            directorNote: \`Xét duyệt nhanh: \${resultType} bởi \${approverName} vào lúc \${new Date().toLocaleString("vi-VN")}\`
          }
        })
      });
      const resData = await res.json();
      if (res.ok) {
        notify(\`Đã phê duyệt "\${resultType}" cho học sinh \${student.fullName}!\`, "ok");
        setReportStudents(prev => prev.map(s => s.id === student.id ? {
          ...s,
          admissionResult: resultType,
          admissionCampus: finalCampus,
          signatureName: approverName
        } : s));
      } else {
        notify(resData.error || "Không thể phê duyệt học sinh", "err");
      }
    } catch (e: any) {
      notify("Lỗi khi xét duyệt: " + (e?.message || e), "err");
    } finally {
      setInlineApprovalLoadingId(null);
    }
  };

  // Handler duyệt hàng loạt (Batch Approval)
  const handleBatchApprove = async (resultType: "Đạt" | "Không đạt") => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(\`Xác nhận phê duyệt kết quả "\${resultType}" cho \${selectedStudentIds.length} học sinh đã chọn?\`)) {
      return;
    }

    setBatchActionLoading(true);
    try {
      const approverName = currentUser?.fullName || "Giám đốc Cơ sở";
      const finalCampus = resolvedStudentCampusObj?.campusName || (campuses.find(c => c.id === reportCampusFilter)?.campusName) || "";

      const res = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedStudentIds,
          data: {
            admissionResult: resultType,
            admissionCampus: finalCampus,
            signatureName: approverName,
            directorNote: \`Phê duyệt hàng loạt: \${resultType} bởi \${approverName} vào lúc \${new Date().toLocaleString("vi-VN")}\`
          }
        })
      });
      const resData = await res.json();
      if (res.ok) {
        notify(\`Đã phê duyệt "\${resultType}" thành công cho \${selectedStudentIds.length} học sinh!\`, "ok");
        setReportStudents(prev => prev.map(s => selectedStudentIds.includes(s.id) ? {
          ...s,
          admissionResult: resultType,
          admissionCampus: finalCampus,
          signatureName: approverName
        } : s));
        setSelectedStudentIds([]);
      } else {
        notify(resData.error || "Lỗi khi phê duyệt hàng loạt", "err");
      }
    } catch (e: any) {
      notify("Lỗi hệ thống: " + (e?.message || e), "err");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPageIds = paginatedReportStudents.map(s => s.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...allPageIds])));
    } else {
      const pageIdSet = new Set(paginatedReportStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper hiển thị tóm tắt điểm thi Toán, Văn, Anh trên hàng
  const renderStudentScoresCell = (student: any) => {
    if (student.isAbsent) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Vắng thi
        </span>
      );
    }
    const scores = student.scores || [];
    if (!scores || scores.length === 0) {
      return <span className="text-slate-400 text-[11px] italic">Chưa có điểm</span>;
    }

    const findScore = (matchFn: (name: string, code: string) => boolean) => {
      const sc = scores.find((item: any) => {
        const name = (item.subject?.name || item.subjectName || "").toLowerCase();
        const code = (item.subject?.code || "").toLowerCase();
        return matchFn(name, code);
      });
      if (!sc) return null;
      let val = sc.score;
      if (val === null || val === undefined) val = sc.evaluation || "—";
      return { val, num: parseFloat(val) };
    };

    const math = findScore((n, c) => n.includes("toán") || c.includes("math"));
    const lit = findScore((n, c) => n.includes("việt") || n.includes("văn") || c.includes("lit"));
    const eng = findScore((n, c) => n.includes("anh") || c.includes("eng") || c.includes("esl"));

    const badgeCls = (num: number) => {
      if (!isNaN(num)) {
        if (num >= 7 || num >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (num >= 5 || num >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
        return "bg-rose-50 text-rose-700 border-rose-200";
      }
      return "bg-slate-50 text-slate-700 border-slate-200";
    };

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {math && (
          <span className={\`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border \${badgeCls(math.num)}\`} title="Toán">
            <span className="text-slate-400 font-normal">T:</span>{math.val}
          </span>
        )}
        {lit && (
          <span className={\`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border \${badgeCls(lit.num)}\`} title="Tiếng Việt / Ngữ Văn">
            <span className="text-slate-400 font-normal">V:</span>{lit.val}
          </span>
        )}
        {eng && (
          <span className={\`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border \${badgeCls(eng.num)}\`} title="Tiếng Anh">
            <span className="text-slate-400 font-normal">A:</span>{eng.val}
          </span>
        )}
        {!math && !lit && !eng && scores.length > 0 && (
          <span className="text-[11px] text-slate-600 font-semibold">{scores.length} môn</span>
        )}
      </div>
    );
  };

  const handleSaveReportResult = async () => {`;

content = content.replace(handlerAnchor, newHandlers);

// 4. Transform Latest Batch Notification Banner
const bannerSearch = `          {latestBatchInfo && (
            <div className="no-print relative overflow-hidden p-4 rounded-2xl shadow-md animate-in fade-in slide-in-from-top-4 duration-500 mb-6 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/60 border border-amber-200/80 ring-1 ring-amber-900/5 group hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform duration-300">
            <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-[13px] font-semibold text-slate-700 leading-relaxed flex flex-wrap items-center gap-y-1.5 gap-x-1">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600 uppercase tracking-widest text-xs py-0.5 px-2.5 rounded-lg bg-white/80 border border-amber-200/50 shadow-sm mr-2 flex items-center gap-1.5">
            Thông báo
            </span>
            <span className="opacity-90">Đợt khảo sát mới nhất:</span> 
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold shadow-md shadow-amber-900/10 mx-0.5 text-xs tracking-wide">
            {latestBatchInfo.name}
            </span> 
            <span className="opacity-90 mx-1">thuộc Kỳ khảo sát</span> 
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-black border border-orange-200/60 shadow-sm mx-0.5 text-xs">
            {latestBatchInfo.periodName}
            </span>
            <span className="opacity-90 ml-0.5">. Vui lòng xét duyệt.</span>
            </div>
            </div>
            </div>
            </div>
          )}`;

if (!content.includes(bannerSearch)) {
  console.error('Banner search block not found!');
  process.exit(1);
}

const bannerReplacement = `          {latestBatchInfo && !alertDismissed && (
            <div className="no-print mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-slate-700 shadow-2xs text-xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                  <AlertCircle className="w-3 h-3" /> Đợt KS mới nhất
                </span>
                <span className="font-black text-slate-800 truncate">{latestBatchInfo.name}</span>
                <span className="text-slate-400 font-medium">• Kỳ: <strong className="text-slate-700">{latestBatchInfo.periodName}</strong></span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setReportPeriodId(latestBatchInfo.periodId);
                    setReportBatchId(latestBatchInfo.id);
                    setReportsSubTab("results");
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  Xem đợt này
                </button>
                <button
                  onClick={() => setAlertDismissed(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}`;

content = content.replace(bannerSearch, bannerReplacement);

// 5. Transform Sub-tab navigation bar
const navSearch = `          {/* Sub-tab Navigation & Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 p-3.5 shadow-sm text-xs font-semibold">
            <div className="hidden md:block flex-1"></div>
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 flex gap-1 shadow-inner">
              <button
                onClick={() => setReportsSubTab("stats")}
                className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 \${reportsSubTab === "stats" ? "bg-white text-indigo-600 shadow-sm scale-[1.02]" : "text-slate-500 hover:text-slate-800"}\`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500"/>
                Thống kê tổng quan
              </button>
              <button
                onClick={() => setReportsSubTab("results")}
                className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 \${reportsSubTab === "results" ? "bg-white text-indigo-600 shadow-sm scale-[1.02]" : "text-slate-500 hover:text-slate-800"}\`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500"/>
                Xét duyệt KQ
              </button>
            </div>
            <div className="flex-1 flex justify-end w-full md:w-auto"></div>
          </div>`;

if (!content.includes(navSearch)) {
  console.error('Nav search block not found!');
  process.exit(1);
}

const navReplacement = `          {/* Sub-tab Navigation & Actions Bar (Streamlined) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex gap-1 shadow-inner w-full sm:w-auto">
              <button
                onClick={() => setReportsSubTab("results")}
                className={\`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-black tracking-tight transition-all duration-200 cursor-pointer \${reportsSubTab === "results" ? "bg-white text-[#007A87] shadow-sm" : "text-slate-500 hover:text-slate-800"}\`}
              >
                <Users className="w-3.5 h-3.5 text-[#007A87]"/>
                Xét duyệt Kết quả ({filteredReportStudents.length})
              </button>
              <button
                onClick={() => setReportsSubTab("stats")}
                className={\`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-black tracking-tight transition-all duration-200 cursor-pointer \${reportsSubTab === "stats" ? "bg-white text-[#007A87] shadow-sm" : "text-slate-500 hover:text-slate-800"}\`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#007A87]"/>
                Báo cáo & Thống kê
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {batchSummaryStats.pending > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  {batchSummaryStats.pending} học sinh chờ duyệt
                </span>
              )}
            </div>
          </div>`;

content = content.replace(navSearch, navReplacement);

// 6. Transform the Executive Batch Overview & KPI blocks in "results" tab
// Replace lines 7378 to 7495 with unified compact Toolbar + Status Filter Chips + Floating Batch Bar
const resultsOverviewSearch = `              {/* EXECUTIVE BATCH OVERVIEW KPI CARD FOR GDCS */}
              <div className="bg-gradient-to-br from-white via-slate-50/60 to-teal-50/20 rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm mb-6 relative overflow-hidden backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-50 text-[#007A87] border border-teal-200/80 shadow-2xs">
                        🏢 {reportCampusFilter === "all" ? "Toàn hệ thống" : (campuses.find(c => c.id === reportCampusFilter)?.campusName || "Cơ sở")}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                        {reportBatchId === "all" ? "Tất cả các đợt khảo sát" : (rawReportBatches.find(b => b.id === reportBatchId)?.name || "Đợt khảo sát")}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
                      <span>Kỳ:</span> <strong className="text-slate-700 font-bold">{reportSelPeriod?.name || "Tất cả các kỳ"}</strong>
                      <span className="text-slate-300">•</span>
                      <span>Tiến độ xét duyệt kết quả tuyển sinh của Giám đốc Cơ sở</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={handleSendBatchApprovalResultEmail}
                      disabled={sendingBatchResultEmail || filteredReportStudents.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#007A87] to-[#48BFE3] hover:brightness-105 active:scale-95 shadow-md shadow-teal-500/20 transition-all disabled:opacity-50 cursor-pointer"
                      title="Gửi email thông báo bảng kết quả xét duyệt của đợt này đến Ban KT&ĐBCL và GĐCS"
                    >
                      {sendingBatchResultEmail ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4"/>}
                      <span>Gửi kết quả (GĐCS, Tư vấn & Ban KT&ĐBCL)</span>
                    </button>
                  </div>
                </div>

                {/* 5 KPI BLOCKS VỚI MÀU SẮC ĐẸP MẮT */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
                  <div 
                    onClick={() => setReportApprovalStatusFilter("all")}
                    className={\`p-3.5 rounded-2xl border transition-all cursor-pointer \${reportApprovalStatusFilter === "all" ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20 shadow-sm" : "bg-white/90 border-slate-200 hover:border-sky-200 shadow-2xs"}\`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng số hồ sơ</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">{batchSummaryStats.total}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">học sinh</div>
                  </div>

                  <div 
                    onClick={() => setReportApprovalStatusFilter("Chưa duyệt")}
                    className={\`p-3.5 rounded-2xl border transition-all cursor-pointer \${reportApprovalStatusFilter === "Chưa duyệt" ? "bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/20 shadow-sm" : "bg-white/90 border-slate-200 hover:border-amber-200 shadow-2xs"}\`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      {batchSummaryStats.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"/>}
                      Chờ GĐCS duyệt
                    </div>
                    <div className="text-2xl font-black text-amber-600 mt-1">{batchSummaryStats.pending}</div>
                    <div className="text-[10px] font-bold text-amber-600/70 mt-0.5">cần xử lý</div>
                  </div>

                  <div 
                    onClick={() => setReportApprovalStatusFilter("Đạt")}
                    className={\`p-3.5 rounded-2xl border transition-all cursor-pointer \${reportApprovalStatusFilter === "Đạt" ? "bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/20 shadow-sm" : "bg-white/90 border-slate-200 hover:border-emerald-200 shadow-2xs"}\`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Đạt chuẩn</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{batchSummaryStats.passed}</div>
                    <div className="text-[10px] font-bold text-emerald-600/70 mt-0.5">đủ điều kiện</div>
                  </div>

                  <div 
                    onClick={() => setReportApprovalStatusFilter("Đạt cam kết")}
                    className={\`p-3.5 rounded-2xl border transition-all cursor-pointer \${reportApprovalStatusFilter === "Đạt cam kết" ? "bg-orange-50/90 border-orange-300 ring-2 ring-orange-400/20 shadow-sm" : "bg-white/90 border-slate-200 hover:border-orange-200 shadow-2xs"}\`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-orange-600">Đạt cam kết</div>
                    <div className="text-2xl font-black text-orange-600 mt-1">{batchSummaryStats.committed}</div>
                    <div className="text-[10px] font-bold text-orange-600/70 mt-0.5">kèm điều kiện</div>
                  </div>

                  <div 
                    onClick={() => setReportApprovalStatusFilter("Không đạt")}
                    className={\`p-3.5 rounded-2xl border transition-all cursor-pointer \${reportApprovalStatusFilter === "Không đạt" ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/20 shadow-sm" : "bg-white/90 border-slate-200 hover:border-rose-200 shadow-2xs"}\`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">Không đạt</div>
                    <div className="text-2xl font-black text-rose-600 mt-1">{batchSummaryStats.failed}</div>
                    <div className="text-[10px] font-bold text-rose-600/70 mt-0.5">chưa đạt</div>
                  </div>
                </div>

                {/* HÀNG NÚT LỌC NHANH (QUICK STATUS PILLS) */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">Lọc nhanh:</span>
                  <button
                    onClick={() => setReportApprovalStatusFilter("all")}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all \${reportApprovalStatusFilter === "all" ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}\`}
                  >
                    Tất cả ({batchSummaryStats.total})
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Chưa duyệt")}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all \${reportApprovalStatusFilter === "Chưa duyệt" ? "bg-amber-600 text-white shadow-sm" : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"}\`}
                  >
                    Chờ duyệt ({batchSummaryStats.pending})
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Đạt")}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all \${reportApprovalStatusFilter === "Đạt" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"}\`}
                  >
                    Đạt chuẩn ({batchSummaryStats.passed})
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Đạt cam kết")}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all \${reportApprovalStatusFilter === "Đạt cam kết" ? "bg-orange-600 text-white shadow-sm" : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"}\`}
                  >
                    Đạt cam kết ({batchSummaryStats.committed})
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Không đạt")}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all \${reportApprovalStatusFilter === "Không đạt" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"}\`}
                  >
                    Không đạt ({batchSummaryStats.failed})
                  </button>
                </div>
              </div>`;

if (!content.includes(resultsOverviewSearch)) {
  console.error('Results overview search block not found!');
  process.exit(1);
}

const resultsOverviewReplacement = `              {/* STREAMLINED STATUS BAR & BATCH CONTROLS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs mb-4 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-teal-50 text-[#007A87] border border-teal-200/80">
                      🏢 {reportCampusFilter === "all" ? "Toàn hệ thống" : (campuses.find(c => c.id === reportCampusFilter)?.campusName || "Cơ sở")}
                    </span>
                    <h3 className="text-sm font-black text-slate-800">
                      {reportBatchId === "all" ? "Tất cả các đợt khảo sát" : (rawReportBatches.find(b => b.id === reportBatchId)?.name || "Đợt khảo sát")}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">• Kỳ: <strong className="text-slate-600">{reportSelPeriod?.name || "Tất cả"}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendBatchApprovalResultEmail}
                      disabled={sendingBatchResultEmail || filteredReportStudents.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                      title="Gửi email thông báo bảng kết quả xét duyệt của đợt này đến Ban KT&ĐBCL và GĐCS"
                    >
                      {sendingBatchResultEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>Gửi email kết quả</span>
                    </button>
                  </div>
                </div>

                {/* TRẠNG THÁI STATUS CHIPS (1-Chạm lọc nhanh tức thì) */}
                <div className="flex items-center gap-2 pt-3 flex-wrap">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">Trạng thái:</span>
                  <button
                    onClick={() => setReportApprovalStatusFilter("all")}
                    className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${reportApprovalStatusFilter === "all" ? "bg-slate-800 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}\`}
                  >
                    <span>Tất cả</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-black">{batchSummaryStats.total}</span>
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Chưa duyệt")}
                    className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${reportApprovalStatusFilter === "Chưa duyệt" ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"}\`}
                  >
                    {batchSummaryStats.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                    <span>Chờ duyệt</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-200/60 text-amber-900 text-[10px] font-black">{batchSummaryStats.pending}</span>
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Đạt")}
                    className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${reportApprovalStatusFilter === "Đạt" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"}\`}
                  >
                    <span>Đạt chuẩn</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-200/60 text-emerald-900 text-[10px] font-black">{batchSummaryStats.passed}</span>
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Đạt cam kết")}
                    className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${reportApprovalStatusFilter === "Đạt cam kết" ? "bg-orange-600 text-white shadow-xs" : "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200"}\`}
                  >
                    <span>Đạt cam kết</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-orange-200/60 text-orange-900 text-[10px] font-black">{batchSummaryStats.committed}</span>
                  </button>
                  <button
                    onClick={() => setReportApprovalStatusFilter("Không đạt")}
                    className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${reportApprovalStatusFilter === "Không đạt" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"}\`}
                  >
                    <span>Không đạt</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-200/60 text-rose-900 text-[10px] font-black">{batchSummaryStats.failed}</span>
                  </button>
                </div>
              </div>

              {/* FLOATING / INLINE BATCH ACTIONS BAR */}
              {selectedStudentIds.length > 0 && (
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl shadow-lg mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500 text-white font-black text-xs">
                      Đã chọn {selectedStudentIds.length} HS
                    </span>
                    <span className="text-xs text-slate-300 hidden sm:inline">Thao tác phê duyệt hàng loạt cho các em đã chọn:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleBatchApprove("Đạt")}
                      disabled={batchActionLoading}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {batchActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      Duyệt ĐẠT ({selectedStudentIds.length})
                    </button>
                    <button
                      onClick={() => handleBatchApprove("Không đạt")}
                      disabled={batchActionLoading}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Duyệt Không đạt
                    </button>
                    <button
                      onClick={() => setSelectedStudentIds([])}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}`;

content = content.replace(resultsOverviewSearch, resultsOverviewReplacement);

// 7. Transform the table: add Checkbox header, Score column, Quick action column
const tableHeaderSearch = `                    <thead className="bg-[#48BFE3]/5 border-b border-slate-300">
                      <tr>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-300">Mã HS</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-300">Họ và tên</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Ngày sinh</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Giới tính</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Khối học</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Hệ Khảo sát</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Diện Khảo sát</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Trạng thái duyệt</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">YC Xét duyệt</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border border-slate-300">Kết quả</th>
                      </tr>
                    </thead>`;

if (!content.includes(tableHeaderSearch)) {
  console.error('Table header search block not found!');
  process.exit(1);
}

const tableHeaderReplacement = `                    <thead className="bg-slate-50 border-b border-slate-300">
                      <tr>
                        <th className="p-2.5 text-center border border-slate-300 w-10">
                          <input
                            type="checkbox"
                            checked={paginatedReportStudents.length > 0 && paginatedReportStudents.every(s => selectedStudentIds.includes(s.id))}
                            onChange={e => handleToggleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            title="Chọn tất cả trên trang này"
                          />
                        </th>
                        <th className="p-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-300">Mã HS</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-300">Họ và tên</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wider text-center border border-slate-300">Khối</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wider border border-slate-300">Hệ / Diện khảo sát</th>
                        <th className="p-2.5 text-[10px] font-black text-teal-800 uppercase tracking-wider border border-slate-300">Điểm KS (Toán, Văn, Anh)</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wider text-center border border-slate-300">Trạng thái</th>
                        <th className="p-2.5 text-[10px] font-black text-teal-800 uppercase tracking-wider text-center border border-slate-300">Duyệt nhanh</th>
                        <th className="p-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wider text-center border border-slate-300">Thao tác</th>
                      </tr>
                    </thead>`;

content = content.replace(tableHeaderSearch, tableHeaderReplacement);

// 8. Transform table row body
const tableRowSearch = `                      {paginatedReportStudents.map(s => {
                        const isSelected = reportStudentId === s.id;
                        return (
                          <tr key={s.id} className={\`hover:bg-slate-50/80 transition-colors \${isSelected ? 'bg-indigo-50/40' : ''}\`}>
                            <td className="p-2.5 border border-slate-300 font-mono text-xs font-bold text-slate-700">{s.studentCode}</td>
                            <td className="p-2.5 border border-slate-300 text-xs font-black text-slate-800">{s.fullName}</td>
                            <td className="p-2.5 border border-slate-300 text-xs text-center text-slate-650">
                              {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-xs text-center text-slate-650">
                              {s.gender === "M" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "Nữ" ? "Nữ" : s.gender || "—"}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-xs text-center text-slate-650 font-bold">K{s.grade || "—"}</td>
                            <td className="p-2.5 border border-slate-300 text-xs text-center font-bold text-amber-700">{s.surveyFormType || "—"}</td>
                            <td className="p-2.5 border border-slate-300 text-xs text-slate-650 max-w-[200px] truncate" title={s.admissionCriteria}>{s.admissionCriteria || "—"}</td>
                            <td className="p-2.5 border border-slate-300 text-xs text-center">
                              {s.isAbsent ? (
                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                  Vắng khảo sát
                                </span>
                              ) : s.admissionResult ? (
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                  {s.admissionResult}
                                </span>
                              ) : (
                                <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-[11px]">
                                  Chưa duyệt
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-center">
                              {!s.admissionResult ? (
                                <button
                                  onClick={() => handleSendGdcsApprovalRequestForStudent(s)}
                                  disabled={sendingApprovalId === s.id}
                                  title="Gửi yêu cầu xét duyệt đến GĐCS"
                                  className="p-1.5 rounded-xl hover:bg-slate-100 text-indigo-600 disabled:opacity-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                                >
                                  {sendingApprovalId === s.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Mail className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-2.5 border border-slate-300 text-center">
                              <button
                                onClick={() => setReportStudentId(s.id)}
                                className={\`px-3 py-1 rounded-xl text-xs font-black transition-all \${
                                  isSelected
                                    ? 'bg-[#48BFE3] text-white shadow-sm'
                                    : 'bg-white text-[#48BFE3] border border-[#48BFE3] hover:bg-[#48BFE3] hover:text-white'
                                }\`}
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}`;

if (!content.includes(tableRowSearch)) {
  console.error('Table row search block not found!');
  process.exit(1);
}

const tableRowReplacement = `                      {paginatedReportStudents.map(s => {
                        const isSelected = reportStudentId === s.id;
                        const isChecked = selectedStudentIds.includes(s.id);
                        const isInlineLoading = inlineApprovalLoadingId === s.id;

                        return (
                          <tr key={s.id} className={\`hover:bg-slate-50/90 transition-colors \${isChecked ? 'bg-teal-50/40' : isSelected ? 'bg-indigo-50/40' : ''}\`}>
                            {/* Checkbox */}
                            <td className="p-2.5 border border-slate-300 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectStudent(s.id)}
                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                            </td>

                            {/* Mã HS */}
                            <td className="p-2.5 border border-slate-300 font-mono text-xs font-bold text-slate-700">
                              {s.studentCode}
                            </td>

                            {/* Họ và tên & Ngày sinh */}
                            <td className="p-2.5 border border-slate-300 text-xs">
                              <div className="font-black text-slate-800">{s.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"} • {s.gender === "M" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "Nữ" ? "Nữ" : s.gender || "—"}
                              </div>
                            </td>

                            {/* Khối */}
                            <td className="p-2.5 border border-slate-300 text-xs text-center font-bold text-slate-700">
                              K{s.grade || "—"}
                            </td>

                            {/* Hệ / Diện khảo sát */}
                            <td className="p-2.5 border border-slate-300 text-xs">
                              <div className="font-bold text-amber-700 text-[11px]">{s.surveyFormType || "—"}</div>
                              <div className="text-[10px] text-slate-500 max-w-[170px] truncate" title={s.admissionCriteria}>
                                {s.admissionCriteria || "—"}
                              </div>
                            </td>

                            {/* Điểm KS (Toán, Văn, Anh) */}
                            <td className="p-2.5 border border-slate-300 text-xs">
                              {renderStudentScoresCell(s)}
                            </td>

                            {/* Trạng thái duyệt */}
                            <td className="p-2.5 border border-slate-300 text-xs text-center">
                              {s.isAbsent ? (
                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                  Vắng KS
                                </span>
                              ) : s.admissionResult ? (
                                <span className={\`font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 \${
                                  s.admissionResult.includes("Đạt") && !s.admissionResult.includes("Không") && !s.admissionResult.includes("cam kết")
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : s.admissionResult.includes("cam kết")
                                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }\`}>
                                  {s.admissionResult}
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  Chờ duyệt
                                </span>
                              )}
                            </td>

                            {/* Duyệt nhanh 1-Click */}
                            <td className="p-2.5 border border-slate-300 text-center">
                              {isInlineLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600 mx-auto" />
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleQuickApproveStudent(s, "Đạt")}
                                    className={\`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer \${
                                      s.admissionResult === "Đạt"
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                    }\`}
                                    title="Duyệt Đạt chuẩn"
                                  >
                                    Đạt
                                  </button>
                                  <button
                                    onClick={() => handleQuickApproveStudent(s, "Đạt cam kết")}
                                    className={\`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer \${
                                      s.admissionResult === "Đạt cam kết"
                                        ? "bg-orange-600 text-white shadow-xs"
                                        : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                                    }\`}
                                    title="Duyệt Đạt cam kết (chọn môn)"
                                  >
                                    Cam kết
                                  </button>
                                  <button
                                    onClick={() => handleQuickApproveStudent(s, "Không đạt")}
                                    className={\`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer \${
                                      s.admissionResult === "Không đạt"
                                        ? "bg-rose-600 text-white shadow-xs"
                                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                    }\`}
                                    title="Duyệt Không đạt"
                                  >
                                    K.Đạt
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Thao tác Chi tiết / Email */}
                            <td className="p-2.5 border border-slate-300 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!s.admissionResult && (
                                  <button
                                    onClick={() => handleSendGdcsApprovalRequestForStudent(s)}
                                    disabled={sendingApprovalId === s.id}
                                    title="Gửi yêu cầu xét duyệt đến GĐCS"
                                    className="p-1 rounded-lg hover:bg-slate-100 text-indigo-600 disabled:opacity-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    {sendingApprovalId === s.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Mail className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => setReportStudentId(s.id)}
                                  className={\`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer \${
                                    isSelected
                                      ? 'bg-[#007A87] text-white shadow-xs'
                                      : 'bg-white text-[#007A87] border border-[#007A87] hover:bg-[#007A87] hover:text-white'
                                  }\`}
                                >
                                  Chi tiết
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}`;

content = content.replace(tableRowSearch, tableRowReplacement);

// 9. Fix colspan on empty state (from 10 to 9)
content = content.replace(
  '<td colSpan={10} className="p-8 text-center text-xs font-bold text-slate-400 uppercase">',
  '<td colSpan={9} className="p-8 text-center text-xs font-bold text-slate-400 uppercase">'
);

// Save back
const output = isCRLF ? content.replace(/\n/g, '\r\n') : content;
fs.writeFileSync(k12Path, output, 'utf8');

console.log('SUCCESS: k12-client.tsx modern approval enhancements applied successfully!');
