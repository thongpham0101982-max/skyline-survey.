// @ts-nocheck
"use client"
import { useState, useMemo, Fragment } from "react"
import {
  Shield, Plus, Save, Edit, Trash2, X, ChevronDown, ChevronRight,
  Check, Sparkles, Search, CheckCheck, Eye, RotateCcw, Filter,
  Layers, Users, Award, BookOpen, Baby, Globe, Building2, UserCheck,
  CheckCircle2, Briefcase
} from "lucide-react"
import { savePermissions, createRole, updateRole, deleteRole } from "./actions"
import { APP_CATEGORIES, ALL_APP_MODULES } from "@/config/modules"
import toast, { Toaster } from "react-hot-toast"

const emptyPerm = (code: string) => ({
  module: code,
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
});

export const ROLE_GROUPS = [
  {
    id: "ALL",
    label: "Tất cả nhóm",
    badge: "16",
    codes: []
  },
  {
    id: "ADMIN_EXEC",
    label: "👑 Quản trị & Điều hành",
    codes: ["ADMIN", "TB_DHCM", "GDCS"],
    color: "border-purple-200 text-purple-700 bg-purple-50/50"
  },
  {
    id: "ACADEMIC",
    label: "🎓 Chuyên môn & Đào tạo",
    codes: ["TBP", "TTCM", "KHAO_THI", "BGH_MN"],
    color: "border-sky-200 text-sky-700 bg-sky-50/50"
  },
  {
    id: "OPERATIONS",
    label: "🏢 Vận hành & Hỗ trợ",
    codes: ["GIAO_VU", "CTHS", "TVAN", "NS"],
    color: "border-emerald-200 text-emerald-700 bg-emerald-50/50"
  },
  {
    id: "TEACHING",
    label: "👨‍🏫 Đội ngũ Giáo viên",
    codes: ["TEACHER", "GV_MN", "GVNN"],
    color: "border-amber-200 text-amber-700 bg-amber-50/50"
  },
  {
    id: "PORTAL",
    label: "👥 Cổng Người dùng",
    codes: ["PARENT", "STUDENT"],
    color: "border-slate-200 text-slate-700 bg-slate-50/50"
  }
];

