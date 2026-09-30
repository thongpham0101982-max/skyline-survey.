// @ts-nocheck
"use server"

function getTeacherResolvedEmail(teacher: any, allowSystemEmail = false): string | null {
  if (!teacher) return null;

  const code = String(teacher.teacherCode || "").trim();
  const name = String(teacher.teacherName || "").trim();

  // 1. High-priority staff / admin mappings
  if (code === "0201000094" || code === "020100094" || name.includes("Phạm Nguyên Thông")) {
    return "thongpn@skylineschool.edu.vn";
  }
  if (code === "0101000105" || name.includes("Dương Xuân Thắng")) {
    return "thangdx@skylineschool.edu.vn";
  }
  if (code === "0101000648" || name.includes("Trần Thị Ngọc Minh")) {
    return "minhttn@skylineschool.edu.vn";
  }
  if (code === "0201000407" || name.includes("Từ Thảo Nguyên")) {
    return "nguyentt@skyline.edu.vn";
  }
  if (code === "0201000817" || name.includes("Mai Thị Hoài Thương")) {
    return "thuongmth@skylineschool.edu.vn";
  }

  const systemEmails = [
    "noreply@skylineschool.edu.vn"
  ];
  const isRealEmail = (e?: string | null): boolean => {
    if (!e) return false;
    const clean = e.trim().toLowerCase();
    if (!clean.includes("@") || clean.includes(" ") || clean.length < 6) return false;
    const local = clean.split("@")[0];
    if (/^\d+$/.test(local)) return false; // Prevent numeric codes from being treated as inboxes
    return !systemEmails.includes(clean);
  };

  // 2. Direct teacher profile email
  let tEmail = (teacher.email || "").trim();
  if (tEmail && !tEmail.includes("@")) tEmail = `${tEmail}@skylineschool.edu.vn`;
  if (isRealEmail(tEmail)) return tEmail;

  // 3. User account email
  let uEmail = (teacher.user?.email || "").trim();
  if (uEmail && !uEmail.includes("@")) uEmail = `${uEmail}@skylineschool.edu.vn`;
  if (isRealEmail(uEmail)) return uEmail;

  return null;
}


import {
  sendTeamsNewSlotDepartmentNotif,
  sendTeamsRequestApprovalNotif,
  sendTeamsApprovalWithEvalFormNotif,
  sendTeamsDeclineNotif,
  sendTeamsLackingObserversReminder,
  sendTeamsToAllDepartmentMembers
} from "@/lib/teams";
import { cookies } from "next/headers"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { sendEmail } from "@/lib/mail"
import {
  renderObservationRequestSubmittedForObserver,
  renderObservationRequestForHost,
  renderObservationRequestResponseForObserver,
  renderObservationSlotCreatedForTcm,
  renderObservationSlotRegisteredForHost,
  renderObservationEvaluationCompletedForHost,
  renderObservationEvaluationCompletedForObserver,
  renderObservationPendingEvaluationReminder,
  renderObservationTeacherAcknowledged,
  renderObservationSurpriseCompletedForHost,
  renderObservationReEvaluationApproved,
  renderObservationReEvaluationRejected,
  renderObservationExpiredNotification,
  SKYLINE_SSM_LOGIN_URL
} from "@/lib/email-templates"
import { ACADEMIC_DIVISIONS, normalizeDivisionCode } from "@/config/divisions"

async function checkIsObservationAdmin(roleCode: string, userId?: string): Promise<boolean> {
  let activeRole = (roleCode || "").trim();
  if (userId) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          teacher: {
            select: {
              position: true,
              departmentRel: { select: { code: true, name: true, divisionCode: true } },
              departmentAssignments: { select: { position: true, department: { select: { code: true, name: true, divisionCode: true } } } },
              divisionAssignments: { select: { divisionCode: true } }
            }
          }
        }
      });
      if (dbUser?.role) activeRole = dbUser.role.trim();
      const teacher = dbUser?.teacher;
      const pos = (teacher?.position || "").trim();
      const mgmtPositions = [
        "ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "PGDCS", "PGĐCS",
        "BAN_DHCM", "TB_DHCM", "TRUONG_BAN_DHCM", "PHO_BAN_DHCM", "DHCM", "BGH", "BGH_MN", "BGHMN", "BGMMN", "QLCM", "QUAN_LY_CM",
        "TBP", "TB_DHCM", "TRUONG_BO_PHAN", "PHO_BO_PHAN", "TTCM", "TO_TRUONG", "TO_PHO", "TPCM"
      ];
      const isMgmtPos = mgmtPositions.includes(pos.toUpperCase()) ||
        pos.toLowerCase().includes("trưởng ban") ||
        pos.toLowerCase().includes("phó ban") ||
        pos.toLowerCase().includes("tổ trưởng") ||
        pos.toLowerCase().includes("tổ phó") ||
        pos.toLowerCase().includes("trưởng bộ phận") ||
        pos.toLowerCase().includes("phó bộ phận") ||
        pos.toLowerCase().includes("giám đốc cơ sở") ||
        pos.toLowerCase().includes("phó giám đốc") ||
        pos.toLowerCase().includes("ban giám hiệu") ||
        pos.toLowerCase().includes("ban đhcm") ||
        pos.toLowerCase().includes("quản lý cm");

      if (isMgmtPos) {
        return true;
      }
    } catch (e) {}
  }

  const directRoles = [
    "ADMIN", "ADMINISTRATOR", "SUPER_ADMIN", "SUPERADMIN", "GDCS", "GĐCS", "GD_CS", "GĐ_CS",
    "BAN_DHCM", "DHCM", "BGH", "BGH_MN", "BGHMN", "BGMMN", "QLCM", "QUAN_LY_CM", "TBP", "TB_DHCM", "TTCM"
  ];
  if (directRoles.includes(activeRole.toUpperCase()) || directRoles.includes(activeRole)) {
    return true;
  }
  
  try {
    const matchingRoles = await prisma.role.findMany({
      where: {
        OR: [
          { code: activeRole },
          { name: activeRole },
          { code: roleCode },
          { name: roleCode }
        ]
      }
    }).catch(() => []);

    const allRoleKeys = new Set<string>([
      activeRole,
      roleCode,
      ...matchingRoles.map(r => r.code),
      ...matchingRoles.map(r => r.name)
    ]);

    const roleVariants: string[] = [];
    allRoleKeys.forEach(r => {
      if (!r) return;
      const trimmed = r.trim();
      roleVariants.push(trimmed);
      roleVariants.push(trimmed.toUpperCase());
      roleVariants.push(trimmed.toLowerCase());
      roleVariants.push(trimmed.replace(/\s+/g, "_"));
      roleVariants.push(trimmed.replace(/_/g, " "));
      roleVariants.push(trimmed.toUpperCase().replace(/\s+/g, "_"));
      roleVariants.push(trimmed.toUpperCase().replace(/_/g, " "));
    });

    const perms = await prisma.permission.findMany({
      where: {
        roleCode: { in: Array.from(new Set(roleVariants)) },
        canRead: true,
        module: {
          in: [
            "TONG_HOP_DU_GIO",
            "TONG_HOP_DU_GIO_K12",
            "TONG_HOP_DU_GIO_MN",
            "TONG_HOP_DU_GIO_DIEU_HANH",
            "DU_GIO_K12",
            "DU_GIO_MAM_NON",
            "DU_GIO_GVNN",
            "XET_DUYET_DANH_GIA_LAI"
          ]
        }
      }
    });
    return perms.length > 0;
  } catch (e) {
    console.error("checkIsObservationAdmin error:", e);
    return false;
  }
}


// Fast In-Memory Cache for Observation System
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const globalObsCache = (globalThis as any).__skylineObservationCache || {
  refCache: new Map<string, CacheEntry<any>>(),
  slotsCache: new Map<string, CacheEntry<any>>()
};
(globalThis as any).__skylineObservationCache = globalObsCache;

const observationRefCache: Map<string, CacheEntry<any>> = globalObsCache.refCache;
const REF_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const observationSlotsCache: Map<string, CacheEntry<any>> = globalObsCache.slotsCache;
const SLOTS_CACHE_TTL = 60 * 1000; // 60 seconds

export async function invalidateObservationSlotsCache() {
  observationSlotsCache.clear();
}

export async function invalidateObservationRefCache() {
  observationRefCache.clear();
}

async function getCachedRef<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = observationRefCache.get(key);
  if (cached && Date.now() - cached.timestamp < REF_CACHE_TTL) {
    return cached.data;
  }
  const fresh = await fetcher();
  observationRefCache.set(key, { data: fresh, timestamp: Date.now() });
  return fresh;
}

async function getCachedSlots<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = observationSlotsCache.get(key);
  if (cached && Date.now() - cached.timestamp < SLOTS_CACHE_TTL) {
    return cached.data;
  }
  const fresh = await fetcher();
  observationSlotsCache.set(key, { data: fresh, timestamp: Date.now() });
  return fresh;
}

