"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Mail, Settings2, Check, Plus, RotateCcw, X, Building2, ShieldCheck, Users, Loader2 } from "lucide-react";

export type CampusCodeKey = "CS1" | "CS2" | "CS3" | "CS4" | "CS5";

export interface CampusRoleEmails {
  gdcs: string;
  tuvan: string;
  giaovu: string;
}

export interface EmailRoutingConfigData {
  autoSendOnApprove: boolean;
  autoMergeDbStaff: boolean;
  groups: {
    gdcs: { enabled: boolean; target: "to" | "cc" };
    tuvan: { enabled: boolean; target: "to" | "cc" };
    giaovu: { enabled: boolean; target: "to" | "cc" };
    ktdbcl: { enabled: boolean; target: "to" | "cc" };
  };
  campuses: Record<CampusCodeKey, CampusRoleEmails>;
  ktdbclEmails: string;
}

export const DEFAULT_EMAIL_ROUTING_CONFIG: EmailRoutingConfigData = {
  autoSendOnApprove: true,
  autoMergeDbStaff: true,
  groups: {
    gdcs: { enabled: true, target: "to" },
    tuvan: { enabled: true, target: "to" },
    giaovu: { enabled: true, target: "to" },
    ktdbcl: { enabled: true, target: "cc" },
  },
  campuses: {
    CS1: {
      gdcs: "longtt@skylineschool.edu.vn, gdcs.cs1@skylineschool.edu.vn",
      tuvan: "thuongttn@skylineschool.edu.vn, tuyensinh.cs1@skylineschool.edu.vn",
      giaovu: "phuongvt@skylineschool.edu.vn, thuda@skylineschool.edu.vn, giaovu.cs1@skylineschool.edu.vn",
    },
    CS2: {
      gdcs: "khanhpt@skylineschool.edu.vn, gdcs.cs2@skylineschool.edu.vn",
      tuvan: "hoaipt@skylineschool.edu.vn, dinhnth@skylineschool.edu.vn, doanhtt@skylineschool.edu.vn, huyennt@skylineschool.edu.vn, tuyensinh.cs2@skylineschool.edu.vn",
      giaovu: "thuda@skylineschool.edu.vn, dunglp@skylineschool.edu.vn, giaovu.cs2@skylineschool.edu.vn",
    },
    CS3: {
      gdcs: "thanhtt@skylineschool.edu.vn, gdcs.cs3@skylineschool.edu.vn",
      tuvan: "thungatt@skylineschool.edu.vn, hapvy@skylineschool.edu.vn, tuyensinh.cs3@skylineschool.edu.vn",
      giaovu: "thuda@skylineschool.edu.vn, giaovu.cs3@skylineschool.edu.vn",
    },
    CS4: {
      gdcs: "trungct@skylineschool.edu.vn, gdcs.cs4@skylineschool.edu.vn",
      tuvan: "senttt@skylineschool.edu.vn, anhntm@skylineschool.edu.vn, tuyensinh.cs4@skylineschool.edu.vn",
      giaovu: "bichtramtt@skylineschool.edu.vn, giaovu.cs4@skylineschool.edu.vn",
    },
    CS5: {
      gdcs: "trungdq1@skylineschool.edu.vn, gdcs.cs5@skylineschool.edu.vn",
      tuvan: "linhnmh@skylineschool.edu.vn, quyenttx@skylineschool.edu.vn, tuyensinh.cs5@skylineschool.edu.vn",
      giaovu: "dunglp@skylineschool.edu.vn, giaovu.cs5@skylineschool.edu.vn",
    },
  },
  ktdbclEmails: "ktdbcl@skylineschool.edu.vn, bankhaothi@skylineschool.edu.vn, thangdx@skylineschool.edu.vn",
};

