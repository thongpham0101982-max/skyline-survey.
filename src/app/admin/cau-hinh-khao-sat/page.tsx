import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { SurveyConfigClient } from "./client"

export const metadata = { title: "Cấu hình Khảo sát | Admin" }
export const dynamic = "force-dynamic";

export default async function SurveyConfigPage({ searchParams }: { searchParams: { tab?: string } }) {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error:", e);
  }
  
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  let liveCampusIds = [...allowedCampusIds];

  // --- FETCH CHUNG ---
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let giaoVuCSUsers: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];

  // --- FETCH K12 RIÊNG ---
  let examBoardUsers: any[] = [];
  let gdcsUsers: any[] = [];
  let subjects: any[] = [];
  let eduSystems: any[] = [];
  let gradesK12: string[] = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  let configs: any[] = [];
  let rolePermissions: any[] = [];

  // --- FETCH MẦM NON RIÊNG ---
  const gradesPreschool = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];

  try {
    const pAny = prisma as any;
    if (pAny) {
      const roleCode = user?.role || "ADMIN";

      // Trigger all fetches in parallel using Promise.all
      const [
        dbAssignments,
        academicYearsResult,
        campusesResult,
        giaoVuCSUsersResult,
        departmentsResult,
        teachersResult,
        examBoardUsersResult,
        gdcsUsersResult,
        subjectsResult,
        configsResult,
        eduSystemsResult,
        count1218Result,
        needsMigrationResult,
        activeYearResult,
        rolePermissionsResult
      ] = await Promise.all([
        // 1. dbAssignments
        user?.id && pAny.userCampusAssignment ? pAny.userCampusAssignment.findMany({ where: { userId: user.id } }).catch(() => []) : Promise.resolve([]),
        // 2. academicYears
        pAny.academicYear ? pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []) : Promise.resolve([]),
        // 3. campuses
        pAny.campus ? pAny.campus.findMany({
          where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
          include: {
            manager: {
              include: {
                teacher: true
              }
            }
          },
          orderBy: { campusName: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 4. giaoVuCSUsers
        pAny.user ? pAny.user.findMany({
          where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } },
          select: { id: true, fullName: true }
        }).catch(() => []) : Promise.resolve([]),
        // 5. departments
        pAny.department ? pAny.department.findMany({
          where: { status: "ACTIVE" }, orderBy: { name: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 6. teachers
        pAny.teacher ? pAny.teacher.findMany({
          where: { status: "ACTIVE" },
          include: {
            departmentRel: true,
            campus: true,
            user: true
          },
          orderBy: { teacherName: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 7. examBoardUsers
        pAny.user ? pAny.user.findMany({
          where: { role: { in: ["KT_DBCL", "ADMIN"] } },
          select: { id: true, fullName: true }
        }).catch(() => []) : Promise.resolve([]),
        // 8. gdcsUsers
        pAny.user ? pAny.user.findMany({
          where: { role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "gdcs", "gđcs", "gđ_cs", "gd_cs"] } },
          select: { id: true, fullName: true, email: true }
        }).catch(() => []) : Promise.resolve([]),
        // 9. subjects
        pAny.assessmentSubject ? pAny.assessmentSubject.findMany({
          where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 10. configs
        pAny.assessmentConfig ? pAny.assessmentConfig.findMany({
          orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
        }).catch(() => []) : Promise.resolve([]),
        // 11. eduSystems
        pAny.educationSystem ? pAny.educationSystem.findMany({
          orderBy: { createdAt: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        // 12. count1218
        pAny.preschoolDevCriteria ? pAny.preschoolDevCriteria.count({ where: { ageGroup: "12 đến 18 tháng" } }).catch(() => 0) : Promise.resolve(0),
        // 13. needsMigration
        pAny.preschoolDevCriteria ? pAny.preschoolDevCriteria.findFirst({
          where: { ageGroup: { in: ["Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"] } }
        }).catch(() => null) : Promise.resolve(null),
        // 14. activeYear
        pAny.academicYear ? getDefaultAcademicYear(pAny).catch(() => null) : Promise.resolve(null),
        // 15. rolePermissions
        pAny.permission ? pAny.permission.findMany({ where: { roleCode } }).catch(() => []) : Promise.resolve([])
      ]);

      // Assign results
      academicYears = academicYearsResult;
      campuses = campusesResult;
      giaoVuCSUsers = giaoVuCSUsersResult;
      departments = departmentsResult;
      teachers = teachersResult;
      examBoardUsers = examBoardUsersResult;
      gdcsUsers = gdcsUsersResult;
      subjects = subjectsResult;
      configs = configsResult;
      eduSystems = eduSystemsResult;
      rolePermissions = rolePermissionsResult;

      if (dbAssignments && dbAssignments.length > 0) {
        liveCampusIds = dbAssignments.map((a: any) => a.campusId);
      }

      // Run auto-seeding if needed
      if (count1218Result === 0 && pAny.preschoolDevCriteria) {
        console.log("Auto-seeding criteria for '12 đến 18 tháng'...");
        await seedPreschool1218(pAny);
      }

      // Run auto-migration if needed
      if (needsMigrationResult && pAny.preschoolDevCriteria) {
        console.log("Auto-migration needed for age groups. Running updates...");
        await Promise.all([
          pAny.preschoolDevCriteria.updateMany({
            where: { ageGroup: "Mẫu giáo bé" },
            data: { ageGroup: "3 đến 4 tuổi" }
          }),
          pAny.preschoolDevCriteria.updateMany({
            where: { ageGroup: "Mẫu giáo nhỡ" },
            data: { ageGroup: "4 đến 5 tuổi" }
          }),
          pAny.preschoolDevCriteria.deleteMany({
            where: { ageGroup: "Mẫu giáo lớn" }
          })
        ]);
      }

      // Fetch gradesK12 if activeYear exists
      if (activeYearResult && pAny.class) {
        const uniqueGrades = await pAny.class.findMany({
          where: { academicYearId: activeYearResult.id },
          select: { grade: true },
          distinct: ["grade"],
          orderBy: { grade: "asc" }
        }).catch(() => []);
        
        try {
          const dbGrades = uniqueGrades
            .map((g: any) => g.grade)
            .filter(Boolean)
            .filter((g: string) => {
              const n = parseInt(g);
              return !isNaN(n) && n >= 1 && n <= 12;
            });
          if (dbGrades.length > 0) {
            gradesK12 = dbGrades.sort((a: any, b: any) => {
              const na = parseInt(a);
              const nb = parseInt(b);
              if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b));
              return na - nb;
            });
          }
        } catch (sortError) {
          console.error("Sorting grades error handled:", sortError);
        }
      }
    }
  } catch (error) {
    console.error("Critical SurveyConfigPage fetch error:", error);
  }

  const safeJson = (data: any) => {
    try {
      if (!data) return [];
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      return [];
    }
  }

  const currentUser = session?.user 
    ? { 
        id: session.user.id, 
        role: (session.user as any).role, 
        campusIds: liveCampusIds, 
        fullName: session.user.name || '' 
      } 
    : null;

  return (
    <SurveyConfigClient
      initialTab={searchParams?.tab || ""}
      academicYears={safeJson(academicYears)}
      campuses={safeJson(campuses)}
      giaoVuCSUsers={safeJson(giaoVuCSUsers)}
      teachers={safeJson(teachers)}
      departments={safeJson(departments)}
      
      // K12
      examBoardUsers={safeJson(examBoardUsers)}
      gdcsUsers={safeJson(gdcsUsers)}
      subjects={safeJson(subjects)}
      eduSystems={safeJson(eduSystems)}
      gradesK12={safeJson(gradesK12)}
      configs={safeJson(configs)}
      rolePermissions={safeJson(rolePermissions)}

      // Mầm non
      gradesPreschool={gradesPreschool}

      // User
      currentUser={currentUser}
    />
  )
}

async function seedPreschool1218(prisma: any) {
  const seedAreas = [
    {
      code: "THE_CHAT",
      name: "Thể chất",
      color: "#10b981",
      sortOrder: 0,
      type: "INPUT",
      criteria: [
        { code: "TC_1218_01", name: "Sức khỏe - Chiều cao (cm)", sortOrder: 1 },
        { code: "TC_1218_02", name: "Sức khỏe - Cân nặng (Kg)", sortOrder: 2 },
        { code: "TC_1218_03", name: "Có thể bắt đầu ngủ suốt đêm", sortOrder: 3 },
        { code: "TC_1218_04", name: "Vận động thô - Ngồi mà không cần hỗ trợ", sortOrder: 4 },
        { code: "TC_1218_05", name: "Vận động thô - Bước đi chập chững hoặc có người hỗ trợ", sortOrder: 5 },
        { code: "TC_1218_06", name: "Vận động thô - Giơ tay tới trước/lên cao để lấy đồ vật", sortOrder: 6 },
        { code: "TC_1218_07", name: "Vận động thô - Chuyển đồ vật từ tay này sang tay kia", sortOrder: 7 },
        { code: "TC_1218_08", name: "Vận động tinh - Tự cầm bình sữa/bình nước của mình", sortOrder: 8 },
        { code: "TC_1218_09", name: "Vận động tinh - Tháo lắp, lồng được 3-4 hộp tròn hoặc thả đồ vật vào hộp", sortOrder: 9 }
      ]
    },
    {
      code: "NHAN_THUC",
      name: "Nhận thức",
      color: "#6366f1",
      sortOrder: 1,
      type: "INPUT",
      criteria: [
        { code: "NT_1218_01", name: "Nhận biết bản thân (quay và nhìn khi tên được gọi tên)", sortOrder: 1 },
        { code: "NT_1218_02", name: "Nhận biết người thân trong gia đình (ba, mẹ, ông, bà...)", sortOrder: 2 },
        { code: "NT_1218_03", name: "Nhận biết một số bộ phận trên cơ thể của bản thân: mắt, mũi, chân, tay,...", sortOrder: 3 },
        { code: "NT_1218_04", name: "Bắt chước hành động đơn giản", sortOrder: 4 },
        { code: "NT_1218_05", name: "Tìm đồ vật bị giấu", sortOrder: 5 },
        { code: "NT_1218_06", name: "Nghe âm thanh và tìm nơi phát ra âm thanh", sortOrder: 6 }
      ]
    },
    {
      code: "NGON_NGU",
      name: "Ngôn ngữ",
      color: "#f59e0b",
      sortOrder: 2,
      type: "INPUT",
      criteria: [
        { code: "NN_1218_01", name: "Hiểu và làm theo chỉ dẫn đơn giản của người lớn", sortOrder: 1 },
        { code: "NN_1218_02", name: "Trả lời được câu hỏi đơn giản: ở đâu?, con gì?, ...thế nào? (con gà gáy thế nào?)....", sortOrder: 2 },
        { code: "NN_1218_03", name: "Gọi tên một số nhân vật, đồ vật, con vật, hành động trong sách", sortOrder: 3 },
        { code: "NN_1218_04", name: "Thể hiện nhu cầu của bản thân bằng ngôn ngữ cơ thể, từ đơn", sortOrder: 4 }
      ]
    },
    {
      code: "TINH_CAM_XH_TM",
      name: "TÌNH CẢM - KỸ NĂNG XÃ HỘI VÀ THẨM MĨ",
      color: "#ec4899",
      sortOrder: 3,
      type: "INPUT",
      criteria: [
        { code: "TM_1218_01", name: "Thích nghe hát, nghe nhạc", sortOrder: 1 },
        { code: "TM_1218_02", name: "Thích xem tranh ảnh có màu sắc", sortOrder: 2 },
        { code: "TM_1218_03", name: "Cảm nhận và biểu lộ cảm xúc: vui, sợ hãi qua nét mặt, cử chỉ", sortOrder: 3 },
        { code: "TM_1218_04", name: "Thực hiện một số hành vi giao tiếp: chào, tạm biệt khi được nhắc", sortOrder: 4 }
      ]
    },
    {
      code: "PROB_NHAN_THUC",
      name: "Phát triển Nhận thức",
      color: "#f59e0b",
      sortOrder: 1,
      type: "PROBATION",
      criteria: [
        { code: "PR_NT_1218_01", name: "Chú ý quan sát các sự vật, hiện tượng xung quanh.", sortOrder: 1 },
        { code: "PR_NT_1218_02", name: "Đặt câu hỏi về sự thay đổi của các sự vật, hiện tượng gần gũi/ quen thuộc", sortOrder: 2 },
        { code: "PR_NT_1218_03", name: "Nhận biết được sự vật, đồ vật gần gũi khi sờ nắn, nghe, ngửi, nếm ...", sortOrder: 3 },
        { code: "PR_NT_1218_04", name: "Tìm kiếm sự trợ giúp của người khác khi khám phá sự vật, hiện tượng gần gũi", sortOrder: 4 },
        { code: "PR_NT_1218_05", name: "Nhận biết được tên, đặc điểm bên ngoài và chức năng chính của 1 số bộ phận cơ thể người.", sortOrder: 5 }
      ]
    },
    {
      code: "PROB_NGON_NGU",
      name: "Phát triển Ngôn ngữ",
      color: "#3b82f6",
      sortOrder: 2,
      type: "PROBATION",
      criteria: [
        { code: "PR_NN_1218_01", name: "Hiểu và thực hiện các yêu cầu đơn giản của người lớn.", sortOrder: 1 },
        { code: "PR_NN_1218_02", name: "Nói/ Nhắc lại được 1 số từ có 2-3 tiếng: ba, mẹ, đi chơi...", sortOrder: 2 },
        { code: "PR_NN_1218_03", name: "Sử dụng ngôn ngữ/hành động để thể hiện nhu cầu.", sortOrder: 3 },
        { code: "PR_NN_1218_04", name: "Sử dụng ngôn ngữ/hành động để giao tiếp với cô giáo, bạn bè.", sortOrder: 4 }
      ]
    },
    {
      code: "PROB_TINH_CAM_XH",
      name: "Phát triển Tình cảm và Kỹ năng Xã hội",
      color: "#ec4899",
      sortOrder: 3,
      type: "PROBATION",
      criteria: [
        { code: "PR_TC_1218_01", name: "Nhận ra bản thân trong gương, trong ảnh (chỉ vào hình ảnh của mình trong gương khi được hỏi)", sortOrder: 1 },
        { code: "PR_TC_1218_02", name: "Cảm nhận và biểu lộ cảm xúc vui, buồn, sợ hãi của mình với người xung quanh.", sortOrder: 2 },
        { code: "PR_TC_1218_03", name: "Làm theo một số yêu cầu đơn giản của cô", sortOrder: 3 },
        { code: "PR_TC_1218_04", name: "Chào tạm biệt khi được nhắc nhở.", sortOrder: 4 }
      ]
    }
  ];

  for (const areaData of seedAreas) {
    let area = await prisma.preschoolDevArea.findUnique({
      where: { code: areaData.code }
    });

    if (!area) {
      area = await prisma.preschoolDevArea.create({
        data: {
          code: areaData.code,
          name: areaData.name,
          color: areaData.color,
          sortOrder: areaData.sortOrder,
          type: areaData.type,
          description: `Đánh giá sự ${areaData.name.toLowerCase()}`
        }
      });
    } else {
      await prisma.preschoolDevArea.update({
        where: { id: area.id },
        data: {
          name: areaData.name,
          color: areaData.color || area.color,
          type: areaData.type,
          status: "ACTIVE"
        }
      });
    }

    for (const crit of areaData.criteria) {
      await prisma.preschoolDevCriteria.upsert({
        where: {
          areaId_code_ageGroup: {
            areaId: area.id,
            code: crit.code,
            ageGroup: "12 đến 18 tháng"
          }
        },
        update: {
          name: crit.name,
          sortOrder: crit.sortOrder,
          status: "ACTIVE"
        },
        create: {
          areaId: area.id,
          code: crit.code,
          name: crit.name,
          ageGroup: "12 đến 18 tháng",
          sortOrder: crit.sortOrder
        }
      });
    }
  }
}
