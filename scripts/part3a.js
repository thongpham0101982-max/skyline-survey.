const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio-gvnn', 'client.tsx');

const p3a = `
  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 text-slate-800">
      {toast && (
        <div
          className={"fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white font-medium text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 " +
            (toast.type === "success" ? "bg-emerald-600" : "bg-rose-600")
          }
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide border border-indigo-400/30 uppercase mb-2">
                <Globe className="w-3.5 h-3.5" />
                Foreign English Teacher & Department Peer Observation
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Class Observation & Teaching Support
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Evidence-based lesson observation framework for ESL and English Departments (Primary, Secondary, International & GVNN).
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 self-start md:self-auto shadow-inner">
              <button
                onClick={() => setActiveTab("walkthrough")}
                className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all " +
                  (activeTab === "walkthrough"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50")
                }
              >
                <Sparkles className="w-4 h-4" />
                ⚡ Walkthrough Form
              </button>
              <button
                onClick={() => setActiveTab("kpi")}
                className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all " +
                  (activeTab === "kpi"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50")
                }
              >
                <BarChart3 className="w-4 h-4" />
                📊 Quota & KPI
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {activeTab === "walkthrough" && (
          <>
            {/* Section 1: Administrative Information */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">General Information & Context</h2>
                    <p className="text-xs text-slate-500">Filtered for 3 English Departments: Primary, Secondary, International & GVNN</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200 self-start sm:self-auto">
                  Subject: ESL (English as a Second Language)
                </span>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Observer Section */}
                <div className="space-y-1.5 md:col-span-2 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
                  <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    Observer / Evaluator (Người Dự Giờ)
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tổ Chuyên Môn Người Dự
                      </label>
                      <select
                        value={observerDeptFilter}
                        onChange={e => setObserverDeptFilter(e.target.value)}
                        className="w-full bg-white border border-indigo-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                      >
                        {ENGLISH_DEPARTMENTS_CONFIG.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Giáo Viên Dự (Observer)
                      </label>
                      <select
                        value={observerId}
                        onChange={e => setObserverId(e.target.value)}
                        className="w-full bg-white border-2 border-indigo-300 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-bold text-indigo-950 outline-none"
                      >
                        {filteredObservers.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} ({t.teacherCode}) - {t.departmentRel?.name || t.position || "English"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Observed Teacher Section */}
                <div className="space-y-1.5 md:col-span-2 bg-amber-50/40 p-4 rounded-xl border border-amber-100">
                  <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    Observed Teacher (Giáo Viên Được Dự) <span className="text-rose-500">*</span>
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Tổ Chuyên Môn GV Dạy
                      </label>
                      <select
                        value={observedDeptFilter}
                        onChange={e => setObservedDeptFilter(e.target.value)}
                        className="w-full bg-white border border-amber-200 focus:border-amber-600 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                      >
                        {ENGLISH_DEPARTMENTS_CONFIG.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Giáo Viên Được Dự (Observed)
                      </label>
                      <select
                        value={teacherId}
                        onChange={handleTeacherChange}
                        className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-lg px-3 py-2 text-xs font-bold text-amber-950 outline-none"
                      >
                        <option value="">-- Chọn Giáo Viên --</option>
                        {filteredObservedTeachers.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} ({t.teacherCode}) - {t.departmentRel?.name || t.position || "English"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Class & Campus */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Class / Grade
                  </label>
                  <select
                    value={classId}
                    onChange={handleClassChange}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  >
                    <option value="">-- Select Class --</option>
                    {teacherClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.grade || c.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Campus
                  </label>
                  <select
                    value={campusId}
                    onChange={e => setCampusId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  >
                    <option value="">-- Select Campus --</option>
                    {props.campuses?.map((cmp: any) => (
                      <option key={cmp.id} value={cmp.id}>
                        {cmp.campusName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Date of Observation
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Teaching Period
                  </label>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  >
                    {PERIOD_LIST.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.time})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Room
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    placeholder="e.g. Room 302 / Smart Lab"
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    Lesson Topic / Unit
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Unit 4: Food - Speaking Practice"
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Target Skills & Language Focus
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 " +
                            (isSelected
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                          }
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Rating Guide Info Box */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-white/10 text-indigo-300 flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-sm text-indigo-200 uppercase tracking-wider">
                      Evaluation Philosophy & Rating Scale:
                    </span>
                    <span className="text-xs text-slate-300">
                      Focus on evidence and student impact. Do not use primarily to rank teachers.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {RATING_OPTIONS.map(opt => (
                      <div key={opt.value} className="bg-white/10 rounded-lg p-2 border border-white/10">
                        <span className="font-bold text-xs block text-indigo-300">{opt.label}</span>
                        <span className="text-[11px] text-slate-300 leading-tight block mt-0.5">{opt.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
`;

fs.appendFileSync(target, p3a, 'utf8');
console.log('Part 3a appended');
