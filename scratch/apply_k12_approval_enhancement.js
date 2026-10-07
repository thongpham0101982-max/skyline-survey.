const fs = require('fs');

const k12Path = 'src/app/admin/xet-duyet-ket-qua/k12-client.tsx';
let rawContent = fs.readFileSync(k12Path, 'utf8');

// Check line endings
const isCRLF = rawContent.includes('\r\n');
let content = rawContent.replace(/\r\n/g, '\n');

console.log('File size:', content.length, 'CRLF detected:', isCRLF);

// 1. Tìm vị trí khai báo reportBatches
const search1 = `  const reportSelPeriod = useMemo(() => visiblePeriods.find(p => p.id === reportPeriodId), [periods, reportPeriodId]);
  const reportBatches = useMemo(() => {
    if (reportPeriodId === "all") {
      return periods.flatMap(p => p.batches || []);
    }
    return reportSelPeriod?.batches || [];
  }, [reportSelPeriod, periods, reportPeriodId]);`;

if (!content.includes(search1)) {
  console.error("search1 not found!");
  process.exit(1);
}

const replacement1 = `  // Helper kiểm tra đợt khảo sát có thuộc Cơ sở được chọn hay không (Cascading Filter)
  const isBatchMatchingCampus = useCallback((batch: any, campusId: string) => {
    if (!campusId || campusId === "all") return true;
    if (batch.campusId && batch.campusId === campusId) return true;
    const targetCampus = campuses.find(c => c.id === campusId);
    if (!targetCampus) return true;
    const cName = (targetCampus.campusName || "").toUpperCase();
    const cCode = (targetCampus.campusCode || "").toUpperCase();
    const bName = (batch.name || "").toUpperCase();
    
    if (cCode && bName.includes(cCode)) return true;
    if (bName.includes(cName)) return true;
    
    if (cCode.includes("CS1") || cName.includes("RIVERSIDE")) {
      if (bName.includes("CS1") || bName.includes("RIVERSIDE")) return true;
    }
    if (cCode.includes("CS2") || cName.includes("CENTRAL")) {
      if (bName.includes("CS2") || bName.includes("CENTRAL")) return true;
    }
    if (cCode.includes("CS3") || cName.includes("GLOBAL")) {
      if (bName.includes("CS3") || bName.includes("GLOBAL")) return true;
    }
    if (cCode.includes("CS4") || cName.includes("HILL")) {
      if (bName.includes("CS4") || bName.includes("HILL")) return true;
    }
    if (cCode.includes("CS5") || cName.includes("BEACH")) {
      if (bName.includes("CS5") || bName.includes("BEACH")) return true;
    }

    // Nếu tên đợt chứa mã cơ sở khác mà không phải cơ sở đang chọn -> loại trừ
    const campusCodes = ["CS1", "CS2", "CS3", "CS4", "CS5"].filter(code => !cCode.includes(code));
    if (campusCodes.some(code => bName.includes(code))) return false;

    return true;
  }, [campuses]);

  // Tự động nhận diện và chọn cơ sở phân quyền của GĐCS khi truy cập trang
  useEffect(() => {
    const userRole = (currentUser?.role || "").toUpperCase();
    const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
    if (isGdcs && currentUser?.campusIds && currentUser.campusIds.length > 0) {
      if (reportCampusFilter === "all") {
        const match = campuses.find(c => currentUser.campusIds.includes(c.id));
        if (match) {
          setReportCampusFilter(match.id);
        }
      }
    }
  }, [currentUser, campuses, reportCampusFilter]);

  const reportSelPeriod = useMemo(() => visiblePeriods.find(p => p.id === reportPeriodId), [periods, reportPeriodId]);
  
  // Toàn bộ các đợt của kỳ (dùng để tra cứu thông tin học sinh không phụ thuộc filter)
  const rawReportBatches = useMemo(() => {
    if (reportPeriodId === "all") {
      return periods.flatMap(p => p.batches || []);
    }
    return reportSelPeriod?.batches || [];
  }, [reportSelPeriod, periods, reportPeriodId]);

  // Danh sách Đợt hiển thị trong bộ lọc (Lọc chặt chẽ theo Cơ sở đã chọn)
  const reportBatches = useMemo(() => {
    if (reportCampusFilter === "all") return rawReportBatches;
    return rawReportBatches.filter(b => isBatchMatchingCampus(b, reportCampusFilter));
  }, [rawReportBatches, reportCampusFilter, isBatchMatchingCampus]);

  // Tự động chuyển Đợt về 'all' nếu đợt hiện tại không thuộc Cơ sở mới chọn (tránh lỗi 0 học sinh)
  useEffect(() => {
    if (reportBatchId !== "all") {
      const isBatchValid = reportBatches.some(b => b.id === reportBatchId);
      if (!isBatchValid) {
        setReportBatchId("all");
      }
    }
  }, [reportCampusFilter, reportBatches, reportBatchId]);`;