export function RolesClient({ initialRoles }: any) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [activeRole, setActiveRole] = useState(roles[0]?.code || "ADMIN");
  const [activeCategoryTab, setActiveCategoryTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(ALL_APP_MODULES.map(m => m.code));

  const toggleExpand = (code: string) => {
    setExpandedModules(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const expandAll = () => setExpandedModules(ALL_APP_MODULES.map(m => m.code));
  const collapseAll = () => setExpandedModules([]);

  const buildPerms = (roleCode: string) => {
    const r = roles.find((r: any) => r.code === roleCode);
    const permsMap = ALL_APP_MODULES.map(m => {
      const existing = r?.permissions?.find((p: any) => p.module === m.code);
      return existing ? { ...existing } : emptyPerm(m.code);
    });

    APP_CATEGORIES.forEach(cat => {
      cat.modules.forEach((m: any) => {
        if (m.subModules && m.subModules.length > 0) {
          const subCodes = m.subModules.map((sm: any) => sm.code);
          const activeSubPerms = permsMap.filter(p => subCodes.includes(p.module));
          const hasRead = activeSubPerms.some(p => p.canRead);
          const hasCreate = activeSubPerms.some(p => p.canCreate);
          const hasUpdate = activeSubPerms.some(p => p.canUpdate);
          const hasDelete = activeSubPerms.some(p => p.canDelete);

          const parentPerm = permsMap.find(p => p.module === m.code);
          if (parentPerm) {
            if (hasRead) parentPerm.canRead = true;
            if (hasCreate) parentPerm.canCreate = true;
            if (hasUpdate) parentPerm.canUpdate = true;
            if (hasDelete) parentPerm.canDelete = true;
          }
        }
      });
    });

    return permsMap;
  };

  const [permissions, setPermissions] = useState<any[]>(() => buildPerms(activeRole));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const switchRole = (code: string) => {
    setActiveRole(code);
    setPermissions(buildPerms(code));
  };

  const currentRoleObj = useMemo(() => {
    return roles.find((r: any) => r.code === activeRole) || roles[0];
  }, [roles, activeRole]);

  // Filtered Roles List
  const filteredRoles = useMemo(() => {
    return roles.filter((r: any) => {
      if (activeCategoryTab !== "ALL") {
        const grp = ROLE_GROUPS.find(g => g.id === activeCategoryTab);
        if (grp && !grp.codes.includes(r.code)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.name?.toLowerCase().includes(q);
        const matchCode = r.code?.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc) return false;
      }
      return true;
    });
  }, [roles, activeCategoryTab, searchQuery]);

  const togglePerm = (moduleCode: string, field: string) => {
    setPermissions(prev => {
      const targetMod = ALL_APP_MODULES.find(m => m.code === moduleCode);
      const isParent = targetMod && targetMod.subModules && targetMod.subModules.length > 0;

      let nextPerms = prev.map(p => {
        if (p.module !== moduleCode) return p;
        const newP = { ...p, [field]: !p[field] };
        if ((field === "canCreate" || field === "canUpdate" || field === "canDelete") && newP[field])
          newP.canRead = true;
        if (field === "canRead" && !newP.canRead)
          newP.canCreate = newP.canUpdate = newP.canDelete = false;
        return newP;
      });

      if (isParent) {
        const parentPerm = nextPerms.find(p => p.module === moduleCode);
        if (parentPerm) {
          const newVal = parentPerm[field];
          const subCodes = targetMod.subModules.map(sm => sm.code);
          nextPerms = nextPerms.map(p => {
            if (!subCodes.includes(p.module)) return p;
            const newP = { ...p, [field]: newVal };
            if ((field === "canCreate" || field === "canUpdate" || field === "canDelete") && newP[field])
              newP.canRead = true;
            if (field === "canRead" && !newP.canRead)
              newP.canCreate = newP.canUpdate = newP.canDelete = false;
            return newP;
          });
        }
      }

      APP_CATEGORIES.forEach(cat => {
        cat.modules.forEach(m => {
          if (m.subModules && m.subModules.length > 0) {
            const subCodes = m.subModules.map((sm: any) => sm.code);
            const activeSubPerms = nextPerms.filter(p => subCodes.includes(p.module));
            const hasRead = activeSubPerms.some(p => p.canRead);
            const hasCreate = activeSubPerms.some(p => p.canCreate);
            const hasUpdate = activeSubPerms.some(p => p.canUpdate);
            const hasDelete = activeSubPerms.some(p => p.canDelete);

            const parentPerm = nextPerms.find(p => p.module === m.code);
            if (parentPerm) {
              if (hasRead) parentPerm.canRead = true;
              if (hasCreate) parentPerm.canCreate = true;
              if (hasUpdate) parentPerm.canUpdate = true;
              if (hasDelete) parentPerm.canDelete = true;
            }
          }
        });
      });

      return nextPerms;
    });
  };

  const setRowPerms = (moduleCode: string, action: 'FULL' | 'READ' | 'CLEAR') => {
    setPermissions(prev => {
      const targetMod = ALL_APP_MODULES.find(m => m.code === moduleCode);
      const isParent = targetMod && targetMod.subModules && targetMod.subModules.length > 0;
      const subCodes = isParent ? targetMod.subModules.map(sm => sm.code) : [];

      return prev.map(p => {
        const isTarget = p.module === moduleCode || subCodes.includes(p.module);
        if (!isTarget) return p;
        return {
          ...p,
          canRead: action === 'FULL' || action === 'READ',
          canCreate: action === 'FULL',
          canUpdate: action === 'FULL',
          canDelete: action === 'FULL'
        };
      });
    });
  };

  const setCategoryPerms = (catId: string, action: 'FULL' | 'READ' | 'CLEAR') => {
    const cat = APP_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    const catModuleCodes = cat.modules.flatMap((m: any) => m.subModules ? [m.code, ...m.subModules.map((sm: any) => sm.code)] : [m.code]);

    setPermissions(prev => prev.map(p => {
      if (!catModuleCodes.includes(p.module)) return p;
      return {
        ...p,
        canRead: action === 'FULL' || action === 'READ',
        canCreate: action === 'FULL',
        canUpdate: action === 'FULL',
        canDelete: action === 'FULL'
      };
    }));
  };

  const applyPreset = (presetType: string) => {
    const roleRules: Record<string, any> = {
      ALL_READ: { allRead: true },
      ALL_FULL: { allFull: true },
      ALL_CLEAR: { allClear: true },
      TB_DHCM: {
        TEACHERS: { r: true },
        DEPARTMENTS: { r: true, c: true, u: true },
        SUBJECTS: { r: true, c: true, u: true },
        ACADEMIC_YEARS: { r: true },
        MANAGE_CLASSES: { r: true },
        ASSIGNMENTS: { r: true, c: true, u: true },
        TIMETABLE: { r: true, c: true, u: true },
        CO_VAN_HOC_TAP: { r: true, c: true, u: true },
        STUDENT_TRANSFERS: { r: true },
        DU_GIO_K12: { r: true, c: true, u: true },
        DU_GIO_MAM_NON: { r: true, c: true, u: true },
        DU_GIO_GVNN: { r: true, c: true, u: true },
        TONG_HOP_DU_GIO: { r: true, c: true, u: true },
        MA_TRAN_DU_GIO_TTCM: { r: true, c: true, u: true },
        XET_DUYET_DANH_GIA_LAI: { r: true, c: true, u: true },
        KTDBCL_EXAMS: { r: true, c: true, u: true },
        KTDBCL_GRADE_REMARKS: { r: true, c: true, u: true },
        KTDBCL_SUPPORT: { r: true, c: true, u: true },
        KTDBCL_HUONG_NGHIEP: { r: true, c: true, u: true },
        QL_DGNL: { r: true, c: true, u: true },
        KTDBCL_IMPORT_KQHT: { r: true, c: true, u: true },
        EXPERIENTIAL_ACTIVITIES: { r: true, c: true, u: true },
        EXP_ACT_MANAGE: { r: true, c: true, u: true },
        EXP_ACT_REPORTS: { r: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true, c: true, u: true },
        XET_DUYET_KET_QUA: { r: true, c: true, u: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true, d: true }
      },
      TBP: {
        TEACHERS: { r: true },
        DEPARTMENTS: { r: true },
        SUBJECTS: { r: true },
        ACADEMIC_YEARS: { r: true },
        MANAGE_CLASSES: { r: true },
        ASSIGNMENTS: { r: true, c: true, u: true },
        TIMETABLE: { r: true, c: true, u: true },
        CO_VAN_HOC_TAP: { r: true, c: true, u: true },
        DU_GIO_K12: { r: true, c: true, u: true },
        DU_GIO_MAM_NON: { r: true, c: true, u: true },
        DU_GIO_GVNN: { r: true, c: true, u: true },
        TONG_HOP_DU_GIO: { r: true, c: true, u: true },
        MA_TRAN_DU_GIO_TTCM: { r: true, c: true, u: true },
        XET_DUYET_DANH_GIA_LAI: { r: true, c: true, u: true },
        KTDBCL_EXAMS: { r: true, c: true, u: true },
        KTDBCL_GRADE_REMARKS: { r: true, c: true, u: true },
        KTDBCL_SUPPORT: { r: true, c: true, u: true },
        QL_DGNL: { r: true },
        EXPERIENTIAL_ACTIVITIES: { r: true, c: true, u: true },
        EXP_ACT_MANAGE: { r: true, c: true, u: true },
        EXP_ACT_REPORTS: { r: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true, c: true, u: true },
        XET_DUYET_KET_QUA: { r: true, c: true, u: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      TTCM: {
        TEACHERS: { r: true },
        DEPARTMENTS: { r: true },
        SUBJECTS: { r: true },
        MANAGE_CLASSES: { r: true },
        ASSIGNMENTS: { r: true, c: true, u: true },
        TIMETABLE: { r: true },
        CO_VAN_HOC_TAP: { r: true, c: true, u: true },
        DU_GIO_K12: { r: true, c: true, u: true },
        DU_GIO_MAM_NON: { r: true, c: true, u: true },
        DU_GIO_GVNN: { r: true, c: true, u: true },
        TONG_HOP_DU_GIO: { r: true },
        MA_TRAN_DU_GIO_TTCM: { r: true, c: true, u: true },
        XET_DUYET_DANH_GIA_LAI: { r: true, c: true, u: true },
        KTDBCL_EXAMS: { r: true, c: true, u: true },
        KTDBCL_GRADE_REMARKS: { r: true, c: true, u: true },
        KTDBCL_SUPPORT: { r: true, c: true, u: true },
        QL_DGNL: { r: true },
        EXPERIENTIAL_ACTIVITIES: { r: true, c: true, u: true },
        EXP_ACT_MANAGE: { r: true, c: true, u: true },
        EXP_ACT_REPORTS: { r: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true },
        XET_DUYET_KET_QUA: { r: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      GDCS: {
        PARENTS: { r: true },
        KTDBCL_EXAM_CONFIG: { r: true },
        KTDBCL_EXAMS: { r: true, c: true, u: true },
        KTDBCL_HUONG_NGHIEP: { r: true, c: true, u: true, d: true },
        TEACHERS: { r: true, c: true, u: true },
        DEPARTMENTS: { r: true, c: true, u: true },
        SUBJECTS: { r: true },
        ACADEMIC_YEARS: { r: true },
        MANAGE_CLASSES: { r: true, c: true, u: true },
        ASSIGNMENTS: { r: true, c: true, u: true },
        STUDENT_TRANSFERS: { r: true, c: true, u: true },
        DU_GIO_K12: { r: true, c: true, u: true },
        DU_GIO_MAM_NON: { r: true, c: true, u: true },
        DU_GIO_GVNN: { r: true, c: true, u: true },
        TONG_HOP_DU_GIO: { r: true, c: true, u: true },
        MA_TRAN_DU_GIO_TTCM: { r: true },
        XET_DUYET_DANH_GIA_LAI: { r: true, c: true, u: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true, c: true, u: true },
        XET_DUYET_KET_QUA: { r: true, c: true, u: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true, d: true }
      },
      GIAO_VU: {
        PARENTS: { r: true },
        KTDBCL_EXAM_CONFIG: { r: true },
        KTDBCL_EXAMS: { r: true, c: true, u: true, d: true },
        KTDBCL_HUONG_NGHIEP: { r: true, c: true, u: true, d: true },
        TEACHERS: { r: true, c: true, u: true },
        DEPARTMENTS: { r: true, c: true, u: true },
        SUBJECTS: { r: true, c: true, u: true },
        ACADEMIC_YEARS: { r: true },
        MANAGE_CLASSES: { r: true, c: true, u: true, d: true },
        ASSIGNMENTS: { r: true, c: true, u: true, d: true },
        STUDENT_TRANSFERS: { r: true, c: true, u: true, d: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true },
        XET_DUYET_KET_QUA: { r: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      KTDBCL: {
        KTDBCL_EXAMS: { r: true, c: true, u: true, d: true },
        KTDBCL_GRADE_REMARKS: { r: true, c: true, u: true, d: true },
        KTDBCL_SUPPORT: { r: true, c: true, u: true, d: true },
        KTDBCL_HUONG_NGHIEP: { r: true, c: true, u: true, d: true },
        QL_DGNL: { r: true, c: true, u: true, d: true },
        KTDBCL_IMPORT_KQHT: { r: true, c: true, u: true, d: true },
        DU_GIO_K12: { r: true, c: true, u: true },
        TONG_HOP_DU_GIO: { r: true, c: true, u: true },
        MA_TRAN_DU_GIO_TTCM: { r: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      TVAN: {
        PARENTS: { r: true },
        STUDENT_TRANSFERS: { r: true },
        CAU_HINH_KHAO_SAT: { r: true },
        INPUT_ASSESSMENT_REPORTS: { r: true },
        STUDENT_INFO: { r: true, c: true, u: true },
        STUDENT_INFO_K12: { r: true, c: true, u: true },
        STUDENT_INFO_MAM_NON: { r: true, c: true, u: true },
        PHAN_CONG_KHAO_SAT: { r: true },
        XET_DUYET_KET_QUA: { r: true },
        TASKS: { r: true, c: true, u: true }
      },
      BGH_MN: {
        CAU_HINH_KHAO_SAT: { r: true, c: true, u: true, d: true },
        PRESCHOOL_INPUT_ASSESSMENTS: { r: true, c: true, u: true, d: true },
        INPUT_ASSESSMENT_REPORTS: { r: true, c: true, u: true, d: true },
        STUDENT_INFO: { r: true, c: true, u: true, d: true },
        STUDENT_INFO_MAM_NON: { r: true, c: true, u: true, d: true },
        PHAN_CONG_KHAO_SAT: { r: true, c: true, u: true, d: true },
        PHAN_CONG_MAM_NON: { r: true, c: true, u: true, d: true },
        XET_DUYET_KET_QUA: { r: true, c: true, u: true, d: true },
        XET_DUYET_MAM_NON: { r: true, c: true, u: true, d: true },
        DU_GIO_MAM_NON: { r: true, c: true, u: true },
        TONG_HOP_DU_GIO: { r: true },
        MANAGE_SURVEYS: { r: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      },
      TEACHER: {
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, u: true }
      },
      CTHS: {
        EXPERIENTIAL_ACTIVITIES: { r: true, c: true, u: true, d: true },
        EXP_ACT_REPORTS: { r: true, c: true, u: true, d: true },
        EXP_ACT_MANAGE: { r: true, c: true, u: true, d: true },
        CO_VAN_HOC_TAP: { r: true, c: true, u: true }
      },
      GV_MN: {
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, u: true },
        DU_GIO_MAM_NON: { r: true, c: true, u: true }
      },
      GVNN: {
        TASKS: { r: true, c: true, u: true, d: true },
        WEEKLY_REPORTS: { r: true, u: true },
        DU_GIO_GVNN: { r: true, c: true, u: true }
      },
      NS: {
        USERS: { r: true, c: true, u: true },
        TEACHERS: { r: true, c: true, u: true },
        TEACHER_TRANSFERS: { r: true, c: true, u: true },
        TASKS: { r: true, c: true, u: true },
        WEEKLY_REPORTS: { r: true, c: true, u: true }
      }
    };

    const rules = roleRules[presetType];
    if (!rules) return;

    setPermissions(prev => prev.map(p => {
      if (rules.allFull) {
        return { ...p, canRead: true, canCreate: true, canUpdate: true, canDelete: true };
      }
      if (rules.allRead) {
        return { ...p, canRead: true, canCreate: false, canUpdate: false, canDelete: false };
      }
      if (rules.allClear) {
        return { ...p, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
      }
      const modRules = rules[p.module];
      if (modRules) {
        return {
          ...p,
          canRead: !!modRules.r,
          canCreate: !!modRules.c,
          canUpdate: !!modRules.u,
          canDelete: !!modRules.d
        };
      }
      return { ...p, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
    }));
    toast.success(`Đã áp dụng mẫu cấu hình: ${presetType}`);
  };

  const handleSavePerms = async () => {
    setSavingMatrix(true);
    const res = await savePermissions(activeRole, permissions);
    if (!res.success) {
      toast.error("Lỗi: " + res.error);
    } else {
      toast.success("Đã lưu ma trận phân quyền thành công!");
      window.location.reload();
    }
    setSavingMatrix(false);
  };

  const colorStyles: Record<string, { bg: string, text: string, border: string, btn: string }> = {
    violet: { bg: "bg-violet-50/80", text: "text-violet-800", border: "border-violet-200", btn: "hover:bg-violet-100 text-violet-700" },
    blue: { bg: "bg-blue-50/80", text: "text-blue-800", border: "border-blue-200", btn: "hover:bg-blue-100 text-blue-700" },
    sky: { bg: "bg-sky-50/80", text: "text-sky-800", border: "border-sky-200", btn: "hover:bg-sky-100 text-sky-700" },
    emerald: { bg: "bg-emerald-50/80", text: "text-emerald-800", border: "border-emerald-200", btn: "hover:bg-emerald-100 text-emerald-700" },
    amber: { bg: "bg-amber-50/80", text: "text-amber-800", border: "border-amber-200", btn: "hover:bg-amber-100 text-amber-700" },
    teal: { bg: "bg-teal-50/80", text: "text-teal-800", border: "border-teal-200", btn: "hover:bg-teal-100 text-teal-700" },
    slate: { bg: "bg-slate-50/80", text: "text-slate-800", border: "border-slate-200", btn: "hover:bg-slate-100 text-slate-700" }
  };

  const activePermCount = useMemo(() => {
    return permissions.filter(p => p.canRead).length;
  }, [permissions]);

  return (
    <>
      <Toaster position="top-right" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Role Groups List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col h-fit">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">NHÓM QUYỀN</h3>
                <p className="text-[11px] text-slate-400 font-medium">{roles.length} vai trò trong hệ thống</p>
              </div>
            </div>
            <button
              onClick={() => {
                setModalMode('ADD');
                setFormData({ code: '', name: '', description: '' });
                setModalOpen(true);
              }}
              className="text-white bg-[#003B3A] hover:bg-[#002B2A] px-2.5 py-1.5 rounded-xl transition-all shadow-xs text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhóm quyền, mã code..."
                className="bg-transparent font-medium text-slate-800 outline-none text-xs w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {ROLE_GROUPS.map(grp => {
              const isActive = activeCategoryTab === grp.id;
              return (
                <button
                  key={grp.id}
                  onClick={() => setActiveCategoryTab(grp.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {grp.label}
                </button>
              );
            })}
          </div>

          {/* Roles List */}
          <div className="p-2.5 space-y-1.5 overflow-y-auto max-h-[62vh] custom-scrollbar">
            {filteredRoles.map((r: any) => {
              const isSelected = activeRole === r.code;
              return (
                <div
                  key={r.code}
                  className={`group relative flex items-stretch w-full rounded-xl transition-all duration-150 border cursor-pointer ${
                    isSelected
                      ? "bg-teal-50/70 border-teal-300 shadow-2xs"
                      : "hover:bg-slate-50 border-slate-200/80 bg-white"
                  }`}
                >
                  <button
                    onClick={() => switchRole(r.code)}
                    className="flex-1 text-left px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs ${isSelected ? "text-teal-900" : "text-slate-800"}`}>
                          {r.name}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.userCount > 0
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-50 text-slate-400"
                      }`}>
                        {r.userCount || 0} tài khoản
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="text-[11px] text-slate-400 font-mono font-medium">
                        {r.code}
                      </span>
                      {r.isSystem ? (
                        <span className="text-[9px] font-bold tracking-wider text-teal-700 uppercase bg-teal-100/60 px-1.5 py-0.2 rounded">
                          Hệ thống
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 line-clamp-1 truncate max-w-[140px]">
                          {r.description || ""}
                        </span>
                      )}
                    </div>
                  </button>

                  {!r.isSystem && (
                    <div className="opacity-0 group-hover:opacity-100 flex flex-col justify-center gap-1 px-2 border-l border-slate-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalMode('EDIT');
                          setFormData({ code: r.code, name: r.name, description: r.description || '' });
                          setModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded transition-all"
                        title="Sửa thông tin vai trò"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Bạn có chắc muốn xóa nhóm quyền "${r.name}"?`)) {
                            const res = await deleteRole(r.code);
                            if (res.success) window.location.reload();
                            else toast.error("Lỗi: " + res.error);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                        title="Xóa nhóm quyền"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permissions Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col">
          {/* Header & Controls */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base tracking-tight">Ma Trận Phân Quyền Chi Tiết</h3>
                  <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                    {activePermCount} chức năng được cấp
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đang thiết lập cho nhóm: <span className="font-bold text-slate-900">{currentRoleObj?.name}</span> ({currentRoleObj?.code})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePerms}
                  disabled={savingMatrix}
                  className="px-4 py-2 bg-[#003B3A] text-white rounded-xl text-xs font-bold flex items-center hover:bg-[#002B2A] active:scale-95 shadow-xs transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>{savingMatrix ? "Đang lưu..." : "Lưu Cấu Hình"}</span>
                </button>
              </div>
            </div>

            {/* Presets Toolbar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" /> MẪU PHÂN QUYỀN CHUẨN (PRESETS)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Mở tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Thu gọn
                  </button>
                </div>
              </div>

              {/* Preset Buttons Grid */}
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => applyPreset('ALL_FULL')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer">
                  Toàn quyền
                </button>
                <button onClick={() => applyPreset('ALL_READ')} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer">
                  Chỉ Xem
                </button>
                <button onClick={() => applyPreset('ALL_CLEAR')} className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Dọn dẹp
                </button>
                <span className="w-px bg-slate-200 my-1 mx-0.5"></span>

                {/* Academic & Management */}
                <button onClick={() => applyPreset('TB_DHCM')} className="px-2.5 py-1.5 border border-purple-200 text-purple-800 bg-purple-50/80 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Trưởng Ban ĐHCM
                </button>
                <button onClick={() => applyPreset('TBP')} className="px-2.5 py-1.5 border border-indigo-200 text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Trưởng Bộ Phận (TBP)
                </button>
                <button onClick={() => applyPreset('TTCM')} className="px-2.5 py-1.5 border border-amber-200 text-amber-800 bg-amber-50/80 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Tổ Trưởng CM (TTCM)
                </button>
                <button onClick={() => applyPreset('GDCS')} className="px-2.5 py-1.5 border border-teal-200 text-teal-800 bg-teal-50/80 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  GĐCS (Cơ sở)
                </button>
                <button onClick={() => applyPreset('KTDBCL')} className="px-2.5 py-1.5 border border-cyan-200 text-cyan-800 bg-cyan-50/80 hover:bg-cyan-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Khảo Thí & ĐBCL
                </button>
                <button onClick={() => applyPreset('BGH_MN')} className="px-2.5 py-1.5 border border-purple-200 text-purple-700 bg-purple-50/60 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  BGH Mầm non
                </button>
                <button onClick={() => applyPreset('GIAO_VU')} className="px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Giáo vụ
                </button>
                <button onClick={() => applyPreset('CTHS')} className="px-2.5 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  CTHS & HĐTN
                </button>
                <button onClick={() => applyPreset('TVAN')} className="px-2.5 py-1.5 border border-amber-200 text-amber-700 bg-amber-50/60 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                  Tư vấn Tuyển sinh
                </button>
                <button onClick={() => applyPreset('TEACHER')} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">
                  GV Phổ thông
                </button>
                <button onClick={() => applyPreset('GV_MN')} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">
                  GV Mầm non
                </button>
                <button onClick={() => applyPreset('GVNN')} className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">
                  GV Nước ngoài
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto custom-scrollbar flex-1 relative max-h-[64vh]">
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 text-xs shadow-2xs">
                  <th className="px-4 py-3 font-bold text-slate-800 uppercase tracking-wider w-[42%]">
                    Chức năng / Module
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider text-center w-[12%]">
                    Xem (R)
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider text-center w-[12%]">
                    Thêm (C)
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider text-center w-[12%]">
                    Sửa (U)
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider text-center w-[12%]">
                    Xóa (D)
                  </th>
                  <th className="px-3 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider text-center w-[10%]">
                    Thao tác nhanh
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {APP_CATEGORIES.map((cat) => {
                  const colors = colorStyles[cat.color] || colorStyles.slate;
                  return (
                    <Fragment key={cat.id}>
                      {/* Category Header Row */}
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={5} className={`px-4 py-2 font-bold text-[11px] uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="w-4 h-4" />
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        <td className={`px-3 py-2 text-center ${colors.bg}`}>
                          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setCategoryPerms(cat.id, 'FULL')}
                              className="px-2 py-0.5 hover:bg-teal-50 hover:text-teal-800 text-[10px] font-bold border-r border-slate-200 cursor-pointer"
                              title="Cấp toàn quyền cả cụm"
                            >
                              Full
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryPerms(cat.id, 'READ')}
                              className="px-2 py-0.5 hover:bg-sky-50 hover:text-sky-800 text-[10px] font-bold border-r border-slate-200 cursor-pointer"
                              title="Chỉ xem cả cụm"
                            >
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryPerms(cat.id, 'CLEAR')}
                              className="px-2 py-0.5 hover:bg-rose-50 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                              title="Tắt cả cụm"
                            >
                              Tắt
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Modules */}
                      {cat.modules.map(m => {
                        const p = permissions.find(x => x.module === m.code) || emptyPerm(m.code);
                        const hasSub = m.subModules && m.subModules.length > 0;
                        const isExpanded = expandedModules.includes(m.code);

                        return (
                          <Fragment key={m.code}>
                            <tr className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {hasSub ? (
                                    <button
                                      onClick={() => toggleExpand(m.code)}
                                      className="p-1 hover:bg-slate-200 rounded transition-all text-slate-500 cursor-pointer"
                                    >
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-teal-800" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  ) : (
                                    <div className="w-5 h-5" />
                                  )}
                                  <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
                                    <m.icon className="w-3.5 h-3.5 text-slate-600" />
                                  </div>
                                  <div>
                                    <div
                                      className={`font-semibold text-slate-800 text-xs ${hasSub ? "cursor-pointer select-none hover:text-teal-900" : ""}`}
                                      onClick={hasSub ? () => toggleExpand(m.code) : undefined}
                                    >
                                      {m.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{m.code}</div>
                                  </div>
                                </div>
                              </td>
                              {(["canRead", "canCreate", "canUpdate", "canDelete"] as const).map(field => (
                                <td key={field} className="px-3 py-2.5 text-center">
                                  <label className="inline-flex items-center justify-center cursor-pointer p-0.5 active:scale-95 transition-transform select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!p[field]}
                                      onChange={() => togglePerm(m.code, field)}
                                      className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                      p[field]
                                        ? field === "canDelete"
                                          ? "bg-rose-600 border-rose-600 text-white"
                                          : "bg-teal-700 border-teal-700 text-white shadow-2xs"
                                        : "bg-white border-slate-300 hover:border-slate-400"
                                    }`}>
                                      {p[field] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                  </label>
                                </td>
                              ))}
                              <td className="px-3 py-2.5 text-center">
                                <div className="inline-flex rounded-md border border-slate-200 overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => setRowPerms(m.code, 'FULL')}
                                    className="px-1.5 py-0.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border-r border-slate-200 text-[9px] font-bold text-slate-600 cursor-pointer"
                                  >
                                    Full
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRowPerms(m.code, 'READ')}
                                    className="px-1.5 py-0.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border-r border-slate-200 text-[9px] font-bold text-slate-600 cursor-pointer"
                                  >
                                    Xem
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRowPerms(m.code, 'CLEAR')}
                                    className="px-1.5 py-0.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-[9px] font-bold text-slate-600 cursor-pointer"
                                  >
                                    Tắt
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* SubModules */}
                            {hasSub && isExpanded && m.subModules.map(sm => {
                              const subP = permissions.find(x => x.module === sm.code) || emptyPerm(sm.code);
                              return (
                                <tr key={sm.code} className="bg-slate-50/40 hover:bg-slate-100/60 transition-colors">
                                  <td className="pl-12 pr-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="text-slate-300 font-mono select-none text-xs">└──</div>
                                      <div className="font-medium text-slate-700 text-xs">{sm.name}</div>
                                      <div className="text-[9px] text-slate-400 font-mono">({sm.code})</div>
                                    </div>
                                  </td>
                                  {(["canRead", "canCreate", "canUpdate", "canDelete"] as const).map(field => (
                                    <td key={field} className="px-3 py-2 text-center">
                                      <label className="inline-flex items-center justify-center cursor-pointer p-0.5 active:scale-95 transition-transform select-none">
                                        <input
                                          type="checkbox"
                                          checked={!!subP[field]}
                                          onChange={() => togglePerm(sm.code, field)}
                                          className="sr-only"
                                        />
                                        <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                                          subP[field]
                                            ? field === "canDelete"
                                              ? "bg-rose-600 border-rose-600 text-white"
                                              : "bg-teal-700 border-teal-700 text-white shadow-2xs"
                                            : "bg-white border-slate-300 hover:border-slate-400"
                                        }`}>
                                          {subP[field] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>
                                      </label>
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-center">
                                    <div className="inline-flex rounded-md border border-slate-200 overflow-hidden shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => setRowPerms(sm.code, 'FULL')}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border-r border-slate-200 text-[8.5px] font-bold text-slate-600 cursor-pointer"
                                      >
                                        Full
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRowPerms(sm.code, 'READ')}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border-r border-slate-200 text-[8.5px] font-bold text-slate-600 cursor-pointer"
                                      >
                                        Xem
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRowPerms(sm.code, 'CLEAR')}
                                        className="px-1 py-0.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-[8.5px] font-bold text-slate-600 cursor-pointer"
                                      >
                                        Tắt
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Role Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="p-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                {modalMode === 'ADD' ? 'Thêm Nhóm Quyền Mới' : 'Sửa Thông Tin Nhóm Quyền'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mã nhóm (Code) *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={modalMode === 'EDIT'}
                  placeholder="VD: TO_TRUONG_TIENG_ANH"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Tên hiển thị *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Tổ Trưởng Tiếng Anh"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả phạm vi và nhiệm vụ của nhóm quyền..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                disabled={loading || !formData.code || !formData.name}
                onClick={async () => {
                  setLoading(true);
                  const res = modalMode === 'ADD'
                    ? await createRole(formData.code, formData.name, formData.description)
                    : await updateRole(formData.code, formData.name, formData.description);
                  if (res.success) {
                    setModalOpen(false);
                    window.location.reload();
                  } else {
                    toast.error("Lỗi: " + res.error);
                  }
                  setLoading(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#003B3A] hover:bg-[#002B2A] disabled:opacity-50 rounded-xl transition-colors flex items-center shadow-2xs cursor-pointer"
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