export function parseSavedEmailRoutingConfig(configs?: any[]): EmailRoutingConfigData {
  const base: EmailRoutingConfigData = JSON.parse(JSON.stringify(DEFAULT_EMAIL_ROUTING_CONFIG));
  if (!Array.isArray(configs)) return base;
  const found = configs.find(
    (c: any) => c.categoryType === "APPROVAL_EMAIL_CONFIG" && c.code === "EMAIL_ROUTING_V1"
  );
  if (!found?.name) return base;
  try {
    const parsed = JSON.parse(found.name);
    if (typeof parsed.autoSendOnApprove === "boolean") base.autoSendOnApprove = parsed.autoSendOnApprove;
    if (typeof parsed.autoMergeDbStaff === "boolean") base.autoMergeDbStaff = parsed.autoMergeDbStaff;
    if (parsed.groups) {
      for (const k of ["gdcs", "tuvan", "giaovu", "ktdbcl"] as const) {
        if (parsed.groups[k]) {
          base.groups[k] = {
            enabled: typeof parsed.groups[k].enabled === "boolean" ? parsed.groups[k].enabled : base.groups[k].enabled,
            target: parsed.groups[k].target === "cc" ? "cc" : "to",
          };
        }
      }
    }
    if (parsed.campuses) {
      for (const cs of ["CS1", "CS2", "CS3", "CS4", "CS5"] as const) {
        if (parsed.campuses[cs]) {
          base.campuses[cs] = {
            gdcs: typeof parsed.campuses[cs].gdcs === "string" ? parsed.campuses[cs].gdcs : base.campuses[cs].gdcs,
            tuvan: typeof parsed.campuses[cs].tuvan === "string" ? parsed.campuses[cs].tuvan : base.campuses[cs].tuvan,
            giaovu: typeof parsed.campuses[cs].giaovu === "string" ? parsed.campuses[cs].giaovu : base.campuses[cs].giaovu,
          };
        }
      }
    }
    if (typeof parsed.ktdbclEmails === "string") {
      base.ktdbclEmails = parsed.ktdbclEmails;
    }
  } catch {}
  return base;
}

