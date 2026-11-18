"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Globe, Award } from "lucide-react";
import {
  buildStudentCtqtPortfolio,
  CtqtCompetencyPortfolioItem,
  CtqtNormalizedStatus,
  CtqtSubjectPortfolioRow,
  CtqtSubjectSemesterData,
  StudentCtqtPortfolio,
} from "@/lib/ctqt/studentProfilePortfolio";

interface StudentCtqtGradesSectionProps {
  student: any;
  isPrintMode?: boolean;
  sectionTitle?: string;
}

function formatScoreValue(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return "—";
  }
  const num = Number(val);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function renderStatusBadge(status: CtqtNormalizedStatus, label: string) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 whitespace-nowrap">
        {label}
      </span>
    );
  }
  if (status === "PENDING_REVIEW") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200 whitespace-nowrap">
        {label}
      </span>
    );
  }
  if (status === "CHANGES_REQUESTED") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200 whitespace-nowrap">
        {label}
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 whitespace-nowrap">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
      {label}
    </span>
  );
}

function renderCompetencyBadge(code: string, labelVi: string) {
  if (code === "E") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 whitespace-nowrap">
        <span className="font-bold">E</span>
        <span>• {labelVi}</span>
      </span>
    );
  }
  if (code === "S") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 whitespace-nowrap">
        <span className="font-bold">S</span>
        <span>• {labelVi}</span>
      </span>
    );
  }
  if (code === "N") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200 whitespace-nowrap">
        <span className="font-bold">N</span>
        <span>• {labelVi}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200 whitespace-nowrap">
      <span className="font-bold">{code}</span>
      <span>• {labelVi}</span>
    </span>
  );
}

function renderBilingualComments(commentEn?: string, commentVi?: string) {
  if (!commentEn && !commentVi) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <div className="space-y-1 leading-relaxed">
      {commentEn && (
        <div className="text-[11px] text-slate-800 font-normal">{commentEn}</div>
      )}
      {commentVi && (
        <div className="text-[11px] text-slate-500 italic font-normal">
          {commentVi}
        </div>
      )}
    </div>
  );
}

