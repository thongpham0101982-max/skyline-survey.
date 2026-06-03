"use server"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const LOGIN_URL = 'https://api.skylineschool.edu.vn/api/Auth/login';
const SYS_USERNAME = 'ktdbcl';
const SYS_PASSWORD = 'Songhanhphuc@@2025';

// Helper to authenticate and get JWT token
async function getAuthToken() {
  const credentials = {
    userName: SYS_USERNAME,
    password: SYS_PASSWORD
  };

  const response = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Authentication failed with status ${response.status}: ${text}`);
  }

  const data = await response.json();
  const token = data.accessToken || data.token;
  if (!token) {
    throw new Error("Token not found in login response payload");
  }
  return token;
}

// 1. Action to test API connection using specific credentials
export async function testConnectionAction(credentials: any) {
  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Đăng nhập thất bại (${res.status}): ${text}` };
    }

    const data = await res.json();
    return { 
      success: true, 
      user: data.user,
      message: `Kết nối thành công! Đã đăng nhập làm: ${data.user?.name || data.user?.userName}`
    };
  } catch (err: any) {
    return { success: false, error: `Lỗi kết nối mạng: ${err.message}` };
  }
}

// 2. Action to sync the active School Year from API to AcademicYear model
export async function syncAcademicYearAction() {
  try {
    const token = await getAuthToken();
    const url = 'https://api.skylineschool.edu.vn/api/Auth/SchoolYear/GetSchoolYear';
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Không thể lấy thông tin năm học (${res.status}): ${text}` };
    }

    const apiYear = await res.json();
    const name = apiYear.schoolYearName || "2026-2027";
    const startDate = apiYear.fromDate ? new Date(apiYear.fromDate) : new Date("2026-06-01");
    const endDate = apiYear.endDate ? new Date(apiYear.endDate) : new Date("2027-05-31");

    // Check if Year already exists in DB by name
    let dbYear = await prisma.academicYear.findFirst({
      where: { name }
    });

    if (dbYear) {
      await prisma.academicYear.updateMany({
        where: { id: { not: dbYear.id } },
        data: { status: "INACTIVE" }
      });
      dbYear = await prisma.academicYear.update({
        where: { id: dbYear.id },
        data: {
          startDate,
          endDate,
          status: "ACTIVE"
        }
      });
      return { 
        success: true, 
        message: `Đã cập nhật năm học: ${name}`, 
        data: dbYear 
      };
    } else {
      await prisma.academicYear.updateMany({
        data: { status: "INACTIVE" }
      });
      dbYear = await prisma.academicYear.create({
        data: {
          name,
          startDate,
          endDate,
          status: "ACTIVE"
        }
      });
      return { 
        success: true, 
        message: `Đã tạo mới năm học: ${name}`, 
        data: dbYear 
      };
    }
  } catch (err: any) {
    return { success: false, error: `Lỗi đồng bộ Năm học: ${err.message}` };
  }
}

// 3. Action to sync master school services from API to local AssessmentConfig
export async function syncServicesAction() {
  try {
    const token = await getAuthToken();
    const url = 'https://api.skylineschool.edu.vn/api/Auth/Service/GetAllServiceMaster';

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Không thể lấy danh mục dịch vụ (${res.status}): ${text}` };
    }

    const services = await res.json();
    if (!Array.isArray(services)) {
      return { success: false, error: "Dữ liệu trả về từ API không phải là danh sách dịch vụ" };
    }

    let created = 0;
    let updated = 0;

    // Get active academic year to link configs if needed
    const activeYear = await getDefaultAcademicYear();
    const academicYearId = activeYear?.id || null;

    for (const service of services) {
      const serviceID = service.serviceID || `service_${service.levelID}`;
      const serviceName = service.serviceName || "Dịch vụ Trường";
      const explain = service.explain || "";
      const sortOrder = service.levelID || 0;

      const existing = await prisma.assessmentConfig.findFirst({
        where: {
          code: serviceID,
          categoryType: "SERVICE",
          academicYearId
        }
      });

      if (existing) {
        await prisma.assessmentConfig.update({
          where: { id: existing.id },
          data: {
            name: `${serviceName} (${explain})`,
            sortOrder,
            status: "ACTIVE"
          }
        });
        updated++;
      } else {
        await prisma.assessmentConfig.create({
          data: {
            code: serviceID,
            name: `${serviceName} (${explain})`,
            categoryType: "SERVICE",
            sortOrder,
            status: "ACTIVE",
            academicYearId
          }
        });
        created++;
      }
    }

    return { 
      success: true, 
      message: `Đồng bộ Dịch vụ hoàn tất! Thêm mới: ${created}, Cập nhật: ${updated}`, 
      count: services.length 
    };
  } catch (err: any) {
    return { success: false, error: `Lỗi đồng bộ Dịch vụ: ${err.message}` };
  }
}