export async function getObservationData(academicYearId?: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = await checkIsObservationAdmin(roleCode, session.user.id)

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        departmentAssignments: {
          include: { department: true }
        },
        divisionAssignments: true,
        campus: true,
        user: {
          select: {
            role: true
          }
        }
      }
    })

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found" }
    }

    const rawAcademicYears = await getCachedRef("academic_years_all", () =>
      prisma.academicYear.findMany({
        orderBy: { startDate: "desc" },
        select: { id: true, name: true, status: true, startDate: true, endDate: true }
      })
    )

    const selectedYear = academicYearId
      ? rawAcademicYears.find(y => y.id === academicYearId)
      : rawAcademicYears.find(y => y.status === "ACTIVE") || rawAcademicYears[0];

    const activeYearId = selectedYear?.id || null;

    // Deduplicate by name and filter by status === "ACTIVE"
    const seenNames = new Set()
    let academicYears = rawAcademicYears.filter(y => {
      if (y.status !== "ACTIVE") return false
      if (seenNames.has(y.name)) return false
      seenNames.add(y.name)
      return true
    })

    // If no active year is found, only show the selectedYear to avoid displaying multiple inactive years
    if (academicYears.length === 0 && selectedYear) {
      academicYears = [selectedYear]
    }

    let activeYearTarget = null
    if (activeYearId && currentTeacher && !isAdmin) {
      activeYearTarget = await prisma.teacherAcademicYearTarget.findUnique({
        where: {
          teacherId_academicYearId: {
            teacherId: currentTeacher.id,
            academicYearId: activeYearId
          }
        }
      })
    }

    if (!currentTeacher && isAdmin) {
      currentTeacher = {
        id: "admin-" + session.user.id,
        teacherName: session.user.name || "Administrator",
        teacherCode: "ADMIN",
        email: session.user.email || null,
        departmentId: "",
        campusId: "",
        position: "ADMIN",
        observerType: "Ban ĐHCM",
        observeeType: "Giáo viên cũ",
        requiredObserved: 0,
        observedUnit: "tháng",
        requiredTaught: 0,
        taughtUnit: "tháng",
        departmentRel: {
          id: "",
          code: "ADMIN",
          name: "Ban giám hiệu",
          blockCM: ""
        },
        campus: {
          id: "",
          campusCode: "ADMIN",
          campusName: "Trụ sở chính"
        }
      } as any;
    } else if (currentTeacher) {
      currentTeacher = {
        ...currentTeacher,
        observerType: activeYearTarget?.observerType || null,
        observeeType: activeYearTarget?.observeeType || null,
        requiredObserved: activeYearTarget?.requiredObserved || 0,
        observedUnit: activeYearTarget?.observedUnit || "tháng",
        requiredTaught: activeYearTarget?.requiredTaught || 0,
        taughtUnit: activeYearTarget?.taughtUnit || "tháng"
      } as any
    }

    const refKey = `du_gio_ref_${activeYearId || 'default'}`;
    const [refData, dbEvals] = await Promise.all([
      getCachedRef(refKey, async () => {
        const [subjects, departments, rawTeachers, allTargets, campuses, classes] = await Promise.all([
          prisma.subject.findMany({
            where: { status: "ACTIVE" },
            orderBy: { subjectName: "asc" }
          }),
          prisma.department.findMany({
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" }
          }),
          prisma.teacher.findMany({
            where: { status: "ACTIVE" },
            select: {
              id: true,
              teacherName: true,
              teacherCode: true,
              email: true,
              departmentId: true,
              departmentRel: {
                select: { id: true, name: true, code: true }
              },
              campusId: true,
              campus: {
                select: {
                  id: true,
                  campusName: true,
                  campusCode: true
                }
              },
              position: true,
              departmentAssignments: {
                select: {
                  departmentId: true,
                  position: true,
                  department: { select: { id: true, name: true, code: true } }
                }
              }
            },
            orderBy: { teacherName: "asc" }
          }),
          activeYearId ? prisma.teacherAcademicYearTarget.findMany({
            where: { academicYearId: activeYearId }
          }) : Promise.resolve([]),
          prisma.campus.findMany({
            where: {
              NOT: { status: "INACTIVE" }
            },
            orderBy: { campusName: "asc" }
          }),
          prisma.class.findMany({
            where: {
              status: "ACTIVE"
            },
            select: { id: true, classCode: true, className: true, level: true, grade: true, campusId: true, academicYearId: true, homeroomTeacherId: true },
            orderBy: { className: "asc" }
          })
        ]);

        const targetsMap = new Map(allTargets.map(t => [t.teacherId, t]));
        const teachers = rawTeachers.map(t => {
          const target = targetsMap.get(t.id);
          return {
            ...t,
            observerType: target?.observerType || null,
            observeeType: target?.observeeType || null,
            requiredObserved: target?.requiredObserved || 0,
            observedUnit: target?.observedUnit || "tháng",
            requiredTaught: target?.requiredTaught || 0,
            taughtUnit: target?.taughtUnit || "tháng"
          };
        });

        return { subjects, departments, campuses, classes, teachers };
      }),
      (currentTeacher?.id && !currentTeacher.id.startsWith("admin-"))
        ? prisma.observationEvaluation.findMany({
            where: {
              OR: [
                {
                  registration: {
                    slot: {
                      teacherId: currentTeacher.id,
                      ...(activeYearId ? { academicYearId: activeYearId } : {})
                    }
                  }
                },
                {
                  registration: {
                    teacherId: currentTeacher.id,
                    slot: {
                      ...(activeYearId ? { academicYearId: activeYearId } : {})
                    }
                  }
                }
              ]
            },
            include: {
              registration: {
                include: {
                  teacher: {
                    select: {
                      id: true,
                      teacherName: true,
                      teacherCode: true,
                      email: true,
                      departmentId: true,
                      campusId: true,
                      position: true
                    }
                  },
                  slot: {
                    include: {
                      teacher: {
                        select: {
                          id: true,
                          teacherName: true,
                          teacherCode: true,
                          email: true,
                          departmentId: true,
                          campusId: true,
                          position: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: {
              submittedAt: "desc"
            }
          }).catch(err => {
            console.error("Error fetching myReceivedEvaluations:", err);
            return [];
          })
        : Promise.resolve([])
    ]);

    const { subjects, departments, campuses, classes, teachers } = refData;

    const myReceivedEvaluations = (dbEvals || []).map((e: any) => ({
      slot: e.registration?.slot,
      registration: {
        ...(e.registration || {}),
        evaluation: e
      },
      evaluation: e,
      role: e.registration?.slot?.teacherId === currentTeacher?.id ? "TEACHER" : "OBSERVER"
    })).filter((item: any) => item.slot != null);

    let myPersonalSlots: any[] = [];

    return {
      success: true,
      currentTeacher,
      subjects,
      departments,
      divisions: ACADEMIC_DIVISIONS,
      teachers,
      campuses,
      classes,
      academicYears,
      selectedYearId: activeYearId,
      myReceivedEvaluations,
      myPersonalSlots
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getObservationSlots(filters: {
    schoolBlock?: string
    campusId?: string
    deptId?: string
    divisionCode?: string
    level?: string
    grade?: string
    classId?: string
    period?: string
    date?: string
    month?: string
    academicYearId?: string
}) {
  try {
    // ensureDbColumns removed from read path for high performance
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = await checkIsObservationAdmin(roleCode, session.user.id)

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { departmentAssignments: true, departmentRel: true }
    })

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found" }
    }

    const activeYear = filters.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: filters.academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })

    const where: any = {
      status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "REJECTED", "OPEN", "EXPIRED", "COMPLETED"] }
    }

    const andConditions: any[] = []

    if (activeYear) {
      andConditions.push({
        OR: [
          { academicYearId: activeYear.id },
          {
            AND: [
              { academicYearId: null },
              {
                date: {
                  gte: activeYear.startDate,
                  lte: activeYear.endDate
                }
              }
            ]
          }
        ]
      })
    }

    if (filters.month && filters.month !== "all") {
      const parts = filters.month.split("-");
      if (parts.length === 2) {
        const mYear = parseInt(parts[0], 10);
        const mMonth = parseInt(parts[1], 10);
        if (!isNaN(mYear) && !isNaN(mMonth)) {
          const startOfMonth = new Date(mYear, mMonth - 1, 1);
          const endOfMonth = new Date(mYear, mMonth, 1);
          andConditions.push({
            date: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          });
        }
      }
    }

    if (filters.level && filters.level !== "all") {
      if (filters.level === "Phổ thông K-12") {
        andConditions.push({ level: { in: ["Tiểu học", "THCS", "THPT", "Phổ thông K-12"] } });
      } else {
        andConditions.push({ level: filters.level });
      }
    }
    if (filters.grade && filters.grade !== "all") {
      andConditions.push({ grade: filters.grade })
    }
    if (filters.period && filters.period !== "all") {
      andConditions.push({ startTime: filters.period })
    }
    if (filters.date) {
      const filterDate = new Date(filters.date)
      const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate())
      const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate() + 1)
      andConditions.push({
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      })
    }
    if (filters.campusId && filters.campusId !== "all") {
      const targetCampus = await prisma.campus.findUnique({
        where: { id: filters.campusId },
        select: { id: true, campusCode: true, campusName: true }
      });
      const campusOrs: any[] = [
        { campusId: filters.campusId },
        { teacher: { campusId: filters.campusId } }
      ];
      if (targetCampus) {
        if (targetCampus.campusCode) {
          campusOrs.push({ campusId: targetCampus.campusCode });
          campusOrs.push({ teacher: { campusId: targetCampus.campusCode } });
        }
        if (targetCampus.campusName) {
          campusOrs.push({ campusName: targetCampus.campusName });
        }
      }
      andConditions.push({ OR: campusOrs });
    }
    if (filters.divisionCode && filters.divisionCode !== "all") {
      andConditions.push({
        OR: [
          {
            teacher: {
              OR: [
                { departmentRel: { divisionCode: filters.divisionCode } },
                { departmentAssignments: { some: { department: { divisionCode: filters.divisionCode } } } }
              ]
            }
          },
          {
            targetDept: { divisionCode: filters.divisionCode }
          }
        ]
      });
    }
    if (filters.deptId && filters.deptId !== "all") {
      andConditions.push({
        OR: [
          { targetDeptId: filters.deptId },
          {
            teacher: {
              OR: [
                { departmentId: filters.deptId },
                { departmentAssignments: { some: { departmentId: filters.deptId } } }
              ]
            }
          }
        ]
      })
    }
    if (filters.classId && filters.classId !== "all") {
      const cls = await prisma.class.findUnique({
        where: { id: filters.classId },
        select: { id: true, className: true }
      });
      if (cls) {
        andConditions.push({
          OR: [
            { classId: cls.id },
            { className: cls.className }
          ]
        });
      } else {
        andConditions.push({
          OR: [
            { classId: filters.classId },
            { className: filters.classId }
          ]
        });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const slotsCacheKey = `slots_${JSON.stringify(filters)}_${isAdmin ? 'admin' : (currentTeacher?.id || 'guest')}`;
    const filteredSlots = await getCachedSlots(slotsCacheKey, async () => {
      const slots = await prisma.observationSlot.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            email: true,
            departmentId: true,
            departmentRel: true,
            departmentAssignments: {
              include: {
                department: true
              }
            },
            campusId: true,
            campus: {
              select: {
                campusName: true
              }
            }
          }
        },
        registrations: {
          include: {
            teacher: {
              select: {
                id: true,
                teacherName: true,
                teacherCode: true,
                departmentId: true,
                campusId: true,
                campus: {
                  select: {
                    id: true,
                    campusName: true,
                    campusCode: true
                  }
                },
                position: true,
                departmentAssignments: {
                  select: { departmentId: true, position: true }
                },
                email: true
              }
            },
            evaluation: true
          }
        }
      },
      orderBy: {
        date: "asc"
      }
    })

        // Filter by visibility and Khối CM with multi-department support
    const filteredSlots = slots.filter((slot) => {
      if (isAdmin) {
        return true;
      }
      if (slot.teacherId === currentTeacher?.id) {
        return true;
      }
      if (slot.visibilityType === "DEPARTMENT") {
        if (!currentTeacher) return false;
        
        const myDeptIds = new Set<string>();
        if (currentTeacher.departmentId) myDeptIds.add(currentTeacher.departmentId);
        if ((currentTeacher as any).departmentAssignments && Array.isArray((currentTeacher as any).departmentAssignments)) {
          (currentTeacher as any).departmentAssignments.forEach((da: any) => {
            if (da.departmentId) myDeptIds.add(da.departmentId);
          });
        }

        const slotTeacherDeptIds = new Set<string>();
        if (slot.teacher?.departmentId) slotTeacherDeptIds.add(slot.teacher.departmentId);
        if (slot.targetDeptId) slotTeacherDeptIds.add(slot.targetDeptId);
        if (slot.teacher?.departmentAssignments && Array.isArray(slot.teacher.departmentAssignments)) {
          slot.teacher.departmentAssignments.forEach((da: any) => {
            if (da.departmentId) slotTeacherDeptIds.add(da.departmentId);
          });
        }

        if (slot.targetDeptId && myDeptIds.has(slot.targetDeptId)) return true;

        for (const id of slotTeacherDeptIds) {
          if (myDeptIds.has(id)) return true;
        }

        if (!slot.targetDeptId) return true;

        return false;
      }
      
      return true;
    })
      return filteredSlots;
    });

    return { success: true, slots: filteredSlots }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createObservationSlot(data: {
  subjectId?: string
  subjectName: string
  level: string
  grade: string
  topic: string
  date: string
  startTime: string
  endTime: string
  isDoublePeriod: boolean
  room?: string
  description?: string
  visibilityType: string
  targetDeptId?: string
  campusId?: string
  campusName?: string
  classId?: string
  className?: string
  lessonPlanName?: string
  lessonPlanData?: string
  sendEmailNotif?: boolean
  notifMode?: string
  selectedMemberIds?: string[]
}) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        departmentAssignments: { include: { department: true } },
        user: true,
        campus: true
      }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    // 1. Verify monthly limit and create slot inside transaction
    const slotDate = new Date(data.date)
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    if (!isNaN(slotDate.getTime()) && slotDate < currentMonthStart) {
      return { success: false, error: "Không thể mở tiết dạy thuộc các tháng trước. Vui lòng chọn ngày trong tháng hiện tại hoặc các tháng sau!" }
    }

    const startOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth(), 1)
    const endOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 1)

    const cookieStore = await cookies();
    const cookieYearId = cookieStore.get("selectedAcademicYear")?.value;
    let yearId = cookieYearId || null;
    if (yearId) {
      const yearExists = await prisma.academicYear.findUnique({ where: { id: yearId } });
      if (!yearExists) yearId = null;
    }

    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      })

      const matchingYear = activeYear ? await prisma.academicYear.findFirst({
        where: {
          startDate: { lte: slotDate },
          endDate: { gte: slotDate }
        }
      }) : null

      yearId = matchingYear?.id || activeYear?.id || null
    }

    const newSlot = await prisma.$transaction(async (tx) => {
      const count = await tx.observationSlot.count({
        where: {
          teacherId: currentTeacher.id,
          date: {
            gte: startOfMonth,
            lt: endOfMonth
          },
          status: "ACTIVE"
        }
      })

      if (count >= 2) {
        throw new Error(`Thầy/Cô đã đạt giới hạn tạo tối đa 2 tiết dạy trong tháng ${slotDate.getMonth() + 1}/${slotDate.getFullYear()}.`)
      }

      return await tx.observationSlot.create({
        data: {
          teacherId: currentTeacher.id,
          subjectId: data.subjectId || null,
          subjectName: data.subjectName,
          level: data.level,
          grade: data.grade,
          topic: data.topic,
          date: slotDate,
          startTime: data.startTime,
          endTime: data.endTime,
          isDoublePeriod: data.isDoublePeriod,
          room: data.room || null,
          description: data.description || null,
          visibilityType: data.visibilityType,
          targetDeptId: data.targetDeptId || currentTeacher.departmentId || null,
          maxSeats: 4,
          status: "ACTIVE",
          campusId: data.campusId || null,
          campusName: data.campusName || null,
          classId: data.classId || null,
          className: data.className || null,
          lessonPlanName: data.lessonPlanName || null,
          lessonPlanData: data.lessonPlanData || null,
          academicYearId: yearId
        }
      })
    })

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")

    
    // Guaranteed Email, Teams & In-App Notification Dispatch for Tag 1 (New Slot) via Next.js after()
    // Runs in the background without blocking the UI response or causing Vercel serverless timeouts
    after(async () => {
      try {
        // 1. Collect all department IDs for the current teacher's TCM
        const allMyDeptIds = new Set<string>();
        if (newSlot.targetDeptId) allMyDeptIds.add(newSlot.targetDeptId);
        if (data.targetDeptId) allMyDeptIds.add(data.targetDeptId);
        if (currentTeacher.departmentId) allMyDeptIds.add(currentTeacher.departmentId);
        if (currentTeacher.departmentAssignments && Array.isArray(currentTeacher.departmentAssignments)) {
          currentTeacher.departmentAssignments.forEach((da: any) => {
            if (da.departmentId) allMyDeptIds.add(da.departmentId);
          });
        }

        // Fallback: check subject department if teacher has no department configured
        if (allMyDeptIds.size === 0 && (data.subjectId || newSlot.subjectId)) {
          const subId = data.subjectId || newSlot.subjectId;
          if (subId) {
            const sub = await prisma.subject.findUnique({ where: { id: subId } });
            if (sub?.departmentId) allMyDeptIds.add(sub.departmentId);
          }
        }

        const targetDeptIds = Array.from(allMyDeptIds);

        // 2. Query all teachers in the TCM
        let deptMembers: any[] = [];
        if (targetDeptIds.length > 0) {
          deptMembers = await prisma.teacher.findMany({
            where: {
              OR: [
                { departmentId: { in: targetDeptIds } },
                { departmentAssignments: { some: { departmentId: { in: targetDeptIds } } } },
                ...(Array.isArray(data.selectedMemberIds) && data.selectedMemberIds.length > 0 ? [{ id: { in: data.selectedMemberIds } }] : [])
              ],
              status: "ACTIVE"
            },
            include: { user: true, departmentRel: true }
          });
        } else if (Array.isArray(data.selectedMemberIds) && data.selectedMemberIds.length > 0) {
          deptMembers = await prisma.teacher.findMany({
            where: {
              id: { in: data.selectedMemberIds },
              status: "ACTIVE"
            },
            include: { user: true, departmentRel: true }
          });
        }

        if (deptMembers.length === 0 && currentTeacher.campusId) {
          deptMembers = await prisma.teacher.findMany({
            where: { campusId: currentTeacher.campusId, status: "ACTIVE" },
            take: 30,
            include: { user: true, departmentRel: true }
          });
        }

        // Email Notification from bankhaothi@skylineschool.edu.vn to resolved teacher emails in TCM
        const creatorEmail = getTeacherResolvedEmail(currentTeacher);
        const deptName = currentTeacher.departmentRel?.name ||
          (currentTeacher.departmentAssignments && currentTeacher.departmentAssignments[0]?.department?.name) ||
          deptMembers.find(m => m.departmentRel?.name)?.departmentRel?.name ||
          "Tổ Chuyên Môn";

        const targetMembers = deptMembers.filter(m => m.id !== currentTeacher.id);
        const formattedDateVi = new Date(newSlot.date).toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        const loginUrl = SKYLINE_SSM_LOGIN_URL;

        // In-app notifications for TCM members
        const notifMembers = targetMembers.filter(m => m.user?.id);
        if (notifMembers.length > 0) {
          await prisma.notification.createMany({
            data: notifMembers.map(m => ({
              userId: m.user.id,
              title: "Tiết dạy mới trong Tổ Chuyên Môn 📖",
              message: `Thầy/Cô ${currentTeacher.teacherName} vừa đăng ký tiết dạy "${newSlot.topic}" môn ${newSlot.subjectName || "Chuyên môn"} vào ${formattedDateVi}. Kính mời Thầy/Cô đăng ký tham gia dự giờ.`,
              link: `/teacher/du-gio?tab=overview_slots&slotId=${newSlot.id}`,
              isRead: false
            }))
          }).catch(e => console.error("[createObservationSlot] In-app notif error:", e));
        }

        if (data.sendEmailNotif !== false && targetMembers.length > 0) {
          const sentEmails = new Set<string>();

          // Send personalized emails concurrently to each member in TCM
          const sendTasks = targetMembers
            .map(m => {
              const targetEmail = getTeacherResolvedEmail(m);
              if (!targetEmail || !targetEmail.includes("@") || targetEmail.toLowerCase() === creatorEmail?.toLowerCase()) {
                return null;
              }
              if (sentEmails.has(targetEmail.toLowerCase())) {
                return null;
              }
              sentEmails.add(targetEmail.toLowerCase());

              const emailSubject = `[Sky-line SMS - Tiết Dạy] Thầy/Cô ${currentTeacher.teacherName} đăng ký tiết dạy mới (${newSlot.subjectName || "Chuyên môn"})`;
              const emailHtml = renderObservationSlotCreatedForTcm({
                recipientName: m.teacherName,
                creatorName: currentTeacher.teacherName,
                teacherName: currentTeacher.teacherName,
                teacherCode: currentTeacher.teacherCode,
                departmentName: deptName,
                topic: newSlot.topic,
                subjectName: newSlot.subjectName,
                level: newSlot.level,
                grade: newSlot.grade,
                className: newSlot.className || undefined,
                campusName: newSlot.campusName || undefined,
                room: newSlot.room || undefined,
                dateStr: formattedDateVi,
                period: newSlot.startTime ? (newSlot.startTime.startsWith("Tiết") ? newSlot.startTime : `${newSlot.startTime} - ${newSlot.endTime}`) : "Tiết 1",
                timeStr: `${newSlot.startTime} - ${newSlot.endTime}`,
                directLink: loginUrl,
                buttonText: "👉 Xem Chi Tiết & Đăng Ký Dự Giờ Ngay"
              });

              return sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: targetEmail, subject: emailSubject, html: emailHtml })
                .then(() => console.log("[Skyline Email] Successfully sent slot creation email to:", targetEmail))
                .catch(err => console.error("[Skyline Email Error] Failed sending to " + targetEmail + ":", err));
            })
            .filter(Boolean);

          await Promise.allSettled(sendTasks);
        }

        // Also trigger Teams notification if department webhook is available
        try {
          const deptRel = (currentTeacher as any).departmentRel;
          if (deptRel) {
            await sendTeamsNewSlotDepartmentNotif({
              id: newSlot.id,
              topic: newSlot.topic,
              subjectName: newSlot.subjectName,
              level: newSlot.level,
              grade: newSlot.grade,
              className: newSlot.className,
              date: newSlot.date,
              startTime: newSlot.startTime,
              endTime: newSlot.endTime,
              campusName: newSlot.campusName,
              room: newSlot.room,
              teacherName: currentTeacher.teacherName,
              teacherCode: currentTeacher.teacherCode,
              maxSeats: newSlot.maxSeats || 4
            }, {
              name: deptRel.name,
              teamsWebhookUrl: deptRel.teamsWebhookUrl
            });
          }
        } catch (teamsErr) {
          console.error("[MS Teams] Error sending slot creation notif:", teamsErr);
        }
      } catch (deptNotifErr) {
        console.error("Error sending department member notifications:", deptNotifErr);
      }
    });

    return { success: true, slot: newSlot }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function registerObservation(slotId: string) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: {
        registrations: true,
        teacher: { include: { user: true, campus: true, departmentRel: true } }
      }
    })

    if (!slot) {
      return { success: false, error: "Observation slot not found" }
    }

    // Chặn đăng ký dự giờ tiết dạy đã diễn ra trong quá khứ (Cho phép thời gian trễ trong vòng 30 ngày để nộp bù đánh giá)
    const limitDate = new Date()
    limitDate.setDate(limitDate.getDate() - 30)
    if (new Date(slot.date) < limitDate) {
      return { success: false, error: "Không thể đăng ký dự giờ tiết dạy đã diễn ra quá 30 ngày." }
    }

    if (slot.status !== "ACTIVE") {
      return { success: false, error: "This slot is no longer active" }
    }

    if (slot.teacherId === currentTeacher.id) {
      return { success: false, error: "You cannot register to observe your own slot" }
    }

    if (slot.registrations.some((r) => r.teacherId === currentTeacher.id)) {
      return { success: false, error: "You are already registered for this slot" }
    }

    if (slot.registrations.length >= Math.min(slot.maxSeats || 4, 4)) {
      return { success: false, error: "Tiết dạy này đã đủ số lượng giáo viên đăng ký (đã đóng đăng ký)" }
    }

    await prisma.observationRegistration.create({
      data: {
        slotId,
        teacherId: currentTeacher.id
      }
    })

    // Asynchronous background dispatch of In-App Notification and Email via Next.js after()
    // Ensures 100% reliable delivery on Vercel Serverless without delaying UI response
    after(async () => {
      try {
        const hostTeacher = slot.teacher;
        const formattedDate = new Date(slot.date).toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
        const hostDirectLink = SKYLINE_SSM_LOGIN_URL;
        const observerDirectLink = SKYLINE_SSM_LOGIN_URL;

        // 1. In-App Notification for Host Teacher
        if (hostTeacher?.user?.id) {
          await prisma.notification.create({
            data: {
              userId: hostTeacher.user.id,
              title: "Thông báo đăng ký tiết dạy 📝",
              message: `Thầy/Cô ${currentTeacher.teacherName} vừa đăng ký tiết dạy "${slot.topic || "tiết học"}" của Thầy/Cô. Vui lòng kiểm tra danh sách người tham dự.`,
              link: `/teacher/du-gio?tab=my_schedule&slotId=${slot.id}`,
              isRead: false
            }
          }).catch(e => console.error("[registerObservation] In-app notif error:", e));
        }

        const hostEmail = getTeacherResolvedEmail(hostTeacher);
        const observerEmail = getTeacherResolvedEmail(currentTeacher);
        const emailTasks: Promise<any>[] = [];

        // 2. Email Notification to Host Teacher
        if (hostEmail && hostEmail.includes("@")) {
          const emailHtml = renderObservationSlotRegisteredForHost({
            hostName: hostTeacher?.teacherName || "Giáo viên dạy",
            observerName: currentTeacher.teacherName,
            observerCode: currentTeacher.teacherCode,
            topic: slot.topic,
            subjectName: slot.subjectName,
            level: slot.level,
            grade: slot.grade,
            className: slot.className || undefined,
            dateStr: formattedDate,
            timeStr: `${slot.startTime} - ${slot.endTime}`,
            directLink: hostDirectLink
          });

          emailTasks.push(
            sendEmail({
              from: "HỆ THỐNG DỰ GIỜ SKY-LINE",
              to: hostEmail,
              subject: `[Sky-line SMS - Dự Giờ] Thầy/Cô ${currentTeacher.teacherName} đăng ký dự giờ tiết dạy: "${slot.topic}"`,
              html: emailHtml
            })
              .then(res => console.log("[registerObservation] Email sent successfully to host:", hostEmail, res?.messageId))
              .catch(err => console.error("[registerObservation] Failed sending email to host " + hostEmail + ":", err))
          );
        } else {
          console.warn("[registerObservation] Host teacher does not have a valid email:", hostTeacher?.teacherName);
        }

        // 3. Email Confirmation to Observer Teacher (Biên nhận đã đăng ký thành công)
        if (observerEmail && observerEmail.includes("@") && observerEmail !== hostEmail) {
          const observerHtml = renderObservationRequestSubmittedForObserver({
            observerName: currentTeacher.teacherName,
            hostName: hostTeacher?.teacherName || "Giáo viên dạy",
            hostCode: hostTeacher?.teacherCode || undefined,
            topic: slot.topic,
            subjectName: slot.subjectName,
            level: slot.level,
            grade: slot.grade,
            className: slot.className || undefined,
            dateStr: formattedDate,
            period: `${slot.startTime} - ${slot.endTime}`,
            campusName: hostTeacher?.campus?.campusName || undefined,
            room: slot.room || undefined,
            directLink: observerDirectLink
          });

          emailTasks.push(
            sendEmail({
              from: "HỆ THỐNG DỰ GIỜ SKY-LINE",
              to: observerEmail,
              subject: `[Sky-line SMS - Dự Giờ] Đăng ký dự giờ thành công tiết dạy của Thầy/Cô ${hostTeacher?.teacherName || ""}`,
              html: observerHtml
            })
              .then(res => console.log("[registerObservation] Confirmation email sent to observer:", observerEmail, res?.messageId))
              .catch(err => console.error("[registerObservation] Failed sending confirmation to observer " + observerEmail + ":", err))
          );
        }

        await Promise.allSettled(emailTasks);
      } catch (bgErr) {
        console.error("[registerObservation] Error in background notification task:", bgErr);
      }
    });

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function cancelObservation(targetId: string) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    // Kiểm tra xem targetId là registrationId hay slotId
    const registration = await prisma.observationRegistration.findFirst({
      where: {
        OR: [
          { id: targetId },
          { slotId: targetId, teacherId: currentTeacher.id }
        ],
        teacherId: currentTeacher.id
      },
      include: { evaluation: true, slot: true }
    });

    if (!registration) {
      return { success: false, error: "Không tìm thấy thông tin đăng ký dự giờ" }
    }

    if (registration.evaluation) {
      return { success: false, error: "Thầy/Cô đã nộp phiếu đánh giá. Không thể hủy đăng ký dự giờ." }
    }

    const slotDateStr = new Date(registration.slot.date).toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];
    if (slotDateStr < todayStr) {
      return { success: false, error: "Tiết dạy đã diễn ra trong quá khứ. Không thể hủy đăng ký dự giờ." }
    }

    await prisma.observationRegistration.delete({
      where: { id: registration.id }
    })

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Helper phân quyền quản trị tiết dạy (Áp dụng cho Ban ĐHCM, GĐCS, TBP, TTCM)
async function canUserManageSlot(userId: string, userRole: string, slot: any): Promise<boolean> {
  const cleanRole = (userRole || "").toUpperCase().trim();
  const isSuperOrBanDHCM = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "SUPERADMIN", "KT_DBCL", "BAN_DHCM"].includes(cleanRole);
  if (isSuperOrBanDHCM) return true;

  const currentTeacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      departmentAssignments: true,
      divisionAssignments: true,
      departmentRel: true
    }
  });
  if (!currentTeacher) return false;

  // Nếu là chính GV tạo slot:
  if (slot.teacherId === currentTeacher.id) return true;

  const pos = (currentTeacher.position || "").toUpperCase();
  const allPositions: string[] = [pos];
  if (currentTeacher.positions) {
    try {
      const parsed = typeof currentTeacher.positions === "string" ? JSON.parse(currentTeacher.positions) : currentTeacher.positions;
      if (Array.isArray(parsed)) parsed.forEach(p => allPositions.push(String(p).toUpperCase()));
    } catch {}
  }
  currentTeacher.departmentAssignments?.forEach((da: any) => { if (da.position) allPositions.push(String(da.position).toUpperCase()); });
  currentTeacher.divisionAssignments?.forEach((da: any) => { if (da.position) allPositions.push(String(da.position).toUpperCase()); });

  // 1. Ban ĐHCM / BGH
  const isBanDHCM = ["BAN_DHCM", "TB_DHCM", "TRUONG_BAN_DHCM", "PHO_BAN_DHCM", "QLCM", "BGH", "BAN GIAM HIEU"].some(k => 
    allPositions.some(p => p.includes(k)) || cleanRole.includes(k)
  );
  if (isBanDHCM) return true;

  // 2. GĐCS: Quản lý các tiết thuộc Cơ sở đó
  const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CO_SO", "PGDCS", "PGĐCS", "GIÁM ĐỐC CƠ SỞ"].some(k => 
    allPositions.some(p => p.includes(k)) || cleanRole.includes(k)
  );
  if (isGDCS) {
    const slotTeacher = slot.teacher || await prisma.teacher.findUnique({ where: { id: slot.teacherId }, select: { campusId: true } });
    if (slot.campusId === currentTeacher.campusId || slotTeacher?.campusId === currentTeacher.campusId) {
      return true;
    }
  }

  // 3. TBP: Quản lý các TCM trực thuộc Bộ phận
  const isTBP = ["TBP", "TRUONG_BO_PHAN", "TRUONG_BOPHAN", "PHO_BO_PHAN", "TRƯỞNG BỘ PHẬN"].some(k => 
    allPositions.some(p => p.includes(k)) || cleanRole.includes(k)
  );
  if (isTBP) {
    const myDivCodes = new Set<string>();
    currentTeacher.divisionAssignments?.forEach((da: any) => { if (da.divisionCode) myDivCodes.add(normalizeDivisionCode(da.divisionCode)); });
    const slotTeacher = slot.teacher || await prisma.teacher.findUnique({ 
      where: { id: slot.teacherId }, 
      include: { departmentRel: true } 
    });
    const slotDivCode = normalizeDivisionCode(slotTeacher?.departmentRel?.divisionCode || "");
    if (slotDivCode && myDivCodes.has(slotDivCode)) {
      return true;
    }
  }

  // 4. TTCM: Tổ nào thì quản lý được Tổ đó
  const isTTCM = ["TTCM", "TỔ TRƯỞNG", "TO_TRUONG", "TỔ PHÓ", "TO_PHO", "TPCM"].some(k => 
    allPositions.some(p => p.includes(k)) || cleanRole.includes(k)
  );
  if (isTTCM) {
    const myDeptIds = new Set<string>();
    if (currentTeacher.departmentId) myDeptIds.add(currentTeacher.departmentId);
    currentTeacher.departmentAssignments?.forEach((da: any) => {
      if (["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM", "Tổ phó", "TO_PHO", "TPCM", "TPTCM"].some(k => (da.position || "").toUpperCase().includes(k.toUpperCase())) && da.departmentId) {
        myDeptIds.add(da.departmentId);
      }
    });
    const slotTeacher = slot.teacher || await prisma.teacher.findUnique({ where: { id: slot.teacherId }, select: { departmentId: true } });
    if ((slotTeacher?.departmentId && myDeptIds.has(slotTeacher.departmentId)) || (slot.targetDeptId && myDeptIds.has(slot.targetDeptId))) {
      return true;
    }
  }

  return false;
}

