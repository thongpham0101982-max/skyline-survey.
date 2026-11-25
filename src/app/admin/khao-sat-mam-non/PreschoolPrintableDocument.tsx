"use client"

import { Printer, X } from "lucide-react"
import { PRESCHOOL_FORM_REGISTRY } from "@/lib/preschool-workflow"

interface Props {
  open: boolean
  onClose: () => void
  docType: "LETTER_17" | "LETTER_04" | "EVALUATION_FORM" | "PSYCHOLOGY_09"
  student: any
  round: any
  legacyDevSummary?: any
}

export function PreschoolPrintableDocument({ open, onClose, docType, student, round, legacyDevSummary }: Props) {
  if (!open || !student) return null

  const todayStr = new Date().toLocaleDateString("vi-VN")
  const dobStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—"
  const campus = student.registeredCampus || student.admissionCampus || round?.campusName || "Hệ thống Giáo dục Sky-Line"

  let formCode = "BM.KTĐBCL.17"
  let formVersion = "2026.1"
  let docTitle = "Thư chúc mừng kết quả khảo sát đầu vào Mầm non"

  if (docType === "LETTER_04") {
    formCode = "BM.KTĐBCL.04"
    formVersion = PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.04"].version
    docTitle = "Thư cảm ơn kết quả khảo sát đầu vào Mầm non"
  } else if (docType === "PSYCHOLOGY_09") {
    formCode = "BM.KTĐBCL.09"
    formVersion = round?.formVersion || PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].version
    docTitle = PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"].title
  } else if (docType === "EVALUATION_FORM") {
    formCode = round?.formCode || "BM.KTĐBCL.01"
    formVersion = round?.formVersion || PRESCHOOL_FORM_REGISTRY[formCode]?.version || "2026.1"
    docTitle = PRESCHOOL_FORM_REGISTRY[formCode]?.title || `Phiếu khảo sát Mầm non (${formCode})`
  }

  let parsedCriteria: Array<{ code: string; area: string; name: string; result: string; note?: string }> = []
  try {
    const raw = docType === "PSYCHOLOGY_09" ? round?.psychologyPayloadJson : round?.criteriaPayloadJson
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.criteria)) parsedCriteria = parsed.criteria
    }
  } catch {}

  // Fallback sang điểm thực tế từ PreschoolDevScore (legacyDevSummary) khi lần khảo sát chưa có criteriaPayloadJson riêng
  if (docType === "EVALUATION_FORM" && parsedCriteria.length === 0 && Array.isArray(legacyDevSummary?.scores) && legacyDevSummary.scores.length > 0) {
    parsedCriteria = legacyDevSummary.scores.map((sc: any) => ({
      code: sc.criteriaCode || "",
      area: sc.areaName || "Đánh giá phát triển",
      name: sc.criteriaName || "—",
      result: sc.result === "DAT" ? "Đạt" : sc.result === "KHONG_DAT" ? "Không đạt" : "Chưa thể hiện",
      note: sc.note ? String(sc.note).replace(/\|/g, " — ") : "",
    }))
  }

  const effTeacherName =
    round?.assignedTeacherName ||
    round?.teacherUserName ||
    (legacyDevSummary?.assignedTeachersFromBatch?.length ? legacyDevSummary.assignedTeachersFromBatch.join(", ") : "") ||
    "—"
  const effMedicalName =
    round?.assignedMedicalName ||
    round?.medicalUserName ||
    (legacyDevSummary?.assignedMedicalFromBatch?.length ? legacyDevSummary.assignedMedicalFromBatch.join(", ") : "") ||
    "—"
  const effHeight = round?.heightCm ?? legacyDevSummary?.heightCm ?? null
  const effWeight = round?.weightKg ?? legacyDevSummary?.weightKg ?? null
  const effBmi = effHeight && effWeight ? (Number(effWeight) / Math.pow(Number(effHeight) / 100, 2)).toFixed(1) : null
  const totalCrit = parsedCriteria.length
  const datCrit = parsedCriteria.filter((c) => c.result === "Đạt" || c.result === "DAT").length
  const khongDatCrit = parsedCriteria.filter((c) => c.result === "Không đạt" || c.result === "KHONG_DAT").length
  const cthCrit = totalCrit - datCrit - khongDatCrit
  const generalCommentText = round?.generalComment || student?.devProfessionalComment || ""

  const handlePrint = () => {
    const el = document.getElementById("preschool-print-a4-content")
    if (!el) return
    const win = window.open("", "_blank", "width=900,height=1000")
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${formCode} - ${student.fullName}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0F172A; line-height: 1.55; font-size: 13px; margin: 0; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #003B3A; padding-bottom: 12px; margin-bottom: 18px; }
        .brand { font-size: 15px; font-weight: 700; color: #003B3A; }
        .meta { text-align: right; font-size: 11px; color: #475569; }
        h1 { text-align: center; font-size: 17px; color: #003B3A; margin: 12px 0 18px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
        th, td { border: 1px solid #CBD5E1; padding: 7px 10px; text-align: left; }
        th { background: #003B3A; color: #FFFFFF; font-weight: 600; }
        .box { border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px 14px; margin: 12px 0; background: #F8FAFC; }
        .signs { display: flex; justify-content: space-between; margin-top: 32px; text-align: center; }
        .sign-col { width: 42%; }
      </style></head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-[#003B3A] text-white px-6 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5EEAD4] font-semibold">
              {formCode} · Phiên bản {formVersion}
            </span>
            <h3 className="text-sm font-bold">{docTitle}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In / Lưu PDF A4
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-teal-100 hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50">
          <div
            id="preschool-print-a4-content"
            className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-xs text-sm text-slate-800 space-y-4"
          >
            <div className="header flex justify-between items-start border-b-2 border-[#003B3A] pb-3">
              <div>
                <div className="brand font-bold text-[#003B3A] text-base">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
                <div className="text-xs text-slate-600">{campus}</div>
              </div>
              <div className="meta text-right text-xs text-slate-500 tabular-nums">
                <div className="font-semibold text-[#003B3A]">Mã biểu mẫu: {formCode}</div>
                <div>Phiên bản: {formVersion}</div>
                <div>Ngày xuất: {todayStr}</div>
              </div>
            </div>

            <h1 className="text-center text-lg font-bold text-[#003B3A]">{docTitle}</h1>

            <div className="box rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 grid grid-cols-2 gap-2 text-xs tabular-nums">
              <div><strong>Họ tên trẻ:</strong> {student.fullName}</div>
              <div><strong>Mã hồ sơ:</strong> {student.studentCode}</div>
              <div><strong>Ngày sinh:</strong> {dobStr}</div>
              <div><strong>Nhóm tuổi / Hệ:</strong> {student.grade || "Mầm non"} · {student.surveySystem || "Hệ S"}</div>
              <div><strong>Cơ sở:</strong> {campus}</div>
              <div><strong>Lần khảo sát:</strong> Lần {round?.roundNumber || 1}</div>
              <div><strong>GV đánh giá:</strong> {effTeacherName}</div>
              <div>
                <strong>Y tế (B4A):</strong> {effMedicalName}
                {effHeight && effWeight ? ` (${effHeight} cm · ${effWeight} kg${effBmi ? ` · BMI ${effBmi}` : ""})` : ""}
              </div>
            </div>

            {docType === "LETTER_17" && (
              <div className="space-y-3 text-sm leading-relaxed">
                <p>Kính gửi Quý Phụ huynh bé <strong>{student.fullName}</strong>,</p>
                <p>
                  Hệ thống Giáo dục Sky-Line trân trọng chúc mừng bé đã hoàn thành buổi khảo sát đầu vào Mầm non tại{" "}
                  <strong>{campus}</strong> và đạt yêu cầu nhập học theo phê duyệt của Giám đốc Điều hành Cơ sở.
                </p>
                <p>
                  Bộ phận Tư vấn Tuyển sinh sẽ đồng hành cùng Quý Phụ huynh hoàn tất thủ tục nhập học và chuẩn bị hành trang tốt nhất cho bé trong những ngày đầu đến trường.
                </p>
                {round?.gdcsComment && (
                  <div className="box rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
                    <strong>Ý kiến Giám đốc Điều hành Cơ sở:</strong> {round.gdcsComment}
                  </div>
                )}
              </div>
            )}

            {docType === "LETTER_04" && (
              <div className="space-y-3 text-sm leading-relaxed">
                <p>Kính gửi Quý Phụ huynh bé <strong>{student.fullName}</strong>,</p>
                <p>
                  Hệ thống Giáo dục Sky-Line chân thành cảm ơn Quý Phụ huynh đã tin tưởng và đưa bé đến tham gia buổi khảo sát đầu vào Mầm non tại{" "}
                  <strong>{campus}</strong>.
                </p>
                <p>
                  Qua quá trình quan sát và trao đổi trực tiếp với Quý Phụ huynh, nhà trường nhận thấy ở thời điểm hiện tại bé cần thêm thời gian chuẩn bị và hỗ trợ phù hợp trước khi nhập học chính thức. Nhà trường rất mong tiếp tục được đồng hành cùng gia đình trong các giai đoạn tiếp theo.
                </p>
                {student.parentConsultationNote && (
                  <div className="box rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs">
                    <strong>Tóm tắt nội dung đã trao đổi với Phụ huynh:</strong> {student.parentConsultationNote}
                  </div>
                )}
              </div>
            )}

            {(docType === "EVALUATION_FORM" || docType === "PSYCHOLOGY_09") && (
              <div className="space-y-3">
                {parsedCriteria.length > 0 ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-[#F0FDFA] px-3 py-2 text-xs tabular-nums">
                      <strong className="text-[#003B3A]">Tổng hợp kết quả ({totalCrit} tiêu chí):</strong>
                      <span className="font-semibold text-slate-700">
                        <span className="text-emerald-700">{datCrit} Đạt ({totalCrit > 0 ? Math.round((datCrit / totalCrit) * 100) : 0}%)</span>
                        {" · "}
                        <span className="text-amber-700">{cthCrit} Chưa thể hiện</span>
                        {khongDatCrit > 0 && (
                          <>
                            {" · "}
                            <span className="text-rose-700">{khongDatCrit} Không đạt</span>
                          </>
                        )}
                      </span>
                    </div>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#003B3A] text-white">
                          <th className="p-2 border border-[#003B3A] text-center w-8">#</th>
                          <th className="p-2 border border-[#003B3A] text-left">Lĩnh vực</th>
                          <th className="p-2 border border-[#003B3A] text-left">Tiêu chí</th>
                          <th className="p-2 border border-[#003B3A] text-center w-28">Kết quả</th>
                          <th className="p-2 border border-[#003B3A] text-left">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCriteria.map((c, idx) => (
                          <tr key={idx}>
                            <td className="p-2 border border-slate-200 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                            <td className="p-2 border border-slate-200 font-medium text-slate-700">{c.area}</td>
                            <td className="p-2 border border-slate-200 text-slate-800">{c.name}</td>
                            <td
                              className={`p-2 border border-slate-200 text-center font-semibold ${
                                c.result === "Đạt"
                                  ? "text-emerald-700"
                                  : c.result === "Không đạt"
                                    ? "text-rose-700"
                                    : "text-amber-700"
                              }`}
                            >
                              {c.result || "—"}
                            </td>
                            <td className="p-2 border border-slate-200 text-slate-600">{c.note || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic">Chưa có chi tiết tiêu chí được lưu trong lần khảo sát này.</p>
                )}
                {generalCommentText && (
                  <div className="box rounded-lg border border-slate-200 p-3 text-xs">
                    <strong>Nhận xét chuyên môn:</strong> {generalCommentText}
                  </div>
                )}
                {student?.devPsychologyComment && (
                  <div className="box rounded-lg border border-slate-200 p-3 text-xs">
                    <strong>Nhận xét tâm lý:</strong> {student.devPsychologyComment}
                  </div>
                )}
                {student?.devImportantNote && (
                  <div className="box rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs">
                    <strong>Lưu ý đặc biệt:</strong> {student.devImportantNote}
                  </div>
                )}
                {docType === "PSYCHOLOGY_09" && (
                  <div className="box rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-xs">
                    <strong>Báo cáo nhanh MS Teams:</strong>{" "}
                    {round?.msTeamsReported ? "Đã thực hiện báo cáo nhanh" : "Chưa ghi nhận"}
                    {round?.msTeamsReportNote ? ` — ${round.msTeamsReportNote}` : ""}
                  </div>
                )}
              </div>
            )}

            <div className="signs flex justify-between pt-8 text-center text-xs">
              <div className="sign-col w-2/5">
                <div className="font-semibold">Người thực hiện / Nhóm trưởng MN</div>
                <div className="text-slate-500 mt-1">(Ký và ghi rõ họ tên)</div>
                <div className="mt-12 font-semibold text-slate-800">{round?.reviewedByName || student.bghApprovalUser || (effTeacherName !== "—" ? effTeacherName : "")}</div>
              </div>
              <div className="sign-col w-2/5">
                <div className="font-semibold">Giám đốc Điều hành Cơ sở</div>
                <div className="text-slate-500 mt-1">(Ký phê duyệt)</div>
                <div className="mt-12 font-semibold text-slate-800">{round?.gdcsUserName || student.gdcsApprovalUser || ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
