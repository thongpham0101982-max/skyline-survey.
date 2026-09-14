"use client"
import { useState } from "react"
import {
  Edit2, Check, X, Trash2, Star, Calendar, Users, GraduationCap,
  BookOpen, Plus, Layers, Sparkles, ShieldCheck, Brain, Activity,
  Heart, Compass, Globe, RotateCcw, Sliders, Tag, AlertCircle
} from "lucide-react"

const EDU_SYSTEMS = [
  { code: "HNG", name: "Hội nhập Quốc tế" },
  { code: "SB", name: "Song bằng" },
  { code: "HNS", name: "Hội nhập S" },
  { code: "MNS", name: "Mầm non S" },
  { code: "MNG", name: "Mầm non Global" }
];

export const DEFAULT_SKYLINE_PILLARS = [
  {
    id: "TRI_TUE",
    name: "Trí tuệ",
    icon: "Brain",
    color: "blue",
    focus: "Phát triển tư duy độc lập, phản biện, sáng tạo khoa học và học tập xuất sắc"
  },
  {
    id: "THE_CHAT",
    name: "Thể chất",
    icon: "Activity",
    color: "emerald",
    focus: "Rèn luyện thể lực bền bỉ, phát triển chiều cao và lối sống năng động lành mạnh"
  },
  {
    id: "TAM_HON",
    name: "Tâm hồn",
    icon: "Heart",
    color: "rose",
    focus: "Nuôi dưỡng lòng nhân ái, sự trung thực, bản sắc văn hóa Việt và lòng biết ơn"
  },
  {
    id: "KY_NANG",
    name: "Kỹ năng",
    icon: "Compass",
    color: "amber",
    focus: "Thành thạo kỹ năng tự lập, sinh tồn, giao tiếp, hợp tác và giải quyết vấn đề"
  },
  {
    id: "HOI_NHAP",
    name: "Hội nhập",
    icon: "Globe",
    color: "purple",
    focus: "Năng lực song ngữ quốc tế, tư duy công dân toàn cầu và làm chủ công nghệ số"
  }
];

export interface YearThemeItem {
  id: string;
  type: string;
  typeName: string;
  title: string;
  isPrimary?: boolean;
}