// 4. Action to sync teacher class lists and map to Class & Student local records
export async function syncTeacherClassListAction(teacherUserName: string) {
  if (!teacherUserName || teacherUserName.trim() === "") {
    return { success: false, error: "Vui lòng nhập tài khoản giáo viên chủ nhiệm" };
  }

  try {
    const token = await getAuthToken();
    
    // Fetch day boarding ("bán trú") and boarding ("nội trú") rosters
    const dayBoardingUrl = `https://api.skylineschool.edu.vn/api/Auth/Class/GetStudentClassDayBoardingByTeacher/${teacherUserName}`;
    const boardingUrl = `https://api.skylineschool.edu.vn/api/Auth/Class/GetStudentClassBoardingByTeacher/${teacherUserName}`;

    let studentsList: any[] = [];
    let logs: string[] = [];

    // Query 1: Day boarding
    try {
      const res = await fetch(dayBoardingUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          studentsList.push(...data.map(item => ({ ...item, isDayBoarding: true })));
          logs.push(`Lấy thành công ${data.length} học sinh bán trú từ API.`);
        }
      } else {
        logs.push(`Gọi API bán trú trả về mã: ${res.status}`);
      }
    } catch (e: any) {
      logs.push(`Lỗi kết nối bán trú: ${e.message}`);
    }

    // Query 2: Boarding
    try {
      const res = await fetch(boardingUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          studentsList.push(...data.map(item => ({ ...item, isBoarding: true })));
          logs.push(`Lấy thành công ${data.length} học sinh nội trú từ API.`);
        }
      } else {
        logs.push(`Gọi API nội trú trả về mã: ${res.status}`);
      }
    } catch (e: any) {
      logs.push(`Lỗi kết nối nội trú: ${e.message}`);
    }

    if (studentsList.length === 0) {
      return { 
        success: false, 
        error: `Không tìm thấy dữ liệu học sinh/lớp cho giáo viên: ${teacherUserName}. Tài khoản này có thể chưa được phân công lớp bán trú/nội trú trên hệ thống central.`,
        logs 
      };
    }

    // Synchronize records into SQLite db
    // 1. Get active academic year
    const activeYear = await getDefaultAcademicYear();
    if (!activeYear) {
      return { success: false, error: "Hệ thống chưa thiết lập năm học hoạt động. Vui lòng đồng bộ Năm học trước!" };
    }

    // 2. Map default campus (use CS1 if none matches)
    const defaultCampus = await prisma.campus.findFirst({
      where: { campusCode: "CS1" }
    });
    const campusId = defaultCampus?.id || "cmnofie5n0000uhvs2ifqj6pr";

    let syncedStudentsCount = 0;
    let syncedClasses = new Set<string>();

    for (const item of studentsList) {
      // Normalize field names
      const sCode = item.studentCode || item.StudentCode || item.studentID || item.StudentID || item.studentSkyLineID || item.StudentSkyLineID;
      const sName = item.fullName || item.StudentName || item.studentName || item.name || "Học sinh mới";
      const className = item.className || item.ClassName || item.classCode || item.ClassCode || "Lớp đồng bộ";
      const gender = item.gender || item.Gender || "N/A";
      const dobStr = item.dateOfBirth || item.DateOfBirth || null;
      const dateOfBirth = dobStr ? new Date(dobStr) : null;

      if (!sCode) continue;

      // Find or create Class
      const classCode = `${className.replace(/\s+/g, '')}_CS1`;
      let dbClass = await prisma.class.findFirst({
        where: { classCode }
      });

      if (!dbClass) {
        dbClass = await prisma.class.create({
          data: {
            classCode,
            className,
            level: className.toLowerCase().includes("thpt") || className.toLowerCase().includes("10") || className.toLowerCase().includes("11") || className.toLowerCase().includes("12") ? "Thpt" : "Tieu hoc",
            campusId,
            academicYearId: activeYear.id,
            status: "ACTIVE"
          }
        });
      }
      syncedClasses.add(className);

      // Find or create Student
      const existingStudent = await prisma.student.findUnique({
        where: { studentCode: sCode }
      });

      if (existingStudent) {
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: {
            studentName: sName,
            classId: dbClass.id,
            campusId,
            academicYearId: activeYear.id,
            gender: gender === "Nam" || gender === "Male" || gender === "1" ? "NAM" : "NU",
            dateOfBirth,
            status: "ACTIVE"
          }
        });
      } else {
        await prisma.student.create({
          data: {
            studentCode: sCode,
            studentName: sName,
            classId: dbClass.id,
            campusId,
            academicYearId: activeYear.id,
            gender: gender === "Nam" || gender === "Male" || gender === "1" ? "NAM" : "NU",
            dateOfBirth,
            status: "ACTIVE"
          }
        });
      }

      syncedStudentsCount++;
    }

    // 3. Link teacher user if username is provided
    try {
      let dbUser = await prisma.user.findFirst({
        where: { email: teacherUserName }
      });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            fullName: `Giáo viên ${teacherUserName}`,
            email: teacherUserName,
            passwordHash: "$2a$10$g.2dC2WjFmH2iU4z5uPq.O1xG7tFskJ6K23xZpT98Hw41L0.G4nO6", // Default hashed password
            role: "TEACHER",
            status: "ACTIVE"
          }
        });
      }

      let dbTeacher = await prisma.teacher.findUnique({
        where: { userId: dbUser.id }
      });

      if (!dbTeacher) {
        await prisma.teacher.create({
          data: {
            userId: dbUser.id,
            teacherCode: teacherUserName,
            teacherName: dbUser.fullName,
            campusId,
            status: "ACTIVE"
          }
        });
      }
      logs.push(`Đã đồng bộ thông tin giáo viên: ${teacherUserName}`);
    } catch (e: any) {
      logs.push(`Bỏ qua liên kết giáo viên: ${e.message}`);
    }

    revalidatePath("/admin/classes");
    return {
      success: true,
      message: `Đồng bộ hoàn tất! Cập nhật ${syncedStudentsCount} học sinh vào ${syncedClasses.size} lớp học: [${Array.from(syncedClasses).join(", ")}].`,
      logs
    };

  } catch (err: any) {
    return { success: false, error: `Lỗi khi thực hiện đồng bộ: ${err.message}` };
  }
}