export async function deleteObservationSlot(slotId: string) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: { teacher: { include: { departmentRel: true } } }
    })

    if (!slot) {
      return { success: false, error: "Không tìm thấy thông tin tiết dạy" }
    }

    const hasManagePerm = await canUserManageSlot(session.user.id, roleCode, slot);
    if (!hasManagePerm) {
      return { success: false, error: "Thầy/Cô không có thẩm quyền xóa hoặc quản lý tiết dạy này" };
    }

    const cleanRole = (roleCode || "").toUpperCase().trim();
    const isSuperOrBanDHCM = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "SUPERADMIN", "KT_DBCL", "BAN_DHCM"].includes(cleanRole);
    if (!isSuperOrBanDHCM) {
      const hasEvaluations = await prisma.observationEvaluation.count({
        where: { registration: { slotId } }
      });
      if (hasEvaluations > 0) {
        return { success: false, error: "Tiết dạy đã có phiếu đánh giá dự giờ. Không thể xóa." };
      }
    }

    // Delete evaluations & registrations linked to this slot first
    await prisma.observationEvaluation.deleteMany({
      where: { registration: { slotId } }
    })

    await prisma.observationRegistration.deleteMany({
      where: { slotId }
    })

    await prisma.observationSlot.delete({
      where: { id: slotId }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/teacher/du-gio-mam-non")
    revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    revalidatePath("/admin/tong-hop-du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteMultipleObservationSlots(slotIds: string[]) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    if (!Array.isArray(slotIds) || slotIds.length === 0) {
      return { success: false, error: "Danh sách tiết dạy cần xóa trống" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const slots = await prisma.observationSlot.findMany({
      where: { id: { in: slotIds } },
      include: { teacher: { include: { departmentRel: true } } }
    });

    for (const slot of slots) {
      const hasPerm = await canUserManageSlot(session.user.id, roleCode, slot);
      if (!hasPerm) {
        return { success: false, error: `Thầy/Cô không có thẩm quyền xóa tiết dạy "${slot.topic}" do không thuộc phạm vi quản lý của Thầy/Cô` };
      }
    }

    const cleanRole = (roleCode || "").toUpperCase().trim();
    const isSuperOrBanDHCM = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "SUPERADMIN", "KT_DBCL", "BAN_DHCM"].includes(cleanRole);
    if (!isSuperOrBanDHCM) {
      const hasEvaluations = await prisma.observationEvaluation.count({
        where: { registration: { slotId: { in: slotIds } } }
      });
      if (hasEvaluations > 0) {
        return { success: false, error: "Một hoặc nhiều tiết dạy đã có phiếu đánh giá dự giờ. Không thể xóa." };
      }
    }

    // Delete linked evaluations
    await prisma.observationEvaluation.deleteMany({
      where: { registration: { slotId: { in: slotIds } } }
    })

    // Delete linked registrations
    await prisma.observationRegistration.deleteMany({
      where: { slotId: { in: slotIds } }
    })

    // Delete slots
    const deleteResult = await prisma.observationSlot.deleteMany({
      where: { id: { in: slotIds } }
    })

    revalidatePath("/teacher/du-gio")
    revalidatePath("/teacher/du-gio-mam-non")
    revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    revalidatePath("/admin/tong-hop-du-gio")

    return { success: true, count: deleteResult.count }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getCreatedCountInMonth(dateString: string) {
  try {
    const session = await auth()
    if (!session || !session.user) return { success: false, count: 0 }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) return { success: false, count: 0 }

    const slotDate = new Date(dateString)
    const startOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth(), 1)
    const endOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 1)

    const count = await prisma.observationSlot.count({
      where: {
        teacherId: currentTeacher.id,
        date: {
          gte: startOfMonth,
          lt: endOfMonth
        },
        status: "ACTIVE"
      }
    })

    return { success: true, count }
  } catch (e: any) {
    return { success: false, count: 0 }
  }
}

export async function approveRegistration(registrationId: string) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }
    const currentTeacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!currentTeacher) return { success: false, error: "Teacher profile not found" }
    const registration = await prisma.observationRegistration.findUnique({ where: { id: registrationId }, include: { slot: true } })
    if (!registration) return { success: false, error: "Registration not found" }
    const isObsAdmin = await checkIsObservationAdmin(session.user.role || "", session.user.id);
    if (registration.slot.teacherId !== currentTeacher.id && !isObsAdmin) {
      return { success: false, error: "Bạn không phải giáo viên chủ trì hoặc không có quyền quản trị để duyệt đăng ký này" };
    }
    
    // Enforce max 4 approved observers limit
    const approvedCount = await prisma.observationRegistration.count({
      where: { slotId: registration.slotId, isApproved: true }
    })
    if (approvedCount >= 4) {
      return { success: false, error: "Tiết dạy này đã đạt tối đa 4 giáo viên dự giờ được xác nhận." }
    }

    await prisma.observationRegistration.update({ where: { id: registrationId }, data: { isApproved: true, approvedAt: new Date() } })

    // Tự động chuyển trạng thái tiết sang ACTIVE nếu tiết đang là PENDING_TEACHER_APPROVAL
    if (registration.slot.status === "PENDING_TEACHER_APPROVAL") {
      await prisma.observationSlot.update({
        where: { id: registration.slotId },
        data: { status: "ACTIVE" }
      });
    }

    try {
      revalidatePath("/admin/du-gio");
      revalidatePath("/teacher/du-gio");
    } catch (e) {}

    // Non-blocking dispatch of Email, In-app Notification, and MS Teams via after()
    after(async () => {
      try {
        const regFull = await prisma.observationRegistration.findUnique({
          where: { id: registrationId },
          include: {
            teacher: { include: { departmentRel: true, campus: true, user: true } },
            slot: { include: { teacher: { include: { campus: true } } } }
          }
        });

        if (!regFull || !regFull.teacher) return;

        const observerTeacher = regFull.teacher;
        const hostSlot = regFull.slot;
        const observerEmail = getTeacherResolvedEmail(observerTeacher);

        const formattedDate = new Date(hostSlot.date).toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
        const observerDirectLink = SKYLINE_SSM_LOGIN_URL;

        // 1. In-App Notification for Observer Teacher
        if (observerTeacher?.user?.id) {
          await prisma.notification.create({
            data: {
              userId: observerTeacher.user.id,
              title: "Đăng ký dự giờ đã được duyệt ✅",
              message: `Thầy/Cô ${currentTeacher.teacherName} đã phê duyệt đăng ký tham gia dự giờ tiết "${hostSlot.topic || "tiết học"}" của Thầy/Cô.`,
              link: "/teacher/du-gio?tab=my_schedule",
              isRead: false
            }
          }).catch(e => console.error("[approveRegistration] In-app notif error:", e));
        }

        // 2. Email Notification to Observer Teacher
        if (observerEmail && observerEmail.includes("@")) {
          const emailHtml = renderObservationRequestResponseForObserver({
            observerName: observerTeacher.teacherName,
            hostName: currentTeacher.teacherName,
            hostCode: currentTeacher.teacherCode || undefined,
            topic: hostSlot.topic,
            subjectName: hostSlot.subjectName,
            grade: hostSlot.grade,
            className: hostSlot.className || undefined,
            dateStr: formattedDate,
            period: `${hostSlot.startTime} - ${hostSlot.endTime}`,
            accepted: true,
            directLink: observerDirectLink
          });

          await sendEmail({
            from: "BAN KHẢO THÍ & ĐBCL SKY-LINE",
            to: observerEmail,
            subject: `[Sky-line SMS - Dự Giờ] Xác nhận tham dự tiết dạy: "${hostSlot.topic}" - GV ${currentTeacher.teacherName}`,
            html: emailHtml
          })
            .then(res => console.log("[approveRegistration] Email sent to observer:", observerEmail, res?.messageId))
            .catch(err => console.error("[approveRegistration] Failed sending email to observer:", err));
        } else {
          console.warn("[approveRegistration] Observer teacher does not have a valid email:", observerTeacher.teacherName);
        }

        // 3. MS Teams Notification
        sendTeamsApprovalWithEvalFormNotif(
          {
            id: hostSlot.id,
            topic: hostSlot.topic,
            subjectName: hostSlot.subjectName,
            level: hostSlot.level,
            grade: hostSlot.grade,
            className: hostSlot.className,
            date: hostSlot.date,
            startTime: hostSlot.startTime,
            endTime: hostSlot.endTime,
            campusName: hostSlot.campusName,
            room: hostSlot.room
          },
          {
            teacherName: observerTeacher.teacherName,
            teacherCode: observerTeacher.teacherCode,
            email: observerTeacher.email,
            teamsWebhookUrl: (observerTeacher as any)?.departmentRel?.teamsWebhookUrl
          },
          currentTeacher.teacherName
        ).catch(err => console.error("Teams approval error:", err));

      } catch (bgErr) {
        console.error("[approveRegistration] Background dispatch error:", bgErr);
      }
    });

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function submitEvaluation(data: {
  registrationId: string
  slotId: string
  criterion1?: number
  criterion2?: number
  criterion3?: number
  criterion4?: number
  criterion5?: number
  score1?: number
  score2?: number
  score3?: number
  score4?: number
  score5?: number
  score6?: number
  score7?: number
  score8?: number
  score9?: number
  score10?: number
  score11?: number
  totalScore?: number
  strengths: string
  improvements: string
  generalComment: string
  overallRating: string
}) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }
    const currentTeacher = await prisma.teacher.findUnique({ 
      where: { userId: session.user.id },
      include: { 
        user: true, 
        campus: true,
        departmentRel: true,
        departmentAssignments: { include: { department: true } }
      }
    })
    if (!currentTeacher) return { success: false, error: "Teacher profile not found" }
    const registration = await prisma.observationRegistration.findUnique({ 
      where: { id: data.registrationId }, 
      include: { evaluation: true, slot: true } 
    })
    if (!registration) return { success: false, error: "Không tìm thấy đăng ký dự giờ" }
    
    // Chặn nộp chấm điểm sớm khi tiết học chưa diễn ra
    if (new Date(registration.slot.date) > new Date()) {
      return { success: false, error: "Tiết học chưa diễn ra. Không thể nộp phiếu đánh giá trước thời gian học." }
    }
    // Chỉ cho phép đánh giá các tiết dạy trong tháng hiện tại (dựa vào ngày dạy slot.date)
    const slotDate = new Date(registration.slot.date);
    const now = new Date();
    const isSameMonth = !isNaN(slotDate.getTime()) && slotDate.getFullYear() === now.getFullYear() && slotDate.getMonth() === now.getMonth();
    const roleCode = (session.user as any)?.role || "";
    const isAdmin = ["ADMIN", "ADMINISTRATOR"].includes(roleCode);

    if (!registration.evaluation && !isAdmin && !isSameMonth) {
      return {
        success: false,
        error: `Chỉ được phép đánh giá các tiết dạy diễn ra trong tháng hiện tại (Tháng ${now.getMonth() + 1}/${now.getFullYear()}). Tiết dạy này thuộc tháng ${slotDate.getMonth() + 1}/${slotDate.getFullYear()}!`
      };
    }

    const isPastDate = !isNaN(slotDate.getTime()) && 
      new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate()) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!registration.evaluation && !isAdmin && isPastDate) {
      return {
        success: false,
        error: "Tiết dạy đã qua ngày diễn ra. Thầy/Cô vui lòng sử dụng chức năng 'Phiếu dự giờ bổ sung' kèm lý do để Giáo viên giảng dạy phê duyệt!"
      };
    }

    if (registration.teacherId !== currentTeacher.id) return { success: false, error: "Không có quyền nộp phiếu này" }
    if (!registration.isApproved) return { success: false, error: "Cần được xác nhận dự giờ trước khi nộp phiếu đánh giá" }
    // Bắt buộc nhập "Nội dung cần cải thiện / Góp ý phát triển"
    if (!data.improvements || !data.improvements.trim()) {
      return { success: false, error: "Nội dung cần cải thiện / Góp ý phát triển là bắt buộc. Vui lòng nhập nhận xét trước khi hoàn tất phiếu đánh giá!" }
    }

    const evalData = {
      criterion1: data.criterion1 ?? null,
      criterion2: data.criterion2 ?? null,
      criterion3: data.criterion3 ?? null,
      criterion4: data.criterion4 ?? null,
      criterion5: data.criterion5 ?? null,
      score1: data.score1 ?? null,
      score2: data.score2 ?? null,
      score3: data.score3 ?? null,
      score4: data.score4 ?? null,
      score5: data.score5 ?? null,
      score6: data.score6 ?? null,
      score7: data.score7 ?? null,
      score8: data.score8 ?? null,
      score9: data.score9 ?? null,
      score10: data.score10 ?? null,
      score11: data.score11 ?? null,
      totalScore: data.totalScore ?? null,
      strengths: data.strengths || "",
      improvements: data.improvements.trim(),
      generalComment: data.generalComment || "",
      overallRating: data.overallRating,
      submittedAt: new Date(),
      reEvaluationStatus: registration.evaluation?.reEvaluationStatus === "APPROVED" ? "COMPLETED" : (registration.evaluation?.reEvaluationStatus === "DRAFT" ? null : registration.evaluation?.reEvaluationStatus)
    }
    if (registration.evaluation) {
      await prisma.observationEvaluation.update({ where: { registrationId: data.registrationId }, data: evalData })
    } else {
      await prisma.observationEvaluation.create({
        data: { registrationId: data.registrationId, slotId: data.slotId, evaluatorId: currentTeacher.id, ...evalData }
      })
    }

    // Gửi Email thông báo kết quả đánh giá cho Giáo viên được dự (Host Teacher) & Người dự giờ (Observer)
    try {
      const slotFull = await prisma.observationSlot.findUnique({
        where: { id: data.slotId },
        include: {
          teacher: { include: { user: true, campus: true } }
        }
      });
      const hostTeacher = slotFull?.teacher;
      const hostEmail = getTeacherResolvedEmail(hostTeacher);
      const observerEmail = getTeacherResolvedEmail(currentTeacher);

      const isMN = slotFull?.level === "Mầm non";
      const isSurprise = slotFull?.requestOrigin === "SURPRISE" || 
        (typeof slotFull?.description === "string" && (slotFull.description.includes("[SURPRISE]") || slotFull.description.toLowerCase().includes("dự giờ đột xuất")));
      const formattedDateVi = slotFull?.date 
        ? new Date(slotFull.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
        : "";
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://ssm.skylineschool.edu.vn";
      const totalDisplay = data.totalScore != null ? (isMN ? `${Number(data.totalScore).toFixed(2)} / 10.00đ` : `${Number(data.totalScore).toFixed(2)} / 20.00đ`) : "Đã hoàn thành";
      const ratingDisplay = data.overallRating || "Đạt";

      // 1. Gửi Email thông báo cho Giáo viên được dự (Host Teacher)
      if (hostTeacher && hostEmail && hostEmail.includes("@")) {
        const linkUrl = SKYLINE_SSM_LOGIN_URL;
        const emailSubject = isSurprise
          ? `[Sky-line SMS - Dự Giờ Đột Xuất] Kết quả đánh giá tiết dạy: "${slotFull?.topic}" - Người dự: ${currentTeacher.teacherName}`
          : `[Sky-line SMS - Dự Giờ] Kết quả đánh giá tiết dạy: "${slotFull?.topic}" - Người dự: ${currentTeacher.teacherName}`;

        const observerDeptName = currentTeacher.departmentRel?.name || 
          currentTeacher.departmentAssignments?.map((da: any) => da.department?.name).filter(Boolean).join(", ") || 
          undefined;

        // Parse criteria scores
        let parsedCriteriaScores: number[] = [];
        if (isMN) {
          try {
            const parsed = typeof data.generalComment === "string" ? JSON.parse(data.generalComment) : null;
            if (parsed && Array.isArray(parsed.scores)) {
              parsedCriteriaScores = parsed.scores;
            }
          } catch (e) {}
          if (parsedCriteriaScores.length === 0) {
            parsedCriteriaScores = [
              data.criterion1 || 0,
              data.criterion2 || 0,
              data.criterion3 || 0,
              data.criterion4 || 0,
              data.criterion5 || 0
            ];
          }
        } else {
          parsedCriteriaScores = [
            data.score1 || 0,
            data.score2 || 0,
            data.score3 || 0,
            data.score4 || 0,
            data.score5 || 0,
            data.score6 || 0,
            data.score7 || 0,
            data.score8 || 0,
            data.score9 || 0,
            data.score10 || 0,
            data.score11 || 0
          ];
        }

        const emailHtml = isSurprise
          ? renderObservationSurpriseCompletedForHost({
              hostName: hostTeacher.teacherName,
              observerName: currentTeacher.teacherName,
              observerCode: currentTeacher.teacherCode,
              observerPosition: currentTeacher.position || undefined,
              observerEmail: observerEmail || undefined,
              observerDepartment: observerDeptName,
              topic: slotFull?.topic || "Tiết dạy",
              subjectName: slotFull?.subjectName || "Môn học",
              grade: slotFull?.grade || "",
              className: slotFull?.className || "",
              dateStr: formattedDateVi,
              period: slotFull?.startTime || "Tiết dạy",
              campusName: slotFull?.campusName || hostTeacher.campus?.campusName || "Sky-Line",
              room: slotFull?.room || "học",
              totalScore: totalDisplay,
              rating: ratingDisplay,
              strengths: data.strengths || undefined,
              improvements: data.improvements || undefined,
              generalComment: data.generalComment || undefined,
              directLink: linkUrl,
              criteriaScores: {
                type: isMN ? "MAMNON" : "K12",
                scores: parsedCriteriaScores
              }
            })
          : renderObservationEvaluationCompletedForHost({
              hostName: hostTeacher.teacherName,
              observerName: currentTeacher.teacherName,
              observerCode: currentTeacher.teacherCode,
              observerPosition: currentTeacher.position || undefined,
              topic: slotFull?.topic || "Tiết dạy",
              subjectName: slotFull?.subjectName || "Môn học",
              grade: slotFull?.grade || undefined,
              className: slotFull?.className || undefined,
              dateStr: formattedDateVi,
              period: slotFull?.startTime || "1",
              campusName: slotFull?.campusName || hostTeacher.campus?.campusName || undefined,
              room: slotFull?.room || undefined,
              totalScore: totalDisplay,
              rating: ratingDisplay,
              strengths: data.strengths || undefined,
              improvements: data.improvements || undefined,
              generalComment: data.generalComment || undefined,
              directLink: linkUrl
            });

        await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: hostEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Evaluation completed email error:", e));

        if (hostTeacher.user?.id) {
          await prisma.notification.create({
            data: {
              userId: hostTeacher.user.id,
              title: isSurprise ? "Kết quả dự giờ đột xuất ⚡" : "Kết quả đánh giá tiết dạy dự giờ",
              message: `Thầy/Cô ${currentTeacher.teacherName} vừa hoàn thành phiếu đánh giá ${isSurprise ? "dự giờ đột xuất" : "tiết dạy"} "${slotFull?.topic}". Xếp loại: ${ratingDisplay}.`,
              link: `/teacher/du-gio?tab=evaluations`,
              isRead: false
            }
          }).catch(e => console.error("Notif error:", e));
        }
      }

      // 2. Gửi Email xác nhận & bản lưu cho Người dự giờ (Observer / Evaluator)
      if (observerEmail && observerEmail.includes("@") && observerEmail !== hostEmail) {
        const observerLinkUrl = SKYLINE_SSM_LOGIN_URL;
        const observerSubject = isSurprise
          ? `[Sky-line SMS - Dự Giờ Đột Xuất] Xác nhận biên bản & đánh giá đột xuất: "${slotFull?.topic}" - GV dạy: ${hostTeacher?.teacherName || "Giáo viên"}`
          : `[Sky-line SMS - Dự Giờ] Xác nhận hoàn tất đánh giá tiết dạy: "${slotFull?.topic}" - GV dạy: ${hostTeacher?.teacherName || "Giáo viên"}`;

        const observerHtml = renderObservationEvaluationCompletedForObserver({
          observerName: currentTeacher.teacherName,
          hostName: hostTeacher?.teacherName || "Giáo viên",
          hostCode: hostTeacher?.teacherCode || undefined,
          topic: slotFull?.topic || "Tiết dạy",
          subjectName: slotFull?.subjectName || "Môn học",
          grade: slotFull?.grade || undefined,
          className: slotFull?.className || undefined,
          dateStr: formattedDateVi,
          period: slotFull?.startTime || "1",
          campusName: slotFull?.campusName || hostTeacher?.campus?.campusName || undefined,
          room: slotFull?.room || undefined,
          totalScore: totalDisplay,
          rating: ratingDisplay,
          strengths: data.strengths || undefined,
          improvements: data.improvements || undefined,
          generalComment: data.generalComment || undefined,
          directLink: observerLinkUrl
        });
        await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: observerEmail, subject: observerSubject, html: observerHtml }).catch(e => console.error("Observer evaluation confirmation email error:", e));

        if (currentTeacher.user?.id) {
          await prisma.notification.create({
            data: {
              userId: currentTeacher.user.id,
              title: isSurprise ? "Đã hoàn tất dự giờ đột xuất ⚡" : "Đã hoàn tất đánh giá tiết dự giờ",
              message: `Thầy/Cô đã hoàn tất ${isSurprise ? "biên bản và phiếu đánh giá dự giờ đột xuất" : "nộp phiếu đánh giá"} tiết dạy "${slotFull?.topic}" của GV ${hostTeacher?.teacherName || ""}.`,
              link: `/teacher/du-gio?tab=my-registrations`,
              isRead: false
            }
          }).catch(e => console.error("Observer notif error:", e));
        }
      }
    } catch (mailErr) {
      console.error("Error sending evaluation completed email:", mailErr);
    }

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function updateObservationSlot(slotId: string, data: {
  subjectId?: string
  subjectName: string
  level: string
  grade: string
  topic: string
  date: string
  startTime: string
  endTime: string
  isDoublePeriod: boolean
  room?: string
  description?: string
  visibilityType: string
  targetDeptId?: string
  campusId?: string
  campusName?: string
  classId?: string
  className?: string
  lessonPlanName?: string
  lessonPlanData?: string
  sendEmailNotif?: boolean
  notifMode?: string
  selectedMemberIds?: string[]
}) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentTeacher) {
      return { success: false, error: "Teacher profile not found" }
    }

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId }
    })

    if (!slot) {
      return { success: false, error: "Observation slot not found" }
    }

    if (slot.teacherId !== currentTeacher.id) {
      return { success: false, error: "You can only edit your own observation slots" }
    }

    const slotDate = new Date(data.date)

    const cookieStore = await cookies();
    const cookieYearId = cookieStore.get("selectedAcademicYear")?.value;
    let yearId = cookieYearId || null;
    if (yearId) {
      const yearExists = await prisma.academicYear.findUnique({ where: { id: yearId } });
      if (!yearExists) yearId = null;
    }

    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      })

      const matchingYear = activeYear ? await prisma.academicYear.findFirst({
        where: {
          startDate: { lte: slotDate },
          endDate: { gte: slotDate }
        }
      }) : null

      yearId = matchingYear?.id || activeYear?.id || null
    }

    const updatedSlot = await prisma.observationSlot.update({
      where: { id: slotId },
      data: {
        subjectId: data.subjectId || null,
        subjectName: data.subjectName,
        level: data.level,
        grade: data.grade,
        topic: data.topic,
        date: slotDate,
        startTime: data.startTime,
        endTime: data.endTime,
        isDoublePeriod: data.isDoublePeriod,
        room: data.room || null,
        description: data.description || null,
        visibilityType: data.visibilityType,
        targetDeptId: data.targetDeptId || null,
        campusId: data.campusId || null,
        campusName: data.campusName || null,
        classId: data.classId || null,
        className: data.className || null,
        lessonPlanName: data.lessonPlanName !== undefined ? data.lessonPlanName : slot.lessonPlanName,
        lessonPlanData: data.lessonPlanData !== undefined ? data.lessonPlanData : slot.lessonPlanData,
        academicYearId: yearId
      }
    })

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true, slot: updatedSlot }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTeacherObservationTargets(
  teacherId: string,
  data: {
    observerType?: string | null
    observeeType?: string | null
    requiredObserved: number
    observedUnit: string
    requiredTaught: number
    taughtUnit: string
    academicYearId?: string
  }
) {
  try {
    invalidateObservationSlotsCache();
    invalidateObservationRefCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = await checkIsObservationAdmin(roleCode, session.user.id)
    const isSuperAdmin = roleCode === "ADMIN" || isAdmin
    const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

    // Also allow TBP, TTCM, or the teacher themselves to update their own targets
    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { 
        id: true, 
        position: true, 
        departmentId: true,
        departmentAssignments: { select: { departmentId: true, position: true } },
        divisionAssignments: true
      }
    })

    const isTTCM = currentTeacher?.position === "TTCM" || 
      currentTeacher?.departmentAssignments?.some((da: any) => 
        ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(da.position)
      );

    const isTBP = ["TBP", "TB_DHCM", "BAN_DHCM"].includes(currentTeacher?.position || "") ||
      ["TBP", "TB_DHCM", "BAN_DHCM"].includes(roleCode) ||
      (currentTeacher?.divisionAssignments?.length || 0) > 0;

    const isSelf = currentTeacher && currentTeacher.id === teacherId

    if (!isSuperAdmin && !isTBP && !isTTCM && !isGDCS) {
      return { success: false, error: "Bạn không có quyền cấu hình chỉ tiêu. Chỉ TTCM, Ban ĐHCM hoặc Quản trị viên mới được phân bổ chỉ tiêu." }
    }

    // If they are TBP, verify that the teacher belongs to their division
    if (isTBP && !isSuperAdmin) {
      const myDivCodes = new Set<string>();
      currentTeacher?.divisionAssignments?.forEach((da: any) => myDivCodes.add(da.divisionCode));
      if (["BAN_DHCM", "TB_DHCM"].includes(currentTeacher?.position || "") || ["BAN_DHCM", "TB_DHCM"].includes(roleCode)) {
        myDivCodes.add("BAN_DHCM");
      }
      const isSuperDiv = Array.from(myDivCodes).some(dc => ["BAN_GD", "BAN_KT_DBCL", "BAN_DHCM", "BAN_TT"].includes(dc));
      if (!isSuperDiv) {
        const targetTeacher = await prisma.teacher.findUnique({
          where: { id: teacherId },
          include: {
            departmentRel: true,
            departmentAssignments: { include: { department: true } },
            divisionAssignments: true
          }
        });
        const targetDivCodes = new Set<string>();
        if (targetTeacher?.departmentRel?.divisionCode) targetDivCodes.add(targetTeacher.departmentRel.divisionCode);
        targetTeacher?.departmentAssignments?.forEach((da: any) => {
          if (da.department?.divisionCode) targetDivCodes.add(da.department.divisionCode);
        });
        targetTeacher?.divisionAssignments?.forEach((da: any) => targetDivCodes.add(da.divisionCode));
        const hasMatchingDiv = Array.from(myDivCodes).some(dc => targetDivCodes.has(dc));
        if (!hasMatchingDiv && !isTTCM) {
          return { success: false, error: "Trưởng Bộ Phận chỉ có quyền cấu hình chỉ tiêu cho GV/TTCM thuộc Bộ phận mình phụ trách" };
        }
      }
    } else if (isTTCM && !isSuperAdmin && !isSelf) {
      // If they are TTCM, make sure the target teacher is in their department
      const targetTeacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { departmentId: true, departmentAssignments: { select: { departmentId: true } } }
      })
      const ttcmDeptIds = new Set<string>();
      if (currentTeacher?.departmentId) ttcmDeptIds.add(currentTeacher.departmentId);
      currentTeacher?.departmentAssignments?.forEach((da: any) => {
        if (["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(da.position) && da.departmentId) {
          ttcmDeptIds.add(da.departmentId);
        }
      });
      const isInDept = (targetTeacher?.departmentId && ttcmDeptIds.has(targetTeacher.departmentId)) ||
        targetTeacher?.departmentAssignments?.some((da: any) => ttcmDeptIds.has(da.departmentId));
      if (!isInDept) {
        return { success: false, error: "Bạn chỉ có thể cấu hình chỉ tiêu cho giáo viên thuộc tổ của mình" }
      }
    }

    const activeYear = data.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: data.academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
    if (!activeYear) {
      return { success: false, error: "Không tìm thấy năm học hoạt động" }
    }

    await prisma.teacherAcademicYearTarget.upsert({
      where: {
        teacherId_academicYearId: {
          teacherId: teacherId,
          academicYearId: activeYear.id
        }
      },
      update: {
        observerType: data.observerType || null,
        observeeType: data.observeeType || null,
        requiredObserved: data.requiredObserved,
        observedUnit: data.observedUnit,
        requiredTaught: data.requiredTaught,
        taughtUnit: data.taughtUnit,
        confirmed: true,
        confirmedAt: new Date()
      },
      create: {
        teacherId: teacherId,
        academicYearId: activeYear.id,
        observerType: data.observerType || null,
        observeeType: data.observeeType || null,
        requiredObserved: data.requiredObserved,
        observedUnit: data.observedUnit,
        requiredTaught: data.requiredTaught,
        taughtUnit: data.taughtUnit,
        confirmed: true,
        confirmedAt: new Date()
      }
    })

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    revalidatePath("/admin/tong-hop-du-gio")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}