function parsePillars(pillarsRaw: any) {
  if (!pillarsRaw) return DEFAULT_SKYLINE_PILLARS;
  if (Array.isArray(pillarsRaw)) return pillarsRaw;
  try {
    const parsed = JSON.parse(pillarsRaw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {}
  return DEFAULT_SKYLINE_PILLARS;
}

function parseThemes(y: any): YearThemeItem[] {
  if (y.yearThemes) {
    try {
      const parsed = typeof y.yearThemes === "string" ? JSON.parse(y.yearThemes) : y.yearThemes;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  if (y.theme && typeof y.theme === "string" && y.theme.trim()) {
    return [
      {
        id: "thm_primary_" + y.id,
        type: "CA_NAM",
        typeName: "Cả năm (Chính)",
        title: y.theme.trim(),
        isPrimary: true
      }
    ];
  }
  return [];
}

function getTypeName(type: string) {
  switch (type) {
    case "CA_NAM": return "Cả năm (Chính)";
    case "HK1": return "Học kỳ 1";
    case "HK2": return "Học kỳ 2";
    case "TRAI_NGHIEM": return "Trải nghiệm / Sự kiện";
    case "KHAC": return "Chủ đề khác";
    default: return "Chủ đề";
  }
}

function getThemeBadgeStyle(type: string) {
  switch (type) {
    case "CA_NAM":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "HK1":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "HK2":
      return "bg-purple-100 text-purple-900 border-purple-300";
    case "TRAI_NGHIEM":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
}

function PillarIcon({ iconName, className }: { iconName: string; className?: string }) {
  switch (iconName) {
    case "Brain": return <Brain className={className} />;
    case "Activity": return <Activity className={className} />;
    case "Heart": return <Heart className={className} />;
    case "Compass": return <Compass className={className} />;
    case "Globe": return <Globe className={className} />;
    default: return <ShieldCheck className={className} />;
  }
}

export function AcademicYearsClient({ initialYears, updateAction, deleteAction, setActiveAction, toggleOffAction }: any) {
  const [years, setYears] = useState(initialYears)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Pillar Configuration Modal State
  const [pillarModalYear, setPillarModalYear] = useState<any | null>(null)
  const [modalTheme, setModalTheme] = useState("")
  const [modalPillars, setModalPillars] = useState<any[]>(DEFAULT_SKYLINE_PILLARS)
  const [modalSaving, setModalSaving] = useState(false)

  // Single Theme Edit Modal State
  const [editingThemeModal, setEditingThemeModal] = useState<{
    yearId: string;
    themeId: string;
    title: string;
    type: string;
    isPrimary: boolean;
  } | null>(null)
  const [themeSaving, setThemeSaving] = useState(false)

  const handleToggleOff = async (id: string, isOff: boolean) => {
    setTogglingId(id);
    try {
      await toggleOffAction(id, isOff);
      setYears(years.map((y: any) => y.id === id ? { ...y, isOff } : y));
    } finally {
      setTogglingId(null);
    }
  }

  const handleEdit = (y: any) => {
    setEditingId(y.id)
    setEditForm({
      name: y.name,
      theme: y.theme || "",
      startDate: new Date(y.startDate).toISOString().split("T")[0],
      endDate: new Date(y.endDate).toISOString().split("T")[0]
    })
  }

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      await updateAction({
        id,
        name: editForm.name,
        theme: editForm.theme || null,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate)
      })
      setYears(years.map((y: any) => y.id === id ? {
        ...y,
        name: editForm.name,
        theme: editForm.theme || null,
        startDate: new Date(editForm.startDate),
        endDate: new Date(editForm.endDate)
      } : y))
      setEditingId(null)
    } catch(e) {}
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm("Xóa năm học \"" + name + "\"? Tài khoản GV/Học sinh sẽ bị mất liên kết.")) return
    try {
      await deleteAction(id);
      setYears(years.filter((y: any) => y.id !== id))
    } catch(e) {}
  }

  const handleSetActive = async (id: string) => {
    setSaving(true)
    try {
      await setActiveAction(id);
      setYears(years.map((y: any) => ({ ...y, status: y.id === id ? "ACTIVE" : "INACTIVE" })))
    } catch(e) {}
    setSaving(false)
  }

  const addEduSystem = async (yearId: string, code: string, name: string) => {
    try {
      const res = await fetch("/api/education-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, academicYearId: yearId })
      });
      if (res.ok) {
        const newItem = await res.json();
        setYears(years.map((y: any) => y.id === yearId ? { ...y, educationSystems: [...(y.educationSystems || []), newItem] } : y));
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch(e: any) {
      alert("Lỗi: " + e.message);
    }
  }

  const removeEduSystem = async (yearId: string, esId: string) => {
    if (!confirm("Xóa Hệ học này?")) return;
    try {
      await fetch("/api/education-systems?id=" + esId, { method: "DELETE" });
      setYears(years.map((y: any) => y.id === yearId ? { ...y, educationSystems: (y.educationSystems || []).filter((e: any) => e.id !== esId) } : y));
    } catch(e) {}
  }

  // ==========================================
  // THEME MANAGEMENT (THÊM, SỬA, XÓA CHỦ ĐỀ)
  // ==========================================

  // THÊM CHỦ ĐỀ MỚI
  const handleAddTheme = async (yearId: string) => {
    const titleInput = document.getElementById(`theme-title-${yearId}`) as HTMLInputElement;
    const typeSelect = document.getElementById(`theme-type-${yearId}`) as HTMLSelectElement;
    const title = titleInput?.value?.trim() || "";
    const type = typeSelect?.value || "CA_NAM";

    if (!title) {
      alert("Vui lòng nhập nội dung chủ đề năm học!");
      return;
    }

    const currentYear = years.find((y: any) => y.id === yearId);
    if (!currentYear) return;

    const currentThemes = parseThemes(currentYear);
    const isFirst = currentThemes.length === 0;
    const isPrimary = type === "CA_NAM" || isFirst;

    const newThemeItem: YearThemeItem = {
      id: "thm_" + Date.now(),
      type,
      typeName: getTypeName(type),
      title,
      isPrimary
    };

    let updatedThemes: YearThemeItem[];
    if (isPrimary) {
      // Unset other primaries
      updatedThemes = [...currentThemes.map(t => ({ ...t, isPrimary: false })), newThemeItem];
    } else {
      updatedThemes = [...currentThemes, newThemeItem];
    }

    const primaryTitle = updatedThemes.find(t => t.isPrimary)?.title || updatedThemes[0]?.title || title;

    try {
      await updateAction({
        id: yearId,
        yearThemes: JSON.stringify(updatedThemes),
        theme: primaryTitle
      });

      setYears(years.map((y: any) => y.id === yearId ? {
        ...y,
        theme: primaryTitle,
        yearThemes: JSON.stringify(updatedThemes)
      } : y));

      if (titleInput) titleInput.value = "";
    } catch (e: any) {
      alert("Lỗi khi thêm chủ đề: " + e.message);
    }
  }

  // XÓA CHỦ ĐỀ
  const handleDeleteTheme = async (yearId: string, themeId: string, themeTitle: string) => {
    if (!confirm(`Xóa chủ đề "${themeTitle}" khỏi năm học?`)) return;

    const currentYear = years.find((y: any) => y.id === yearId);
    if (!currentYear) return;

    const currentThemes = parseThemes(currentYear);
    const updatedThemes = currentThemes.filter(t => t.id !== themeId);
    const primaryTheme = updatedThemes.find(t => t.isPrimary) || updatedThemes[0];
    const newPrimaryTitle = primaryTheme ? primaryTheme.title : null;

    try {
      await updateAction({
        id: yearId,
        yearThemes: JSON.stringify(updatedThemes),
        theme: newPrimaryTitle
      });

      setYears(years.map((y: any) => y.id === yearId ? {
        ...y,
        theme: newPrimaryTitle,
        yearThemes: JSON.stringify(updatedThemes)
      } : y));
    } catch (e: any) {
      alert("Lỗi khi xóa chủ đề: " + e.message);
    }
  }

  // MỞ MODAL SỬA CHỦ ĐỀ
  const handleOpenEditThemeModal = (yearId: string, themeItem: YearThemeItem) => {
    setEditingThemeModal({
      yearId,
      themeId: themeItem.id,
      title: themeItem.title,
      type: themeItem.type,
      isPrimary: Boolean(themeItem.isPrimary)
    });
  }

  // LƯU CẬP NHẬT CHỦ ĐỀ
  const handleSaveEditTheme = async () => {
    if (!editingThemeModal) return;
    const { yearId, themeId, title, type, isPrimary } = editingThemeModal;

    if (!title.trim()) {
      alert("Vui lòng không để trống nội dung chủ đề!");
      return;
    }

    setThemeSaving(true);
    try {
      const currentYear = years.find((y: any) => y.id === yearId);
      if (!currentYear) return;

      const currentThemes = parseThemes(currentYear);
      const updatedThemes = currentThemes.map(t => {
        if (t.id === themeId) {
          return {
            ...t,
            title: title.trim(),
            type,
            typeName: getTypeName(type),
            isPrimary
          };
        }
        if (isPrimary) {
          return { ...t, isPrimary: false };
        }
        return t;
      });

      const primaryTheme = updatedThemes.find(t => t.isPrimary) || updatedThemes[0];
      const newPrimaryTitle = primaryTheme ? primaryTheme.title : null;

      await updateAction({
        id: yearId,
        yearThemes: JSON.stringify(updatedThemes),
        theme: newPrimaryTitle
      });

      setYears(years.map((y: any) => y.id === yearId ? {
        ...y,
        theme: newPrimaryTitle,
        yearThemes: JSON.stringify(updatedThemes)
      } : y));

      setEditingThemeModal(null);
    } catch (e: any) {
      alert("Lỗi khi cập nhật chủ đề: " + e.message);
    } finally {
      setThemeSaving(false);
    }
  }

  // ==========================================
  // PILLAR & FULL CONFIG MODAL
  // ==========================================
  const openPillarModal = (year: any) => {
    setPillarModalYear(year)
    setModalTheme(year.theme || "")
    setModalPillars(parsePillars(year.pillars))
  }

  const handleSavePillarsModal = async () => {
    if (!pillarModalYear) return;
    setModalSaving(true);
    try {
      const currentThemes = parseThemes(pillarModalYear);
      let updatedThemes = [...currentThemes];

      // If modal theme changed, update the primary theme item or add one
      const trimmedTheme = modalTheme.trim();
      if (trimmedTheme) {
        const primaryIdx = updatedThemes.findIndex(t => t.isPrimary || t.type === "CA_NAM");
        if (primaryIdx >= 0) {
          updatedThemes[primaryIdx] = { ...updatedThemes[primaryIdx], title: trimmedTheme };
        } else {
          updatedThemes.unshift({
            id: "thm_" + Date.now(),
            type: "CA_NAM",
            typeName: "Cả năm (Chính)",
            title: trimmedTheme,
            isPrimary: true
          });
        }
      }

      await updateAction({
        id: pillarModalYear.id,
        theme: trimmedTheme || null,
        yearThemes: JSON.stringify(updatedThemes),
        pillars: JSON.stringify(modalPillars)
      });

      setYears(years.map((y: any) => y.id === pillarModalYear.id ? {
        ...y,
        theme: trimmedTheme || null,
        yearThemes: JSON.stringify(updatedThemes),
        pillars: JSON.stringify(modalPillars)
      } : y));

      setPillarModalYear(null);
    } catch (e: any) {
      alert("Lỗi khi lưu cấu hình: " + e.message);
    } finally {
      setModalSaving(false);
    }
  }

  const handleResetToSkylineDefault = () => {
    if (confirm("Khôi phục nội dung 5 trụ cột về định dạng chuẩn của Hệ thống Sky-Line?")) {
      setModalPillars(DEFAULT_SKYLINE_PILLARS);
    }
  }

  const handlePillarFocusChange = (idx: number, newFocus: string) => {
    const updated = [...modalPillars];
    updated[idx] = { ...updated[idx], focus: newFocus };
    setModalPillars(updated);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-amber-700 font-medium text-xs font-semibold flex items-center gap-1.5 bg-amber-50/80 p-3 rounded-xl border border-amber-200/80">
        <Star className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          Năm học <strong>ACTIVE</strong> sẽ được dùng làm mặc định khi tạo tài khoản GV/Học sinh mới và hiển thị Chủ đề năm học trên Cổng Học Sinh.
          Click <strong>&quot;Đặt Active&quot;</strong> để thay đổi năm học hiện tại.
        </span>
      </div>

      {years.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">Chưa có năm học nào</p>
          <p className="text-sm mt-1">Hãy tạo năm học đầu tiên ở form bên trên.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {years.map((y: any) => {
            const isEditing = editingId === y.id
            const isActive = y.status === "ACTIVE"
            const existingCodes = (y.educationSystems || []).map((e: any) => e.code);
            const availableSystems = EDU_SYSTEMS.filter(s => !existingCodes.includes(s.code));
            const pillars = parsePillars(y.pillars);
            const yearThemes = parseThemes(y);
            const primaryTheme = yearThemes.find(t => t.isPrimary) || yearThemes[0] || (y.theme ? { id: 'primary', title: y.theme, type: 'CA_NAM', typeName: 'Cả năm' } : null);

            return (
              <div
                key={y.id}
                className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${
                  isActive ? "border-teal-400 shadow-teal-500/10" : "border-slate-200"
                }`}
              >
                {/* TOP HEADER ROW */}
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 bg-gradient-to-b from-slate-50/40 to-white">
                  <div className="flex-shrink-0">
                    {isActive ? (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center shadow-md shadow-teal-900/20">
                        <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                        <Calendar className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 ${y.isOff ? 'opacity-60' : ''}`}>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên năm học</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày bắt đầu</label>
                            <input
                              type="date"
                              value={editForm.startDate}
                              onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày kết thúc</label>
                            <input
                              type="date"
                              value={editForm.endDate}
                              onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Chủ đề năm học chính</label>
                          <input
                            type="text"
                            value={editForm.theme}
                            placeholder="Nhập chủ đề năm học (VD: Khát vọng vươn tầm - Vững bước hội nhập)"
                            onChange={e => setEditForm({ ...editForm, theme: e.target.value })}
                            className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm outline-none font-medium"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">{y.name}</h3>
                          {y.isOff && (
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                              Đã khóa (OFF)
                            </span>
                          )}
                          {!y.isOff && isActive && (
                            <span className="text-xs font-bold bg-[#007A72] text-white px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                              <span>Đang hoạt động</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(y.startDate).toLocaleDateString("vi-VN")}</span>
                          <span>&rarr;</span>
                          <span>{new Date(y.endDate).toLocaleDateString("vi-VN")}</span>
                        </p>

                        {/* CHỦ ĐỀ NĂM HỌC TÓM TẮT TRÊN BANNER */}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          {primaryTheme ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-50 via-teal-50/80 to-amber-50/60 border border-teal-200 text-teal-950 shadow-2xs group">
                              <span className="text-xs font-black text-[#007A72] uppercase tracking-wider flex items-center gap-1 shrink-0">
                                🎯 Chủ đề năm học:
                              </span>
                              <span className="text-xs font-extrabold text-slate-800 italic">
                                &ldquo;{primaryTheme.title}&rdquo;
                              </span>
                              <div className="flex items-center gap-1 pl-1 border-l border-teal-200/80 ml-1">
                                <button
                                  onClick={() => handleOpenEditThemeModal(y.id, primaryTheme)}
                                  className="p-1 text-teal-700 hover:text-blue-600 hover:bg-teal-100/70 rounded transition-colors"
                                  title="Sửa chủ đề chính"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTheme(y.id, primaryTheme.id, primaryTheme.title)}
                                  className="p-1 text-teal-700 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Xóa chủ đề chính"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-dashed border-slate-200">
                              <span>Chưa có chủ đề năm học</span>
                              <button
                                onClick={() => {
                                  const titleInput = document.getElementById(`theme-title-${y.id}`) as HTMLInputElement;
                                  titleInput?.focus();
                                }}
                                className="text-teal-700 font-bold hover:underline not-italic ml-1 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Thêm ngay
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-3 sm:gap-4 text-sm self-start md:self-center">
                      <div className="flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200/60">
                        <GraduationCap className="w-4 h-4 text-amber-600" />
                        <span className="font-extrabold text-slate-800 text-sm">{y.teacherCount ?? 0}</span>
                        <span className="text-slate-500 text-xs font-bold">GV</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50/80 px-2.5 py-1.5 rounded-xl border border-blue-200/60">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-extrabold text-slate-800 text-sm">{y._count?.students ?? 0}</span>
                        <span className="text-slate-500 text-xs font-bold">HS</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200/60">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span className="font-extrabold text-slate-800 text-sm">{y._count?.classes ?? 0}</span>
                        <span className="text-slate-500 text-xs font-bold">Lớp</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSave(y.id)}
                          disabled={saving}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg text-xs font-semibold border border-green-200 transition-colors"
                          title="Lưu thay đổi"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          title="Hủy"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="flex items-center cursor-pointer mr-2 select-none">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={!y.isOff}
                              onChange={() => handleToggleOff(y.id, !y.isOff)}
                              disabled={togglingId === y.id}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${y.isOff ? 'bg-slate-300' : 'bg-[#007A72]'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${y.isOff ? '' : 'transform translate-x-4'}`}></div>
                          </div>
                          <div className="ml-2 text-xs font-bold text-slate-500">{y.isOff ? "Đã khóa" : "Mở"}</div>
                        </label>
                        {!isActive && (
                          <button
                            onClick={() => handleSetActive(y.id)}
                            disabled={saving || y.isOff}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              y.isOff
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'bg-teal-50 text-[#007A72] hover:bg-teal-100 border border-teal-200'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5" />
                            Đặt Active
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(y)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                          title="Chỉnh sửa thông tin năm học"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(y.id, y.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          title="Xóa năm học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 🎯 PHÂN KHU THÊM, SỬA, XÓA CHỦ ĐỀ THEO NĂM HỌC */}
                <div className="px-5 py-4 bg-gradient-to-r from-amber-50/40 via-teal-50/20 to-white border-t border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Chủ Đề Theo Năm Học ({yearThemes.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Thêm, sửa, xóa các chủ đề xuyên suốt năm học, theo học kỳ và hoạt động trải nghiệm cho Học sinh Sky-Line
                      </p>
                    </div>

                    {/* FORM THÊM CHỦ ĐỀ THEO NĂM HỌC */}
                    <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                      <select
                        id={`theme-type-${y.id}`}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-teal-500"
                        defaultValue={yearThemes.length === 0 ? "CA_NAM" : "HK1"}
                      >
                        <option value="CA_NAM">🎯 Cả năm (Chính)</option>
                        <option value="HK1">🍂 Học kỳ 1</option>
                        <option value="HK2">🌸 Học kỳ 2</option>
                        <option value="TRAI_NGHIEM">🏕️ Trải nghiệm / Sự kiện</option>
                        <option value="KHAC">✨ Chủ đề khác</option>
                      </select>

                      <input
                        type="text"
                        id={`theme-title-${y.id}`}
                        placeholder="Nhập tên chủ đề..."
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTheme(y.id);
                          }
                        }}
                        className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-teal-500 w-56 sm:w-72 font-medium text-slate-800"
                      />

                      <button
                        onClick={() => handleAddTheme(y.id)}
                        className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-[#007A72] hover:bg-[#003B3A] text-white rounded-xl transition-all shadow-sm shadow-teal-900/10"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm chủ đề
                      </button>
                    </div>
                  </div>

                  {/* DANH SÁCH CÁC CHỦ ĐỀ TRONG NĂM HỌC */}
                  {yearThemes.length === 0 ? (
                    <div className="bg-white/80 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400 italic">
                      Chưa có chủ đề nào cho năm học này. Hãy sử dụng form bên trên để thêm chủ đề (Cả năm, Học kỳ 1, Học kỳ 2...).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {yearThemes.map((th: YearThemeItem) => (
                        <div
                          key={th.id}
                          className="group bg-white border border-slate-200 hover:border-teal-300 rounded-2xl p-3 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${getThemeBadgeStyle(th.type)}`}>
                              {th.typeName}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate" title={th.title}>
                              &ldquo;{th.title}&rdquo;
                            </span>
                          </div>

                          {/* THAO TÁC SỬA & XÓA TRÊN TỪNG CHỦ ĐỀ */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditThemeModal(y.id, th)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                              title="Sửa chủ đề này"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTheme(y.id, th.id, th.title)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                              title="Xóa chủ đề này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5 TRỤ CỘT CHO HỌC SINH SKY-LINE SECTION */}
                <div className="px-5 py-4 bg-gradient-to-r from-teal-50/30 via-slate-50/20 to-teal-50/10 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#007A72]" />
                        <span>5 Trụ Cột Cho Học Sinh Sky-Line ({pillars.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Khung phát triển toàn diện xuyên suốt K-12 được đồng bộ trực tiếp tới Cổng Học Sinh Sky-Line
                      </p>
                    </div>

                    <button
                      onClick={() => openPillarModal(y)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-[#007A72] border border-teal-200 rounded-xl hover:bg-teal-50 hover:border-teal-300 transition-all shadow-2xs self-start sm:self-auto"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#007A72]" />
                      <span>Cấu hình 5 Trụ cột & Mục tiêu</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {pillars.map((p: any, idx: number) => {
                      const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
                        blue: { bg: "bg-blue-50/60", text: "text-blue-900", border: "border-blue-200", badge: "bg-blue-600" },
                        emerald: { bg: "bg-emerald-50/60", text: "text-emerald-900", border: "border-emerald-200", badge: "bg-emerald-600" },
                        rose: { bg: "bg-rose-50/60", text: "text-rose-900", border: "border-rose-200", badge: "bg-rose-600" },
                        amber: { bg: "bg-amber-50/60", text: "text-amber-900", border: "border-amber-200", badge: "bg-amber-600" },
                        purple: { bg: "bg-purple-50/60", text: "text-purple-900", border: "border-purple-200", badge: "bg-purple-600" }
                      };
                      const themeStyles = colorMap[p.color] || colorMap.blue;

                      return (
                        <div
                          key={p.id || idx}
                          className={`p-3 rounded-2xl border bg-white ${themeStyles.border} shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${themeStyles.badge} shadow-xs`}>
                                  <PillarIcon iconName={p.icon} className="w-3.5 h-3.5" />
                                </div>
                                <span className={`font-black text-xs ${themeStyles.text}`}>
                                  {p.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-slate-400">#0{idx + 1}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-3">
                              {p.focus || "Đang cập nhật trọng tâm rèn luyện..."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HE HOC SECTION */}
                <div className="px-5 py-4 border-t border-slate-100 text-xs font-semibold">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> Hệ học ({(y.educationSystems || []).length})
                    </h4>

                    <div className="flex flex-wrap items-center gap-3">
                      {availableSystems.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-slate-400 text-xs mr-1">Thêm nhanh:</span>
                          {availableSystems.map(s => (
                            <button
                              key={s.code}
                              onClick={() => addEduSystem(y.id, s.code, s.name)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> {s.code}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-bold text-xs pl-1">Khác:</span>
                        <input
                          type="text"
                          placeholder="MÃ HỆ HỌC (VD: ALEVEL)"
                          id={`custom-code-${y.id}`}
                          className="border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500 w-32 font-bold text-slate-800 uppercase"
                        />
                        <input
                          type="text"
                          placeholder="Tên hệ học"
                          id={`custom-name-${y.id}`}
                          className="border border-slate-200 bg-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500 w-44 font-semibold text-slate-700"
                        />
                        <button
                          onClick={() => {
                            const codeInput = document.getElementById(`custom-code-${y.id}`) as HTMLInputElement;
                            const nameInput = document.getElementById(`custom-name-${y.id}`) as HTMLInputElement;
                            const code = codeInput?.value?.trim()?.toUpperCase() || "";
                            const name = nameInput?.value?.trim() || "";
                            if (!code || !name) {
                              alert("Vui lòng nhập đầy đủ Mã và Tên hệ học!");
                              return;
                            }
                            addEduSystem(y.id, code, name);
                            if (codeInput) codeInput.value = "";
                            if (nameInput) nameInput.value = "";
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-[#007A72] text-white rounded-lg hover:bg-[#007A72]/90 transition-colors shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  {(y.educationSystems || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có Hệ học nào. Bấm nút phía trên để thêm.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(y.educationSystems || []).map((es: any) => (
                        <div key={es.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs group">
                          <span className="font-bold text-indigo-700 text-sm">{es.code}</span>
                          <span className="text-slate-500 text-xs">- {es.name}</span>
                          <button
                            onClick={() => removeEduSystem(y.id, es.id)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL SỬA CHỦ ĐỀ (EDIT THEME MODAL) */}
      {editingThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#007A72]" />
                <span>Chỉnh Sửa Chủ Đề</span>
              </h3>
              <button
                onClick={() => setEditingThemeModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                  Loại chủ đề
                </label>
                <select
                  value={editingThemeModal.type}
                  onChange={e => setEditingThemeModal({
                    ...editingThemeModal,
                    type: e.target.value,
                    isPrimary: e.target.value === "CA_NAM" ? true : editingThemeModal.isPrimary
                  })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-teal-500"
                >
                  <option value="CA_NAM">🎯 Cả năm (Chính)</option>
                  <option value="HK1">🍂 Học kỳ 1</option>
                  <option value="HK2">🌸 Học kỳ 2</option>
                  <option value="TRAI_NGHIEM">🏕️ Trải nghiệm / Sự kiện</option>
                  <option value="KHAC">✨ Chủ đề khác</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1.5">
                  Nội dung chủ đề *
                </label>
                <textarea
                  rows={3}
                  value={editingThemeModal.title}
                  onChange={e => setEditingThemeModal({ ...editingThemeModal, title: e.target.value })}
                  placeholder="Nhập nội dung chủ đề..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal-is-primary"
                  checked={editingThemeModal.isPrimary}
                  onChange={e => setEditingThemeModal({ ...editingThemeModal, isPrimary: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="modal-is-primary" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Đặt làm Chủ đề chính (hiển thị trên Cổng Học Sinh)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditingThemeModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditTheme}
                disabled={themeSaving}
                className="px-5 py-2 text-xs font-black text-white bg-[#007A72] hover:bg-[#003B3A] rounded-xl shadow-md shadow-teal-900/20 transition-all flex items-center gap-1.5"
              >
                {themeSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu Thay Đổi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH 5 TRỤ CỘT & CHỦ ĐỀ CHÍNH */}
      {pillarModalYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider">
                  Năm học: {pillarModalYear.name}
                </span>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mt-1 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#007A72]" />
                  <span>Cấu hình 5 Trụ cột cho Học sinh Sky-Line</span>
                </h3>
              </div>
              <button
                onClick={() => setPillarModalYear(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Theme Input */}
              <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-200/80 space-y-2">
                <label className="block text-xs font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Chủ đề năm học chính (Primary Annual Theme)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Khẩu hiệu và thông điệp hành động truyền cảm hứng cho toàn thể Học sinh và Giáo viên trong năm học.
                </p>
                <input
                  type="text"
                  value={modalTheme}
                  onChange={e => setModalTheme(e.target.value)}
                  placeholder="VD: Khát vọng vươn tầm - Vững bước hội nhập toàn cầu"
                  className="w-full bg-white border border-teal-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>

              {/* 5 Pillars List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Chi tiết 5 Trụ Cột Cho Học Sinh Sky-Line</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Định hình trọng tâm phát triển của từng trụ cột cho học sinh trong năm học {pillarModalYear.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToSkylineDefault}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Mặc định chuẩn Sky-Line</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {modalPillars.map((p: any, idx: number) => {
                    const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
                      blue: { bg: "bg-blue-50/50", text: "text-blue-900", border: "border-blue-200", badge: "bg-blue-600" },
                      emerald: { bg: "bg-emerald-50/50", text: "text-emerald-900", border: "border-emerald-200", badge: "bg-emerald-600" },
                      rose: { bg: "bg-rose-50/50", text: "text-rose-900", border: "border-rose-200", badge: "bg-rose-600" },
                      amber: { bg: "bg-amber-50/50", text: "text-amber-900", border: "border-amber-200", badge: "bg-amber-600" },
                      purple: { bg: "bg-purple-50/50", text: "text-purple-900", border: "border-purple-200", badge: "bg-purple-600" }
                    };
                    const themeStyles = colorMap[p.color] || colorMap.blue;

                    return (
                      <div key={p.id || idx} className={`p-4 rounded-2xl border ${themeStyles.border} ${themeStyles.bg} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${themeStyles.badge}`}>
                              <PillarIcon iconName={p.icon} className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-xs font-black ${themeStyles.text}`}>
                              Trụ cột {idx + 1}: {p.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.id}</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Trọng tâm / Mục tiêu rèn luyện cho Học sinh Sky-Line:
                          </label>
                          <textarea
                            rows={2}
                            value={p.focus || ""}
                            onChange={e => handlePillarFocusChange(idx, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200 resize-none"
                            placeholder={`Nhập trọng tâm rèn luyện trụ cột ${p.name}...`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md rounded-b-3xl">
              <button
                type="button"
                onClick={() => setPillarModalYear(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSavePillarsModal}
                disabled={modalSaving}
                className="px-5 py-2 text-xs font-black text-white bg-[#007A72] hover:bg-[#003B3A] rounded-xl shadow-md shadow-teal-900/20 transition-all flex items-center gap-1.5"
              >
                {modalSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu Cấu Hình</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