content = content.replace(search1, replacement1);
console.log('Search 1 replaced successfully.');

// 2. Thêm state gửi email kết quả & KPI Batch
const search2 = `  // Email States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingBatchEmail, setSendingBatchEmail] = useState(false);`;

const replacement2 = `  // Email States & Approval Notification
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingBatchEmail, setSendingBatchEmail] = useState(false);
  const [sendingBatchResultEmail, setSendingBatchResultEmail] = useState(false);
  const [autoSendApprovalEmail, setAutoSendApprovalEmail] = useState(true);

  // Thống kê chi tiết đợt khảo sát phục vụ Executive Card của GĐCS
  const batchSummaryStats = useMemo(() => {
    const baseList = (reportStudents || []).filter(s => {
      if (reportPeriodId && reportPeriodId !== "all") {
        if (s.periodId !== reportPeriodId && s.period?.id !== reportPeriodId) return false;
      }
      if (reportBatchId && reportBatchId !== "all") {
        if (s.batchId !== reportBatchId) return false;
      }
      if (reportCampusFilter && reportCampusFilter !== "all") {
        const resolvedCampusId = resolveStudentCampusId(s);
        const matchesCampus = resolvedCampusId === reportCampusFilter || 
                              s.admissionCampus === reportCampusFilter || 
                              s.registeredCampus === reportCampusFilter;
        if (!matchesCampus) return false;
      }
      return true;
    });

    const total = baseList.length;
    const pending = baseList.filter(s => !s.admissionResult && !s.isAbsent).length;
    const passed = baseList.filter(s => s.admissionResult && (s.admissionResult.includes("Đạt") || s.admissionResult.includes("đạt")) && !s.admissionResult.includes("không") && !s.admissionResult.includes("Không") && !s.admissionResult.includes("cam kết")).length;
    const committed = baseList.filter(s => s.admissionResult && s.admissionResult.includes("cam kết")).length;
    const failed = baseList.filter(s => s.admissionResult && s.admissionResult.includes("Không đạt")).length;
    const absent = baseList.filter(s => s.isAbsent).length;

    return { total, pending, passed, committed, failed, absent };
  }, [reportStudents, reportPeriodId, reportBatchId, reportCampusFilter, resolveStudentCampusId]);`;

if (!content.includes(search2)) {
  console.error("search2 not found!");
  process.exit(1);
}
content = content.replace(search2, replacement2);
console.log('Search 2 replaced successfully.');

// 3. Tích hợp tự động gửi mail sau khi lưu duyệt học sinh
const search3 = `      const r = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReportStudent.id,
          data: {
            admissionResult: reportForm.admissionResult,
            admissionCampus: finalCampus,
            signatureName: finalSignature,
            directorNote: finalNote
          }
        })
      });
      const resData = await r.json().catch(() => ({}));
      if (r.ok) {
        notify("Đã lưu kết quả & lược sử xét duyệt thành công!");
        setReportStudents(prev => prev.map(s => s.id === selectedReportStudent.id ? { 
          ...s, 
          admissionResult: reportForm.admissionResult,
          admissionCampus: finalCampus,
          signatureName: finalSignature,
          directorNote: finalNote
        } : s));
      } else {
        notify(resData.error || "Lỗi khi lưu kết quả tổng hợp", "err");
      }`;

const replacement3 = `      const r = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReportStudent.id,
          data: {
            admissionResult: reportForm.admissionResult,
            admissionCampus: finalCampus,
            signatureName: finalSignature,
            directorNote: finalNote
          }
        })
      });
      const resData = await r.json().catch(() => ({}));
      if (r.ok) {
        notify("Đã lưu kết quả & lược sử xét duyệt thành công!", "ok");
        setReportStudents(prev => prev.map(s => s.id === selectedReportStudent.id ? { 
          ...s, 
          admissionResult: reportForm.admissionResult,
          admissionCampus: finalCampus,
          signatureName: finalSignature,
          directorNote: finalNote
        } : s));

        // Tự động gửi email thông báo kết quả xét duyệt tới Ban KT&ĐBCL và GĐCS nếu bật tuỳ chọn
        if (autoSendApprovalEmail) {
          try {
            fetch("/api/admin/send-approval-result-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                periodId: reportPeriodId,
                periodName: reportSelPeriod?.name,
                batchId: selectedReportStudent.batchId || reportBatchId,
                batchName: rawReportBatches.find(b => b.id === (selectedReportStudent.batchId || reportBatchId))?.name,
                campusId: reportCampusFilter !== "all" ? reportCampusFilter : undefined,
                campusName: finalCampus,
                approverName,
                approverRole: isGDCSUser ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
                students: [{
                  ...selectedReportStudent,
                  admissionResult: reportForm.admissionResult,
                  admissionCampus: finalCampus,
                  directorNote: finalNote
                }]
              })
            }).then(res => res.json()).then(mailData => {
              if (mailData.success) {
                notify("Đã gửi email thông báo kết quả đến Ban KT&ĐBCL và GĐCS!", "ok");
              }
            }).catch(() => {});
          } catch(mailErr) {}
        }
      } else {
        notify(resData.error || "Lỗi khi lưu kết quả tổng hợp", "err");
      }`;