let isDbColumnsEnsured = false;

async function ensureDbColumns() {
  if (isDbColumnsEnsured) return;
  isDbColumnsEnsured = true;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Teacher" ADD COLUMN "teamsWebhookUrl" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Department" ADD COLUMN "teamsWebhookUrl" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "expiredNotifSentAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "lastRemindedAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "requestOrigin" TEXT DEFAULT 'TEACHER_OPEN';`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationSlot" ADD COLUMN "rejectionReason" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "reEvaluationStatus" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "reEvaluationReason" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "reEvaluationRequestedAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "reEvaluationApprovedAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "reEvaluationApprovedBy" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "reEvaluationNote" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "teacherAcknowledgedAt" TIMESTAMP;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "teacherAcknowledgedAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "teacherFeedback" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "teacherFeedbackAt" TIMESTAMP;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "teacherFeedbackAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "isSupplemental" BOOLEAN DEFAULT 0;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalStatus" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalReason" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalSubmittedAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalReviewedAt" DATETIME;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalReviewedBy" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalReviewNote" TEXT;`);
  } catch (e) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ObservationEvaluation" ADD COLUMN "supplementalHistory" TEXT;`);
  } catch (e) {}
}

export async function requestObservationSlot(data: {
  targetTeacherId: string
  targetDeptId?: string
  classId?: string
  className?: string
  level?: string
  grade?: string
  subjectId?: string
  subjectName?: string
  topic?: string
  date: string
  period?: string
  room?: string
  notes?: string
  academicYearId?: string
}) {
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const roleCode = (session.user as any)?.role || "TEACHER";
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode);

    // Parallelize initial lookups for maximum database speed
    const [observerTeacherResult, hostTeacherResult, activeYear] = await Promise.all([
      prisma.teacher.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            { email: session.user.email || undefined },
            { teacherCode: (session.user as any)?.username || undefined }
          ]
        },
        include: { user: true, campus: true, departmentRel: true }
      }),
      prisma.teacher.findFirst({
        where: {
          OR: [
            { id: data.targetTeacherId },
            { teacherCode: data.targetTeacherId },
            { userId: data.targetTeacherId }
          ]
        },
        include: { campus: true, departmentRel: true, user: true }
      }),
      data.academicYearId
        ? prisma.academicYear.findUnique({ where: { id: data.academicYearId } })
        : prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
    ]);

    const hostTeacher = hostTeacherResult;

    let observerTeacher = observerTeacherResult;
    if (!observerTeacher && isAdmin) {
      observerTeacher = {
        id: "admin-" + session.user.id,
        teacherName: session.user.name || "Administrator",
        teacherCode: "ADMIN",
        email: session.user.email || null
      } as any;
    }

    if (!observerTeacher) {
      return { success: false, error: "Tài khoản của bạn chưa được gắn với hồ sơ Nhân sự/Giáo viên." };
    }

    if (!hostTeacher) {
      return { success: false, error: "Không tìm thấy thông tin Giáo viên dạy." };
    }

    if (observerTeacher && hostTeacher && observerTeacher.id === hostTeacher.id) {
      return { success: false, error: "Thầy/Cô không thể tự gửi đề xuất dự giờ chính mình." };
    }

    const periodMap: Record<string, { start: string; end: string }> = {
      "Tiết 1": { start: "07:30", end: "08:15" },
      "Tiết 2": { start: "08:25", end: "09:10" },
      "Tiết 3": { start: "09:30", end: "10:15" },
      "Tiết 4": { start: "10:25", end: "11:10" },
      "Tiết 5": { start: "13:00", end: "13:45" },
      "Tiết 6": { start: "13:55", end: "14:40" },
      "Tiết 7": { start: "15:00", end: "15:45" },
      "Tiết 8": { start: "15:55", end: "16:40" }
    };
    const timeRange = periodMap[data.period || "Tiết 1"] || { start: "07:30", end: "08:15" };

    // Standardize date parsing to prevent UTC-7 timezone offsets
    const rawDateStr = String(data.date || "").trim();
    const slotDate = new Date(rawDateStr.includes("T") ? rawDateStr : `${rawDateStr}T07:00:00+07:00`);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (!isNaN(slotDate.getTime()) && slotDate < currentMonthStart) {
      return { success: false, error: "Không thể xin dự giờ các tiết dạy thuộc các tháng trước. Vui lòng chọn ngày trong tháng hiện tại hoặc các tháng sau!" };
    }

    // Atomic database creation: ObservationSlot with initial Registration
    let newSlot: any;
    const slotCreateData: any = {
      teacherId: hostTeacher.id,
      targetDeptId: data.targetDeptId || hostTeacher.departmentId || hostTeacher.departmentRel?.id || null,
      classId: data.classId || null,
      className: data.className || "Lớp chọn",
      level: data.level || "ALL",
      grade: data.grade || "Khối",
      subjectId: data.subjectId || null,
      subjectName: data.subjectName || "Môn học",
      topic: data.topic || "Đề xuất xin dự giờ tiết học",
      date: slotDate,
      startTime: data.period || timeRange.start,
      endTime: timeRange.end,
      room: data.room || "Phòng học",
      description: data.notes || "Yêu cầu xin dự giờ từ GVBM",
      visibilityType: "PUBLIC",
      maxSeats: 4,
      status: "PENDING_TEACHER_APPROVAL",
      requestOrigin: "OBSERVER_REQUEST",
      academicYearId: activeYear?.id || null,
      campusId: hostTeacher.campusId || null,
      campusName: hostTeacher.campus?.campusName || null
    };

    try {
      newSlot = await prisma.observationSlot.create({
        data: slotCreateData
      });
    } catch (createErr: any) {
      if (createErr?.message?.includes("requestOrigin") || createErr?.message?.includes("no column named")) {
        delete slotCreateData.requestOrigin;
        slotCreateData.description = (data.notes ? data.notes + " | " : "") + "[GVBM_XIN_DU_GIO]";
        newSlot = await prisma.observationSlot.create({
          data: slotCreateData
        });
      } else {
        throw createErr;
      }
    }

    // Register observer
    if (observerTeacher && observerTeacher.id && !observerTeacher.id.startsWith("admin-")) {
      await prisma.observationRegistration.create({
        data: {
          slotId: newSlot.id,
          teacherId: observerTeacher.id,
          isApproved: false
        }
      });
    }

    // Instant purge for active cache paths
    revalidatePath("/teacher/du-gio");
    revalidatePath("/admin/du-gio");

    // Asynchronous background dispatch of In-App Notification and Email via Next.js after()
    // This returns the success response to the client immediately (~300ms) without waiting for SMTP handshakes
    after(async () => {
      try {
        if (!hostTeacher) return;

        const slotDateObj = new Date(data.date);
        const formattedDate = slotDateObj.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
        const hostDirectLink = SKYLINE_SSM_LOGIN_URL;
        const observerDirectLink = SKYLINE_SSM_LOGIN_URL;

        // 1. In-App Notification for Host Teacher
        if (hostTeacher.user?.id) {
          const notifTitle = "Đề xuất xin dự giờ mới 📬";
          const notifMsg = `Thầy/Cô ${observerTeacher.teacherName} vừa gửi đề xuất xin dự giờ tiết dạy "${data.topic || "tiết học"}" của Thầy/Cô. Vui lòng xem và xác nhận.`;

          await prisma.notification.create({
            data: {
              userId: hostTeacher.user.id,
              title: notifTitle,
              message: notifMsg,
              link: `/teacher/du-gio?tab=my_schedule&slotId=${newSlot.id}`,
              isRead: false
            }
          }).catch(e => console.error("In-app notif error:", e));
        }

        const hostEmail = getTeacherResolvedEmail(hostTeacher);
        const observerEmail = getTeacherResolvedEmail(observerTeacher);

        const emailTasks: Promise<any>[] = [];

        console.log(`[requestObservationSlot] Auto-mapping & dispatching emails for slot ${newSlot.id}:`);
        console.log(` - Host: ${hostTeacher.teacherName} (Code: ${hostTeacher.teacherCode || "N/A"}, Dept: ${hostTeacher.departmentRel?.name || "N/A"}) -> Email: ${hostEmail}`);
        console.log(` - Observer: ${observerTeacher.teacherName} (Code: ${observerTeacher.teacherCode || "N/A"}) -> Email: ${observerEmail}`);

        // 2. Email Notification to Host Teacher
        if (hostEmail && hostEmail.includes("@")) {
          const emailSubject = `[Sky-line SMS - Dự Giờ] Thầy/Cô ${observerTeacher.teacherName} gửi đề xuất xin dự giờ tiết dạy: "${data.topic || "Tiết học"}"`;
          const emailHtml = renderObservationRequestForHost({
            hostName: hostTeacher.teacherName,
            hostCode: hostTeacher.teacherCode || undefined,
            hostDept: hostTeacher.departmentRel?.name || undefined,
            observerName: observerTeacher.teacherName,
            observerCode: observerTeacher.teacherCode,
            observerPosition: observerTeacher.position || undefined,
            topic: data.topic || "Đề xuất xin dự giờ tiết học",
            subjectName: data.subjectName || "Môn học",
            grade: `${data.level || ""} ${data.grade || ""}`.trim(),
            className: data.className || undefined,
            dateStr: formattedDate,
            period: data.period || "Tiết 1",
            notes: data.notes || undefined,
            directLink: hostDirectLink
          });

          emailTasks.push(
            sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: hostEmail, subject: emailSubject, html: emailHtml })
              .then(res => console.log("[requestObservationSlot] Email successfully sent to host:", hostEmail, res?.messageId))
              .catch(err => console.error("[requestObservationSlot] Email failed sending to host " + hostEmail + ":", err))
          );
        } else {
          console.warn("[requestObservationSlot] Host teacher does not have a valid resolved email address:", hostTeacher.teacherName, hostTeacher.teacherCode);
        }

        // 3. Email Confirmation to Observer Teacher (Skipped if self-observation)
        if (observerEmail && observerEmail.includes("@") && observerEmail !== hostEmail) {
          const observerSubject = `[Sky-line SMS - Dự Giờ] Đã gửi thành công đề xuất xin dự giờ tới Thầy/Cô ${hostTeacher.teacherName}`;
          const observerHtml = renderObservationRequestSubmittedForObserver({
            observerName: observerTeacher.teacherName,
            hostName: hostTeacher.teacherName,
            hostCode: hostTeacher.teacherCode,
            hostDept: hostTeacher.departmentRel?.name || undefined,
            topic: data.topic || "Đề xuất xin dự giờ tiết học",
            subjectName: data.subjectName || "Môn học",
            level: data.level,
            grade: data.grade,
            className: data.className || undefined,
            dateStr: formattedDate,
            period: data.period || "Tiết 1",
            campusName: hostTeacher.campus?.campusName || undefined,
            room: data.room || undefined,
            directLink: observerDirectLink
          });

          emailTasks.push(
            sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: observerEmail, subject: observerSubject, html: observerHtml })
              .then(res => console.log("[requestObservationSlot] Confirmation email sent to observer:", observerEmail, res?.messageId))
              .catch(err => console.error("[requestObservationSlot] Confirmation email failed sending to observer " + observerEmail + ":", err))
          );
        }

        await Promise.allSettled(emailTasks);
      } catch (bgErr) {
        console.error("Error in background requestObservationSlot task:", bgErr);
      }
    });

    return { success: true, slot: newSlot };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function respondToObservationRequest(slotId: string, accept: boolean, reason?: string) {
  // Ensure DB columns exist
  await ensureDbColumns();
  try {
    invalidateObservationSlotsCache();
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: {
        teacher: { include: { user: true, campus: true } },
        registrations: {
          include: {
            teacher: { include: { user: true } }
          }
        }
      }
    })

    if (!slot) {
      return { success: false, error: "Không tìm thấy thông tin tiết dự giờ." }
    }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    });
    const roleCode = (session.user as any)?.role || "TEACHER";
    const isObsAdmin = await checkIsObservationAdmin(roleCode, session.user.id);
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS", "SUPER_ADMIN", "BAN_DHCM"].includes(roleCode) || isObsAdmin;

    if (!isAdmin && (!currentTeacher || currentTeacher.id !== slot.teacherId)) {
      return { success: false, error: "Chỉ giáo viên được mời dự giờ hoặc Quản trị viên mới có quyền phê duyệt/từ chối yêu cầu này." };
    }

    const hostTeacher = slot.teacher;
    const formattedDateVi = new Date(slot.date).toLocaleDateString("vi-VN");
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://ssm.skylineschool.edu.vn";

    if (accept) {
      await prisma.observationSlot.update({
        where: { id: slotId },
        data: {
          status: "ACTIVE"
        }
      })

      // Approve registrations
      await prisma.observationRegistration.updateMany({
        where: { slotId },
        data: {
          isApproved: true,
          approvedAt: new Date()
        }
      })

      // Send email to observer teachers confirming approval
      try {
        for (const reg of slot.registrations) {
          const obsTeacher = reg.teacher;
          const obsEmail = getTeacherResolvedEmail(obsTeacher);
          if (obsEmail && obsEmail.includes("@")) {
            const emailSubject = `[Sky-line SMS - Dự Giờ] Đề xuất dự giờ của bạn đã được Thầy/Cô ${hostTeacher?.teacherName} đồng ý`;
            const linkUrl = SKYLINE_SSM_LOGIN_URL;
            const emailHtml = renderObservationRequestResponseForObserver({
              observerName: obsTeacher?.teacherName || "Quý Thầy/Cô",
              hostName: hostTeacher?.teacherName || "Giáo viên dạy",
              hostCode: hostTeacher?.teacherCode || undefined,
              topic: slot.topic,
              subjectName: slot.subjectName,
              grade: slot.grade,
              className: slot.className || undefined,
              dateStr: formattedDateVi,
              period: slot.startTime,
              accepted: true,
              directLink: linkUrl
            });
            await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: obsEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Accept observation request email error:", e));
          }
        }
      } catch (mailErr) {
        console.error("Failed sending acceptance emails:", mailErr);
      }
    } else {
      try {
        await prisma.observationSlot.update({
          where: { id: slotId },
          data: {
            status: "REJECTED",
            rejectionReason: reason || "Giáo viên từ chối"
          }
        })
      } catch (err: any) {
        if (err?.message?.includes("rejectionReason") || err?.message?.includes("no column named")) {
          await prisma.observationSlot.update({
            where: { id: slotId },
            data: {
              status: "REJECTED"
            }
          })
        } else {
          throw err;
        }
      }

      // Send decline email to observer teachers
      try {
        for (const reg of slot.registrations) {
          const obsTeacher = reg.teacher;
          const obsEmail = getTeacherResolvedEmail(obsTeacher);
          if (obsEmail && obsEmail.includes("@")) {
            const emailSubject = `[Sky-line SMS - Dự Giờ] Phản hồi đề xuất dự giờ: "${slot.topic}" - GV: ${hostTeacher?.teacherName}`;
            const emailHtml = renderObservationRequestResponseForObserver({
              observerName: obsTeacher?.teacherName || "Quý Thầy/Cô",
              hostName: hostTeacher?.teacherName || "Giáo viên dạy",
              hostCode: hostTeacher?.teacherCode || undefined,
              topic: slot.topic,
              subjectName: slot.subjectName,
              grade: slot.grade,
              className: slot.className || undefined,
              dateStr: formattedDateVi,
              period: slot.startTime,
              accepted: false,
              reason: reason || undefined,
              directLink: SKYLINE_SSM_LOGIN_URL
            });
            await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: obsEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Decline observation request email error:", e));
          }
        }
      } catch (mailErr) {
        console.error("Failed sending decline emails:", mailErr);
      }
    }

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}