export function StudentCtqtGradesSection({
  student,
  isPrintMode = false,
  sectionTitle = "IV. KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ",
}: StudentCtqtGradesSectionProps) {
  const portfolio: StudentCtqtPortfolio = useMemo(() => {
    if (
      student?.ctqtPortfolio &&
      Array.isArray(student.ctqtPortfolio.subjects)
    ) {
      return student.ctqtPortfolio as StudentCtqtPortfolio;
    }
    return buildStudentCtqtPortfolio({ student });
  }, [student]);

  const [viewMode, setViewMode] = useState<"HK1" | "HK2" | "ALL">(
    portfolio.defaultViewMode
  );

  useEffect(() => {
    setViewMode(portfolio.defaultViewMode);
  }, [
    student?.id,
    student?.studentCode,
    portfolio.defaultViewMode,
    portfolio.hasSem1Data,
    portfolio.hasSem2Data,
  ]);

  const effectiveMode: "HK1" | "HK2" | "ALL" = isPrintMode
    ? portfolio.defaultViewMode
    : viewMode;

  const activeCompetencies: CtqtCompetencyPortfolioItem[] | null =
    effectiveMode === "HK1"
      ? portfolio.competenciesSem1
      : effectiveMode === "HK2"
      ? portfolio.competenciesSem2
      : portfolio.competenciesSem2 || portfolio.competenciesSem1;

  const cellPad = isPrintMode ? "py-2 px-2.5" : "py-3 px-3";

  const renderSubjectIdentity = (
    row: CtqtSubjectPortfolioRow,
    semData?: CtqtSubjectSemesterData
  ) => {
    const gvbm = semData?.teacherName || row.teacherName;
    return (
      <div>
        <div className="font-semibold text-slate-900 leading-snug">
          {row.nameVi}
          <span className="text-slate-500 font-normal ml-1.5">
            ({row.nameEn})
          </span>
        </div>
        {gvbm && (
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
            GVBM: {gvbm}
          </div>
        )}
      </div>
    );
  };

  const renderSemesterTable = (semKey: "sem1" | "sem2") => {
    const level = portfolio.level;

    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse tabular-nums">
          <thead className="bg-[#003B3A] border-b border-[#003B3A]">
            {level === "PRIMARY" && (
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-2.5 w-10 text-center text-teal-100 font-semibold">
                  STT
                </th>
                <th className="py-2.5 px-3 text-white font-semibold">
                  Môn học CTQT
                </th>
                <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                  KTTX (Progress Test)
                </th>
                <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                  Giữa kỳ (GK) (Mid Term)
                </th>
                <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                  Cuối kỳ (CK) (End Term)
                </th>
                <th className="py-2.5 px-3 text-teal-100 font-semibold">
                  Nhận xét chuyên môn (Report Card)
                </th>
                <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                  Trạng thái
                </th>
              </tr>
            )}

            {level === "MIDDLE" && (
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-2.5 w-10 text-center text-teal-100 font-semibold">
                  STT
                </th>
                <th className="py-2.5 px-3 text-white font-semibold">
                  Môn học CTQT
                </th>
                <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                  KTTX (Progress)
                </th>
                <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                  Giữa kỳ (GK) (Mid Term)
                </th>
                <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                  Cuối kỳ (CK) (End Term)
                </th>
                <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                  ĐTB Môn (GPA / TBM)
                </th>
                <th className="py-2.5 px-3 text-teal-100 font-semibold">
                  Nhận xét chuyên môn (Report Card)
                </th>
                <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                  Trạng thái
                </th>
              </tr>
            )}

            {level === "HIGH" && (
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-2.5 w-10 text-center text-teal-100 font-semibold">
                  STT
                </th>
                <th className="py-2.5 px-3 text-white font-semibold">
                  Môn học CTQT
                </th>
                <th className="py-2.5 px-3 text-teal-100 font-semibold">
                  Nội dung đánh giá
                </th>
                <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                  Điểm / Band
                </th>
                <th className="py-2.5 px-3 text-teal-100 font-semibold">
                  Nhận xét chuyên môn (Report Card)
                </th>
                <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                  Trạng thái
                </th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {portfolio.subjects.map((row, idx) => {
              const sData = row[semKey];

              return (
                <tr
                  key={row.code}
                  className="transition-colors align-middle hover:bg-[#F8FAFC]"
                >
                  <td
                    className={`${cellPad} text-center font-mono text-slate-400 align-middle`}
                  >
                    {idx + 1}
                  </td>
                  <td className={`${cellPad} align-middle`}>
                    {renderSubjectIdentity(row, sData)}
                  </td>

                  {level === "PRIMARY" && (
                    <>
                      <td
                        className={`${cellPad} text-center font-semibold text-slate-700 align-middle`}
                      >
                        {row.hasProgressColumn ? sData.progressDisplay : "—"}
                      </td>
                      <td
                        className={`${cellPad} text-center font-bold text-slate-800 align-middle`}
                      >
                        {formatScoreValue(sData.midTermScore)}
                      </td>
                      <td
                        className={`${cellPad} text-center font-bold text-[#00736E] bg-[#F0FDFA]/60 align-middle`}
                      >
                        {formatScoreValue(sData.endTermScore)}
                      </td>
                    </>
                  )}

                  {level === "MIDDLE" && (
                    <>
                      {row.isQualitative ? (
                        <td
                          colSpan={4}
                          className={`${cellPad} text-center text-slate-500 italic align-middle bg-slate-50/50`}
                        >
                          Đánh giá nhận xét định tính
                        </td>
                      ) : (
                        <>
                          <td
                            className={`${cellPad} text-center font-semibold text-slate-700 align-middle`}
                          >
                            {sData.progressDisplay}
                          </td>
                          <td
                            className={`${cellPad} text-center font-bold text-slate-800 align-middle`}
                          >
                            {formatScoreValue(sData.midTermScore)}
                          </td>
                          <td
                            className={`${cellPad} text-center font-bold text-slate-800 align-middle`}
                          >
                            {formatScoreValue(sData.endTermScore)}
                          </td>
                          <td
                            className={`${cellPad} text-center font-bold text-[#00736E] bg-[#F0FDFA]/60 align-middle`}
                          >
                            {sData.gpaScore !== null ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-teal-200 text-[#00736E] font-bold">
                                {formatScoreValue(sData.gpaScore)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </>
                      )}
                    </>
                  )}

                  {level === "HIGH" && (
                    <>
                      <td
                        className={`${cellPad} text-slate-700 align-middle`}
                      >
                        {sData.assessmentContentDisplay || "—"}
                      </td>
                      <td
                        className={`${cellPad} text-center font-bold text-[#00736E] bg-[#F0FDFA]/60 align-middle`}
                      >
                        {row.isQualitative
                          ? "Định tính"
                          : row.isIelts
                          ? formatScoreValue(sData.ieltsScore)
                          : formatScoreValue(sData.midTermScore ?? sData.gpaScore)}
                      </td>
                    </>
                  )}

                  <td className={`${cellPad} align-middle max-w-xs`}>
                    {renderBilingualComments(sData.commentEn, sData.commentVi)}
                  </td>
                  <td className={`${cellPad} text-center align-middle`}>
                    {renderStatusBadge(sData.reviewStatus, sData.statusLabel)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAnnualSummaryTable = () => {
    const level = portfolio.level;

    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse tabular-nums">
          <thead className="bg-[#003B3A] border-b border-[#003B3A]">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              <th className="py-2.5 px-2.5 w-10 text-center text-teal-100 font-semibold">
                STT
              </th>
              <th className="py-2.5 px-3 text-white font-semibold">
                Môn học CTQT
              </th>
              {level !== "HIGH" && (
                <th className="py-2.5 px-2 text-center text-teal-100 font-semibold">
                  GK HK1
                </th>
              )}
              <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                {level === "MIDDLE"
                  ? "ĐTB HK1"
                  : level === "PRIMARY"
                  ? "CK HK1"
                  : "Điểm HK1"}
              </th>
              {level !== "HIGH" && (
                <th className="py-2.5 px-2 text-center text-teal-100 font-semibold">
                  GK HK2
                </th>
              )}
              <th className="py-2.5 px-2.5 text-center text-teal-100 font-semibold">
                {level === "MIDDLE"
                  ? "ĐTB HK2"
                  : level === "PRIMARY"
                  ? "CK HK2"
                  : "Điểm HK2"}
              </th>
              <th className="py-2.5 px-2.5 text-center text-[#5EEAD4] font-semibold">
                Cả năm (CN)
              </th>
              <th className="py-2.5 px-3 text-teal-100 font-semibold">
                Nhận xét chuyên môn (Report Card)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {portfolio.subjects.map((row, idx) => {
              const hk1Main =
                level === "MIDDLE"
                  ? row.sem1.gpaScore
                  : level === "PRIMARY"
                  ? row.sem1.endTermScore
                  : row.sem1.representativeScore;
              const hk2Main =
                level === "MIDDLE"
                  ? row.sem2.gpaScore
                  : level === "PRIMARY"
                  ? row.sem2.endTermScore
                  : row.sem2.representativeScore;

              return (
                <tr
                  key={row.code}
                  className="transition-colors align-middle hover:bg-[#F8FAFC]"
                >
                  <td
                    className={`${cellPad} text-center font-mono text-slate-400 align-middle`}
                  >
                    {idx + 1}
                  </td>
                  <td className={`${cellPad} align-middle`}>
                    {renderSubjectIdentity(row)}
                  </td>

                  {row.isQualitative ? (
                    <td
                      colSpan={level !== "HIGH" ? 5 : 3}
                      className={`${cellPad} text-center text-slate-500 italic bg-slate-50/50 align-middle`}
                    >
                      Đánh giá nhận xét định tính
                    </td>
                  ) : (
                    <>
                      {level !== "HIGH" && (
                        <td
                          className={`${cellPad} text-center text-slate-700 font-semibold align-middle`}
                        >
                          {formatScoreValue(row.sem1.midTermScore)}
                        </td>
                      )}
                      <td
                        className={`${cellPad} text-center font-bold text-slate-800 align-middle`}
                      >
                        {formatScoreValue(hk1Main)}
                      </td>
                      {level !== "HIGH" && (
                        <td
                          className={`${cellPad} text-center text-slate-700 font-semibold align-middle`}
                        >
                          {formatScoreValue(row.sem2.midTermScore)}
                        </td>
                      )}
                      <td
                        className={`${cellPad} text-center font-bold text-slate-800 align-middle`}
                      >
                        {formatScoreValue(hk2Main)}
                      </td>
                      <td
                        className={`${cellPad} text-center font-bold text-[#00736E] bg-[#F0FDFA]/60 align-middle`}
                      >
                        {row.annualScore !== null ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-teal-200 text-[#00736E] font-bold">
                            {formatScoreValue(row.annualScore)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </>
                  )}

                  <td className={`${cellPad} align-middle max-w-xs`}>
                    {renderBilingualComments(
                      row.latestCommentEn,
                      row.latestCommentVi
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#008B85]" />
          <Globe className="w-4 h-4 text-[#00736E]" />
          <h3 className="text-xs font-black text-[#003B3A] tracking-wide">
            {sectionTitle}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          {portfolio.isEligible && (
            <span className="text-[11px] font-semibold text-[#00736E] bg-[#F0FDFA] px-2.5 py-0.5 rounded-full border border-teal-200">
              {portfolio.levelNameVi} • CTQT &amp; Report Card
            </span>
          )}

          {portfolio.isEligible && isPrintMode && (
            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {effectiveMode === "ALL"
                ? "Tổng hợp cả năm"
                : effectiveMode === "HK2"
                ? "Học kỳ 2"
                : "Học kỳ 1"}
            </span>
          )}

          {portfolio.isEligible && !isPrintMode && (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-[#E2E8F0] no-print pdf-hide">
              <button
                type="button"
                onClick={() => setViewMode("HK1")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  effectiveMode === "HK1"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A]"
                }`}
              >
                Học kỳ 1
                {portfolio.sem1ScoredCount > 0
                  ? ` (${portfolio.sem1ScoredCount})`
                  : ""}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("HK2")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  effectiveMode === "HK2"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A]"
                }`}
              >
                Học kỳ 2
                {portfolio.sem2ScoredCount > 0
                  ? ` (${portfolio.sem2ScoredCount})`
                  : ""}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  effectiveMode === "ALL"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A]"
                }`}
              >
                Cả năm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!portfolio.isEligible ? (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-2xl text-center text-xs text-slate-500 italic">
          Học sinh thuộc lớp chương trình tiêu chuẩn / Chưa áp dụng sổ điểm Chương trình Quốc tế (CTQT &amp; Report Card).
        </div>
      ) : (
        <div className="space-y-3">
          {effectiveMode === "HK1" && renderSemesterTable("sem1")}
          {effectiveMode === "HK2" && renderSemesterTable("sem2")}
          {effectiveMode === "ALL" && renderAnnualSummaryTable()}

          {/* Core Competencies from Report Card when evaluated */}
          {activeCompetencies && activeCompetencies.length > 0 && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 space-y-2 tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#003B3A]">
                  <Award className="w-3.5 h-3.5 text-[#008B85]" />
                  <span>
                    Năng lực cốt lõi Report Card (Core competencies)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  E: Tốt • S: Đạt yêu cầu • N: Cần cải thiện • U: Chưa đạt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeCompetencies.map((cc) => (
                  <div
                    key={cc.key}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-[#E2E8F0]"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {cc.labelVi}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {cc.labelEn}
                      </div>
                    </div>
                    {renderCompetencyBadge(cc.code, cc.ratingLabelVi)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