function splitEmailList(str: string): string[] {
  return String(str || "")
    .split(/[,;]/)
    .map(s => s.trim().replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn"))
    .filter(s => s && s.includes("@"));
}

function toggleEmailInString(currentStr: string, emailToToggle: string): string {
  const normTarget = emailToToggle.trim().toLowerCase().replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn");
  const list = splitEmailList(currentStr);
  const exists = list.some(e => e.toLowerCase() === normTarget);
  if (exists) {
    return list.filter(e => e.toLowerCase() !== normTarget).join(", ");
  } else {
    return [...list, normTarget].join(", ");
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: EmailRoutingConfigData;
  onSaved: (newConfig: EmailRoutingConfigData) => void;
  campuses?: any[];
  teachers?: any[];
}

export function EmailRoutingConfigModal({
  isOpen,
  onClose,
  config,
  onSaved,
  campuses = [],
  teachers = [],
}: Props) {
  const [draft, setDraft] = useState<EmailRoutingConfigData>(() => JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<CampusCodeKey | "KTDBCL">("CS1");
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(config)));
      setToastMsg(null);
    }
  }, [isOpen, config]);

  // Gợi ý nhân sự theo từng cơ sở & phòng ban từ CSDL kết hợp danh bạ chuẩn
  const staffSuggestions = useMemo(() => {
    const result: Record<
      CampusCodeKey,
      {
        gdcs: { label: string; email: string }[];
        tuvan: { label: string; email: string }[];
        giaovu: { label: string; email: string }[];
      }
    > = {
      CS1: {
        gdcs: [
          { label: "Tống Thiên Long (GĐCS CS1)", email: "longtt@skylineschool.edu.vn" },
          { label: "Hòm thư GĐCS CS1", email: "gdcs.cs1@skylineschool.edu.vn" },
        ],
        tuvan: [
          { label: "Trương Thị Ngọc Thương (Tư vấn CS1)", email: "thuongttn@skylineschool.edu.vn" },
          { label: "Hòm thư Tuyển sinh CS1", email: "tuyensinh.cs1@skylineschool.edu.vn" },
        ],
        giaovu: [
          { label: "Huỳnh Thị Phượng (Giáo vụ CS1)", email: "phuongvt@skylineschool.edu.vn" },
          { label: "Đỗ Anh Thư (Giáo vụ CS1-CS2-CS3)", email: "thuda@skylineschool.edu.vn" },
          { label: "Hòm thư Giáo vụ CS1", email: "giaovu.cs1@skylineschool.edu.vn" },
        ],
      },
      CS2: {
        gdcs: [
          { label: "Phạm Thị Khánh (GĐCS CS2)", email: "khanhpt@skylineschool.edu.vn" },
          { label: "Hòm thư GĐCS CS2", email: "gdcs.cs2@skylineschool.edu.vn" },
        ],
        tuvan: [
          { label: "Phạm Thương Hoài (Tư vấn CS2)", email: "hoaipt@skylineschool.edu.vn" },
          { label: "Nguyễn Thị Hồng Dinh (Tư vấn CS2)", email: "dinhnth@skylineschool.edu.vn" },
          { label: "Hà Thị Thi Đoan (Tư vấn CS2)", email: "doanhtt@skylineschool.edu.vn" },
          { label: "Nguyễn Thanh Huyền (Tư vấn CS2)", email: "huyennt@skylineschool.edu.vn" },
          { label: "Hòm thư Tuyển sinh CS2", email: "tuyensinh.cs2@skylineschool.edu.vn" },
        ],
        giaovu: [
          { label: "Đỗ Anh Thư (Giáo vụ CS1-CS2-CS3)", email: "thuda@skylineschool.edu.vn" },
          { label: "Lê Phương Dung (Giáo vụ CS2-CS5)", email: "dunglp@skylineschool.edu.vn" },
          { label: "Hòm thư Giáo vụ CS2", email: "giaovu.cs2@skylineschool.edu.vn" },
        ],
      },
      CS3: {
        gdcs: [
          { label: "Trần Thị Thanh (GĐCS CS3)", email: "thanhtt@skylineschool.edu.vn" },
          { label: "Hòm thư GĐCS CS3", email: "gdcs.cs3@skylineschool.edu.vn" },
        ],
        tuvan: [
          { label: "Trương Thị Thu Nga (Tư vấn CS3)", email: "thungatt@skylineschool.edu.vn" },
          { label: "Phan Vũ Yên Hà (Tư vấn CS3)", email: "hapvy@skylineschool.edu.vn" },
          { label: "Hòm thư Tuyển sinh CS3", email: "tuyensinh.cs3@skylineschool.edu.vn" },
        ],
        giaovu: [
          { label: "Đỗ Anh Thư (Giáo vụ CS3)", email: "thuda@skylineschool.edu.vn" },
          { label: "Hòm thư Giáo vụ CS3", email: "giaovu.cs3@skylineschool.edu.vn" },
        ],
      },
      CS4: {
        gdcs: [
          { label: "Cao Thanh Trung (GĐCS CS4)", email: "trungct@skylineschool.edu.vn" },
          { label: "Hòm thư GĐCS CS4", email: "gdcs.cs4@skylineschool.edu.vn" },
        ],
        tuvan: [
          { label: "Trần Thị Thu Sen (Tư vấn CS4)", email: "senttt@skylineschool.edu.vn" },
          { label: "Nguyễn Thị Minh Ánh (Tư vấn CS4)", email: "anhntm@skylineschool.edu.vn" },
          { label: "Hòm thư Tuyển sinh CS4", email: "tuyensinh.cs4@skylineschool.edu.vn" },
        ],
        giaovu: [
          { label: "Tống Thị Bích Trâm (Giáo vụ CS4)", email: "bichtramtt@skylineschool.edu.vn" },
          { label: "Hòm thư Giáo vụ CS4", email: "giaovu.cs4@skylineschool.edu.vn" },
        ],
      },
      CS5: {
        gdcs: [
          { label: "Đỗ Quang Trung (GĐCS CS5)", email: "trungdq1@skylineschool.edu.vn" },
          { label: "Hòm thư GĐCS CS5", email: "gdcs.cs5@skylineschool.edu.vn" },
        ],
        tuvan: [
          { label: "Nguyễn Mai Huyền Linh (Tư vấn CS5)", email: "linhnmh@skylineschool.edu.vn" },
          { label: "Trần Thị Xuân Quyên (Tư vấn CS5)", email: "quyenttx@skylineschool.edu.vn" },
          { label: "Hòm thư Tuyển sinh CS5", email: "tuyensinh.cs5@skylineschool.edu.vn" },
        ],
        giaovu: [
          { label: "Lê Phương Dung (Giáo vụ CS5)", email: "dunglp@skylineschool.edu.vn" },
          { label: "Hòm thư Giáo vụ CS5", email: "giaovu.cs5@skylineschool.edu.vn" },
        ],
      },
    };

    // Bổ sung động nhân sự từ bảng teachers nếu chưa có trong danh sách gợi ý
    (teachers || []).forEach((t: any) => {
      const csCode = String(t.campus?.campusCode || "").toUpperCase() as CampusCodeKey;
      if (!result[csCode]) return;
      const cleanEmail = String(t.email || "")
        .trim()
        .toLowerCase()
        .replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn");
      if (!cleanEmail || !cleanEmail.includes("@")) return;

      const deptName = String(t.departmentRel?.name || "").toLowerCase();
      const deptCode = String(t.departmentRel?.code || "").toLowerCase();
      const uRole = String(t.user?.role || "").toUpperCase();

      const addIfMissing = (arr: { label: string; email: string }[], labelSuffix: string) => {
        if (!arr.some(item => item.email.toLowerCase() === cleanEmail)) {
          arr.push({ label: `${t.teacherName} (${labelSuffix})`, email: cleanEmail });
        }
      };

      if (deptCode.includes("gđ_cs") || deptName.includes("gđcs") || ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(uRole)) {
        addIfMissing(result[csCode].gdcs, `GĐCS ${csCode}`);
      } else if (deptName.includes("giáo vụ") || deptCode.includes("gvu") || ["GIAO_VU", "GIAO_VU_CS"].includes(uRole)) {
        addIfMissing(result[csCode].giaovu, `Giáo vụ ${csCode}`);
      } else if (deptName.includes("tư vấn") || deptName.includes("tuyển sinh") || deptCode.includes("tvan") || uRole === "TVAN") {
        addIfMissing(result[csCode].tuvan, `Tư vấn ${csCode}`);
      }
    });

    return result;
  }, [teachers]);

  const ktdbclSuggestions = [
    { label: "Hòm thư Ban KT&ĐBCL", email: "ktdbcl@skylineschool.edu.vn" },
    { label: "Hòm thư Ban Khảo thí", email: "bankhaothi@skylineschool.edu.vn" },
    { label: "Thầy Dương Xuân Thắng (Trưởng ban)", email: "thangdx@skylineschool.edu.vn" },
    { label: "Cô Dương Thị Hoàng Yến (KT&ĐBCL)", email: "hoangyendt@skylineschool.edu.vn" },
    { label: "Thầy Phạm Nguyên Thông (KT&ĐBCL)", email: "thongpn@skylineschool.edu.vn" },
    { label: "Cô Mai Thị Hoài Thương (ĐBCL)", email: "thuongmth@skylineschool.edu.vn" },
    { label: "Cô Phạm Nguyễn Khánh Vy (Khảo thí)", email: "vypnk@skylineschool.edu.vn" },
    { label: "Cô Từ Thảo Nguyên (Khảo thí)", email: "nguyentt@skyline.edu.vn" },
  ];

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setToastMsg(null);
    try {
      const res = await fetch("/api/assessment-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryType: "APPROVAL_EMAIL_CONFIG",
          code: "EMAIL_ROUTING_V1",
          name: JSON.stringify(draft),
          upsert: true,
        }),
      });
      if (res.ok) {
        onSaved(draft);
        setToastMsg({ text: "Đã lưu cấu hình gửi email xét duyệt thành công!", type: "ok" });
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        const err = await res.json().catch(() => ({}));
        setToastMsg({ text: err.error || "Không thể lưu cấu hình", type: "err" });
      }
    } catch (e: any) {
      setToastMsg({ text: "Lỗi kết nối: " + (e?.message || e), type: "err" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setDraft(JSON.parse(JSON.stringify(DEFAULT_EMAIL_ROUTING_CONFIG)));
    setToastMsg({ text: "Đã khôi phục danh bạ mặc định chuẩn Sky-Line (Nhấn Lưu để áp dụng)", type: "ok" });
  };

  const groupMeta = [
    {
      key: "gdcs" as const,
      title: "Giám đốc Cơ sở (GĐCS)",
      desc: "Nhận thông báo xác nhận quyết định phê duyệt tại cơ sở phụ trách",
    },
    {
      key: "tuvan" as const,
      title: "Tư vấn Cơ sở (Tuyển sinh)",
      desc: "Nhận kết quả để liên hệ Phụ huynh và hướng dẫn thủ tục nhập học",
    },
    {
      key: "giaovu" as const,
      title: "Giáo vụ Cơ sở",
      desc: "Nhận kết quả để xếp lớp, theo dõi diện cam kết học tập hoặc kiểm tra lại",
    },
    {
      key: "ktdbcl" as const,
      title: "Ban KT&ĐBCL",
      desc: "Tiếp nhận dữ liệu tổng hợp, giám sát quy trình và lưu trữ chất lượng",
    },
  ];

  const renderRoleEmailEditor = (
    csCode: CampusCodeKey,
    roleKey: keyof CampusRoleEmails,
    roleTitle: string,
    roleSubtitle: string,
    suggestions: { label: string; email: string }[]
  ) => {
    const currentVal = draft.campuses[csCode]?.[roleKey] || "";
    const activeEmails = splitEmailList(currentVal).map(e => e.toLowerCase());
    const count = activeEmails.length;

    return (
      <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
              <span>{roleTitle}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums border ${
                  draft.groups[roleKey].enabled
                    ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {draft.groups[roleKey].enabled
                  ? `${draft.groups[roleKey].target.toUpperCase()} • ${count} email`
                  : "Đang tắt"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{roleSubtitle}</p>
          </div>
        </div>

        <input
          type="text"
          value={currentVal}
          onChange={e =>
            setDraft(prev => ({
              ...prev,
              campuses: {
                ...prev.campuses,
                [csCode]: {
                  ...prev.campuses[csCode],
                  [roleKey]: e.target.value,
                },
              },
            }))
          }
          placeholder="Nhập một hoặc nhiều địa chỉ email, phân cách bằng dấu phẩy (,)"
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#008B85] focus:ring-2 focus:ring-[#00A19A]/15 transition-all font-mono"
        />

        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Chọn nhanh:</span>
            {suggestions.map(sug => {
              const isSelected = activeEmails.includes(sug.email.toLowerCase());
              return (
                <button
                  key={sug.email}
                  type="button"
                  onClick={() =>
                    setDraft(prev => ({
                      ...prev,
                      campuses: {
                        ...prev.campuses,
                        [csCode]: {
                          ...prev.campuses[csCode],
                          [roleKey]: toggleEmailInString(prev.campuses[csCode][roleKey], sug.email),
                        },
                      },
                    }))
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#F0FDFA] text-[#003B3A] border-[#008B85] font-semibold"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isSelected ? <Check className="w-3 h-3 text-[#008B85]" /> : <Plus className="w-3 h-3 text-slate-400" />}
                  <span>{sug.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({sug.email.split("@")[0]})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[240] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="bg-[#003B3A] text-white px-5 py-4 border-b-2 border-[#00A19A] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#5EEAD4]">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                Thiết lập cấu hình gửi email xét duyệt
              </h3>
              <p className="text-[11px] text-[#CCFBF1]/85 font-medium mt-0.5">
                Quản lý bộ phận nhận thông báo và danh bạ email định tuyến theo từng cơ sở (GĐCS, Tư vấn, Giáo vụ &amp; Ban KT&amp;ĐBCL)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 bg-[#F8FAFC]">
          {toastMsg && (
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                toastMsg.type === "ok"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{toastMsg.text}</span>
            </div>
          )}

          {/* SECTION 1: QUY TẮC CHUNG & BỘ PHẬN NHẬN EMAIL */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#008B85]" />
                <h4 className="text-xs font-bold text-[#0F172A]">
                  1. Tuỳ chọn tự động gửi &amp; Nhóm bộ phận nhận thông báo
                </h4>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draft.autoSendOnApprove}
                    onChange={e => setDraft(prev => ({ ...prev, autoSendOnApprove: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#008B85] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                  />
                  <span>Mặc định bật tự động gửi sau khi lưu duyệt</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draft.autoMergeDbStaff}
                    onChange={e => setDraft(prev => ({ ...prev, autoMergeDbStaff: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#008B85] border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                  />
                  <span>Tự động gộp nhân sự phân công trên hệ thống</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {groupMeta.map(g => {
                const state = draft.groups[g.key];
                return (
                  <div
                    key={g.key}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      state.enabled
                        ? "bg-[#F0FDFA]/60 border-[#99F6E4]"
                        : "bg-slate-50/70 border-slate-200 opacity-75"
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={state.enabled}
                        onChange={e =>
                          setDraft(prev => ({
                            ...prev,
                            groups: {
                              ...prev.groups,
                              [g.key]: { ...prev.groups[g.key], enabled: e.target.checked },
                            },
                          }))
                        }
                        className="mt-0.5 w-4 h-4 rounded text-[#008B85] border-slate-300 focus:ring-[#00A19A] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#003B3A]">{g.title}</div>
                        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{g.desc}</div>
                      </div>
                    </label>

                    <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shrink-0">
                      {(["to", "cc"] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          disabled={!state.enabled}
                          onClick={() =>
                            setDraft(prev => ({
                              ...prev,
                              groups: {
                                ...prev.groups,
                                [g.key]: { ...prev.groups[g.key], target: mode },
                              },
                            }))
                          }
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                            state.target === mode
                              ? "bg-[#003B3A] text-white"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {mode === "to" ? "To (Chính)" : "CC"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: DANH BẠ EMAIL THEO CƠ SỞ & BAN KT&ĐBCL */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#008B85]" />
                <h4 className="text-xs font-bold text-[#0F172A]">
                  2. Danh bạ địa chỉ email nhận thông báo theo từng Cơ sở &amp; Ban KT&amp;ĐBCL
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Chọn cơ sở bên dưới để kiểm tra hoặc điều chỉnh địa chỉ email nhận
              </span>
            </div>

            {/* Segmented Tab Bar */}
            <div className="flex items-center gap-1.5 flex-wrap bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              {(["CS1", "CS2", "CS3", "CS4", "CS5"] as const).map(cs => {
                const cObj = campuses.find((c: any) => String(c.campusCode || "").toUpperCase() === cs);
                const totalEmails =
                  splitEmailList(draft.campuses[cs]?.gdcs).length +
                  splitEmailList(draft.campuses[cs]?.tuvan).length +
                  splitEmailList(draft.campuses[cs]?.giaovu).length;
                const isActive = activeTab === cs;
                return (
                  <button
                    key={cs}
                    type="button"
                    onClick={() => setActiveTab(cs)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tabular-nums ${
                      isActive
                        ? "bg-[#003B3A] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    <span>Cơ sở {cObj?.campusName || cs}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        isActive ? "bg-white/20 text-[#5EEAD4]" : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      {totalEmails}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveTab("KTDBCL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer tabular-nums ${
                  activeTab === "KTDBCL"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ban KT&amp;ĐBCL</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] ${
                    activeTab === "KTDBCL" ? "bg-white/20 text-[#5EEAD4]" : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {splitEmailList(draft.ktdbclEmails).length}
                </span>
              </button>
            </div>

            {/* Active Tab Content */}
            {activeTab !== "KTDBCL" ? (
              <div className="space-y-3">
                {renderRoleEmailEditor(
                  activeTab,
                  "gdcs",
                  `Giám đốc Cơ sở ${activeTab} (GĐCS)`,
                  "Nhận thông báo kết quả xét duyệt của học sinh thuộc cơ sở " + activeTab,
                  staffSuggestions[activeTab]?.gdcs || []
                )}
                {renderRoleEmailEditor(
                  activeTab,
                  "tuvan",
                  `Bộ phận Tư vấn Cơ sở ${activeTab} (Tuyển sinh)`,
                  "Nhận kết quả phê duyệt để liên hệ Phụ huynh học sinh cơ sở " + activeTab,
                  staffSuggestions[activeTab]?.tuvan || []
                )}
                {renderRoleEmailEditor(
                  activeTab,
                  "giaovu",
                  `Bộ phận Giáo vụ Cơ sở ${activeTab}`,
                  "Nhận kết quả phê duyệt để xếp lớp, theo dõi môn cam kết / kiểm tra lại tại cơ sở " + activeTab,
                  staffSuggestions[activeTab]?.giaovu || []
                )}
              </div>
            ) : (
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
                      <span>Ban Kiểm tra &amp; Đảm bảo Chất lượng (Toàn hệ thống)</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4]">
                        {draft.groups.ktdbcl.enabled
                          ? `${draft.groups.ktdbcl.target.toUpperCase()} • ${splitEmailList(draft.ktdbclEmails).length} email`
                          : "Đang tắt"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Nhận bản sao tất cả thông báo kết quả xét duyệt của các cơ sở để giám sát và lưu trữ chất lượng
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={draft.ktdbclEmails}
                  onChange={e => setDraft(prev => ({ ...prev, ktdbclEmails: e.target.value }))}
                  placeholder="Nhập danh sách email Ban KT&ĐBCL, phân cách bằng dấu phẩy (,)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#008B85] focus:ring-2 focus:ring-[#00A19A]/15 transition-all font-mono"
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-medium text-slate-500 mr-1">Chọn nhanh:</span>
                  {ktdbclSuggestions.map(sug => {
                    const activeList = splitEmailList(draft.ktdbclEmails).map(e => e.toLowerCase());
                    const isSelected = activeList.includes(sug.email.toLowerCase());
                    return (
                      <button
                        key={sug.email}
                        type="button"
                        onClick={() =>
                          setDraft(prev => ({
                            ...prev,
                            ktdbclEmails: toggleEmailInString(prev.ktdbclEmails, sug.email),
                          }))
                        }
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#F0FDFA] text-[#003B3A] border-[#008B85] font-semibold"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3 text-[#008B85]" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        <span>{sug.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({sug.email.split("@")[0]})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục danh bạ mặc định</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#00524E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />}
              <span>Lưu cấu hình gửi email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