export async function triggerSlotReminder(slotId: string) {
  try {
    const session = await auth();
    if (!session || !session.user) return { success: false, error: "Unauthorized" };

    const slot = await prisma.observationSlot.findUnique({
      where: { id: slotId },
      include: {
        teacher: { include: { departmentRel: true } },
        registrations: true
      }
    });

    if (!slot) return { success: false, error: "Không tìm thấy thông tin tiết dạy" };

    const regCount = slot.registrations.length;
    await sendTeamsLackingObserversReminder({
      id: slot.id,
      topic: slot.topic,
      subjectName: slot.subjectName,
      level: slot.level,
      grade: slot.grade,
      className: slot.className,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      campusName: slot.campusName,
      room: slot.room,
      teacherName: slot.teacher?.teacherName,
      teacherCode: slot.teacher?.teacherCode,
      maxSeats: slot.maxSeats || 4,
      registeredCount: regCount
    }, slot.teacher?.departmentRel as any);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}


export async function getDepartmentTeachers(departmentId?: string) {
  try {
    const session = await auth();
    if (!session?.user) return [];
    
    const userTeacher = await prisma.teacher.findUnique({
      where: { userId: (session.user as any).id }
    });
    
    const targetDeptId = departmentId || userTeacher?.departmentId;
    if (!targetDeptId) {
      return await prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, teacherCode: true, teacherName: true, email: true }
      });
    }

    return await prisma.teacher.findMany({
      where: {
        OR: [
          { departmentId: targetDeptId },
          { departmentAssignments: { some: { departmentId: targetDeptId } } }
        ],
        status: "ACTIVE"
      },
      select: { id: true, teacherCode: true, teacherName: true, email: true }
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}


/**
 * Process Expired Observation Slots:
 * Sends automated Email, Teams & In-App notifications to BOTH the Host Teacher AND all Registered Observer Teachers.
 */
export async function processExpiredSlotsNotifications() {
  await ensureDbColumns();
  try {
    const now = new Date();
    // Fetch active slots whose date is today or past, and expiredNotifSentAt is null
    const expiredSlots = await prisma.observationSlot.findMany({
      where: {
        status: "ACTIVE",
        expiredNotifSentAt: null,
        date: { lte: now }
      },
      include: {
        teacher: { include: { user: true } },
        registrations: {
          include: {
            teacher: { include: { user: true } }
          }
        }
      }
    });

    console.log(`[Skyline Expired Check] Found ${expiredSlots.length} expired slots to notify.`);
    let processedCount = 0;

    for (const slot of expiredSlots) {
      const hostTeacher = slot.teacher;
      const approvedRegistrations = slot.registrations || [];
      const observerTeachers = approvedRegistrations.map(r => r.teacher).filter(Boolean);
      const formattedDateVi = new Date(slot.date).toLocaleDateString("vi-VN");
      const linkUrl = SKYLINE_SSM_LOGIN_URL;

      // 1. Send Email to Host Teacher
      if (hostTeacher) {
        const hostEmail = hostTeacher.email || (hostTeacher as any).user?.email;
        if (hostEmail && hostEmail.includes("@")) {
          const observerNamesList = observerTeachers.length > 0 
            ? observerTeachers.map(t => `• ${t.teacherName} (${t.teacherCode}) - ${t.email || ''}`).join("<br/>")
            : "<em style='color: #94a3b8;'>Chưa có Giáo viên nào đăng ký dự giờ tiết này.</em>";

          const hostSubject = `[Sky-line SMS - Dự Giờ] Hết hạn đăng ký: Tiết dạy "${slot.topic}" - Môn ${slot.subjectName}`;
          const hostHtml = renderObservationExpiredNotification({
            recipientName: hostTeacher.teacherName,
            isHost: true,
            hostName: hostTeacher.teacherName,
            hostCode: hostTeacher.teacherCode,
            topic: slot.topic,
            subjectName: slot.subjectName,
            grade: slot.grade,
            className: slot.className || undefined,
            campusName: slot.campusName || undefined,
            room: slot.room || undefined,
            dateStr: formattedDateVi,
            timeStr: `${slot.startTime} - ${slot.endTime}`,
            directLink: linkUrl
          });

          sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: hostEmail, subject: hostSubject, html: hostHtml }).catch(e => console.error("Host expired email error:", e));
        }
      }

      // 2. Send Emails to ALL Registered Observer Teachers
      for (const observer of observerTeachers) {
        const observerEmail = getTeacherResolvedEmail(observer);
        if (observerEmail && observerEmail.includes("@")) {
          const obsSubject = `[Sky-line SMS - Dự Giờ] Nhắc lịch dự giờ: "${slot.topic}" - GV ${hostTeacher?.teacherName || "Giáo viên"}`;
          const obsHtml = renderObservationExpiredNotification({
            recipientName: observer.teacherName,
            isHost: false,
            hostName: hostTeacher?.teacherName || "Giáo viên",
            hostCode: hostTeacher?.teacherCode || undefined,
            topic: slot.topic,
            subjectName: slot.subjectName,
            grade: slot.grade,
            className: slot.className || undefined,
            campusName: slot.campusName || undefined,
            room: slot.room || undefined,
            dateStr: formattedDateVi,
            timeStr: `${slot.startTime} - ${slot.endTime}`,
            directLink: linkUrl
          });

          sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: observerEmail, subject: obsSubject, html: obsHtml }).catch(e => console.error("Observer expired email error:", e));
        }
      }

      // 3. Create In-App Notifications
      const notifUsers = [hostTeacher?.user?.id, ...observerTeachers.map(o => o.user?.id)].filter(Boolean) as string[];
      if (notifUsers.length > 0) {
        const notifData = notifUsers.map(uId => ({
          userId: uId,
          title: "Hết hạn đăng ký dự giờ & Nhắc lịch dạy",
          message: `Tiết dạy dự giờ (${slot.subjectName} - ${slot.topic}) đã hết hạn đăng ký (Có ${registeredCount}/4 GV tham dự). Vui lòng thực hiện tiết dạy theo đúng lịch.`,
          link: `/teacher/du-gio?tab=my_schedule&slotId=${slot.id}`,
          isRead: false
        }));
        await prisma.notification.createMany({ data: notifData }).catch(e => console.error("Notif error:", e));
      }

      // Mark expiredNotifSentAt
      await prisma.observationSlot.update({
        where: { id: slot.id },
        data: { expiredNotifSentAt: new Date() }
      });

      processedCount++;
    }

    return { success: true, processedCount };
  } catch (e: any) {
    console.error("processExpiredSlotsNotifications error:", e);
    return { success: false, error: e?.message || "Lỗi xử lý tiết hết hạn" };
  }
}

export async function sendPendingEvaluationReminder(registrationId: string) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const reg = await prisma.observationRegistration.findUnique({
      where: { id: registrationId },
      include: {
        teacher: { include: { user: true } },
        evaluation: true,
        slot: {
          include: {
            teacher: { include: { user: true } }
          }
        }
      }
    });

    if (!reg) {
      return { success: false, error: "Không tìm thấy thông tin đăng ký dự giờ" };
    }

    if (reg.evaluation) {
      return { success: false, error: "Giáo viên đã hoàn thành nhập đánh giá cho tiết dạy này." };
    }

    if (!reg.isApproved) {
      return { success: false, error: "Tiết dự chưa được duyệt, chưa thể gửi nhắc đánh giá." };
    }

    const observer = reg.teacher;
    const slot = reg.slot;
    const hostTeacher = slot.teacher;
    const observerEmail = getTeacherResolvedEmail(observer);

    if (!observerEmail || !observerEmail.includes("@")) {
      return { success: false, error: "Giáo viên chưa có email trong hệ thống." };
    }

    const slotDate = new Date(slot.date);
    const formattedDateVi = slotDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const linkUrl = SKYLINE_SSM_LOGIN_URL;

    const emailSubject = `[Sky-line SMS - Dự Giờ] Nhắc nhở hoàn tất nhập đánh giá tiết dạy: "${slot.topic}"`;
    const emailHtml = renderObservationPendingEvaluationReminder({
      observerName: observer.teacherName,
      hostName: hostTeacher?.teacherName || "Giáo viên đứng lớp",
      hostCode: hostTeacher?.teacherCode || undefined,
      topic: slot.topic,
      subjectName: slot.subjectName,
      grade: slot.grade,
      className: slot.className || undefined,
      dateStr: formattedDateVi,
      period: slot.startTime,
      campusName: slot.campusName || undefined,
      room: slot.room || undefined,
      directLink: linkUrl
    });

    await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: observerEmail, subject: emailSubject, html: emailHtml });

    // Create in-app notification
    if (observer.user?.id) {
      await prisma.notification.create({
        data: {
          userId: observer.user.id,
          title: "Nhắc nhở hoàn tất nhập đánh giá dự giờ",
          message: `Vui lòng hoàn tất nhập đánh giá tiết dạy "${slot.topic}" của Thầy/Cô ${hostTeacher?.teacherName}. Hệ thống chỉ ghi nhận khi hoàn tất đánh giá.`,
          link: `/teacher/du-gio?tab=evaluations&evalSlotId=${slot.id}`,
          isRead: false
        }
      }).catch(e => console.error("In-app notif error:", e));
    }

    return { success: true };
  } catch (error: any) {
    console.error("[sendPendingEvaluationReminder Error]:", error);
    return { success: false, error: error.message || "Lỗi khi gửi email nhắc nhở" };
  }
}

export async function sendBatchPendingEvaluationReminders() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Tự động chuyển các tiết trước ngày hôm nay sang trạng thái EXPIRED (Hết hạn)
    try {
      await prisma.observationSlot.updateMany({
        where: {
          date: { lt: startOfToday },
          status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL"] }
        },
        data: {
          status: "EXPIRED"
        }
      });
    } catch (e) {
      console.error("[Auto-Expire Error]:", e);
    }

    // 2. Tìm các đăng ký đã duyệt của tiết dạy đến hạn (date <= endOfToday) mà chưa nộp đánh giá
    const pendingRegs = await prisma.observationRegistration.findMany({
      where: {
        isApproved: true,
        evaluation: null,
        slot: {
          date: {
            lte: endOfToday
          }
        }
      },
      include: {
        teacher: { include: { user: true } },
        slot: {
          include: {
            teacher: { include: { user: true } }
          }
        }
      }
    });

    let sentCount = 0;
    const linkUrl = SKYLINE_SSM_LOGIN_URL;

    for (const reg of pendingRegs) {
      const observer = reg.teacher;
      const slot = reg.slot;
      const hostTeacher = slot.teacher;
      const observerUserId = observer.user?.id;
      const observerEmail = getTeacherResolvedEmail(observer);

      // CHỈ NHẮC 1 LẦN: Kiểm tra xem đã gửi thông báo nhắc nhở cho đăng ký này hay chưa
      if (observerUserId) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: observerUserId,
            title: "Nhắc nhở hoàn tất nhập đánh giá dự giờ",
            OR: [
              { message: { contains: `[Dự giờ #${reg.id}]` } },
              { link: { contains: slot.id } }
            ]
          }
        });

        if (existingNotif) {
          // Đã nhắc 1 lần rồi -> Bỏ qua không nhắc lại
          continue;
        }
      }

      if (observerEmail && observerEmail.includes("@")) {
        const slotDate = new Date(slot.date);
        const formattedDateVi = slotDate.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });

        const emailSubject = `[Sky-line SMS - Dự Giờ] Nhắc nhở hoàn tất nhập đánh giá tiết dạy: "${slot.topic}"`;
        const emailHtml = renderObservationPendingEvaluationReminder({
          observerName: observer.teacherName,
          hostName: hostTeacher?.teacherName || "Giáo viên đứng lớp",
          hostCode: hostTeacher?.teacherCode || undefined,
          topic: slot.topic,
          subjectName: slot.subjectName,
          grade: slot.grade,
          className: slot.className || undefined,
          dateStr: formattedDateVi,
          period: slot.startTime,
          campusName: slot.campusName || undefined,
          room: slot.room || undefined,
          directLink: linkUrl
        });

        sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: observerEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Batch pending eval email error:", e));
        sentCount++;

        // Ghi nhận thông báo để đảm bảo CHỈ NHẮC 1 LẦN duy nhất
        if (observerUserId) {
          prisma.notification.create({
            data: {
              userId: observerUserId,
              title: "Nhắc nhở hoàn tất nhập đánh giá dự giờ",
              message: `Vui lòng hoàn tất nhập đánh giá tiết dạy "${slot.topic}" của Thầy/Cô ${hostTeacher?.teacherName || "Giáo viên đứng lớp"}. Hệ thống chỉ ghi nhận khi hoàn tất đánh giá.`,
              link: `/teacher/du-gio?tab=evaluations&evalSlotId=${slot.id}`,
              isRead: false
            }
          }).catch(e => console.error("Batch notif error:", e));
        }
      }
    }

    return { success: true, scanned: pendingRegs.length, sentCount };
  } catch (error: any) {
    console.error("[sendBatchPendingEvaluationReminders Error]:", error);
    return { success: false, error: error.message };
  }
}


