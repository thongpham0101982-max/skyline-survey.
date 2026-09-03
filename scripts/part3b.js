const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio-gvnn', 'client.tsx');

const p3b = `
            {/* Section 2: Indicators */}
            <div className="space-y-6">
              {["D", "E", "ABC"].map(sectionKey => {
                const sectionIndicators = ESL_INDICATORS.filter(i => i.section === sectionKey);
                const title = sectionIndicators[0]?.sectionTitle;

                return (
                  <div
                    key={sectionKey}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider">{title}</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {sectionIndicators.length} Pedagogical Indicators
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {sectionIndicators.map(ind => {
                        const currentData = indicatorData[ind.id] || { rating: "3", evidence: "", studentImpact: "" };

                        return (
                          <div key={ind.id} className="p-5 sm:p-6 space-y-4 hover:bg-slate-50/40 transition">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="space-y-1 max-w-3xl">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase">
                                    {ind.label}
                                  </span>
                                  <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                                    {ind.text}
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 italic pl-1">{ind.vnText}</p>
                              </div>

                              <div className="flex items-center gap-1.5 self-start bg-slate-100 p-1 rounded-xl border border-slate-200">
                                {RATING_OPTIONS.map(opt => {
                                  const isSelected = currentData.rating === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => handleRatingChange(ind.id, opt.value)}
                                      className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
                                        (isSelected
                                          ? (opt.badge + " shadow-sm scale-105")
                                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80")
                                      }
                                    >
                                      {opt.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Evidence / Examples Observed (Minh chứng)
                                </label>
                                <textarea
                                  rows={2}
                                  value={currentData.evidence}
                                  onChange={e => handleEvidenceChange(ind.id, e.target.value)}
                                  placeholder="Describe specific teacher actions, lesson pacing, or instructional tasks observed..."
                                  className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-lg p-2.5 text-xs text-slate-800 outline-none resize-none transition"
                                />
                                {ind.quickEvidence && ind.quickEvidence.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Quick-Insert Evidence Tags:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ind.quickEvidence.map(tag => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => appendQuickTag(ind.id, "evidence", tag)}
                                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Student Impact / Progress (Tác động HS)
                                </label>
                                <textarea
                                  rows={2}
                                  value={currentData.studentImpact}
                                  onChange={e => handleImpactChange(ind.id, e.target.value)}
                                  placeholder="Describe how students responded, produced target language, or overcame difficulties..."
                                  className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-lg p-2.5 text-xs text-slate-800 outline-none resize-none transition"
                                />
                                {ind.quickImpact && ind.quickImpact.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Quick-Insert Impact Tags:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ind.quickImpact.map(tag => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => appendQuickTag(ind.id, "studentImpact", tag)}
                                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
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

            {/* Section 3: Teacher Voice & Reflective Feedback (Section F) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    F
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      Teacher Voice & Curriculum Feedback (Post-Lesson Discussion)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reflective questions completed during debrief with the observed teacher
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    1. What is working well in this class at the moment?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Những điểm đang vận hành tốt và hiệu quả ở lớp học này hiện tại?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.workingWell}
                    onChange={e => setTeacherVoice({ ...teacherVoice, workingWell: e.target.value })}
                    placeholder="e.g. Students show great enthusiasm for speaking games; routine is well established..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    2. What challenges are you experiencing in teaching this class or implementing the curriculum?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Những khó khăn/thách thức đang gặp phải khi giảng dạy lớp này?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.challenges}
                    onChange={e => setTeacherVoice({ ...teacherVoice, challenges: e.target.value })}
                    placeholder="e.g. Mixed proficiency levels; a few students require more phonics support..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    3. Is there anything in the curriculum, materials, assessment, timetable or class context that should be adjusted?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Có nội dung nào trong giáo trình, học liệu, đánh giá, TKB cần điều chỉnh không?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.curriculumAdjustments}
                    onChange={e => setTeacherVoice({ ...teacherVoice, curriculumAdjustments: e.target.value })}
                    placeholder="e.g. Unit 4 reading text is too long for a single period; suggest splitting into 2 sessions..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    4. What support would help you teach this class more effectively?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Nhà trường / Tổ bộ môn cần hỗ trợ điều gì để giúp GV giảng dạy hiệu quả hơn?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.supportNeeded}
                    onChange={e => setTeacherVoice({ ...teacherVoice, supportNeeded: e.target.value })}
                    placeholder="e.g. Supplementary phonics worksheets; co-teacher assistance during pair work..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Observation Summary & Actions (Section G) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    G
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      Observation Summary & Action Plan (Quick Record)
                    </h3>
                    <p className="text-xs text-slate-500">Agreed outcomes and support commitments</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoGenerateSummary}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:opacity-95 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  ⚡ Auto-Generate Summary
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-emerald-600" />
                    Key Strengths Observed (Điểm mạnh nổi bật)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.keyStrengths}
                    onChange={e => setSummary({ ...summary, keyStrengths: e.target.value })}
                    placeholder="Bullet points of strongest pedagogical execution..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Key Teaching / Learning Challenges (Khó khăn & Thách thức)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.keyChallenges}
                    onChange={e => setSummary({ ...summary, keyChallenges: e.target.value })}
                    placeholder="Bullet points of areas requiring growth or scaffolding..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Evidence of Student Progress (Tiến bộ học sinh)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.studentProgressEvidence}
                    onChange={e => setSummary({ ...summary, studentProgressEvidence: e.target.value })}
                    placeholder="Specific student learning gains demonstrated in the lesson..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Students Needing Support (HS cần bổ trợ)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.studentsNeedingSupport}
                    onChange={e => setSummary({ ...summary, studentsNeedingSupport: e.target.value })}
                    placeholder="Names or specific groups of students needing clinic/follow-up..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Agreed Actionable Steps & Commitments (Kế hoạch hành động thống nhất)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.agreedActions}
                    onChange={e => setSummary({ ...summary, agreedActions: e.target.value })}
                    placeholder="1. Action item 1\\n2. Action item 2..."
                    className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Rating:</span>
                  <span className={"px-3 py-1 rounded-full text-xs font-extrabold " + stats.badgeColor}>
                    {stats.suggestedRating}
                  </span>
                </div>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-600 font-semibold">
                  Indicators: {stats.count4} (★4) • {stats.count3} (★3) • {stats.count2} (★2) • {stats.count1} (★1)
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSubmit(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSubmit(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
                >
                  <Send className="w-4 h-4" />
                  {isPending ? "Submitting..." : "Submit Evaluation"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Quota & KPI */}
        {activeTab === "kpi" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">ESL Observation Quota & Progress</h3>
              <p className="text-xs text-slate-500">
                Live synchronization with Academic Year targets for both Observed Lessons (Host) and Observation Credits (Evaluator).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                  Observed as Host Teacher (Tiết Dạy)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {props.currentTeacher?.requiredTaught || 0}
                  </span>
                  <span className="text-xs text-slate-500">/ target per term</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full w-3/4 rounded-full" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
                  Observation Credits as Evaluator (Tiết Đi Dự)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {props.currentTeacher?.requiredObserved || 0}
                  </span>
                  <span className="text-xs text-slate-500">/ target per term</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full w-4/5 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.appendFileSync(target, p3b, 'utf8');
console.log('Part 3b appended');
