const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio', 'components', 'ObservationRegistrationSection.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStart = `{creationMode === "SURPRISE" || creationMode === "CAMPUS_SCHEDULE" ? (`;
const targetEnd = `            </div>\n          ) : creationMode === "OBSERVER_REQUEST" ? (`;

const startIdx = content.indexOf(targetStart);
if (startIdx === -1) {
  console.error("targetStart not found!");
  process.exit(1);
}

const endIdx = content.indexOf(targetEnd, startIdx);
if (endIdx === -1) {
  console.error("targetEnd not found!");
  process.exit(1);
}

const fullTarget = content.substring(startIdx, endIdx + `            </div>`.length);

const replacement = `{creationMode === "CAMPUS_SCHEDULE" ? (
              /* ===== FORM: ĐĂNG KÝ LỊCH LÀM VIỆC CƠ SỞ – TỔ CTHS ===== */
              <div className="flex flex-col gap-6 text-xs font-semibold bg-gradient-to-b from-slate-50/40 via-white to-teal-50/20 p-6 sm:p-8 rounded-3xl border border-teal-200/90 shadow-sm animate-in fade-in duration-300">
                {/* Header Banner */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#007068] text-white border border-teal-600/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-teal-200 shadow-inner">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-black tracking-wide">
                          ĐĂNG KÝ LỊCH LÀM VIỆC CƠ SỞ – TỔ CTHS
                        </h4>
                        <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-400 text-amber-950 uppercase">
                          Tổ CTHS - Công tác học sinh
                        </span>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-800/80 text-teal-100 border border-teal-500/40">
                          Tự động cộng Ma trận phân bổ
                        </span>
                      </div>
                      <p className="text-xs text-teal-100/90 font-medium mt-1 leading-relaxed">
                        Ghi nhận nhân sự, cơ sở làm việc, ngày làm việc, số tiết và các đầu việc thực hiện. Hệ thống tự động phân bổ vào Ma trận cơ sở và hỗ trợ xuất Biên bản làm việc.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/25 px-3.5 py-2 rounded-xl border border-white/15 text-[11px] font-bold text-teal-100 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Không áp dụng tiêu chí chấm điểm</span>
                  </div>
                </div>

                {/* KHỐI 1: THÔNG TIN NHÂN SỰ, CƠ SỞ & THỜI GIAN LÀM VIỆC */}
                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 bg-[#007068] text-white rounded-md flex items-center justify-center text-xs font-black">1</span>
                      Thông tin Nhân sự & Thời gian làm việc tại cơ sở
                    </h5>
                    <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                      Trọng tâm trực quan: <strong className="text-teal-800 font-bold">Cơ sở + Số tiết + Đầu việc</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-4 sm:gap-5">
                    {/* 1. Nhân sự CTHS */}
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#007068]" />
                          <span>Nhân sự Tổ CTHS *</span>
                        </span>
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          {cthsStaffList.length} nhân sự
                        </span>
                      </label>
                      <select
                        value={cthsStaffId}
                        onChange={(e) => {
                          const sId = e.target.value;
                          setCthsStaffId(sId);
                          const selectedStaff = teachers?.find((t: any) => t.id === sId);
                          if (selectedStaff?.campusId && !cthsCampusId) {
                            setCthsCampusId(selectedStaff.campusId);
                          }
                        }}
                        className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#007068] focus:border-[#007068] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Chọn Nhân sự CTHS --</option>
                        {cthsStaffList.map((t: any) => {
                          const campusObj = campuses?.find((c: any) => c.id === t.campusId);
                          const campusShort = campusObj?.campusCode || campusObj?.campusName?.replace("Sky-Line ", "") || "";
                          return (
                            <option key={t.id} value={t.id}>
                              {t.teacherName} {t.teacherCode ? \`(\${t.teacherCode})\` : ""} {campusShort ? \`[CS: \${campusShort}]\` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 2. Cơ sở làm việc */}
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#007068]" />
                          <span>Cơ sở làm việc *</span>
                        </span>
                        {(() => {
                          const selStaff = teachers?.find((t: any) => t.id === cthsStaffId) || currentTeacher;
                          const isInter = selStaff?.campusId && cthsCampusId && selStaff.campusId !== cthsCampusId;
                          return (
                            <span className={\`text-[10px] font-black px-2 py-0.5 rounded-full border \${
                              isInter
                                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }\`}>
                              {isInter ? "🔵 Liên cơ sở" : "🟢 Nội bộ CS"}
                            </span>
                          );
                        })()}
                      </label>
                      <select
                        value={cthsCampusId}
                        onChange={(e) => setCthsCampusId(e.target.value)}
                        className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#007068] focus:border-[#007068] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="">-- Chọn cơ sở làm việc --</option>
                        {(campuses || []).map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.campusName} {c.campusCode ? \`(\${c.campusCode})\` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Ngày làm việc */}
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#007068]" />
                        <span>Ngày làm việc tại cơ sở *</span>
                      </label>
                      <input
                        type="date"
                        value={cthsDate}
                        min={minAllowedDate}
                        onChange={(e) => setCthsDate(e.target.value)}
                        required
                        className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#007068] focus:border-[#007068] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                      />
                    </div>

                    {/* 4. Tiết bắt đầu - Tiết kết thúc & Tự tính số tiết */}
                    <div className="col-span-12 lg:col-span-8 p-4 bg-teal-50/50 rounded-2xl border border-teal-100/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-black text-teal-950 uppercase tracking-wide flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#007068]" />
                          <span>Khung tiết & Tự động tính số tiết</span>
                        </span>
                        <span className="text-xs font-black text-teal-900 bg-white px-3 py-1 rounded-xl border border-teal-200 shadow-2xs flex items-center gap-1.5">
                          <span>Số tiết tự tính:</span>
                          <strong className="text-emerald-700 text-sm font-black">{Math.max(1, cthsEndPeriod - cthsStartPeriod + 1)} tiết</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-3 items-center">
                        {/* Tiết bắt đầu */}
                        <div className="col-span-6 sm:col-span-3 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-600">Tiết bắt đầu</label>
                          <select
                            value={cthsStartPeriod}
                            onChange={(e) => {
                              const s = parseInt(e.target.value) || 1;
                              setCthsStartPeriod(s);
                              if (cthsEndPeriod < s) setCthsEndPeriod(s);
                            }}
                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#007068] outline-none"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                              <option key={p} value={p}>Tiết {p} ({p === 1 ? "07:30" : p === 2 ? "08:20" : p === 3 ? "09:20" : p === 4 ? "10:10" : p === 5 ? "13:30" : p === 6 ? "14:20" : p === 7 ? "15:10" : "15:55"})</option>
                            ))}
                          </select>
                        </div>

                        {/* Tiết kết thúc */}
                        <div className="col-span-6 sm:col-span-3 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-600">Tiết kết thúc</label>
                          <select
                            value={cthsEndPeriod}
                            onChange={(e) => {
                              const end = parseInt(e.target.value) || 1;
                              setCthsEndPeriod(end);
                              if (end < cthsStartPeriod) setCthsStartPeriod(end);
                            }}
                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#007068] outline-none"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                              <option key={p} value={p}>Tiết {p} ({p === 1 ? "08:15" : p === 2 ? "09:05" : p === 3 ? "10:05" : p === 4 ? "10:55" : p === 5 ? "14:15" : p === 6 ? "15:05" : p === 7 ? "15:55" : "16:40"})</option>
                            ))}
                          </select>
                        </div>

                        {/* Quick buttons */}
                        <div className="col-span-12 sm:col-span-6 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-600">Chọn nhanh thời lượng:</label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[1, 2, 3, 4, 5, 6].map((num) => {
                              const isCurrent = (cthsEndPeriod - cthsStartPeriod + 1) === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    const newEnd = Math.min(8, cthsStartPeriod + num - 1);
                                    setCthsEndPeriod(newEnd);
                                  }}
                                  className={\`flex-1 min-w-[42px] py-2 text-xs font-black rounded-xl border transition-all cursor-pointer select-none active:scale-95 \${
                                    isCurrent
                                      ? "bg-[#007068] text-white border-[#005B58] shadow-xs ring-2 ring-teal-300/70"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }\`}
                                >
                                  {num} tiết
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Địa điểm / Phòng làm việc */}
                    <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#007068]" />
                        <span>Địa điểm / Phòng làm việc</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Phòng CTHS, Sân trường, Khối lớp..."
                        value={cthsLocation}
                        onChange={(e) => setCthsLocation(e.target.value)}
                        className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#007068] focus:border-[#007068] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs placeholder:text-slate-400"
                      />
                    </div>

                    {/* 6. Nhóm đầu việc chính */}
                    <div className="col-span-12 flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Nhóm đầu việc chính *</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {CTHS_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCthsCategory(cat)}
                            className={\`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 \${
                              cthsCategory === cat
                                ? "bg-[#007068] text-white border-[#005B58] shadow-xs ring-2 ring-teal-300/70 font-black"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }\`}
                          >
                            {cthsCategory === cat && <Check className="w-3.5 h-3.5 inline mr-1 stroke-[3]" />}
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KHỐI 2: DANH SÁCH ĐẦU VIỆC (DỰ KIẾN & ĐÃ THỰC HIỆN) */}
                <div className="bg-white p-6 sm:p-7 rounded-2xl border border-teal-200/90 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#007068] text-white rounded-md flex items-center justify-center text-xs font-black">2</span>
                        Danh sách Đầu việc ({cthsWorkItems.length} đầu việc)
                      </h5>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Ghi nhận ngắn gọn: Tên đầu việc – Trạng thái Hoàn thành / Tiếp tục – Nội dung cần tiếp tục – Ghi chú kết quả.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddCthsWorkItem()}
                      className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-[#005B58] text-xs font-black rounded-xl border border-teal-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm đầu việc mới</span>
                    </button>
                  </div>

                  {/* Gợi ý nhanh */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Gợi ý đầu việc CTHS thường gặp (bấm để thêm nhanh):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CTHS_TASK_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleAddCthsWorkItem(preset)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Danh sách các đầu việc */}
                  <div className="space-y-3.5">
                    {cthsWorkItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={\`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 shadow-2xs \${
                          item.status === "COMPLETED"
                            ? "bg-white border-slate-200 hover:border-teal-200"
                            : "bg-amber-50/30 border-amber-200"
                        }\`}
                      >
                        {/* Row 1: STT, Tên đầu việc, Toggle trạng thái, Nút xóa */}
                        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                          <span className="w-7 h-7 rounded-xl bg-teal-50 border border-teal-200 text-[#005B58] flex items-center justify-center text-xs font-black shrink-0">
                            #{index + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Tên / Nội dung đầu việc (VD: Kiểm tra nền nếp học sinh...)"
                            value={item.name}
                            onChange={(e) => handleUpdateCthsWorkItem(item.id, "name", e.target.value)}
                            className="flex-1 min-w-[200px] text-xs font-bold p-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-[#007068] outline-none text-slate-800"
                          />

                          {/* Status toggle */}
                          <button
                            type="button"
                            onClick={() => handleUpdateCthsWorkItem(item.id, "status", item.status === "COMPLETED" ? "CONTINUE" : "COMPLETED")}
                            className={\`px-3.5 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs select-none active:scale-95 \${
                              item.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                : "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                            }\`}
                            title="Bấm để chuyển đổi trạng thái Hoàn thành / Tiếp tục"
                          >
                            {item.status === "COMPLETED" ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Hoàn thành</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-amber-600" />
                                <span>Tiếp tục thực hiện</span>
                              </>
                            )}
                          </button>

                          {cthsWorkItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCthsWorkItem(item.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                              title="Xóa đầu việc này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Row 2: Nội dung cần tiếp tục (nếu cần) & Ghi chú kết quả */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-0 sm:pl-9">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                              <span>Nội dung cần tiếp tục / Phối hợp theo dõi:</span>
                              {item.status === "CONTINUE" && <span className="text-amber-600 font-black">(Cần thiết)</span>}
                            </label>
                            <input
                              type="text"
                              placeholder="VD: Tiếp tục theo dõi buổi sáng ngày mai, phối hợp GVCN..."
                              value={item.followUpNotes || ""}
                              onChange={(e) => handleUpdateCthsWorkItem(item.id, "followUpNotes", e.target.value)}
                              className={\`w-full text-xs font-medium p-2.5 rounded-xl border outline-none \${
                                item.status === "CONTINUE"
                                  ? "border-amber-300 bg-amber-50/50 focus:bg-white focus:ring-1 focus:ring-amber-500 text-slate-800"
                                  : "border-slate-200 bg-slate-50/40 focus:bg-white focus:ring-1 focus:ring-[#007068] text-slate-700"
                              }\`}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-600">Ghi chú kết quả thực hiện thực tế:</label>
                            <input
                              type="text"
                              placeholder="VD: Đã kiểm tra xong 6 lớp, không phát hiện vi phạm..."
                              value={item.notes || ""}
                              onChange={(e) => handleUpdateCthsWorkItem(item.id, "notes", e.target.value)}
                              className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-slate-50/40 focus:bg-white focus:ring-1 focus:ring-[#007068] outline-none text-slate-700"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KHỐI 3: TỔNG KẾT SAU BUỔI LÀM VIỆC & GHI CHÚ CHUNG */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-5 h-5 bg-[#007068] text-white rounded-md flex items-center justify-center text-xs font-black">3</span>
                      Tổng kết buổi làm việc & Ghi chú phối hợp chung
                    </label>
                    <span className="text-xs font-black text-teal-950 bg-teal-50 px-3.5 py-1 rounded-xl border border-teal-200">
                      Tự động cộng Ma trận CS: <strong className="text-emerald-700 font-black">{Math.max(1, cthsEndPeriod - cthsStartPeriod + 1)} tiết</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      Ghi chú & Đề xuất phối hợp chung với Ban Giám hiệu / GVCN cơ sở (Tùy chọn)
                    </label>
                    <textarea
                      placeholder="Ghi chú tổng kết hoặc nội dung cần tiếp tục phối hợp với Ban Giám hiệu / GVCN cơ sở..."
                      rows={3}
                      value={cthsGeneralNotes}
                      onChange={(e) => setCthsGeneralNotes(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-[#007068] outline-none resize-none transition-all shadow-2xs text-slate-800"
                    />
                  </div>

                  {/* Email notification toggle */}
                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cthsSendEmail}
                        onChange={(e) => setCthsSendEmail(e.target.checked)}
                        className="w-4 h-4 rounded text-[#007068] focus:ring-[#007068] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Tự động gửi email thông báo lịch làm việc & biên bản tới Nhân sự và Ban Giám hiệu cơ sở
                      </span>
                    </label>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email thương hiệu Sky-Line</span>
                    </span>
                  </div>
                </div>

                {/* KHỐI 4: NÚT HÀNH ĐỘNG */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={surpriseSubmitting}
                    onClick={() => handleCthsSubmit(true)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4 text-slate-500" />
                    {surpriseSubmitting ? "Đang lưu..." : "Lưu nháp / Đăng ký trước"}
                  </button>

                  <button
                    type="button"
                    disabled={surpriseSubmitting}
                    onClick={() => handleCthsSubmit(false)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 bg-gradient-to-r from-[#007068] via-[#005B58] to-emerald-600 hover:from-[#005B58] hover:to-emerald-700 text-white shadow-teal-900/20"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    {surpriseSubmitting ? "Đang xử lý..." : "Ghi nhận & Hoàn thành buổi làm việc (Tổ CTHS)"}
                  </button>
                </div>
              </div>
            ) : creationMode === "SURPRISE" ? (
            /* ===== FORM 3: DỰ GIỜ ĐỘT XUẤT (K12 / MẦM NON) ===== */
            <div className="flex flex-col gap-6 text-xs font-semibold bg-gradient-to-b from-slate-50/40 via-white to-teal-50/20 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm animate-in fade-in duration-300">
              {/* Header Banner */}
              <div className={\`p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white \${
                surpriseLevel === "Mầm non"
                  ? "bg-gradient-to-r from-amber-700 via-amber-800 to-[#003B3A] border-amber-500/40"
                  : "bg-gradient-to-r from-[#003B3A] via-[#005B54] to-[#00A19A] border-teal-600/40"
              }\`}>
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black tracking-wide">
                        {surpriseLevel === "Mầm non"
                          ? "DỰ GIỜ ĐỘT XUẤT MẦM NON"
                          : "DỰ GIỜ ĐỘT XUẤT"}
                      </h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-400 text-amber-950 uppercase">
                        {isAdminUser ? "Ban ĐHCM / GĐCS / TBP / Quản lý" : (surpriseLevel === "Mầm non" ? "TTCM / BGH Mầm non" : "TTCM / Trưởng Bộ Phận")}
                      </span>

                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-800/80 text-teal-100 border border-teal-500/40">
                        Đồng hành chuyên môn
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-50/90 font-medium mt-1 leading-relaxed">
                      {surpriseLevel === "Mầm non"
                        ? "Đánh giá hoạt động học / chuyên đề Mầm non (18 tiêu chí - Tổng 10 điểm). Tự động ghi nhận không cần duyệt trước."
                        : "Đánh giá trực tiếp tiết dạy đột xuất (11 tiêu chí - Chuẩn 20 điểm) nhằm đồng hành, hỗ trợ và phát triển chuyên môn giáo viên. Kết quả được lưu tự động mà không cần phê duyệt trước."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/20 text-[11px] font-bold text-teal-100 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Hình thức: Mặc định đột xuất</span>
                </div>
              </div>

              {/* QUOTA TRACKER BANNER (Chỉ áp dụng cho Dự giờ đột xuất) */}
              {surpriseQuota && (
                <div className={\`p-4 sm:p-5 rounded-2xl border transition-all \${
                  surpriseQuota.isExceeded && !surpriseQuota.isUnlimited
                    ? "bg-rose-50/90 border-rose-200 text-rose-950 shadow-xs"
                    : surpriseQuota.isUnlimited
                    ? "bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-teal-50/80 border-indigo-200/90 text-slate-800 shadow-xs"
                    : "bg-gradient-to-r from-teal-50/90 via-emerald-50/60 to-cyan-50/80 border-teal-200/90 text-slate-800 shadow-xs"
                }\`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={\`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs \${
                        surpriseQuota.isExceeded && !surpriseQuota.isUnlimited
                          ? "bg-rose-200 text-rose-800"
                          : surpriseQuota.isUnlimited
                          ? "bg-indigo-200/80 text-indigo-700"
                          : "bg-teal-200/70 text-[#00A19A]"
                      }\`}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-800">
                            Hạn ngạch Dự Giờ Đột Xuất ({surpriseQuota.monthLabel})
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/80 border border-slate-200 text-slate-700">
                            {surpriseQuota.roleName}
                          </span>
                          <span className={\`px-2 py-0.5 text-[10px] font-black rounded-full \${
                            surpriseQuota.isExceeded && !surpriseQuota.isUnlimited
                              ? "bg-rose-600 text-white"
                              : surpriseQuota.isUnlimited
                              ? "bg-indigo-600 text-white"
                              : "bg-[#00A19A] text-white"
                          }\`}>
                            {surpriseQuota.isUnlimited ? "✨ Không giới hạn đột xuất" : "Tối đa 50% chỉ tiêu"}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 mt-1">
                          {surpriseQuota.isUnlimited ? (
                            <>
                              Chỉ tiêu quy định: <strong className="text-slate-800 font-bold">{surpriseQuota.monthlyTarget} tiết/tháng</strong> • Dự giờ đột xuất: <strong className="text-indigo-600 font-black">Không hạn chế số tiết</strong> (Dành cho {surpriseQuota.roleName})
                            </>
                          ) : (
                            <>
                              Chỉ tiêu quy định: <strong className="text-slate-800 font-bold">{surpriseQuota.monthlyTarget} tiết/tháng</strong> • Dự giờ đột xuất tối đa: <strong className="text-[#00A19A] font-black">{surpriseQuota.maxSurpriseAllowed} tiết</strong> (50%)
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pl-12 md:pl-0">
                      <div className="flex items-center gap-2 text-xs font-black">
                        {surpriseQuota.isUnlimited ? (
                          <span className="text-indigo-700 font-bold">
                            Đã thực hiện: {surpriseQuota.currentSurpriseCount} tiết đột xuất
                          </span>
                        ) : (
                          <>
                            <span className={surpriseQuota.isExceeded ? "text-rose-700" : "text-[#00A19A]"}>
                              Đã dùng: {surpriseQuota.currentSurpriseCount} / {surpriseQuota.maxSurpriseAllowed} tiết
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              ({Math.min(100, Math.round((surpriseQuota.currentSurpriseCount / (surpriseQuota.maxSurpriseAllowed || 1)) * 100))}%)
                            </span>
                          </>
                        )}
                      </div>
                      {!surpriseQuota.isUnlimited && (
                        <div className="w-full sm:w-48 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className={\`h-full transition-all duration-500 rounded-full \${
                              surpriseQuota.isExceeded ? "bg-rose-600" : "bg-gradient-to-r from-teal-500 to-emerald-500"
                            }\`}
                            style={{
                              width: \`\${Math.min(100, Math.round((surpriseQuota.currentSurpriseCount / (surpriseQuota.maxSurpriseAllowed || 1)) * 100))}%\`
                            }}
                          />
                        </div>
                      )}
                      <div className="text-[11px] font-bold">
                        {surpriseQuota.isUnlimited ? (
                          <span className="text-indigo-700 font-bold">⚡ Cấp quản lý linh hoạt thực hiện đột xuất</span>
                        ) : surpriseQuota.isExceeded ? (
                          <span className="text-rose-600 font-black">⚠️ Đã đạt giới hạn tối đa 50% chỉ tiêu</span>
                        ) : (
                          <span className="text-emerald-700">🟢 Còn lại {surpriseQuota.remainingSurpriseCount} lượt đăng ký</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {surpriseQuota.isExceeded && !surpriseQuota.isUnlimited && (
                    <div className="mt-3 pt-3 border-t border-rose-200/80 text-xs text-rose-800 font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        Thầy/Cô đã hoàn thành tối đa số lượt dự giờ đột xuất cho phép trong tháng (50% của {surpriseQuota.monthlyTarget} tiết chỉ tiêu). Để đảm bảo tính sư phạm và kế hoạch chuyên môn, các tiết dự giờ còn lại vui lòng chuyển sang tab <strong>"Xin dự giờ"</strong> theo kế hoạch.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CO-OBSERVATION: BỘ LỌC VÀ CẢNH BÁO PHIÊN DỰ GIỜ ĐỘT XUẤT CÙNG TIẾT */}
              {loadingExistingSlot && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span className="font-semibold">Đang tự động kiểm tra phiên dự giờ của giáo viên trong cùng tiết học...</span>
                </div>
              )}

              {existingSurpriseSlot && !dismissDuplicateNotice && !joinExistingSlot && (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/95 via-sky-50/80 to-teal-50/90 border-2 border-indigo-300 shadow-sm flex flex-col gap-4 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                          Phát hiện phiên dự giờ cùng tiết học
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                          ⚡ Gộp phiên (Co-observation)
                        </span>
                      </div>
                      <h5 className="text-sm sm:text-base font-black text-indigo-950 mt-1.5 leading-snug">
                        “Đã tồn tại phiên dự giờ của giáo viên này trong cùng tiết học. Bạn có muốn tham gia phiên dự giờ hiện có?”
                      </h5>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Hệ thống xác định phiên dự giờ dựa trên: Giáo viên được dự (<strong>{existingSurpriseSlot.teacherName}</strong>), Ngày (<strong>{existingSurpriseSlot.date}</strong>), Tiết (<strong>{existingSurpriseSlot.period}</strong>), Lớp (<strong>{existingSurpriseSlot.className}</strong>) tại cơ sở <strong>{existingSurpriseSlot.campusName}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Chi tiết phiên hiện có */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/95 border border-indigo-100 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Môn & Bài dạy</span>
                        <strong className="text-slate-900 text-xs font-bold block truncate">
                          {existingSurpriseSlot.subjectName} — "{existingSurpriseSlot.topic}"
                        </strong>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Lớp & Tiết học</span>
                        <strong className="text-slate-900 text-xs font-bold block">
                          {existingSurpriseSlot.className} • {existingSurpriseSlot.period}
                        </strong>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 sm:col-span-2 lg:col-span-1">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Cơ sở & Phòng</span>
                        <span className="font-bold text-slate-700 block truncate">
                          {existingSurpriseSlot.campusName} {existingSurpriseSlot.room ? \`• \${existingSurpriseSlot.room}\` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-slate-500 font-semibold">Người tham gia dự giờ:</span>
                        <span className="font-bold text-indigo-950">
                          {existingSurpriseSlot.participants?.map((p: any) => \`\${p.teacherName} (\${p.position || "Cán bộ"})\`).join(", ") || "Đang dự"}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {existingSurpriseSlot.participantCount} người tham gia
                      </span>
                    </div>
                  </div>

                  {/* 2 Lựa chọn hành động theo yêu cầu */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-600 font-medium italic">
                      💡 Vui lòng lựa chọn cách ghi nhận phiên dự giờ:
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setJoinExistingSlot(false);
                          setDismissDuplicateNotice(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        ➕ Tạo phiên mới
                        <span className="text-[10px] font-normal text-slate-500 block sm:inline sm:ml-1">(Tiết dạy khác)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setJoinExistingSlot(true);
                          if (existingSurpriseSlot.topic) setSurpriseTopic(existingSurpriseSlot.topic);
                          if (existingSurpriseSlot.subjectName) setSurpriseSubjectName(existingSurpriseSlot.subjectName);
                          if (existingSurpriseSlot.subjectId) setSurpriseSubjectId(existingSurpriseSlot.subjectId);
                          if (existingSurpriseSlot.room) setSurpriseRoom(existingSurpriseSlot.room);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003B3A] via-[#005B54] to-[#00A19A] hover:from-[#002B2A] hover:to-[#005B54] text-white font-black text-xs transition-all shadow-md shadow-teal-950/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-emerald-300" />
                        <span>Tham gia phiên dự giờ</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-emerald-950 text-[10px] font-black">Khuyến nghị</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI ĐÃ CHỌN THAM GIA PHIÊN DỰ GIỜ CHUNG */}
              {existingSurpriseSlot && joinExistingSlot && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50/95 via-emerald-50/90 to-cyan-50/90 border-2 border-[#00A19A] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800 animate-in fade-in duration-200">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00A19A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-[#003B3A] uppercase tracking-wide">
                          Đã chọn: Tham gia phiên dự giờ chung
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                          {existingSurpriseSlot.participantCount} người cùng dự
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Phiếu đánh giá riêng độc lập
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        Phiên: <strong>"{existingSurpriseSlot.topic}"</strong> ({existingSurpriseSlot.subjectName} - {existingSurpriseSlot.className} - {existingSurpriseSlot.period}). Hệ thống chỉ ghi nhận 01 phiên cho GV dạy; Thầy/Cô thực hiện phiếu đánh giá riêng của mình (11 tiêu chí, nhận xét và điểm số độc lập).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setJoinExistingSlot(false);
                      setDismissDuplicateNotice(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                  >
                    Thay đổi lựa chọn
                  </button>
                </div>
              )}

              {/* SECTION 1: THÔNG TIN TIẾT DẠY & GIÁO VIÊN */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-teal-100 text-[#00A19A] rounded-md flex items-center justify-center text-xs font-black">1</span>
                    Thông tin Giáo viên & Tiết học
                  </h5>
                  <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                    Các mục có dấu <span className="text-rose-500 font-bold">*</span> là bắt buộc
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-4 sm:gap-5">
                  {/* 1. Chọn Tổ CM */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Chọn Tổ CM *</span>
                      </span>
                      {!isAdminUser && isTTCM && !isMamNonTeacher && (
                        <span className="text-[10px] text-amber-600 font-bold">🔒 Khóa theo TCM</span>
                      )}
                      {isMamNonTeacher && (
                        <span className="text-[10px] text-emerald-600 font-bold">✨ Tổ Mầm non & TA</span>
                      )}
                    </label>
                    <select
                      value={surpriseDeptId}
                      onChange={e => {
                        const newDeptId = e.target.value;
                        setSurpriseDeptId(newDeptId);
                        setSurpriseTeacherId("");
                        if (newDeptId) {
                          const selectedDept = departments.find((d: any) => d.id === newDeptId);
                          if (selectedDept && isPreschoolDepartment(selectedDept.name || selectedDept.code || "")) {
                            setSurpriseLevel("Mầm non");
                            const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                            setSurpriseSubjectId(khacChuyenDeId);
                            setSurpriseSubjectName("Chủ đề/Chuyên đề");
                          } else {
                            if (surpriseLevel === "Mầm non") setSurpriseLevel("Phổ thông K-12");
                          }
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      {(isAdminUser || isMamNonTeacher) && <option value="">-- Chọn Tổ CM --</option>}
                      {ttcmAllowedDepartments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Giáo viên dạy được dự */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-5 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Giáo viên dạy được dự *</span>
                      </span>
                      {filteredTeachersForSurprise.length > 0 && (
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          {filteredTeachersForSurprise.length} GV
                        </span>
                      )}
                    </label>
                    <select
                      value={surpriseTeacherId}
                      onChange={e => {
                        const tId = e.target.value;
                        setSurpriseTeacherId(tId);
                        if (tId) {
                          const tObj = teachers.find((t: any) => t.id === tId);
                          if (tObj) {
                            if (tObj.campusId && !surpriseCampusId) setSurpriseCampusId(tObj.campusId);
                            if (tObj.mainSubjectRel?.subjectName && !surpriseSubjectId) {
                              setSurpriseSubjectName(tObj.mainSubjectRel.subjectName);
                              if (tObj.mainSubjectId) setSurpriseSubjectId(tObj.mainSubjectId);
                            }
                            const tDept = departments.find((d: any) => d.id === tObj.departmentId) || tObj.departmentRel;
                            if (tDept && isPreschoolDepartment(tDept.name || tDept.code || "")) {
                              setSurpriseLevel("Mầm non");
                              const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                              setSurpriseSubjectId(khacChuyenDeId);
                              setSurpriseSubjectName("Chủ đề/Chuyên đề");
                            } else {
                              if (surpriseLevel === "Mầm non") {
                                setSurpriseLevel("Phổ thông K-12");
                              }
                            }
                          }
                        }
                      }}
                      required
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn Giáo viên dạy --</option>
                      {filteredTeachersForSurprise.map((t: any) => {
                        const campusObj = campuses.find((c: any) => c.id === t.campusId);
                        const campusShort = campusObj?.campusCode || campusObj?.campusName?.replace("Sky-Line ", "") || "";
                        const depts = getTeacherAllDeptNames(t, departments);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} {t.teacherCode ? \`(\${t.teacherCode})\` : ""} {depts ? \`• \${depts}\` : ""} {campusShort ? \`[\${campusShort}]\` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 3. Môn học */}
                  <div className="col-span-12 sm:col-span-12 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Môn học *</span>
                      </span>
                      {isMamNonTeacher && (
                        <span className="text-[10px] text-emerald-600 font-bold">✨ Chủ đề/Chuyên đề</span>
                      )}
                    </label>
                    <select
                      value={surpriseSubjectId}
                      onChange={e => {
                        const sId = e.target.value;
                        setSurpriseSubjectId(sId);
                        const sObj = subjects.find((s: any) => s.id === sId);
                        if (sObj) {
                          setSurpriseSubjectName(sObj.subjectName);
                        } else if (sId) {
                          setSurpriseSubjectName(sId);
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {(() => {
                        const chuDeSub = subjects.find((s: any) => {
                          const n = (s.subjectName || "").toLowerCase();
                          return n.includes("chủ đề") || n.includes("chu de") || n === "chủ đề/chuyên đề";
                        });
                        const chuDeId = chuDeSub ? chuDeSub.id : "Chủ đề/Chuyên đề";
                        return (
                          <option key="opt_chude" value={chuDeId}>
                            🌟 Chủ đề/Chuyên đề {isMamNonTeacher ? "(Mầm non)" : ""}
                          </option>
                        );
                      })()}
                      {subjects.map((s: any) => {
                        const n = (s.subjectName || "").toLowerCase();
                        if (n.includes("chủ đề") || n.includes("chu de") || n === "chủ đề/chuyên đề") return null;
                        return (
                          <option key={s.id} value={s.id}>{s.subjectName}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 30-DAY SPACING WARNING BANNER */}
                  {loadingTeacherHistory && (
                    <div className="col-span-12 p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-teal-700 text-xs flex items-center gap-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00A19A]" />
                      <span className="font-semibold">Đang kiểm tra lịch sử dự giờ đột xuất của giáo viên trong 30 ngày qua...</span>
                    </div>
                  )}

                  {!loadingTeacherHistory && teacherSurpriseHistory?.hasRecentSurprise && (
                    <div className="col-span-12 p-4 sm:p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-amber-950 flex flex-col gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-200/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <AlertTriangle className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h6 className="text-xs font-black text-amber-950 tracking-tight uppercase flex items-center gap-1.5">
                              <span>⚠️ Cảnh báo giãn cách dự giờ đột xuất</span>
                            </h6>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                              {teacherSurpriseHistory.count} lượt trong 30 ngày qua
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-amber-900 mt-1.5 leading-relaxed">
                            Giáo viên này đã có <strong>{teacherSurpriseHistory.count} lượt dự giờ đột xuất trong 30 ngày gần nhất</strong>. Lượt gần nhất vào ngày <strong>{teacherSurpriseHistory.recentSlot?.date}</strong> (cách đây <strong>{teacherSurpriseHistory.daysAgo} ngày</strong>) do <strong>{teacherSurpriseHistory.recentSlot?.evaluatorName} ({teacherSurpriseHistory.recentSlot?.evaluatorPosition})</strong> thực hiện với bài dạy <em>"{teacherSurpriseHistory.recentSlot?.topic}"</em> ({teacherSurpriseHistory.recentSlot?.subjectName} - {teacherSurpriseHistory.recentSlot?.className}).
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <span className="text-[11px] text-amber-800/90 font-medium italic">
                          💡 Để đảm bảo phân bổ dự giờ đồng đều và không tạo áp lực dồn dập cho giáo viên, Thầy/Cô vui lòng cân nhắc kỹ trước khi tiếp tục:
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSurpriseTeacherId("");
                              setTeacherSurpriseHistory(null);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors text-xs cursor-pointer shadow-2xs"
                          >
                            Đổi giáo viên khác
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer bg-amber-100/90 hover:bg-amber-200/80 px-3.5 py-1.5 rounded-xl border border-amber-300 font-bold text-amber-950 transition-colors">
                            <input
                              type="checkbox"
                              checked={confirmedSpacingWarning}
                              onChange={e => setConfirmedSpacingWarning(e.target.checked)}
                              className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                            />
                            <span>Tôi đã cân nhắc & tiếp tục</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Ngày dự giờ */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Ngày dự giờ *</span>
                    </label>
                    <input
                      type="date"
                      value={surpriseDate}
                      min={minAllowedDate}
                      onChange={e => setSurpriseDate(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    />
                  </div>

                  {/* 5. Tiết dự */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>{surpriseLevel === "Mầm non" ? "Khung giờ / Hoạt động dự *" : "Tiết dự *"}</span>
                    </label>
                    <select
                      value={surprisePeriod}
                      onChange={e => setSurprisePeriod(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      {surpriseLevel === "Mầm non" && (
                        <>
                          <option value="HĐ Học sáng">Hoạt động học có chủ đích (08:30 - 09:15)</option>
                          <option value="HĐ Tiếng Anh">Làm quen Tiếng Anh (09:15 - 09:45)</option>
                          <option value="HĐ Góc/Ngoài trời">Hoạt động góc / Ngoài trời (09:45 - 10:30)</option>
                          <option value="HĐ Chiều">Hoạt động chiều / Năng khiếu (14:30 - 15:15)</option>
                        </>
                      )}
                      <option value="Tiết 1">Tiết 1 (07:30 - 08:15)</option>
                      <option value="Tiết 2">Tiết 2 (08:20 - 09:05)</option>
                      <option value="Tiết 3">Tiết 3 (09:20 - 10:05)</option>
                      <option value="Tiết 4">Tiết 4 (10:10 - 10:55)</option>
                      <option value="Tiết 5">Tiết 5 (13:30 - 14:15)</option>
                      <option value="Tiết 6">Tiết 6 (14:20 - 15:05)</option>
                      <option value="Tiết 7">Tiết 7 (15:10 - 15:55)</option>
                      <option value="Tiết 8">Tiết 8 (15:55 - 16:40)</option>
                    </select>
                  </div>

                  {/* 6. Cơ sở trường */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Cơ sở trường</span>
                    </label>
                    <select
                      value={surpriseCampusId}
                      onChange={e => {
                        setSurpriseCampusId(e.target.value);
                        setSurpriseClassId("");
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn cơ sở --</option>
                      {campuses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.campusName}</option>
                      ))}
                    </select>
                  </div>

                  {/* 7. Cấp học */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Cấp học</span>
                    </label>
                    <select
                      value={surpriseLevel}
                      onChange={e => {
                        const newLvl = e.target.value;
                        setSurpriseLevel(newLvl);
                        setSurpriseClassId("");
                        if (newLvl === "Mầm non") {
                          const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                          setSurpriseSubjectId(khacChuyenDeId);
                          setSurpriseSubjectName("Chủ đề/Chuyên đề");
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="Phổ thông K-12">Phổ thông K-12</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                      <option value="Mầm non">Mầm non</option>
                    </select>
                  </div>

                  {/* 8. Lớp học */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Lớp học *</span>
                      </span>
                      {filteredClassesForSurprise.length > 0 && (
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          {filteredClassesForSurprise.length} lớp
                        </span>
                      )}
                    </label>
                    <select
                      value={surpriseClassId}
                      onChange={e => {
                        const clsId = e.target.value;
                        setSurpriseClassId(clsId);
                        const clsObj = classes.find((c: any) => c.id === clsId);
                        if (clsObj) {
                          setSurpriseClassName(clsObj.className);
                          if (clsObj.grade) setSurpriseGrade(clsObj.grade);
                          if (clsObj.level) setSurpriseLevel(clsObj.level);
                          if (clsObj.campusId && !surpriseCampusId) setSurpriseCampusId(clsObj.campusId);

                          if (clsObj.level === "Mầm non") {
                            const gClean = (clsObj.grade || clsObj.className || "").toLowerCase();
                            let matchedDept = null;
                            if (gClean.includes("nha tre") || gClean.includes("nhà trẻ")) {
                              matchedDept = departments.find((d: any) => d.code === "NHA_TRE" || d.name.includes("Nhà Trẻ"));
                            } else if (gClean.includes("be") || gClean.includes("bé")) {
                              matchedDept = departments.find((d: any) => d.code === "MGB" || d.name.includes("Mẫu giáo Bé"));
                            } else if (gClean.includes("nho") || gClean.includes("nhỡ")) {
                              matchedDept = departments.find((d: any) => d.code === "MGN" || d.name.includes("Mẫu giáo Nhỡ"));
                            } else if (gClean.includes("lon") || gClean.includes("lớn")) {
                              matchedDept = departments.find((d: any) => d.code === "MGL" || d.name.includes("Mẫu giáo Lớn"));
                            }
                            if (matchedDept && (!surpriseDeptId || surpriseDeptId === "all")) {
                              setSurpriseDeptId(matchedDept.id);
                            }

                            if (clsObj.homeroomTeacherId && !surpriseTeacherId) {
                              setSurpriseTeacherId(clsObj.homeroomTeacherId);
                            }
                          }
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn danh sách lớp --</option>
                      {filteredClassesForSurprise.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  {/* 9. Phòng học */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Phòng học</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Phòng 204, Phòng Lab..."
                      value={surpriseRoom}
                      onChange={e => setSurpriseRoom(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs placeholder:text-slate-400"
                    />
                  </div>

                  {/* 10. Chủ đề / Nội dung bài dạy */}
                  <div className="col-span-12 lg:col-span-6 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Chủ đề / Nội dung bài dạy *</span>
                    </label>
                    <input
                      type="text"
                      placeholder={surpriseLevel === "Mầm non" 
                        ? "VD: Chủ đề: Bản thân và gia đình, Hoạt động góc, STEAM, Khám phá khoa học..." 
                        : "VD: Bài 12: Phân tích số liệu và biểu đồ thống kê..."}
                      value={surpriseTopic}
                      onChange={e => setSurpriseTopic(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Thẻ Người ghi nhận tự động */}
                <div className="bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-slate-50 rounded-2xl p-4 border border-teal-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#00A19A] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {currentTeacher?.teacherName ? currentTeacher.teacherName.charAt(0) : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">
                          Người dự giờ (Tự động):
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{currentTeacher?.teacherName || "Tài khoản đăng nhập"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {currentTeacher?.email || "Email"} • Chức vụ: <span className="font-bold text-slate-700">{isTTCM ? "Tổ trưởng chuyên môn" : (currentTeacher?.position || "Ban ĐHCM / Quản lý chuyên môn")}</span>
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-3 py-1.5 text-[11px] font-bold rounded-xl bg-white border border-teal-200 text-teal-800 shadow-2xs shrink-0 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tự động ghi nhận</span>
                  </span>
                </div>
              </div>

              {/* SECTION 2: FORM ĐÁNH GIÁ TIẾT DẠY */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-teal-100 text-[#00A19A] rounded-md flex items-center justify-center text-xs font-black">2</span>
                    {surpriseLevel !== "Mầm non" ? "Phiếu Đánh Giá 11 Tiêu Chí (Tổng 20 điểm)" : "Phiếu Đánh Giá Mầm Non (Tổng 10 điểm)"}
                  </h5>

                  {/* Summary Score Box & Quick Actions */}
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span className="text-xs font-black text-slate-600 uppercase">Tổng điểm:</span>
                    <span className="text-sm font-black text-teal-950 bg-teal-50 px-3.5 py-1.5 rounded-xl border border-teal-200 shadow-2xs">
                      {surpriseLevel !== "Mầm non" 
                        ? `${effectiveScoresK12.reduce((a, b) => a + b, 0).toFixed(2)} / 20.00đ`
                        : `${effectiveScoresMN.reduce((a, b) => a + b, 0).toFixed(2)} / 10.00đ`
                      }
                    </span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      Xếp loại: {surpriseLevel !== "Mầm non" ? calculateK12Ranking(effectiveScoresK12) : calculateMamNonRanking(effectiveScoresMN)}
                    </span>

                    {/* Quick batch scoring buttons */}
                    <div className="flex items-center gap-1.5 pl-1">
                      <button
                        type="button"
                        onClick={handleSetAllMaxSafe}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Chấm điểm tối đa cho toàn bộ các tiêu chí"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chấm nhanh Max ({surpriseLevel !== "Mầm non" ? "20/20" : "10/10"})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetScoresSafe}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Đặt lại toàn bộ tiêu chí về 0 điểm"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Đặt lại 0đ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tiêu chí K-12 */}
                {surpriseLevel !== "Mầm non" ? (
                  <div className="space-y-6">
                    {K12_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += K12_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="w-5 h-5 bg-rose-600 text-white rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h6>

                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              const currentScore = effectiveScoresK12[globalIdx] ?? 0;
                              const isMaxReached = currentScore === req.max;

                              return (
                                <div
                                  key={req.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isMaxReached
                                      ? "bg-emerald-50/40 border-emerald-200/80 shadow-2xs"
                                      : currentScore > 0
                                        ? "bg-teal-50/30 border-teal-200/70 shadow-2xs"
                                        : "bg-slate-50/70 hover:bg-slate-50 border-slate-200/70"
                                  }`}
                                >
                                  <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                      {req.mandatoryText && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                                          isMaxReached
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                            : "bg-amber-50 text-amber-700 border-amber-300"
                                        }`}>
                                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                          {req.mandatoryText}
                                          {isMaxReached && (
                                            <span className="ml-0.5 font-black text-emerald-600">✓ Đạt Max</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Điểm:</span>
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs transition-all ${
                                          isMaxReached
                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-100"
                                            : currentScore > 0
                                              ? "bg-teal-600 text-white border-teal-700 shadow-teal-100"
                                              : "bg-slate-200 text-slate-700 border-slate-300"
                                        }`}
                                      >
                                        <span>{currentScore.toFixed(2)}đ</span>
                                        <span className="text-[10px] opacity-80">/ {req.max}đ</span>
                                        {isMaxReached && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                      {isMaxReached ? (
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                                          ✓ Tối đa 100%
                                        </span>
                                      ) : currentScore > 0 ? (
                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-lg border border-teal-200">
                                          Đạt {Math.round((currentScore / req.max) * 100)}%
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                          Chưa chấm
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {options.map((o) => {
                                          const isSelected = currentScore === o;
                                          const isMax = o === req.max;
                                          return (
                                            <button
                                              key={o}
                                              type="button"
                                              onClick={() => handleUpdateK12Score(globalIdx, o)}
                                              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                                                isSelected
                                                  ? isMax
                                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/70 scale-105 font-black"
                                                    : o > 0
                                                      ? "bg-teal-600 text-white border-teal-700 shadow-xs ring-2 ring-teal-300/70 scale-105 font-black"
                                                      : "bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-300/70 scale-105 font-black"
                                                  : isMax
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                              }`}
                                              title={`Chọn ${o.toFixed(2)} điểm`}
                                            >
                                              {isMax ? `★ ${o}` : o}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <select
                                        value={currentScore}
                                        onChange={(e) => handleUpdateK12Score(globalIdx, parseFloat(e.target.value))}
                                        className={`rounded-xl border px-2 py-1 text-xs font-black outline-none shadow-2xs transition-all w-20 cursor-pointer ${
                                          isMaxReached
                                            ? "border-emerald-300 bg-emerald-50/70 text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                                            : currentScore > 0
                                              ? "border-teal-300 bg-teal-50/70 text-teal-800 focus:ring-2 focus:ring-teal-500"
                                              : "border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400"
                                        }`}
                                        title="Hoặc chọn điểm từ danh sách"
                                      >
                                        {options.map((o) => (
                                          <option key={o} value={o}>
                                            {o.toFixed(2)}đ
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Tiêu chí Mầm Non */
                  <div className="space-y-6">
                    {MAMNON_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += MAMNON_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="w-5 h-5 bg-amber-600 text-white rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h6>

                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              const currentScore = effectiveScoresMN[globalIdx] ?? 0;
                              const isMaxReached = currentScore === req.max;

                              return (
                                <div
                                  key={req.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isMaxReached
                                      ? "bg-emerald-50/40 border-emerald-200/80 shadow-2xs"
                                      : currentScore > 0
                                        ? "bg-amber-50/30 border-amber-200/70 shadow-2xs"
                                        : "bg-slate-50/70 hover:bg-slate-50 border-slate-200/70"
                                  }`}
                                >
                                  <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Điểm:</span>
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs transition-all ${
                                          isMaxReached
                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-100"
                                            : currentScore > 0
                                              ? "bg-amber-600 text-white border-amber-700 shadow-amber-100"
                                              : "bg-slate-200 text-slate-700 border-slate-300"
                                        }`}
                                      >
                                        <span>{currentScore.toFixed(2)}đ</span>
                                        <span className="text-[10px] opacity-80">/ {req.max}đ</span>
                                        {isMaxReached && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                      {isMaxReached ? (
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                                          ✓ Tối đa 100%
                                        </span>
                                      ) : currentScore > 0 ? (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                                          Đạt {Math.round((currentScore / req.max) * 100)}%
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                          Chưa chấm
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {options.map((o) => {
                                          const isSelected = currentScore === o;
                                          const isMax = o === req.max;
                                          return (
                                            <button
                                              key={o}
                                              type="button"
                                              onClick={() => handleUpdateMNScore(globalIdx, o)}
                                              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                                                isSelected
                                                  ? isMax
                                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/70 scale-105 font-black"
                                                    : o > 0
                                                      ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-300/70 scale-105 font-black"
                                                      : "bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-300/70 scale-105 font-black"
                                                  : isMax
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                              }`}
                                              title={`Chọn ${o.toFixed(2)} điểm`}
                                            >
                                              {isMax ? `★ ${o}` : o}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <select
                                        value={currentScore}
                                        onChange={(e) => handleUpdateMNScore(globalIdx, parseFloat(e.target.value))}
                                        className={`rounded-xl border px-2 py-1 text-xs font-black outline-none shadow-2xs transition-all w-20 cursor-pointer ${
                                          isMaxReached
                                            ? "border-emerald-300 bg-emerald-50/70 text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                                            : currentScore > 0
                                              ? "border-amber-300 bg-amber-50/70 text-amber-800 focus:ring-2 focus:ring-amber-500"
                                              : "border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400"
                                        }`}
                                        title="Hoặc chọn điểm từ danh sách"
                                      >
                                        {options.map((o) => (
                                          <option key={o} value={o}>
                                            {o.toFixed(2)}đ
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Comment Presets for Surprise Observation */}
                <QuickCommentPresets
                  isPreschool={surpriseLevel === "Mầm non"}
                  onAddStrength={(text) => setSurpriseStrengths((prev: string) => prev ? `${prev}\n• ${text}` : `• ${text}`)}
                  onAddImprovement={(text) => setSurpriseImprovements((prev: string) => prev ? `${prev}\n• ${text}` : `• ${text}`)}
                />

                {/* Qualitative Feedback Textareas */}
                <div className="space-y-4 pt-2">
                  <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider">Nhận xét & Góp ý chuyên môn</h6>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">1. Ưu điểm nổi bật của tiết dạy</label>
                    <textarea
                      placeholder="Những điểm mạnh, sáng tạo trong phương pháp và tổ chức hoạt động của giáo viên..."
                      rows={2}
                      value={surpriseStrengths}
                      onChange={e => setSurpriseStrengths(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none resize-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">2. Nội dung cần cải thiện / Góp ý phát triển</label>
                    <textarea
                      placeholder="Các gợi ý phương pháp, phân bổ thời gian hoặc điều chỉnh hoạt động học sinh tốt hơn..."
                      rows={2}
                      value={surpriseImprovements}
                      onChange={e => setSurpriseImprovements(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none resize-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">3. Đề xuất & Kiến nghị chuyên môn</label>
                    <textarea
                      placeholder="Đề xuất bồi dưỡng chuyên môn, nhân rộng tiết dạy mẫu hoặc kế hoạch hỗ trợ tiếp theo..."
                      rows={2}
                      value={surpriseGeneral}
                      onChange={e => setSurpriseGeneral(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none resize-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Overall Rating & Automatic Reason */}
                {(() => {
                  const isMN = surpriseLevel === "Mầm non";
                  const rankInfo = isMN 
                    ? getMamNonRankingDetails(effectiveScoresMN)
                    : getK12RankingDetails(effectiveScoresK12);
                  const currentRank = surpriseOverall || rankInfo.rating;

                  return (
                    <div className="flex flex-col gap-4 p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-150">
                        <div>
                          <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            Xếp loại tiết dạy tổng thể (Tự động)
                          </label>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Hệ thống tự động phân tích điểm số các tiêu chuẩn để xếp loại và giải trình lý do
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-slate-500">Kết quả xếp loại:</span>
                          <span className={`px-3.5 py-1 text-xs font-black uppercase rounded-xl border shadow-2xs ${
                            currentRank === "Giỏi" || currentRank === "Tốt"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : currentRank === "Khá"
                              ? "bg-sky-50 text-sky-700 border-sky-300"
                              : currentRank === "Trung bình" || currentRank === "Đạt"
                              ? "bg-amber-50 text-amber-700 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-300"
                          }`}>
                            {currentRank}
                          </span>
                        </div>
                      </div>

                      {/* Reason Callout Box */}
                      <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                        rankInfo.color === "emerald"
                          ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
                          : rankInfo.color === "sky"
                          ? "bg-sky-50/80 border-sky-200/80 text-sky-950"
                          : rankInfo.color === "amber"
                          ? "bg-amber-50/80 border-amber-200/80 text-amber-950"
                          : "bg-rose-50/80 border-rose-200/80 text-rose-950"
                      }`}>
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h6 className="text-[11px] font-black uppercase tracking-wider">
                            Lý do xếp loại:
                          </h6>
                          <p className="text-xs font-medium leading-relaxed">
                            {rankInfo.reason}
                          </p>
                        </div>
                      </div>

                      {/* Rating selection buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        {(isMN
                          ? [["Tốt","bg-emerald-600"],["Khá","bg-sky-600"],["Đạt","bg-teal-600"],["Không đạt","bg-rose-600"]]
                          : [["Giỏi","bg-emerald-600"],["Khá","bg-sky-600"],["Trung bình","bg-amber-500"],["Không xếp loại","bg-rose-600"]]
                        ).map(([r, color]) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSurpriseOverall(r)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              currentRank === r
                                ? `${color} text-white shadow-md ring-2 ring-offset-1 ring-slate-400/40`
                                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {currentRank === r && <Check className="w-3.5 h-3.5" />}
                            <span>{r}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons: Lưu nháp / Hoàn thành */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                {surpriseQuota?.isExceeded && !surpriseQuota?.isUnlimited && (
                  <span className="text-xs text-rose-600 font-black mr-auto flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Đã hết hạn ngạch dự giờ đột xuất tháng ({surpriseQuota.currentSurpriseCount}/{surpriseQuota.maxSurpriseAllowed} tiết).
                  </span>
                )}

                {(() => {
                  const isBlockedByQuota = !surpriseQuota?.isUnlimited && surpriseQuota?.isExceeded;

                  const doSubmitSurprise = (isDraft: boolean) => {
                    if (isBlockedByQuota) return;
                    if (teacherSurpriseHistory?.hasRecentSurprise && !confirmedSpacingWarning) {
                      setPendingDraftSubmit(isDraft);
                      setShowSpacingConfirmModal(true);
                      return;
                    }
                    if (joinExistingSlot && existingSurpriseSlot?.id) {
                      handleSurpriseSubmit(isDraft, { existingSlotId: existingSurpriseSlot.id });
                    } else if (dismissDuplicateNotice) {
                      handleSurpriseSubmit(isDraft, { forceNewSlot: true });
                    } else {
                      handleSurpriseSubmit(isDraft);
                    }
                  };

                  return (
                    <>
                      <button
                        type="button"
                        disabled={surpriseSubmitting || isBlockedByQuota}
                        onClick={() => doSubmitSurprise(true)}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4 text-slate-500" />
                        {surpriseSubmitting ? "Đang lưu..." : "Lưu nháp"}
                      </button>

                      <button
                        type="button"
                        disabled={surpriseSubmitting || isBlockedByQuota}
                        onClick={() => doSubmitSurprise(false)}
                        className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          isBlockedByQuota
                            ? "bg-slate-300 text-slate-500 shadow-none"
                            : "bg-gradient-to-r from-[#00A19A] via-[#008B85] to-emerald-600 hover:from-[#008B85] hover:to-emerald-700 text-white shadow-teal-900/20"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        {surpriseSubmitting
                          ? "Đang xử lý..."
                          : (joinExistingSlot ? "Hoàn thành đánh giá (Gộp phiên)" : "Hoàn thành đánh giá")}
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* MODAL XÁC NHẬN CẢNH BÁO GIÃN CÁCH 30 NGÀY */}
              {showSpacingConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mx-auto shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-base font-black text-slate-800">
                        Xác nhận đăng ký Dự giờ đột xuất
                      </h4>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Giáo viên <strong>{teacherSurpriseHistory?.recentSlot?.teacherName || "này"}</strong> đã có <strong>{teacherSurpriseHistory?.count} lượt dự giờ đột xuất trong 30 ngày gần nhất</strong> (ngày {teacherSurpriseHistory?.recentSlot?.date} do {teacherSurpriseHistory?.recentSlot?.evaluatorName} thực hiện).
                      </p>
                      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 font-semibold space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>💡 Khuyến nghị chuyên môn:</span>
                        </div>
                        <p className="text-[11px] font-normal leading-relaxed text-amber-800">
                          Để đảm bảo tâm lý thoải mái và phân bổ hoạt động hỗ trợ đồng đều cho đội ngũ, Thầy/Cô có thể cân nhắc đổi sang giáo viên khác chưa được dự giờ gần đây.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSpacingConfirmModal(false);
                          setSurpriseTeacherId("");
                          setTeacherSurpriseHistory(null);
                        }}
                        className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Đổi giáo viên khác
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmedSpacingWarning(true);
                          setShowSpacingConfirmModal(false);
                          if (joinExistingSlot && existingSurpriseSlot?.id) {
                            handleSurpriseSubmit(pendingDraftSubmit, { existingSlotId: existingSurpriseSlot.id });
                          } else if (dismissDuplicateNotice) {
                            handleSurpriseSubmit(pendingDraftSubmit, { forceNewSlot: true });
                          } else {
                            handleSurpriseSubmit(pendingDraftSubmit);
                          }
                        }}
                        className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#00A19A] hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-md shadow-teal-900/20 cursor-pointer"
                      >
                        Xác nhận tiếp tục
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