// ==========================================
// CHỨC NĂNG ĐÁNH GIÁ LẠI & XÉT DUYỆT (RE-EVALUATION)
// ==========================================

export async function requestReEvaluation(data: {
  registrationId?: string
  evaluationId?: string
  reason: string
}) {
  try {
    invalidateObservationSlotsCache();
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = await checkIsObservationAdmin(roleCode, session.user.id)
    const currentTeacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } })
    if (!currentTeacher && !isAdmin) return { success: false, error: "Teacher profile not found" }

    let evaluation = null
    if (data.evaluationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { id: data.evaluationId },
        include: { registration: { include: { slot: true } } }
      })
    } else if (data.registrationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { registrationId: data.registrationId },
        include: { registration: { include: { slot: true } } }
      })
    }

    if (!evaluation) return { success: false, error: "Không tìm thấy phiếu đánh giá cần xin đánh giá lại" }
    
    const isEvaluator = currentTeacher && (evaluation.evaluatorId === currentTeacher.id || evaluation.registration?.teacherId === currentTeacher.id);
    const isHost = currentTeacher && (evaluation.registration?.slot?.teacherId === currentTeacher.id);

    if (!isEvaluator && !isHost && !isAdmin) {
      return { success: false, error: "Bạn không có quyền gửi yêu cầu đánh giá lại cho tiết dạy này" }
    }

    await prisma.observationEvaluation.update({
      where: { id: evaluation.id },
      data: {
        reEvaluationStatus: "REQUESTED",
        reEvaluationReason: data.reason,
        reEvaluationRequestedAt: new Date(),
        reEvaluationApprovedAt: null,
        reEvaluationApprovedBy: null,
        reEvaluationNote: null
      }
    })

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) {
    console.error("[requestReEvaluation Error]:", e)
    return { success: false, error: e.message }
  }
}

export async function approveReEvaluation(data: {
  evaluationId?: string
  registrationId?: string
  adminNote?: string
}) {
  try {
    invalidateObservationSlotsCache();
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)
    if (!isAdmin) {
      return { success: false, error: "Bạn không có quyền xét duyệt đánh giá lại" }
    }

    let evaluation = null
    if (data.evaluationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { id: data.evaluationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: { include: { teacher: { include: { user: true } } } }
            }
          }
        }
      })
    } else if (data.registrationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { registrationId: data.registrationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: { include: { teacher: { include: { user: true } } } }
            }
          }
        }
      })
    }

    if (!evaluation) return { success: false, error: "Không tìm thấy phiếu đánh giá" }

    const adminName = session.user.name || session.user.email || "Ban Quản trị / Admin"

    await prisma.observationEvaluation.update({
      where: { id: evaluation.id },
      data: {
        reEvaluationStatus: "APPROVED",
        reEvaluationApprovedAt: new Date(),
        reEvaluationApprovedBy: adminName,
        reEvaluationNote: data.adminNote || null
      }
    })

    // Gửi Email thông báo trực tiếp đến GVBM
    const gvbm = evaluation.registration.teacher
    const hostTeacher = evaluation.registration.slot.teacher
    const slot = evaluation.registration.slot
    const gvbmEmail = getTeacherResolvedEmail(gvbm)

    if (gvbmEmail && gvbmEmail.includes("@")) {
      const formattedDate = new Date(slot.date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })

      const accessUrl = SKYLINE_SSM_LOGIN_URL

      const emailSubject = `[Sky-line SMS - Dự Giờ] Phê duyệt mở lại phiếu đánh giá tiết dạy - ${slot.topic || "Tiết dự giờ"}`
      const emailHtml = renderObservationReEvaluationApproved({
        teacherName: gvbm?.teacherName || "Giáo viên",
        hostName: hostTeacher?.teacherName || undefined,
        topic: slot.topic || "Tiết dạy chuyên môn",
        subjectName: slot.subjectName || undefined,
        className: `${slot.className || slot.grade || ""} ${slot.level ? `(${slot.level})` : ""}`.trim() || undefined,
        dateStr: formattedDate,
        period: `${slot.startTime}${slot.endTime ? " - " + slot.endTime : ""}`,
        reason: evaluation.reEvaluationReason || undefined,
        adminNote: data.adminNote || undefined,
        directLink: accessUrl
      });

      await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: gvbmEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Re-evaluation approve email error:", e))
    }

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) {
    console.error("[approveReEvaluation Error]:", e)
    return { success: false, error: e.message }
  }
}

export async function rejectReEvaluation(data: {
  evaluationId?: string
  registrationId?: string
  adminNote: string
}) {
  try {
    invalidateObservationSlotsCache();
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)
    if (!isAdmin) {
      return { success: false, error: "Bạn không có quyền xét duyệt đánh giá lại" }
    }

    let evaluation = null
    if (data.evaluationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { id: data.evaluationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: { include: { teacher: { include: { user: true } } } }
            }
          }
        }
      })
    } else if (data.registrationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { registrationId: data.registrationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: { include: { teacher: { include: { user: true } } } }
            }
          }
        }
      })
    }

    if (!evaluation) return { success: false, error: "Không tìm thấy phiếu đánh giá" }

    const adminName = session.user.name || session.user.email || "Ban Quản trị / Admin"

    await prisma.observationEvaluation.update({
      where: { id: evaluation.id },
      data: {
        reEvaluationStatus: "REJECTED",
        reEvaluationApprovedAt: new Date(),
        reEvaluationApprovedBy: adminName,
        reEvaluationNote: data.adminNote
      }
    })

    // Gửi Email thông báo từ chối
    const gvbm = evaluation.registration.teacher
    const slot = evaluation.registration.slot
    const gvbmEmail = getTeacherResolvedEmail(gvbm)

    if (gvbmEmail && gvbmEmail.includes("@")) {
      const emailSubject = `[Sky-line SMS - Dự Giờ] Phản hồi yêu cầu mở lại phiếu đánh giá - ${slot.topic || "Tiết dự giờ"}`
      const emailHtml = renderObservationReEvaluationRejected({
        teacherName: gvbm?.teacherName || "Giáo viên",
        topic: slot.topic || "Tiết dự giờ",
        adminNote: data.adminNote || undefined
      });
      await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: gvbmEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Re-evaluation reject email error:", e))
    }

    revalidatePath("/teacher/du-gio"); revalidatePath("/teacher/du-gio-mam-non"); revalidatePath("/admin/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    return { success: true }
  } catch (e: any) {
    console.error("[rejectReEvaluation Error]:", e)
    return { success: false, error: e.message }
  }
}

export async function getReEvaluationRequests(academicYearId?: string) {
  try {
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const evaluations = await prisma.observationEvaluation.findMany({
      where: {
        reEvaluationStatus: {
          in: ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"]
        }
      },
      include: {
        registration: {
          include: {
            teacher: {
              select: {
                id: true,
                teacherName: true,
                teacherCode: true,
                email: true,
                departmentId: true,
                campusId: true,
                departmentRel: true,
                campus: true
              }
            },
            slot: {
              include: {
                teacher: {
                  select: {
                    id: true,
                    teacherName: true,
                    teacherCode: true,
                    email: true,
                    departmentId: true,
                    campusId: true,
                    departmentRel: true,
                    campus: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        reEvaluationRequestedAt: "desc"
      }
    })

    return { success: true, requests: evaluations }
  } catch (e: any) {
    console.error("[getReEvaluationRequests Error]:", e)
    return { success: false, error: e.message }
  }
}

// =========================================================================
// PHẢN HỒI 2 CHIỀU: GIÁO VIÊN TIẾP THU GÓP Ý & GỬI KẾ HOẠCH KHẮC PHỤC
// =========================================================================
export async function acknowledgeAndFeedbackEvaluation(data: {
  evaluationId?: string;
  registrationId?: string;
  feedback?: string;
}) {
  try {
    invalidateObservationSlotsCache();
    await ensureDbColumns();
    const session = await auth();
    if (!session || !session.user) return { success: false, error: "Unauthorized" };

    const roleCode = ((session.user as any)?.role || "TEACHER").toUpperCase();
    const isAdmin = [
      "ADMIN",
      "ADMINISTRATOR",
      "SUPER_ADMIN",
      "BGH",
      "BAN_GIAM_HIEU",
      "KT_DBCL",
      "QLCM",
      "QUAN_LY_CM",
      "BAN_DHCM"
    ].includes(roleCode);

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { user: true, campus: true }
    });
    if (!currentTeacher && session.user?.email) {
      currentTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            { id: session.user.id },
            { email: session.user.email }
          ]
        },
        include: { user: true, campus: true }
      });
    }
    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Không tìm thấy hồ sơ giáo viên." };
    }

    let evaluation = null;
    if (data.evaluationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { id: data.evaluationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: {
                include: {
                  teacher: { include: { user: true } }
                }
              }
            }
          }
        }
      });
    }
    if (!evaluation && data.registrationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { registrationId: data.registrationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: {
                include: {
                  teacher: { include: { user: true } }
                }
              }
            }
          }
        }
      });
    }
    if (!evaluation && data.evaluationId) {
      // In case evaluationId was passed as a slotId
      evaluation = await prisma.observationEvaluation.findFirst({
        where: { slotId: data.evaluationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true } },
              slot: {
                include: {
                  teacher: { include: { user: true } }
                }
              }
            }
          }
        }
      });
    }

    if (!evaluation) return { success: false, error: "Không tìm thấy phiếu đánh giá" };

    const slot = evaluation.registration?.slot;
    const hostTeacher = slot?.teacher;
    const evaluator = evaluation.registration?.teacher;

    // Kiểm tra quyền: Chỉ GV dạy của tiết hoặc Admin mới có quyền xác nhận tiếp thu & phản hồi
    const isHost = 
      (currentTeacher && (
        hostTeacher?.id === currentTeacher.id || 
        slot?.teacherId === currentTeacher.id ||
        (hostTeacher?.teacherCode && currentTeacher?.teacherCode && hostTeacher.teacherCode === currentTeacher.teacherCode) ||
        (hostTeacher?.email && currentTeacher?.email && hostTeacher.email.toLowerCase() === currentTeacher.email.toLowerCase())
      )) ||
      (hostTeacher?.userId === session.user.id) ||
      (hostTeacher?.email && session.user?.email && hostTeacher.email.toLowerCase() === session.user.email.toLowerCase());

    if (!isAdmin && !isHost) {
      return { success: false, error: "Chỉ Giáo viên dạy của tiết này mới có quyền gửi phản hồi & xác nhận tiếp thu góp ý!" };
    }

    const feedbackText = data.feedback ? data.feedback.trim() : "Đã tiếp thu toàn bộ góp ý chuyên môn.";
    const nowTime = new Date();

    const updated = await prisma.observationEvaluation.update({
      where: { id: evaluation.id },
      data: {
        teacherAcknowledgedAt: nowTime,
        teacherFeedback: feedbackText,
        teacherFeedbackAt: nowTime
      }
    });

    // Cập nhật trạng thái slot sang COMPLETED khi giáo viên dạy đã tiếp thu ý kiến
    if (slot?.id) {
      await prisma.observationSlot.update({
        where: { id: slot.id },
        data: { status: "COMPLETED" }
      }).catch(e => console.warn("Could not update slot status to COMPLETED:", e));
    }

    // Invalidate cache ngay sau khi cập nhật dữ liệu để người dùng thấy trạng thái mới ngay lập tức
    invalidateObservationSlotsCache();

    // 1. Gửi Email thông báo trực tiếp đến Người dự giờ (Evaluator) - chạy không đồng bộ để không chặn giao diện
    try {
      const evaluatorEmail = getTeacherResolvedEmail(evaluator);
      if (evaluatorEmail && evaluatorEmail.includes("@")) {
        const emailSubject = `[Sky-line SMS - Dự Giờ] GV ${hostTeacher?.teacherName} đã tiếp thu góp ý & gửi phản hồi: "${slot?.topic || "Tiết dạy"}"`;
        const emailHtml = renderObservationTeacherAcknowledged({
          evaluatorName: evaluator?.teacherName || "Người dự giờ",
          hostName: hostTeacher?.teacherName || "Giáo viên dạy",
          topic: slot?.topic || "Tiết dạy",
          feedbackText: feedbackText,
          acknowledgedAtStr: `${nowTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • ${nowTime.toLocaleDateString("vi-VN")}`,
          directLink: SKYLINE_SSM_LOGIN_URL
        });
        sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: evaluatorEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Acknowledge email error:", e));
      }

      // 2. Tạo thông báo chuông in-app cho Người dự giờ
      const evaluatorUserId = evaluator?.userId || evaluator?.user?.id;
      if (evaluatorUserId) {
        await prisma.notification.create({
          data: {
            userId: evaluatorUserId,
            title: "Giáo viên đã tiếp thu góp ý dự giờ 💬",
            message: `GV ${hostTeacher?.teacherName || "dạy"} đã xác nhận tiếp thu góp ý và gửi phản hồi cho tiết "${slot?.topic || "Tiết dạy"}". Trạng thái tiết đã hoàn tất.`,
            link: `/teacher/du-gio?tab=evaluations`,
            isRead: false
          }
        }).catch(e => console.warn("Could not create evaluator ack notification:", e));
      }
    } catch (mailErr) {
      console.error("Failed to process acknowledge email & notifications:", mailErr);
    }

    revalidatePath("/teacher/du-gio");
    revalidatePath("/teacher/du-gio-mam-non");
    revalidatePath("/admin/du-gio-mam-non");
    revalidatePath("/admin/du-gio");

    return { 
      success: true, 
      evaluation: updated,
      slotStatus: "COMPLETED",
      message: "Đã xác nhận tiếp thu góp ý và cập nhật trạng thái hoàn tất thành công!" 
    };
  } catch (e: any) {
    console.error("[acknowledgeAndFeedbackEvaluation Error]:", e);
    return { success: false, error: e.message || "Lỗi khi gửi phản hồi" };
  }
}

