"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Copy,
  Check,
  Database,
} from "lucide-react";

interface SkillRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: any | null;
  onAppliedConfirm?: (skill: any) => void;
}

export function SkillRunnerModal({
  isOpen,
  onClose,
  skill,
  onAppliedConfirm,
}: SkillRunnerModalProps) {
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [bindMyClassData, setBindMyClassData] = useState(false);
  const [scopeCatalog, setScopeCatalog] = useState<any>(null);
  const [selectedAssignmentIdx, setSelectedAssignmentIdx] = useState<number>(0);
  const [customInstruction, setCustomInstruction] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showDeptUpdateBox, setShowDeptUpdateBox] = useState(false);
  const [deptSessionNote, setDeptSessionNote] = useState("");
  const [savingDeptUpdate, setSavingDeptUpdate] = useState(false);
  const [deptUpdateSuccessMsg, setDeptUpdateSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !skill) return;
    setRunError(null);
    setRunResult(null);
    setShowDeptUpdateBox(false);
    setDeptSessionNote("");
    setDeptUpdateSuccessMsg(null);
    setCustomInstruction(skill.aiInstruction || "");
    const initialInputs: Record<string, any> = {};
    (skill.inputSchema || []).forEach((f: any) => {
      initialInputs[f.key] = f.placeholder || "";
    });
    if (!initialInputs.topic_or_lesson && skill.topicName) {
      initialInputs.topic_or_lesson = skill.topicName;
    }
    setInputValues(initialInputs);

    // Load current teacher's own authorized scope (never inheriting skill author's class data)
    fetch("/api/skyline-connect?action=ssmDataScope")
      .then((r) => r.json())
      .then((json) => {
        if (json?.assignments) {
          setScopeCatalog(json);
          setSelectedAssignmentIdx(0);
        }
      })
      .catch(() => {});
  }, [isOpen, skill]);

  if (!isOpen || !skill) return null;

  const assignments: any[] = scopeCatalog?.assignments || [];
  const selectedAssignment = assignments[selectedAssignmentIdx] || null;

  const handleExecute = async () => {
    if (running) return; // Prevent duplicate submission
    setRunning(true);
    setRunError(null);
    try {
      const clientRequestId = `run_${skill.id}_${Date.now()}`;
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "runSkill",
          skillId: skill.id,
          clientRequestId,
          runType: "CLASS_APPLICATION",
          inputParams: inputValues,
          customInstructionOverride: customInstruction,
          bindClassScope:
            bindMyClassData && selectedAssignment
              ? {
                  academicYearId: scopeCatalog?.selectedAcademicYearId,
                  classId: selectedAssignment.classId,
                  subjectCode: selectedAssignment.subjectCode,
                  periodType: "SEMESTER",
                  semester: 1,
                }
              : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể thực thi Skill trên SSM.");
      setRunResult(json);
    } catch (err: any) {
      setRunError(err?.message || "Lỗi khi chạy Skill.");
    } finally {
      setRunning(false);
    }
  };

  const handleCopyOutput = () => {
    if (!runResult?.outputText) return;
    navigator.clipboard.writeText(runResult.outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#003B3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#00A19A] text-white text-[10px] font-bold">
                Dùng trên SSM • v{skill.currentVersion}
              </span>
              <h2 className="text-base font-bold text-white leading-tight">{skill.title}</h2>
            </div>
            <p className="text-xs text-teal-100/80 mt-0.5">
              Tác giả: {skill.authorName} • Dữ liệu lớp chỉ gắn theo phiên chạy của người dùng hiện tại, không kế thừa dữ liệu từ tác giả Skill.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#003B3A] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>
                Tách biệt dữ liệu học sinh: Hệ thống kiểm tra lại phân công của Thầy/Cô khi gắn dữ liệu lớp.
              </span>
            </div>
            <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={bindMyClassData}
                onChange={(e) => setBindMyClassData(e.target.checked)}
                className="accent-[#003B3A]"
              />
              <span>Gắn dữ liệu lớp thuộc phân công của tôi</span>
            </label>
          </div>

          {bindMyClassData && (
            <div className="p-3.5 rounded-xl bg-[#F0FDFA]/70 border border-[#00A19A]/40 space-y-2">
              <label className="block text-xs font-bold text-[#003B3A]">
                Chọn lớp & môn thuộc quyền giảng dạy của Thầy/Cô:
              </label>
              {assignments.length > 0 ? (
                <select
                  value={selectedAssignmentIdx}
                  onChange={(e) => setSelectedAssignmentIdx(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                >
                  {assignments.map((a: any, idx: number) => (
                    <option key={`${a.classId}_${a.subjectCode}_${idx}`} value={idx}>
                      Lớp {a.className} — Môn {a.subjectName} ({a.gradeLevel})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-amber-800">
                  Tài khoản hiện tại chưa có lớp phân công giảng dạy trực tiếp; Skill sẽ chạy với các tham số nhập bên dưới.
                </div>
              )}
            </div>
          )}

          {/* Input Schema Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(skill.inputSchema && skill.inputSchema.length > 0
              ? skill.inputSchema
              : [
                  {
                    key: "topic_or_lesson",
                    label: "Bài học / Chủ đề trọng tâm",
                    type: "TEXT",
                    required: true,
                    placeholder: "Nhập tên bài học hoặc chủ đề...",
                  },
                  {
                    key: "student_group_context",
                    label: "Đặc điểm nhóm học sinh / Yêu cầu phân hóa",
                    type: "TEXTAREA",
                    required: false,
                    placeholder: "Mô tả ngắn đặc điểm lớp (không nhập họ tên học sinh)...",
                  },
                ]
            ).map((field: any) => (
              <div
                key={field.key}
                className={field.type === "TEXTAREA" ? "md:col-span-2" : ""}
              >
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {field.label} {field.required && <span className="text-rose-600">*</span>}
                </label>
                {field.type === "TEXTAREA" ? (
                  <textarea
                    rows={2}
                    value={inputValues[field.key] || ""}
                    onChange={(e) =>
                      setInputValues({ ...inputValues, [field.key]: e.target.value })
                    }
                    placeholder={field.placeholder || ""}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                ) : (
                  <input
                    type={field.type === "NUMBER" ? "number" : "text"}
                    value={inputValues[field.key] || ""}
                    onChange={(e) =>
                      setInputValues({ ...inputValues, [field.key]: e.target.value })
                    }
                    placeholder={field.placeholder || ""}
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs text-slate-800 bg-white"
                  />
                )}
              </div>
            ))}
          </div>

          <details className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <summary className="text-xs font-semibold text-slate-700 cursor-pointer">
              Tùy chỉnh hướng dẫn AI cho lần chạy này (tùy chọn)
            </summary>
            <textarea
              rows={4}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              className="w-full mt-2 rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-mono text-slate-800 bg-white"
            />
          </details>

          {runError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{runError}</span>
              </div>
              <button
                type="button"
                onClick={handleExecute}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {runResult && (
            <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                <span className="text-xs font-bold text-[#059669] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kết quả thực thi Skill (v{runResult.skillVersion})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyOutput}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#059669]" />
                        <span>Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép kết quả</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-slate-800 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] max-h-80 overflow-y-auto font-sans leading-relaxed">
                {runResult.outputText}
              </pre>

              {/* CẬP NHẬT SKILL TỪ PHIÊN CHẠY & LÀM VIỆC TỔ CHUYÊN MÔN */}
              <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Thầy/Cô vừa tinh chỉnh hướng dẫn AI hoặc rút kinh nghiệm từ lớp dạy?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDeptUpdateBox((prev) => !prev)}
                    className="px-3 py-1 rounded-lg bg-[#F0FDFA] border border-[#00A19A] text-xs font-bold text-[#003B3A] cursor-pointer"
                  >
                    {showDeptUpdateBox
                      ? "Thu gọn"
                      : "+ Cập nhật phiên bản Skill cùng Tổ chuyên môn"}
                  </button>
                </div>

                {deptUpdateSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#059669]">
                    {deptUpdateSuccessMsg}
                  </div>
                )}

                {showDeptUpdateBox && (
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                    <div className="text-xs font-bold text-[#003B3A]">
                      Ghi nhận phiên làm việc / dạy thực nghiệm để nâng cấp Skill (v{skill.currentVersion} → bản mới)
                    </div>
                    <textarea
                      rows={2}
                      value={deptSessionNote}
                      onChange={(e) => setDeptSessionNote(e.target.value)}
                      placeholder="Nhập điểm thống nhất điều chỉnh của Tổ chuyên môn hoặc rút kinh nghiệm từ lần chạy này..."
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs bg-white"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={savingDeptUpdate || !deptSessionNote.trim()}
                        onClick={async () => {
                          setSavingDeptUpdate(true);
                          setDeptUpdateSuccessMsg(null);
                          try {
                            const res = await fetch("/api/skyline-connect", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "departmentSessionSkillUpdate",
                                skillId: skill.id,
                                sessionType: "DAY_THU_NGHIEM",
                                sessionTitle: `Rút kinh nghiệm sau phiên chạy thực tế — ${
                                  inputValues.topic_or_lesson || skill.title
                                }`,
                                testedClassesSummary: selectedAssignment
                                  ? `Lớp ${selectedAssignment.className} (${selectedAssignment.gradeLevel})`
                                  : "",
                                agreedAdjustments: deptSessionNote.trim(),
                                updatedAiSystemPrompt:
                                  customInstruction.trim() !==
                                  (skill.aiInstruction || "").trim()
                                    ? customInstruction.trim()
                                    : undefined,
                                submitMode: "PENDING_REVIEW",
                              }),
                            });
                            const json = await res.json();
                            if (!res.ok)
                              throw new Error(
                                json.message || "Không thể lưu bản cập nhật Skill."
                              );
                            setDeptUpdateSuccessMsg(
                              `Đã tạo phiên bản nâng cấp v${
                                json?.versionRecord?.version || "mới"
                              } từ phiên làm việc Tổ chuyên môn!`
                            );
                            setShowDeptUpdateBox(false);
                            setDeptSessionNote("");
                          } catch (e: any) {
                            setRunError(
                              e?.message || "Lỗi khi cập nhật phiên bản Skill."
                            );
                          } finally {
                            setSavingDeptUpdate(false);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                      >
                        {savingDeptUpdate
                          ? "Đang lưu phiên bản mới..."
                          : "Lưu bản nâng cấp cho Tổ chuyên môn"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div>
            {onAppliedConfirm && (
              <button
                type="button"
                onClick={() => onAppliedConfirm(skill)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-[#059669] cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận Đã áp dụng vào giảng dạy</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={running}
              onClick={handleExecute}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002827] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
            >
              {running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  <span>{runResult ? "Chạy lại" : "Thực thi trên SSM"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
