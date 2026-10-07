const fs = require('fs');

const mnPath = 'src/app/admin/xet-duyet-ket-qua/mam-non-client.tsx';
let rawContent = fs.readFileSync(mnPath, 'utf8');

const isCRLF = rawContent.includes('\r\n');
let content = rawContent.replace(/\r\n/g, '\n');

console.log('File size:', content.length, 'CRLF detected:', isCRLF);

// 1. Tự động nhận diện cơ sở GĐCS
const search1 = `  const [cCampusFilter, setCCampusFilter] = useState("");
  const [cAgeGroupFilter, setCAgeGroupFilter] = useState("");`;

const replacement1 = `  const [cCampusFilter, setCCampusFilter] = useState("");
  const [cAgeGroupFilter, setCAgeGroupFilter] = useState("");

  // Tự động chọn cơ sở phụ trách của GĐCS khi vào trang Mầm non
  useEffect(() => {
    const userRole = (currentUser?.role || "").toUpperCase();
    const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
    if (isGdcs && currentUser?.campusIds && currentUser.campusIds.length > 0) {
      if (!cCampusFilter) {
        const match = filteredCampuses.find((c: any) => currentUser.campusIds.includes(c.id));
        if (match) {
          setCCampusFilter(match.campusCode || match.campusName);
        }
      }
    }
  }, [currentUser, filteredCampuses, cCampusFilter]);`;

if (!content.includes(search1)) {
  console.error("MN search1 not found!");
  process.exit(1);
}
content = content.replace(search1, replacement1);
console.log('MN Search 1 replaced.');

// 2. Cascading Filter cho availableBatches
const search2 = `  const selPeriod = periods.find(p => p.id === cPeriodId);
  const availableBatches = useMemo(() => {
    if (cPeriodId === "all") {
      return periods.flatMap((p: any) => p.batches || []);
    }
    return selPeriod?.batches || [];
  }, [periods, cPeriodId, selPeriod]);`;

const replacement2 = `  const selPeriod = periods.find(p => p.id === cPeriodId);
  const rawAvailableBatches = useMemo(() => {
    if (cPeriodId === "all") {
      return periods.flatMap((p: any) => p.batches || []);
    }
    return selPeriod?.batches || [];
  }, [periods, cPeriodId, selPeriod]);

  // Lọc Đợt khảo sát mầm non theo Cơ sở đã chọn (Cascading Filter)
  const availableBatches = useMemo(() => {
    if (!cCampusFilter) return rawAvailableBatches;
    return rawAvailableBatches.filter((b: any) => {
      if (b.campusId) {
        const c = filteredCampuses.find((cmp: any) => cmp.id === b.campusId);
        if (c && isPreschoolCampusMatch(cCampusFilter, c.campusCode, c.campusName)) return true;
      }
      return isPreschoolCampusMatch(cCampusFilter, b.name, b.name);
    });
  }, [rawAvailableBatches, cCampusFilter, filteredCampuses]);

  // Tự động reset cBatchId nếu đợt không thuộc cơ sở mới chọn
  useEffect(() => {
    if (cBatchId) {
      const isBatchValid = availableBatches.some((b: any) => b.id === cBatchId);
      if (!isBatchValid) {
        setCBatchId("");
      }
    }
  }, [cCampusFilter, availableBatches, cBatchId]);`;

if (!content.includes(search2)) {
  console.error("MN search2 not found!");
  process.exit(1);
}
content = content.replace(search2, replacement2);
console.log('MN Search 2 replaced.');

// 3. Nâng cấp Banner Đợt mới nhất ở Mầm non
const search3 = `            <div className="relative flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform duration-300">
            <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-[13px] font-semibold text-slate-700 leading-relaxed flex flex-wrap items-center gap-y-1.5 gap-x-1">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600 uppercase tracking-widest text-xs py-0.5 px-2.5 rounded-lg bg-white/80  shadow-sm mr-2 flex items-center gap-1.5">
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

const replacement3 = `            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    Vui lòng rà soát đánh giá các lĩnh vực phát triển và hoàn tất phê duyệt kết quả tuyển sinh Mầm non.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => {
                    setCPeriodId(latestBatchInfo.periodId);
                    setCBatchId(latestBatchInfo.id);
                    setDevTab("xetDuyet");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Xem & Xét duyệt đợt này</span>
                </button>
              </div>
            </div>`;

if (!content.includes(search3)) {
  console.error("MN search3 not found!");
  process.exit(1);
}
content = content.replace(search3, replacement3);
console.log('MN Search 3 replaced.');

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(mnPath, content, 'utf8');
console.log('ALL MAM NON UPDATES COMPLETED SUCCESSFULLY!');