export async function createSurpriseObservation(data: {
  teacherId: string
  targetDeptId?: string
  campusId?: string
  classId?: string
  className?: string
  level?: string
  grade?: string
  subjectId?: string
  subjectName: string
  topic: string
  date: string
  period?: string
  room?: string
  
  criterion1?: number
  criterion2?: number
  criterion3?: number
  criterion4?: number
  criterion5?: number
  score1?: number
  score2?: number
  score3?: number
  score4?: number
  score5?: number
  score6?: number
  score7?: number
  score8?: number
  score9?: number
  score10?: number
  score11?: number
  totalScore: number
  overallRating: string
  strengths: string
  improvements: string
  generalComment: string
  isDraft?: boolean
}) {
  try {
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const roleCode = (session.user as any)?.role || "TEACHER"
    const isAdminOrLeader = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BAN_DHCM", "DHCM", "BGH", "BGH_MN", "BGHMN", "BGMMN", "QLCM", "QUAN_LY_CM", "GIAO_VU_CS"].includes(roleCode)

    let currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        departmentAssignments: {
          include: { department: true }
        },
        divisionAssignments: true,
        campus: true,
        user: true
      }
    })

    if (!currentTeacher && !isAdminOrLeader) {
      return { success: false, error: "Không tìm thấy hồ sơ giáo viên." }
    }

    if (!currentTeacher && isAdminOrLeader) {
      const adminTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { user: { role: { in: ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS"] } } },
            { position: { in: ["ADMIN", "BGH", "GDCS", "KT_DBCL"] } }
          ]
        },
        include: { departmentRel: true, departmentAssignments: { include: { department: true } }, divisionAssignments: true, campus: true, user: true }
      })
      if (adminTeacher) currentTeacher = adminTeacher
    }

    if (!currentTeacher) {
      return { success: false, error: "Không tìm thấy người đánh giá hợp lệ." }
    }

    const isTTCM = currentTeacher?.position === "TTCM" ||
                   ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(currentTeacher?.position || "") ||
                   currentTeacher?.departmentAssignments?.some((da: any) => ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(da.position));

    const isTBP = ["TBP", "TB_DHCM", "BAN_DHCM"].includes(currentTeacher?.position || "") ||
                  ["TBP", "TB_DHCM", "BAN_DHCM"].includes(roleCode) ||
                  (currentTeacher?.divisionAssignments?.length || 0) > 0;

    const isQLCM = ["QLCM", "Quản lý CM", "QUAN_LY_CM"].includes(currentTeacher?.position || "") ||
                   ["QLCM", "Quản lý CM", "QUAN_LY_CM"].includes(roleCode) ||
                   currentTeacher?.departmentAssignments?.some((da: any) => ["QLCM", "Quản lý CM", "QUAN_LY_CM"].includes(da.position));

    const isBGHMN = ["BGH_MN", "BGHMN", "BGMMN", "BGH Mầm non"].includes(currentTeacher?.position || "") ||
                    ["BGH_MN", "BGHMN", "BGMMN", "BGH Mầm non"].includes(roleCode);

    if (!isAdminOrLeader && !isTTCM && !isQLCM && !isBGHMN && !isTBP) {
      return { success: false, error: "Bạn không có quyền thực hiện chức năng Dự giờ đột xuất." }
    }

    const hostTeacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      include: {
        campus: true,
        departmentRel: true,
        departmentAssignments: { include: { department: true } },
        divisionAssignments: true,
        user: true
      }
    })
    if (!hostTeacher) return { success: false, error: "Không tìm thấy giáo viên được dự giờ." }

    // 1. Kiểm tra phạm vi nếu là TBP (chỉ được dự giờ GV thuộc Bộ phận phụ trách)
    if (isTBP && !isAdminOrLeader) {
      const myDivCodes = new Set<string>();
      currentTeacher.divisionAssignments?.forEach((da: any) => {
        if (da.divisionCode) myDivCodes.add(normalizeDivisionCode(da.divisionCode));
      });
      if (["BAN_DHCM", "TB_DHCM"].includes(currentTeacher.position || "")) {
        myDivCodes.add("BAN_DHCM");
      }
      const isSuperDiv = Array.from(myDivCodes).some(dc => ["BAN_GD", "BAN_KT_DBCL", "BAN_DHCM", "BAN_TT"].includes(dc));
      if (!isSuperDiv) {
        const hostDivCodes = new Set<string>();
        if (hostTeacher.departmentRel?.divisionCode) hostDivCodes.add(normalizeDivisionCode(hostTeacher.departmentRel.divisionCode));
        hostTeacher.departmentAssignments?.forEach((da: any) => {
          if (da.department?.divisionCode) hostDivCodes.add(normalizeDivisionCode(da.department.divisionCode));
        });
        hostTeacher.divisionAssignments?.forEach((da: any) => {
          if (da.divisionCode) hostDivCodes.add(normalizeDivisionCode(da.divisionCode));
        });
        const hasMatchingDiv = Array.from(myDivCodes).some(dc => hostDivCodes.has(dc));
        const isSamePrimaryDept = currentTeacher.departmentId && hostTeacher.departmentId === currentTeacher.departmentId;
        if (!hasMatchingDiv && !isSamePrimaryDept) {
          return { success: false, error: "Trưởng Bộ Phận chỉ có quyền dự giờ đột xuất giáo viên thuộc Bộ Phận mình phụ trách." }
        }
      }
    }

    // 2. Kiểm tra phạm vi nếu là TTCM / QLCM (chỉ được dự giờ GV thuộc Tổ chuyên môn của mình)
    if (!isAdminOrLeader && (isTTCM || isQLCM) && !isTBP) {
      const ttcmDeptIds = new Set<string>()
      if (currentTeacher.departmentId) ttcmDeptIds.add(currentTeacher.departmentId)
      if (currentTeacher.departmentAssignments) {
        currentTeacher.departmentAssignments.forEach((da: any) => {
          if (["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM", "Tổ phó", "TO_PHO", "TPCM", "TPTCM", "QLCM", "QUAN_LY_CM", "Quản lý CM"].some(k => (da.position || "").toUpperCase().includes(k.toUpperCase())) && da.departmentId) {
            ttcmDeptIds.add(da.departmentId)
          }
        })
      }

      const hostDeptIds = new Set<string>()
      if (hostTeacher.departmentId) hostDeptIds.add(hostTeacher.departmentId)
      if (hostTeacher.departmentAssignments) {
        hostTeacher.departmentAssignments.forEach((da: any) => {
          if (da.departmentId) hostDeptIds.add(da.departmentId)
        })
      }

      const hasCommonDept = Array.from(ttcmDeptIds).some(id => hostDeptIds.has(id))
      if (!hasCommonDept) {
        return { success: false, error: "Tổ trưởng / Quản lý chuyên môn (QLCM) chỉ có quyền thực hiện dự giờ đột xuất cho Giáo viên thuộc Tổ chuyên môn của mình." }
      }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" }
    })

    const periodMap: Record<string, { start: string, end: string }> = {
      "Tiết 1": { start: "07:30", end: "08:15" },
      "Tiết 2": { start: "08:20", end: "09:05" },
      "Tiết 3": { start: "09:20", end: "10:05" },
      "Tiết 4": { start: "10:10", end: "10:55" },
      "Tiết 5": { start: "13:30", end: "14:15" },
      "Tiết 6": { start: "14:20", end: "15:05" },
      "Tiết 7": { start: "15:10", end: "15:55" },
      "Tiết 8": { start: "15:55", end: "16:40" },
      "HĐ Học sáng": { start: "08:30", end: "09:15" },
      "HĐ Tiếng Anh": { start: "09:15", end: "09:45" },
      "HĐ Góc/Ngoài trời": { start: "09:45", end: "10:30" },
      "HĐ Chiều": { start: "14:30", end: "15:15" }
    }

    const timeRange = periodMap[data.period || "Tiết 1"] || { start: "07:30", end: "08:15" }
    const slotDate = new Date(data.date)
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    if (!isNaN(slotDate.getTime()) && slotDate < currentMonthStart) {
      return { success: false, error: "Không thể tạo tiết dự giờ đột xuất thuộc các tháng trước. Vui lòng chọn ngày trong tháng hiện tại hoặc các tháng sau!" }
    }

    // 1. Create ObservationSlot
    let newSlot: any;
    try {
      newSlot = await prisma.observationSlot.create({
        data: {
          teacherId: hostTeacher.id,
          targetDeptId: data.targetDeptId || hostTeacher.departmentId || null,
          classId: data.classId || null,
          className: data.className || "Lớp học",
          level: data.level || "Phổ thông K-12",
          grade: data.grade || "Khối",
          subjectId: data.subjectId || null,
          subjectName: data.subjectName || "Môn học",
          topic: data.topic || "Dự giờ đột xuất",
          date: slotDate,
          startTime: data.period || timeRange.start,
          endTime: timeRange.end,
          room: data.room || "Phòng học",
          description: "Dự giờ đột xuất (" + (isTTCM ? "Tổ trưởng chuyên môn" : "Ban ĐHCM / BGH / GĐCS") + ")",
          visibilityType: "PUBLIC",
          maxSeats: 1,
          status: "ACTIVE",
          requestOrigin: "SURPRISE",
          academicYearId: activeYear?.id || null,
          campusId: hostTeacher.campusId || null,
          campusName: hostTeacher.campus?.campusName || null
        }
      })
    } catch (createErr: any) {
      if (createErr?.message?.includes("requestOrigin") || createErr?.message?.includes("no column named")) {
        newSlot = await prisma.observationSlot.create({
          data: {
            teacherId: hostTeacher.id,
            targetDeptId: data.targetDeptId || hostTeacher.departmentId || null,
            classId: data.classId || null,
            className: data.className || "Lớp học",
            level: data.level || "Phổ thông K-12",
            grade: data.grade || "Khối",
            subjectId: data.subjectId || null,
            subjectName: data.subjectName || "Môn học",
            topic: data.topic || "Dự giờ đột xuất",
            date: slotDate,
            startTime: data.period || timeRange.start,
            endTime: timeRange.end,
            room: data.room || "Phòng học",
            description: "Dự giờ đột xuất [SURPRISE]",
            visibilityType: "PUBLIC",
            maxSeats: 1,
            status: "ACTIVE",
            academicYearId: activeYear?.id || null,
            campusId: hostTeacher.campusId || null,
            campusName: hostTeacher.campus?.campusName || null
          }
        })
      } else {
        throw createErr
      }
    }

    // Bắt buộc nhập "Nội dung cần cải thiện / Góp ý phát triển" khi không phải lưu nháp
    if (!data.isDraft && (!data.improvements || !data.improvements.trim())) {
      return { success: false, error: "Nội dung cần cải thiện / Góp ý phát triển là bắt buộc. Vui lòng nhập nhận xét trước khi hoàn tất biên bản!" }
    }

    // 2. Create ObservationRegistration (Auto-approved)
    const registration = await prisma.observationRegistration.create({
      data: {
        slotId: newSlot.id,
        teacherId: currentTeacher.id,
        isApproved: true,
        approvedAt: new Date()
      }
    })

    // 3. Create ObservationEvaluation
    const evalData: any = {
      registrationId: registration.id,
      slotId: newSlot.id,
      evaluatorId: currentTeacher.id,
      criterion1: data.criterion1 ?? null,
      criterion2: data.criterion2 ?? null,
      criterion3: data.criterion3 ?? null,
      criterion4: data.criterion4 ?? null,
      criterion5: data.criterion5 ?? null,
      score1: data.score1 ?? null,
      score2: data.score2 ?? null,
      score3: data.score3 ?? null,
      score4: data.score4 ?? null,
      score5: data.score5 ?? null,
      score6: data.score6 ?? null,
      score7: data.score7 ?? null,
      score8: data.score8 ?? null,
      score9: data.score9 ?? null,
      score10: data.score10 ?? null,
      score11: data.score11 ?? null,
      totalScore: data.totalScore ?? null,
      strengths: data.strengths || "",
      improvements: data.improvements ? data.improvements.trim() : "",
      generalComment: data.generalComment || "",
      overallRating: data.overallRating || "Đạt",
      submittedAt: new Date(),
      reEvaluationStatus: data.isDraft ? "DRAFT" : null
    }

    await prisma.observationEvaluation.create({
      data: evalData
    })

    // Gửi Email thông báo kết quả đánh giá cho Giáo viên được dự & Người dự giờ (Observer) khi hoàn tất (không phải lưu nháp)
    if (!data.isDraft) {
      try {
        const hostEmail = getTeacherResolvedEmail(hostTeacher);
        const observerEmail = getTeacherResolvedEmail(currentTeacher);
        const isMN = data.level === "Mầm non";
        const formattedDateVi = new Date(data.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://skyline-survey.vercel.app";
        const totalDisplay = data.totalScore != null ? (isMN ? `${Number(data.totalScore).toFixed(2)} / 10.00đ` : `${Number(data.totalScore).toFixed(2)} / 20.00đ`) : "Đã hoàn thành";
        const ratingDisplay = data.overallRating || "Đạt";

        // 1. Email thông báo cho Giáo viên được dự (Host Teacher)
        if (hostEmail && hostEmail.includes("@")) {
          const linkUrl = SKYLINE_SSM_LOGIN_URL;
          const emailSubject = `[Sky-line SMS - Dự Giờ Đột Xuất] Kết quả đánh giá tiết dạy: "${data.topic}" - Người dự: ${currentTeacher.teacherName}`;
          const observerDeptName = currentTeacher.departmentRel?.name || 
            currentTeacher.departmentAssignments?.map((da: any) => da.department?.name).filter(Boolean).join(", ") || 
            undefined;

          // Parse criteria scores
          let parsedCriteriaScores: number[] = [];
          if (isMN) {
            try {
              const parsed = typeof data.generalComment === "string" ? JSON.parse(data.generalComment) : null;
              if (parsed && Array.isArray(parsed.scores)) {
                parsedCriteriaScores = parsed.scores;
              }
            } catch (e) {}
            if (parsedCriteriaScores.length === 0) {
              parsedCriteriaScores = [
                data.criterion1 || 0,
                data.criterion2 || 0,
                data.criterion3 || 0,
                data.criterion4 || 0,
                data.criterion5 || 0
              ];
            }
          } else {
            parsedCriteriaScores = [
              data.score1 || 0,
              data.score2 || 0,
              data.score3 || 0,
              data.score4 || 0,
              data.score5 || 0,
              data.score6 || 0,
              data.score7 || 0,
              data.score8 || 0,
              data.score9 || 0,
              data.score10 || 0,
              data.score11 || 0
            ];
          }

          const emailHtml = renderObservationSurpriseCompletedForHost({
            hostName: hostTeacher.teacherName,
            observerName: currentTeacher.teacherName,
            observerCode: currentTeacher.teacherCode,
            observerPosition: currentTeacher.position || undefined,
            observerEmail: observerEmail || undefined,
            observerDepartment: observerDeptName,
            topic: data.topic,
            subjectName: data.subjectName || "Môn học",
            grade: data.grade || "",
            className: data.className || "",
            dateStr: formattedDateVi,
            period: data.period || "Tiết dạy",
            campusName: hostTeacher.campus?.campusName || "Sky-Line",
            room: data.room || "học",
            totalScore: totalDisplay,
            rating: ratingDisplay,
            strengths: data.strengths || undefined,
            improvements: data.improvements || undefined,
            generalComment: data.generalComment || undefined,
            directLink: linkUrl,
            criteriaScores: {
              type: isMN ? "MAMNON" : "K12",
              scores: parsedCriteriaScores
            }
          });

          await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: hostEmail, subject: emailSubject, html: emailHtml }).catch(e => console.error("Surprise eval completed email error:", e));

          if (hostTeacher.user?.id) {
            await prisma.notification.create({
              data: {
                userId: hostTeacher.user.id,
                title: "Kết quả dự giờ đột xuất ⚡",
                message: `Thầy/Cô ${currentTeacher.teacherName} vừa hoàn thành phiếu đánh giá dự giờ đột xuất tiết "${data.topic}". Xếp loại: ${ratingDisplay}.`,
                link: `/teacher/du-gio?tab=evaluations`,
                isRead: false
              }
            }).catch(e => console.error("Notif error:", e));
          }
        }

        // 2. Email xác nhận & bản lưu cho Người dự giờ (Observer / TTCM / Ban ĐHCM)
        if (observerEmail && observerEmail.includes("@") && observerEmail !== hostEmail) {
          const observerLinkUrl = SKYLINE_SSM_LOGIN_URL;
          const observerSubject = `[Sky-line SMS - Dự Giờ Đột Xuất] Xác nhận biên bản & đánh giá đột xuất: "${data.topic}" - GV dạy: ${hostTeacher.teacherName}`;
          const observerHtml = renderObservationEvaluationCompletedForObserver({
            observerName: currentTeacher.teacherName,
            hostName: hostTeacher.teacherName,
            hostCode: hostTeacher.teacherCode,
            topic: data.topic,
            subjectName: data.subjectName || "Môn học",
            grade: data.grade || "",
            className: data.className || "",
            dateStr: formattedDateVi,
            period: data.period || "Tiết dạy",
            campusName: hostTeacher.campus?.campusName || "Sky-Line",
            room: data.room || "học",
            totalScore: totalDisplay,
            rating: ratingDisplay,
            strengths: data.strengths || undefined,
            improvements: data.improvements || undefined,
            generalComment: data.generalComment || undefined,
            directLink: observerLinkUrl
          });
          await sendEmail({ from: "HỆ THỐNG DỰ GIỜ SKY-LINE", to: observerEmail, subject: observerSubject, html: observerHtml }).catch(e => console.error("Observer surprise eval email error:", e));

          if (currentTeacher.user?.id) {
            await prisma.notification.create({
              data: {
                userId: currentTeacher.user.id,
                title: "Đã hoàn tất dự giờ đột xuất ⚡",
                message: `Thầy/Cô đã hoàn tất biên bản và phiếu đánh giá dự giờ đột xuất tiết "${data.topic}" của GV ${hostTeacher.teacherName}.`,
                link: `/teacher/du-gio?tab=my-registrations`,
                isRead: false
              }
            }).catch(e => console.error("Observer notif error:", e));
          }
        }
      } catch (mailErr) {
        console.error("Error sending surprise evaluation email:", mailErr);
      }
    }

    revalidatePath("/teacher/du-gio")
    revalidatePath("/teacher/du-gio-mam-non")
    revalidatePath("/admin/du-gio")
    revalidatePath("/admin/du-gio-mam-non")

    return { 
      success: true, 
      slot: newSlot, 
      registrationId: registration.id,
      message: data.isDraft ? "Đã lưu nháp phiếu đánh giá dự giờ đột xuất!" : "Đã hoàn thành đánh giá dự giờ đột xuất thành công!" 
    }
  } catch (e: any) {
    console.error("[createSurpriseObservation Error]:", e)
    return { success: false, error: e.message || "Lỗi khi tạo dự giờ đột xuất" }
  }
}

export async function getTTCMDepartmentOverview(params?: {
  departmentId?: string
  academicYearId?: string
  month?: string
}) {
  try {
    await ensureDbColumns();
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const roleCode = (session.user as any)?.role || "TEACHER";
    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        departmentAssignments: {
          include: { department: true }
        }
      }
    });

    const isKTDBCL = currentTeacher?.departmentRel?.code?.includes("KT") || 
      currentTeacher?.departmentRel?.name?.includes("KT&ĐBCL") || 
      currentTeacher?.departmentRel?.name?.includes("ĐBCL") ||
      currentTeacher?.departmentAssignments?.some((da: any) => 
        da.department?.code?.includes("KT") || da.department?.name?.includes("KT&ĐBCL") || da.department?.name?.includes("ĐBCL")
      );

    const isAdmin = (await checkIsObservationAdmin(roleCode, session.user.id)) || isKTDBCL;

    if (!currentTeacher && !isAdmin) {
      return { success: false, error: "Teacher profile not found" };
    }

    const isTTCM = currentTeacher?.position === "TTCM" ||
      ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(currentTeacher?.position || "") ||
      currentTeacher?.departmentAssignments?.some((da: any) => ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(da.position));

    if (!isAdmin && !isTTCM) {
      return { success: false, error: "Chỉ Tổ trưởng chuyên môn (TTCM) hoặc Quản trị viên mới có quyền xem tổng hợp Tổ chuyên môn." };
    }

    // Determine candidate department IDs for this TTCM / Admin
    const ttcmDeptIds = new Set<string>();
    if (currentTeacher?.departmentId) ttcmDeptIds.add(currentTeacher.departmentId);
    if (currentTeacher?.departmentAssignments) {
      currentTeacher.departmentAssignments.forEach((da: any) => {
        if (["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM"].includes(da.position) && da.departmentId) {
          ttcmDeptIds.add(da.departmentId);
        }
      });
    }

    let targetDeptId = params?.departmentId;
    if (!targetDeptId || targetDeptId === "all") {
      if (currentTeacher?.departmentId && (isAdmin || ttcmDeptIds.has(currentTeacher.departmentId))) {
        targetDeptId = currentTeacher.departmentId;
      } else if (ttcmDeptIds.size > 0) {
        targetDeptId = Array.from(ttcmDeptIds)[0];
      }
    }

    let targetDept = null;
    if (targetDeptId) {
      targetDept = await prisma.department.findUnique({
        where: { id: targetDeptId }
      });
    }

    // Determine active academic year
    const activeYear = params?.academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: params.academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });

    // Fetch all teachers in this department (including secondary assignments)
    const deptTeachersRaw = targetDeptId ? await prisma.teacher.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { departmentId: targetDeptId },
          { departmentAssignments: { some: { departmentId: targetDeptId } } }
        ]
      },
      select: {
        id: true,
        teacherName: true,
        teacherCode: true,
        email: true,
        departmentId: true,
        position: true,
        campusId: true,
        departmentAssignments: {
          select: { departmentId: true, position: true }
        }
      },
      orderBy: { teacherName: "asc" }
    }) : [];

    const teacherIds = deptTeachersRaw.map(t => t.id);

    // Fetch targets for these teachers
    const targets = (activeYear && teacherIds.length > 0) ? await prisma.teacherAcademicYearTarget.findMany({
      where: {
        academicYearId: activeYear.id,
        teacherId: { in: teacherIds }
      }
    }) : [];

    const targetsMap = new Map(targets.map(t => [t.teacherId, t]));

    const teachers = deptTeachersRaw.map(t => {
      const target = targetsMap.get(t.id);
      return {
        ...t,
        observerType: target?.observerType || null,
        observeeType: target?.observeeType || null,
        requiredObserved: target?.requiredObserved || 0,
        observedUnit: target?.observedUnit || "tháng",
        requiredTaught: target?.requiredTaught || 0,
        taughtUnit: target?.taughtUnit || "tháng"
      };
    });

    // Query slots where teacher is in this department OR an observer is in this department
    const slotWhere: any = {
      status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "REJECTED", "OPEN", "EXPIRED", "COMPLETED"] }
    };

    const andConditions: any[] = [];
    if (activeYear) {
      andConditions.push({
        OR: [
          { academicYearId: activeYear.id },
          {
            AND: [
              { academicYearId: null },
              {
                date: {
                  gte: activeYear.startDate,
                  lte: activeYear.endDate
                }
              }
            ]
          }
        ]
      });
    }

    if (params?.month && params.month !== "all") {
      const parts = params.month.split("-");
      if (parts.length === 2) {
        const mYear = parseInt(parts[0], 10);
        const mMonth = parseInt(parts[1], 10);
        if (!isNaN(mYear) && !isNaN(mMonth)) {
          const startOfMonth = new Date(mYear, mMonth - 1, 1);
          const endOfMonth = new Date(mYear, mMonth, 1);
          andConditions.push({
            date: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          });
        }
      }
    }

    if (teacherIds.length > 0) {
      andConditions.push({
        OR: [
          { teacherId: { in: teacherIds } },
          { registrations: { some: { teacherId: { in: teacherIds } } } }
        ]
      });
    }

    if (andConditions.length > 0) {
      slotWhere.AND = andConditions;
    }

    const slots = (teacherIds.length > 0) ? await prisma.observationSlot.findMany({
      where: slotWhere,
      include: {
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true,
            email: true,
            departmentId: true,
            position: true,
            campus: { select: { campusName: true } }
          }
        },
        registrations: {
          include: {
            teacher: {
              select: {
                id: true,
                teacherName: true,
                teacherCode: true,
                departmentId: true,
                position: true,
                email: true
              }
            },
            evaluation: true
          }
        }
      },
      orderBy: { date: "asc" }
    }) : [];

    return {
      success: true,
      department: targetDept,
      teachers,
      slots,
      academicYear: activeYear
    };
  } catch (e: any) {
    console.error("[getTTCMDepartmentOverview Error]:", e);
    return { success: false, error: e.message || "Lỗi khi lấy dữ liệu tổng hợp tổ chuyên môn" };
  }
}

/**
 * Rà soát và đồng bộ toàn diện trạng thái các tiết dự giờ:
 * 1. Các tiết PENDING_TEACHER_APPROVAL đã có đăng ký duyệt hoặc có biên bản đánh giá -> chuyển ACTIVE
 * 2. Các tiết PENDING_TEACHER_APPROVAL đã quá hạn (ngày trong quá khứ) mà chưa được duyệt -> chuyển EXPIRED
 * 3. Đóng các yêu cầu trùng lặp tự động -> REJECTED
 */
export async function syncAndReconcileObservationStatuses() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    const isObsAdmin = await checkIsObservationAdmin(session.user.role || "", session.user.id);
    if (!isObsAdmin) {
      return { success: false, error: "Chỉ Quản trị viên / BGH / TTCM mới có quyền thực hiện rà soát trạng thái." };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 1. Tiết đã có đăng ký duyệt hoặc có biên bản đánh giá
    const pendingWithApproved = await prisma.observationSlot.findMany({
      where: {
        status: "PENDING_TEACHER_APPROVAL",
        registrations: {
          some: {
            OR: [
              { isApproved: true },
              { evaluation: { isNot: null } }
            ]
          }
        }
      },
      select: { id: true }
    });

    let activatedCount = 0;
    if (pendingWithApproved.length > 0) {
      const actRes = await prisma.observationSlot.updateMany({
        where: { id: { in: pendingWithApproved.map(s => s.id) } },
        data: { status: "ACTIVE" }
      });
      activatedCount = actRes.count;
    }

    // 2. Tiết quá hạn chưa từng được duyệt
    const expiredRes = await prisma.observationSlot.updateMany({
      where: {
        status: "PENDING_TEACHER_APPROVAL",
        date: { lt: startOfToday },
        registrations: {
          none: {
            isApproved: true
          }
        }
      },
      data: { status: "EXPIRED" }
    });

    try {
      revalidatePath("/admin/du-gio");
      revalidatePath("/teacher/du-gio");
    } catch (e) {}

    return {
      success: true,
      activatedCount,
      expiredCount: expiredRes.count,
      message: `Đã rà soát xong: Kích hoạt ${activatedCount} tiết đã duyệt, chuyển ${expiredRes.count} tiết quá hạn sang Hết hạn.`
    };
  } catch (error: any) {
    console.error("[syncAndReconcileObservationStatuses Error]:", error);
    return { success: false, error: error.message || "Lỗi đồng bộ trạng thái tiết dự giờ" };
  }
}

