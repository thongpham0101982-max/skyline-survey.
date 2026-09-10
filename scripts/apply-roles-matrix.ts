import { prisma } from "../src/lib/db";
import { ALL_APP_MODULES, APP_CATEGORIES } from "../src/config/modules";

async function applyRolePermissions(roleCode: string, rules: Record<string, any>) {
  console.log(`\n=== Applying permissions for role: ${roleCode} ===`);

  // 1. Ensure role exists
  let role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    console.log(`Role ${roleCode} does not exist, creating...`);
    role = await prisma.role.create({
      data: {
        code: roleCode,
        name: roleCode === "TBP" ? "Trưởng Bộ Phận (TBP)" : roleCode === "TTCM" ? "Tổ Trưởng Chuyên Môn (TTCM)" : roleCode === "TB_DHCM" ? "Trưởng Ban ĐHCM" : roleCode,
        description: `Quyền chuyên môn ${roleCode}`,
        isSystem: false
      }
    });
  }

  // 2. Build permissions map
  const permsMap = new Map<string, { module: string; canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>();

  ALL_APP_MODULES.forEach(m => {
    const modRule = rules[m.code] || {};
    permsMap.set(m.code, {
      module: m.code,
      canRead: rules.allFull ? true : rules.allRead ? true : !!modRule.r,
      canCreate: rules.allFull ? true : !!modRule.c,
      canUpdate: rules.allFull ? true : !!modRule.u,
      canDelete: rules.allFull ? true : !!modRule.d,
    });
  });

  // Sync parent modules
  APP_CATEGORIES.forEach((cat: any) => {
    cat.modules.forEach((m: any) => {
      if (m.subModules && m.subModules.length > 0) {
        const subCodes = m.subModules.map((sm: any) => sm.code);
        const activeSubs = Array.from(permsMap.values()).filter((p: any) => subCodes.includes(p.module));
        const hasRead = activeSubs.some((p: any) => p.canRead);
        const hasCreate = activeSubs.some((p: any) => p.canCreate);
        const hasUpdate = activeSubs.some((p: any) => p.canUpdate);
        const hasDelete = activeSubs.some((p: any) => p.canDelete);

        const parent = permsMap.get(m.code) || { module: m.code, canRead: false, canCreate: false, canUpdate: false, canDelete: false };
        if (hasRead) parent.canRead = true;
        if (hasCreate) parent.canCreate = true;
        if (hasUpdate) parent.canUpdate = true;
        if (hasDelete) parent.canDelete = true;
        permsMap.set(m.code, parent);
      }
    });
  });

  // Delete existing
  await prisma.permission.deleteMany({ where: { roleCode } });

  // Filter only active permissions (at least canRead)
  const activePerms = Array.from(permsMap.values()).filter(p => p.canRead || p.canCreate || p.canUpdate || p.canDelete);

  for (const p of activePerms) {
    await prisma.permission.create({
      data: {
        roleCode,
        module: p.module,
        canRead: p.canRead,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete
      }
    });
  }

  console.log(`Successfully saved ${activePerms.length} permissions for ${roleCode}`);
}

async function main() {
  const roleRules: Record<string, any> = {
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
    }
  };

  for (const [code, rules] of Object.entries(roleRules)) {
    await applyRolePermissions(code, rules);
  }

  console.log("\n✅ All observation role matrix permissions successfully applied!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