if (!content.includes(search3)) {
  console.error("search3 not found!");
  process.exit(1);
}
content = content.replace(search3, replacement3);
console.log('Search 3 replaced successfully.');

// 4. Thêm hàm gửi email cả đợt
const search4 = `  const handleSendGdcsApprovalRequestForStudent = async (student: any) => {`;
const replacement4 = `  const handleSendBatchApprovalResultEmail = async () => {
    if (filteredReportStudents.length === 0) {
      return notify("Không có học sinh nào trong đợt khảo sát hiện tại để gửi thông báo!", "err");
    }
    const pendingCount = filteredReportStudents.filter(s => !s.admissionResult && !s.isAbsent).length;
    if (pendingCount > 0) {
      if (!window.confirm(\`Đợt này hiện còn \${pendingCount} học sinh chưa xét duyệt kết quả. Thầy/Cô có muốn tiếp tục gửi thông báo kết quả cho \${filteredReportStudents.length} học sinh hiện tại đến Ban KT&ĐBCL và GĐCS không?\`)) {
        return;
      }
    }
    setSendingBatchResultEmail(true);
    try {
      const activeBatchObj = rawReportBatches.find(b => b.id === reportBatchId);
      const curCampusObj = campuses.find(c => c.id === reportCampusFilter);
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);

      const res = await fetch("/api/admin/send-approval-result-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: reportPeriodId,
          periodName: reportSelPeriod?.name,
          batchId: reportBatchId,
          batchName: activeBatchObj?.name || (reportBatchId === "all" ? "Tất cả các đợt" : "Đợt khảo sát"),
          campusId: reportCampusFilter !== "all" ? reportCampusFilter : undefined,
          campusName: curCampusObj?.campusName || (reportCampusFilter !== "all" ? reportCampusFilter : "Toàn hệ thống Sky-Line"),
          approverName: currentUser?.fullName || "Giám đốc Cơ sở",
          approverRole: isGdcs ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
          students: filteredReportStudents
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify(\`Đã gửi email thông báo kết quả xét duyệt (\${filteredReportStudents.length} học sinh) đến GĐCS & Ban KT&ĐBCL thành công!\`, "ok");
      } else {
        notify(data.error || "Không thể gửi email thông báo", "err");
      }
    } catch (err: any) {
      notify("Lỗi kết nối khi gửi email: " + (err.message || err), "err");
    } finally {
      setSendingBatchResultEmail(false);
    }
  };

  const handleSendGdcsApprovalRequestForStudent = async (student: any) => {`;

if (!content.includes(search4)) {
  console.error("search4 not found!");
  process.exit(1);
}
content = content.replace(search4, replacement4);
console.log('Search 4 replaced successfully.');

// 5. Nâng cấp Dropdown đợt khảo sát hiển thị kèm số lượng HS & hồ sơ chờ duyệt
const search5 = `                  {reportBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}`;

const replacement5 = `                  {reportBatches.map(b => {
                    const countInBatch = (reportStudents || []).filter(s => s.batchId === b.id).length;
                    const pendingInBatch = (reportStudents || []).filter(s => s.batchId === b.id && !s.admissionResult && !s.isAbsent).length;
                    const suffix = countInBatch > 0 ? \` (\${countInBatch} HS\${pendingInBatch > 0 ? \` - \${pendingInBatch} chờ duyệt\` : ''})\` : '';
                    return (
                      <option key={b.id} value={b.id}>{b.name}{suffix}</option>
                    );
                  })}`;

if (!content.includes(search5)) {
  console.error("search5 not found!");
  process.exit(1);
}
content = content.replace(search5, replacement5);
console.log('Search 5 replaced successfully.');

// 6. Cập nhật Banner Đợt mới nhất cá nhân hóa kèm nút [Xem & Duyệt ngay]
const search6 = `            <div className="relative flex items-start sm:items-center gap-4">
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
            </div>`;