/**
 * Nộp phiếu dự giờ bổ sung:
 * - Điều kiện: Tiết đã duyệt, GV dạy đã xác nhận dự giờ, chưa có phiếu (hoặc đang yêu cầu sửa)
 * - Thời hạn: Đến hết tháng phát sinh tiết dự giờ
 * - Bắt buộc nhập lý do bổ sung và nhận xét cải thiện
 * - Trạng thái ban đầu: isSupplemental = true, supplementalStatus = 'PENDING'
 */
export async function submitSupplementalEvaluation(data: {
  registrationId: string
  slotId: string
  criterion1?: number
  criterion2?: number
  criterion3?: number
  criterion4?: number
  criterion5?: number
  score1?: number
  score2?: number
  score3?: number
  score4?: number
  score5?: number
  score6?: number
  score7?: number
  score8?: number
  score9?: number
  score10?: number
  score11?: number
  totalScore?: number
  strengths?: string
  improvements: string
  generalComment?: string
  overallRating: string
  supplementalReason: string
}) {
  try {
    invalidateObservationSlotsCache();
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
        campus: true,
        departmentRel: true
      }
    });
    if (!currentTeacher) return { success: false, error: "Teacher profile not found" };

    const registration = await prisma.observationRegistration.findUnique({
      where: { id: data.registrationId },
      include: {
        evaluation: true,
        slot: {
          include: {
            teacher: { include: { user: true, campus: true } }
          }
        }
      }
    });
    if (!registration) return { success: false, error: "Không tìm thấy đăng ký dự giờ" };

    if (registration.teacherId !== currentTeacher.id) {
      return { success: false, error: "Bạn không có quyền nộp phiếu cho đăng ký dự giờ này" };
    }

    if (!registration.isApproved) {
      return { success: false, error: "Tiết dự giờ này chưa được Giáo viên giảng dạy xác nhận dự giờ. Không thể nộp phiếu bổ sung!" };
    }

    const slotDate = new Date(registration.slot.date);
    const now = new Date();

    if (slotDate > now) {
      return { success: false, error: "Tiết học chưa diễn ra. Không thể nộp phiếu đánh giá trước thời gian học." };
    }

    // Thời hạn bổ sung: Đến hết ngày cuối cùng của tháng phát sinh tiết dự
    const endOfSlotMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 0, 23, 59, 59, 999);
    if (now > endOfSlotMonth) {
      const monthStr = `${String(slotDate.getMonth() + 1).padStart(2, "0")}/${slotDate.getFullYear()}`;
      return {
        success: false,
        error: `Đã hết hạn bổ sung phiếu cho tiết học này! Thời hạn bổ sung chỉ áp dụng đến hết tháng phát sinh tiết dự (${monthStr}).`
      };
    }

    // Bắt buộc nhập lý do bổ sung
    if (!data.supplementalReason || !data.supplementalReason.trim()) {
      return { success: false, error: "Lý do bổ sung phiếu là bắt buộc. Vui lòng nêu rõ lý do chưa nộp kịp thời!" };
    }

    // Bắt buộc nhập nhận xét cải thiện
    if (!data.improvements || !data.improvements.trim()) {
      return { success: false, error: "Nội dung cần cải thiện / Góp ý phát triển là bắt buộc. Vui lòng nhập nhận xét trước khi gửi phiếu!" };
    }

    // Đọc lịch sử hiện tại nếu có
    let historyList: any[] = [];
    if (registration.evaluation?.supplementalHistory) {
      try {
        historyList = JSON.parse(registration.evaluation.supplementalHistory);
        if (!Array.isArray(historyList)) historyList = [];
      } catch (e) {
        historyList = [];
      }
    }

    const newHistoryEntry = {
      action: registration.evaluation?.supplementalStatus === "NEEDS_REVISION" ? "RESUBMIT" : "SUBMIT",
      timestamp: now.toISOString(),
      reason: data.supplementalReason.trim(),
      submittedBy: currentTeacher.teacherName,
      teacherCode: currentTeacher.teacherCode
    };
    historyList.push(newHistoryEntry);

    const evalData = {
      criterion1: data.criterion1 ?? null,
      criterion2: data.criterion2 ?? null,
      criterion3: data.criterion3 ?? null,
      criterion4: data.criterion4 ?? null,
      criterion5: data.criterion5 ?? null,
      score1: data.score1 ?? null,
      score2: data.score2 ?? null,
      score3: data.score3 ?? null,
      score4: data.score4 ?? null,
      score5: data.score5 ?? null,
      score6: data.score6 ?? null,
      score7: data.score7 ?? null,
      score8: data.score8 ?? null,
      score9: data.score9 ?? null,
      score10: data.score10 ?? null,
      score11: data.score11 ?? null,
      totalScore: data.totalScore ?? null,
      strengths: data.strengths || "",
      improvements: data.improvements.trim(),
      generalComment: data.generalComment || "",
      overallRating: data.overallRating,
      submittedAt: now,
      // Cờ bổ sung
      isSupplemental: true,
      supplementalStatus: "PENDING",
      supplementalReason: data.supplementalReason.trim(),
      supplementalSubmittedAt: now,
      supplementalReviewedAt: null,
      supplementalReviewedBy: null,
      supplementalReviewNote: null,
      supplementalHistory: JSON.stringify(historyList)
    };

    if (registration.evaluation) {
      await prisma.observationEvaluation.update({
        where: { registrationId: data.registrationId },
        data: evalData
      });
    } else {
      await prisma.observationEvaluation.create({
        data: {
          registrationId: data.registrationId,
          slotId: data.slotId,
          evaluatorId: currentTeacher.id,
          ...evalData
        }
      });
    }

    // Gửi thông báo In-app cho GV giảng dạy (Host Teacher) biết có phiếu bổ sung chờ duyệt
    const hostTeacher = registration.slot?.teacher;
    if (hostTeacher?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: hostTeacher.user.id,
          title: "Phiếu dự giờ bổ sung chờ duyệt 📋",
          message: `Thầy/Cô ${currentTeacher.teacherName} vừa nộp phiếu dự giờ bổ sung cho tiết "${registration.slot.topic}". Vui lòng xem xét và duyệt phiếu.`,
          link: `/teacher/du-gio?tab=my_schedule`,
          isRead: false
        }
      }).catch(e => console.error("[submitSupplementalEvaluation] Notif error:", e));
    }

    revalidatePath("/teacher/du-gio");
    revalidatePath("/teacher/du-gio-mam-non");
    revalidatePath("/admin/du-gio");

    return {
      success: true,
      message: "Đã nộp phiếu dự giờ bổ sung thành công! Phiếu đang chờ Giáo viên giảng dạy xét duyệt."
    };
  } catch (e: any) {
    console.error("[submitSupplementalEvaluation Error]:", e);
    return { success: false, error: e.message || "Lỗi khi nộp phiếu dự giờ bổ sung" };
  }
}

/**
 * GV Giảng dạy xét duyệt phiếu dự giờ bổ sung:
 * - action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
 * - Chỉ sau khi GVGD duyệt (APPROVE):
 *   + Phiếu được ghi nhận chính thức
 *   + Được tính vào thống kê
 *   + Tự động gửi email kết quả cho GV dạy
 */
export async function reviewSupplementalEvaluation(data: {
  evaluationId?: string
  registrationId?: string
  action: "APPROVE" | "REJECT" | "REQUEST_REVISION"
  reviewNote?: string
}) {
  try {
    invalidateObservationSlotsCache();
    await ensureDbColumns();
    const session = await auth()
    if (!session || !session.user) return { success: false, error: "Unauthorized" }

    const roleCode = (session.user as any)?.role || "TEACHER";
    const isObsAdmin = await checkIsObservationAdmin(roleCode, session.user.id);
    const currentTeacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { user: true, campus: true }
    });
    if (!currentTeacher && !isObsAdmin) return { success: false, error: "Teacher profile not found" };

    let evaluation = null;
    if (data.evaluationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { id: data.evaluationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true, campus: true, departmentRel: true, departmentAssignments: { include: { department: true } } } },
              slot: { include: { teacher: { include: { user: true, campus: true } } } }
            }
          }
        }
      });
    } else if (data.registrationId) {
      evaluation = await prisma.observationEvaluation.findUnique({
        where: { registrationId: data.registrationId },
        include: {
          registration: {
            include: {
              teacher: { include: { user: true, campus: true, departmentRel: true, departmentAssignments: { include: { department: true } } } },
              slot: { include: { teacher: { include: { user: true, campus: true } } } }
            }
          }
        }
      });
    }

    if (!evaluation) return { success: false, error: "Không tìm thấy phiếu đánh giá cần xét duyệt" };

    const hostTeacher = evaluation.registration?.slot?.teacher;
    const observerTeacher = evaluation.registration?.teacher;
    const slot = evaluation.registration?.slot;

    // Kiểm tra quyền: Người thực hiện phải là GVGD của tiết đó hoặc Quản trị viên
    const isHost = currentTeacher && hostTeacher && hostTeacher.id === currentTeacher.id;
    if (!isHost && !isObsAdmin) {
      return { success: false, error: "Chỉ Giáo viên trực tiếp giảng dạy tiết học này (hoặc Ban Quản trị) mới có quyền xét duyệt phiếu bổ sung!" };
    }

    // Bắt buộc nhập lý do/ghi chú khi Từ chối hoặc Yêu cầu sửa
    if (data.action !== "APPROVE" && (!data.reviewNote || !data.reviewNote.trim())) {
      return {
        success: false,
        error: data.action === "REJECT" ? "Vui lòng nhập lý do từ chối phiếu bổ sung!" : "Vui lòng nhập nội dung yêu cầu chỉnh sửa!"
      };
    }

    const now = new Date();
    const reviewerName = currentTeacher?.teacherName || session.user.name || "Giáo viên giảng dạy";

    // Đọc lịch sử và append
    let historyList: any[] = [];
    if (evaluation.supplementalHistory) {
      try {
        historyList = JSON.parse(evaluation.supplementalHistory);
        if (!Array.isArray(historyList)) historyList = [];
      } catch (e) {
        historyList = [];
      }
    }

    historyList.push({
      action: data.action,
      reviewedBy: reviewerName,
      timestamp: now.toISOString(),
      note: data.reviewNote?.trim() || null
    });

    if (data.action === "APPROVE") {
      await prisma.observationEvaluation.update({
        where: { id: evaluation.id },
        data: {
          supplementalStatus: "APPROVED",
          supplementalReviewedAt: now,
          supplementalReviewedBy: reviewerName,
          supplementalReviewNote: data.reviewNote?.trim() || null,
          supplementalHistory: JSON.stringify(historyList)
        }
      });

      // TỰ ĐỘNG GỬI EMAIL KẾT QUẢ CHO GIÁO VIÊN GIẢNG DẠY (Host Teacher)
      try {
        const hostEmail = getTeacherResolvedEmail(hostTeacher);
        const observerEmail = getTeacherResolvedEmail(observerTeacher);
        const isMN = slot?.level === "Mầm non";
        const isSurprise = slot?.requestOrigin === "SURPRISE" ||
          (typeof slot?.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất")));
        const formattedDateVi = slot?.date
          ? new Date(slot.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
          : "";
        const totalDisplay = evaluation.totalScore != null
          ? (isMN ? `${Number(evaluation.totalScore).toFixed(2)} / 10.00đ` : `${Number(evaluation.totalScore).toFixed(2)} / 20.00đ`)
          : "Đã hoàn thành";
        const ratingDisplay = evaluation.overallRating || "Đạt";

        if (hostTeacher && hostEmail && hostEmail.includes("@")) {
          const emailSubject = `[Sky-line SSM - Phiếu Bổ Sung Đã Duyệt] Kết quả đánh giá tiết dạy: "${slot?.topic}" - Người dự: ${observerTeacher?.teacherName}`;

          const observerDeptName = observerTeacher?.departmentRel?.name ||
            observerTeacher?.departmentAssignments?.map((da: any) => da.department?.name).filter(Boolean).join(", ") ||
            undefined;

          let parsedCriteriaScores: number[] = [];
          if (isMN) {
            try {
              const parsed = typeof evaluation.generalComment === "string" ? JSON.parse(evaluation.generalComment) : null;
              if (parsed && Array.isArray(parsed.scores)) {
                parsedCriteriaScores = parsed.scores;
              }
            } catch (e) {}
            if (parsedCriteriaScores.length === 0) {
              parsedCriteriaScores = [
                evaluation.criterion1 || 0,
                evaluation.criterion2 || 0,
                evaluation.criterion3 || 0,
                evaluation.criterion4 || 0,
                evaluation.criterion5 || 0
              ];
            }
          } else {
            parsedCriteriaScores = [
              evaluation.score1 || 0,
              evaluation.score2 || 0,
              evaluation.score3 || 0,
              evaluation.score4 || 0,
              evaluation.score5 || 0,
              evaluation.score6 || 0,
              evaluation.score7 || 0,
              evaluation.score8 || 0,
              evaluation.score9 || 0,
              evaluation.score10 || 0,
              evaluation.score11 || 0
            ];
          }

          const emailHtml = isSurprise
            ? renderObservationSurpriseCompletedForHost({
                hostName: hostTeacher.teacherName,
                observerName: observerTeacher?.teacherName || "Giáo viên dự giờ",
                observerCode: observerTeacher?.teacherCode,
                observerPosition: observerTeacher?.position || undefined,
                observerEmail: observerEmail || undefined,
                observerDepartment: observerDeptName,
                topic: slot?.topic || "Tiết dạy",
                subjectName: slot?.subjectName || "Môn học",
                grade: slot?.grade || "",
                className: slot?.className || "",
                dateStr: formattedDateVi,
                period: slot?.startTime || "Tiết dạy",
                campusName: slot?.campusName || hostTeacher.campus?.campusName || "Sky-Line",
                room: slot?.room || "học",
                totalScore: totalDisplay,
                rating: ratingDisplay,
                strengths: evaluation.strengths || undefined,
                improvements: evaluation.improvements || undefined,
                generalComment: evaluation.generalComment || undefined,
                directLink: SKYLINE_SSM_LOGIN_URL,
                criteriaScores: {
                  type: isMN ? "MAMNON" : "K12",
                  scores: parsedCriteriaScores
                }
              })
            : renderObservationEvaluationCompletedForHost({
                hostName: hostTeacher.teacherName,
                observerName: observerTeacher?.teacherName || "Giáo viên dự giờ",
                observerCode: observerTeacher?.teacherCode,
                observerPosition: observerTeacher?.position || undefined,
                topic: slot?.topic || "Tiết dạy",
                subjectName: slot?.subjectName || "Môn học",
                grade: slot?.grade || undefined,
                className: slot?.className || undefined,
                dateStr: formattedDateVi,
                period: `${slot?.startTime || ""}${slot?.endTime ? " - " + slot.endTime : ""}`.trim() || "Tiết dự giờ",
                campusName: slot?.campusName || hostTeacher.campus?.campusName || "Sky-Line",
                room: slot?.room || undefined,
                totalScore: totalDisplay,
                rating: ratingDisplay,
                strengths: evaluation.strengths || undefined,
                improvements: evaluation.improvements || undefined,
                generalComment: evaluation.generalComment || undefined,
                directLink: SKYLINE_SSM_LOGIN_URL,
                criteriaScores: {
                  type: isMN ? "MAMNON" : "K12",
                  scores: parsedCriteriaScores
                }
              });

          await sendEmail({
            from: "HỆ THỐNG DỰ GIỜ SKY-LINE",
            to: hostEmail,
            subject: emailSubject,
            html: emailHtml
          }).catch(e => console.error("[reviewSupplementalEvaluation] Email sending error to host:", e));
        }

        // Thông báo in-app cho GV dự giờ
        if (observerTeacher?.user?.id) {
          await prisma.notification.create({
            data: {
              userId: observerTeacher.user.id,
              title: "Phiếu dự giờ bổ sung đã được duyệt ✅",
              message: `Giáo viên giảng dạy ${reviewerName} đã phê duyệt phiếu dự giờ bổ sung của Thầy/Cô cho tiết "${slot?.topic}". Phiếu đã được ghi nhận chính thức vào hệ thống thống kê.`,
              link: `/teacher/du-gio?tab=evaluations`,
              isRead: false
            }
          }).catch(e => console.error("[reviewSupplementalEvaluation] In-app notif error to observer:", e));
        }
      } catch (mailErr) {
        console.error("[reviewSupplementalEvaluation] Post-approval dispatch error:", mailErr);
      }

      revalidatePath("/teacher/du-gio");
      revalidatePath("/teacher/du-gio-mam-non");
      revalidatePath("/admin/du-gio");
      revalidatePath("/admin/tong-hop-du-gio");

      return {
        success: true,
        message: "Đã phê duyệt phiếu dự giờ bổ sung thành công! Phiếu đã được ghi nhận chính thức và hệ thống đã gửi email kết quả cho Giáo viên giảng dạy."
      };
    } else if (data.action === "REJECT") {
      await prisma.observationEvaluation.update({
        where: { id: evaluation.id },
        data: {
          supplementalStatus: "REJECTED",
          supplementalReviewedAt: now,
          supplementalReviewedBy: reviewerName,
          supplementalReviewNote: data.reviewNote.trim(),
          supplementalHistory: JSON.stringify(historyList)
        }
      });

      if (observerTeacher?.user?.id) {
        await prisma.notification.create({
          data: {
            userId: observerTeacher.user.id,
            title: "Phiếu dự giờ bổ sung bị từ chối ❌",
            message: `Phiếu dự giờ bổ sung cho tiết "${slot?.topic}" đã bị từ chối bởi ${reviewerName}. Lý do: ${data.reviewNote.trim()}`,
            link: `/teacher/du-gio?tab=my_schedule`,
            isRead: false
          }
        }).catch(e => console.error("[reviewSupplementalEvaluation] In-app notif error to observer:", e));
      }

      revalidatePath("/teacher/du-gio");
      revalidatePath("/admin/du-gio");

      return {
        success: true,
        message: "Đã từ chối phiếu dự giờ bổ sung."
      };
    } else if (data.action === "REQUEST_REVISION") {
      await prisma.observationEvaluation.update({
        where: { id: evaluation.id },
        data: {
          supplementalStatus: "NEEDS_REVISION",
          supplementalReviewedAt: now,
          supplementalReviewedBy: reviewerName,
          supplementalReviewNote: data.reviewNote.trim(),
          supplementalHistory: JSON.stringify(historyList)
        }
      });

      if (observerTeacher?.user?.id) {
        await prisma.notification.create({
          data: {
            userId: observerTeacher.user.id,
            title: "Yêu cầu chỉnh sửa phiếu dự giờ bổ sung ✍️",
            message: `Giáo viên giảng dạy ${reviewerName} yêu cầu Thầy/Cô chỉnh sửa lại phiếu dự giờ bổ sung cho tiết "${slot?.topic}". Nội dung: ${data.reviewNote.trim()}`,
            link: `/teacher/du-gio?tab=my_schedule`,
            isRead: false
          }
        }).catch(e => console.error("[reviewSupplementalEvaluation] In-app notif error to observer:", e));
      }

      revalidatePath("/teacher/du-gio");
      revalidatePath("/admin/du-gio");

      return {
        success: true,
        message: "Đã gửi yêu cầu chỉnh sửa đến Giáo viên dự giờ."
      };
    }

    return { success: false, error: "Hành động không hợp lệ" };
  } catch (e: any) {
    console.error("[reviewSupplementalEvaluation Error]:", e);
    return { success: false, error: e.message || "Lỗi khi xét duyệt phiếu bổ sung" };
  }
}