const replacement6 = `            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform duration-300">
                  <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-700 leading-relaxed flex flex-wrap items-center gap-y-1.5 gap-x-1.5">
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600 uppercase tracking-widest text-xs py-0.5 px-2.5 rounded-lg bg-white/90 border border-amber-200/60 shadow-sm flex items-center gap-1.5">
                      Thông báo
                    </span>
                    <span className="opacity-90">Đợt khảo sát mới nhất:</span> 
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-sm text-xs tracking-wide">
                      {latestBatchInfo.name}
                    </span> 
                    <span className="opacity-90">thuộc Kỳ</span> 
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white text-slate-700 font-bold border border-amber-200/80 shadow-2xs text-xs">
                      {latestBatchInfo.periodName}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/80 font-medium mt-1">
                    Vui lòng rà soát điểm số các môn và hoàn tất phê duyệt kết quả tuyển sinh.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => {
                    setReportPeriodId(latestBatchInfo.periodId);
                    setReportBatchId(latestBatchInfo.id);
                    setReportApprovalStatusFilter("Chưa duyệt");
                    setReportsSubTab("results");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Xem & Xét duyệt đợt này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>`;

if (!content.includes(search6)) {
  console.error("search6 not found!");
  process.exit(1);
}
content = content.replace(search6, replacement6);
console.log('Search 6 replaced successfully.');

// 7. Thêm Thẻ Executive Batch Overview KPI Card & Hàng nút Pill trạng thái trước Bảng học sinh
const search7 = `              {/* STUDENT EXCEL LIST TABLE */}
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden text-left mb-6">
                <h3 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#48BFE3]" />
                  Danh sách học sinh khảo sát ({filteredReportStudents.length})
                </h3>`;

const replacement7 = `              {/* EXECUTIVE BATCH OVERVIEW KPI CARD FOR GDCS */}
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
                      <span>Gửi kết quả đợt tới Ban KT&ĐBCL</span>
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
              </div>

              {/* STUDENT EXCEL LIST TABLE */}
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden text-left mb-6">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#48BFE3]" />
                    Danh sách học sinh khảo sát ({filteredReportStudents.length})
                  </h3>
                  <button
                    onClick={handleSendBatchApprovalResultEmail}
                    disabled={sendingBatchResultEmail || filteredReportStudents.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi mail kết quả cho Ban KT&ĐBCL</span>
                  </button>
                </div>`;

if (!content.includes(search7)) {
  console.error("search7 not found!");
  process.exit(1);
}
content = content.replace(search7, replacement7);
console.log('Search 7 replaced successfully.');

// 8. Thêm checkbox tự động gửi email trong modal xét duyệt học sinh
const search8 = `                    <Field label="Ý kiến / Ghi chú Hội đồng">
                      <textarea 
                        value={reportForm.directorNote}
                        onChange={e => setReportForm(f => ({ ...f, directorNote: e.target.value }))}
                        className={\`\${inp} h-16 py-1.5 text-xs resize-none\`}
                        placeholder="Nhập ý kiến hoặc lý do..."
                        disabled={!canApprove}
                      />
                    </Field>`;

const replacement8 = `                    <Field label="Ý kiến / Ghi chú Hội đồng">
                      <textarea 
                        value={reportForm.directorNote}
                        onChange={e => setReportForm(f => ({ ...f, directorNote: e.target.value }))}
                        className={\`\${inp} h-16 py-1.5 text-xs resize-none\`}
                        placeholder="Nhập ý kiến hoặc lý do..."
                        disabled={!canApprove}
                      />
                    </Field>

                    <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200/80 flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="autoSendApprovalEmailCheck"
                        checked={autoSendApprovalEmail}
                        onChange={e => setAutoSendApprovalEmail(e.target.checked)}
                        className="w-4 h-4 text-[#007A87] rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                      />
                      <label htmlFor="autoSendApprovalEmailCheck" className="text-xs font-bold text-teal-900 cursor-pointer select-none">
                        ✉️ Gửi email thông báo kết quả đến Ban KT&ĐBCL và GĐCS sau khi lưu
                      </label>
                    </div>`;

if (!content.includes(search8)) {
  console.error("search8 not found!");
  process.exit(1);
}
content = content.replace(search8, replacement8);
console.log('Search 8 replaced successfully.');

// 9. Sửa lỗi colSpan={9} thành colSpan={10} khi bảng trống
content = content.replace(
  '<td colSpan={9} className="p-8 text-center text-xs font-bold text-slate-400 uppercase">',
  '<td colSpan={10} className="p-8 text-center text-xs font-bold text-slate-400 uppercase">'
);

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(k12Path, content, 'utf8');
console.log('ALL 8 REPLACEMENTS COMPLETED SUCCESSFULLY in k12-client.tsx!');
