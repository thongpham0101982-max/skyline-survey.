/* eslint-disable */
// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";
import { formatTimeFrameAndSemester } from "@/lib/experiential/timeframe-helper";

export const dynamic = "force-dynamic";

function parseDbJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    // Allow public or authorized depending on environment
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const campusId = searchParams.get("campusId") || "ALL";
    const gradeFilter = searchParams.get("grade") || "ALL";
    const format = (searchParams.get("format") || "xlsx").toLowerCase(); // "xlsx" | "json"

    // 1. Get Academic Year
    let activeYear: any = null;
    if (academicYearId) {
      activeYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    }
    if (!activeYear) {
      activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } }) ||
                   await prisma.academicYear.findFirst({ orderBy: { createdAt: "desc" } });
    }
    const yearName = activeYear?.name || "2026-2027";
    const targetYearId = activeYear?.id;

    // 2. Fetch all Campuses
    const campuses = await prisma.campus.findMany({
      where: { NOT: { status: "INACTIVE" } },
      orderBy: { campusCode: "asc" }
    });
    const campusMap = new Map(campuses.map(c => [c.id, c]));

    // 3. Fetch all Classes for this Academic Year
    const classWhere: any = {
      status: { not: "INACTIVE" }
    };
    if (targetYearId) {
      classWhere.academicYearId = targetYearId;
    }
    if (campusId && campusId !== "ALL") {
      classWhere.campusId = campusId;
    }
    if (gradeFilter && gradeFilter !== "ALL") {
      classWhere.grade = gradeFilter;
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: true,
        teachers: {
          include: {
            teacher: true
          }
        },
        students: {
          where: { status: { not: "INACTIVE" } },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            gender: true
          },
          orderBy: { studentName: "asc" }
        }
      },
      orderBy: [
        { campusId: "asc" },
        { grade: "asc" },
        { className: "asc" }
      ]
    });

    // 4. Fetch all Activity Records for this Academic Year
    const actWhere: any = {};
    if (targetYearId) {
      actWhere.academicYearId = targetYearId;
    }

    const activityRecords = await prisma.activityRecord.findMany({
      where: actWhere,
      include: {
        catalog: {
          select: {
            id: true,
            code: true,
            name: true,
            theme: { select: { name: true } },
            type: { select: { name: true } },
            level: true
          }
        },
        academicYear: true,
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true
          }
        },
        participants: {
          select: {
            id: true,
            studentId: true,
            roleId: true,
            evalLevelId: true,
            note: true,
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                classId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 5. Fetch Activity Catalogs (to catch any catalogs with allocatedCampuses that have not created ActivityRecord)
    const catalogs = await prisma.activityCatalog.findMany({
      where: { status: { not: "DELETED" } },
      include: {
        theme: { select: { name: true } },
        type: { select: { name: true } }
      }
    });

    // Merge activities list
    const normalizedActivities: any[] = [];

    // Add activity records
    activityRecords.forEach(act => {
      const meta = parseDbJson<any>(act.locationId, {});
      const catMeta = parseDbJson<any>(act.catalog?.description, {});
      const assigned = meta.assignedClasses || [];

      normalizedActivities.push({
        id: act.id,
        code: act.code || act.catalog?.code || "HDTN",
        name: act.name || act.catalog?.name || "Kế hoạch Hoạt động",
        themeName: meta.themeName || act.catalog?.theme?.name || catMeta.themeName || "Chủ đề phát triển năng lực",
        timeRange: meta.timeRange || meta.timeFrame || (act.date ? act.date.toISOString().split("T")[0] : ""),
        semester: meta.semester || act.semester || 1,
        assignedClasses: assigned,
        participants: act.participants || []
      });
    });

    // Add catalogs that have assigned classes but no record yet
    catalogs.forEach(cat => {
      const hasRecord = activityRecords.some(r => r.catalogId === cat.id || (r.code && r.code === cat.code));
      if (hasRecord) return;

      const catMeta = parseDbJson<any>(cat.description, {});
      if (targetYearId && catMeta.academicYearId && catMeta.academicYearId !== targetYearId) return;

      const allocatedClasses = (catMeta.allocatedCampuses || []).flatMap((c: any) => c.assignedClasses || []);
      const assignedClasses = catMeta.assignedClasses || allocatedClasses;
      if (assignedClasses.length === 0) return;

      normalizedActivities.push({
        id: cat.id,
        code: cat.code || "HDTN-CAT",
        name: cat.name,
        themeName: catMeta.themeName || cat.theme?.name || "Chủ đề giáo dục",
        timeRange: catMeta.timeFrame || "Trong năm học",
        semester: catMeta.semester || 1,
        assignedClasses: assignedClasses,
        participants: []
      });
    });

    // 6. Build Data structures grouped by GVCN / Class
    const gvcnSummaryList: any[] = [];
    const gvcnDetailList: any[] = [];
    const unevaluatedStudentsDetailList: any[] = [];

    // Helper map of teacher info
    const teacherCache = new Map<string, any>();
    for (const cls of classes) {
      // Find homeroom teacher
      let gvcnName = "";
      let gvcnCode = "";
      let gvcnEmail = "";
      let gvcnPhone = "";

      const hrAssignment = cls.teachers.find((t: any) => t.roleInClass === "GVCN" || t.isHomeroom);
      if (hrAssignment?.teacher) {
        gvcnName = hrAssignment.teacher.teacherName || "";
        gvcnCode = hrAssignment.teacher.teacherCode || "";
        gvcnEmail = hrAssignment.teacher.email || "";
        gvcnPhone = hrAssignment.teacher.phone || "";
      } else if (cls.homeroomTeacherId) {
        if (!teacherCache.has(cls.homeroomTeacherId)) {
          const t = await prisma.teacher.findUnique({ where: { id: cls.homeroomTeacherId } }).catch(() => null);
          teacherCache.set(cls.homeroomTeacherId, t);
        }
        const t = teacherCache.get(cls.homeroomTeacherId);
        if (t) {
          gvcnName = t.teacherName || "";
          gvcnCode = t.teacherCode || "";
          gvcnEmail = t.email || "";
          gvcnPhone = t.phone || "";
        }
      }

      if (!gvcnName && cls.teachers.length > 0) {
        const firstT = cls.teachers[0].teacher;
        if (firstT) {
          gvcnName = firstT.teacherName;
          gvcnCode = firstT.teacherCode;
          gvcnEmail = firstT.email;
        }
      }

      if (!gvcnName) {
        gvcnName = "Chưa phân công";
      }

      const campusName = cls.campus?.campusName || cls.campus?.campusCode || "Sky-Line";
      const campusCode = cls.campus?.campusCode || "CS";
      const grade = cls.grade ? (String(cls.grade).startsWith("Khối") ? cls.grade : `Khối ${cls.grade}`) : "Toàn trường";
      const classStudents = cls.students || [];
      const classStudentsCount = classStudents.length;

      // Find all activities assigned to this class
      const assignedActivitiesForClass = normalizedActivities.filter(act => {
        // 1. Check assignedClasses in meta
        const inAssigned = act.assignedClasses.some((ac: any) => 
          ac.classId === cls.id || 
          ac.className === cls.className ||
          (ac.className && ac.className.toLowerCase() === cls.className.toLowerCase())
        );
        if (inAssigned) return true;

        // 2. Check participants
        const inParticipants = act.participants.some((p: any) => 
          p.student?.classId === cls.id
        );
        if (inParticipants) return true;

        return false;
      });

      let totalAssignedPlans = assignedActivitiesForClass.length;
      let totalStudentEvaluationsRequired = 0;
      let totalStudentEvaluationsDone = 0;
      let totalStudentEvaluationsPending = 0;

      // Process each activity for this class
      assignedActivitiesForClass.forEach(act => {
        // Get student evaluations for this class in this activity
        const actParticipants = act.participants.filter((p: any) => 
          p.student?.classId === cls.id
        );

        // Map of studentId -> participant record
        const evalMap = new Map<string, any>();
        actParticipants.forEach((p: any) => {
          if (p.studentId) evalMap.set(p.studentId, p);
          if (p.student?.studentCode) evalMap.set(p.student.studentCode, p);
        });

        let actEvaluatedCount = 0;
        let actPendingCount = 0;
        const unevaluatedInThisAct: any[] = [];

        // Check each student in the class
        classStudents.forEach(st => {
          const p = evalMap.get(st.id) || evalMap.get(st.studentCode);
          let isEvaluated = false;

          if (p) {
            const pNote = parseDbJson<any>(p.note, {});
            if (
              p.evalLevelId || 
              p.roleId || 
              pNote.isCompleted === true || 
              (pNote.finalResult && pNote.finalResult !== "CHUA_DANH_GIA") ||
              (pNote.calculatedPercent !== null && pNote.calculatedPercent !== undefined)
            ) {
              isEvaluated = true;
            }
          }

          if (isEvaluated) {
            actEvaluatedCount += 1;
          } else {
            actPendingCount += 1;
            unevaluatedInThisAct.push(st);

            // Add to the master unevaluated sheet
            unevaluatedStudentsDetailList.push({
              stt: unevaluatedStudentsDetailList.length + 1,
              campusName,
              grade,
              className: cls.className,
              homeroomTeacherName: gvcnName,
              teacherCode: gvcnCode,
              studentCode: st.studentCode,
              studentName: st.studentName,
              gender: st.gender || "—",
              activityCode: act.code,
              activityName: act.name,
              timeRange: `${act.timeRange} (HK ${act.semester})`,
              evalStatus: "Chưa đánh giá / Chưa nhập vai trò"
            });
          }
        });

        // If class has no students in DB yet, fallback to metadata counts
        const effectiveTotal = classStudentsCount > 0 ? classStudentsCount : (actParticipants.length || 30);
        const effectiveEval = classStudentsCount > 0 ? actEvaluatedCount : actParticipants.length;
        const effectivePending = Math.max(0, effectiveTotal - effectiveEval);

        totalStudentEvaluationsRequired += effectiveTotal;
        totalStudentEvaluationsDone += effectiveEval;
        totalStudentEvaluationsPending += effectivePending;

        const actProgressPercent = effectiveTotal > 0 ? Math.round((effectiveEval / effectiveTotal) * 100) : 0;
        let actStatusLabel = "Chưa đánh giá";
        if (actProgressPercent === 100) actStatusLabel = "Đã hoàn thành 100%";
        else if (actProgressPercent > 0) actStatusLabel = `Đang đánh giá (${actProgressPercent}%)`;

        const unevaluatedNamesPreview = unevaluatedInThisAct.slice(0, 5).map(s => s.studentName).join(", ") +
          (unevaluatedInThisAct.length > 5 ? ` (+${unevaluatedInThisAct.length - 5} HS)` : "");

        gvcnDetailList.push({
          stt: gvcnDetailList.length + 1,
          campusName,
          grade,
          className: cls.className,
          homeroomTeacherName: gvcnName,
          teacherCode: gvcnCode,
          teacherEmail: gvcnEmail,
          activityCode: act.code,
          activityName: act.name,
          themeName: act.themeName,
          timeRange: `${act.timeRange} (HK ${act.semester})`,
          totalStudents: effectiveTotal,
          evaluatedCount: effectiveEval,
          pendingCount: effectivePending,
          progressPercent: `${actProgressPercent}%`,
          statusLabel: actStatusLabel,
          unevaluatedPreview: unevaluatedNamesPreview || (effectivePending === 0 ? "— (Đã hoàn tất)" : `${effectivePending} HS chưa đánh giá`)
        });
      });

      // Overall Progress for this GVCN & Class
      const overallProgress = totalStudentEvaluationsRequired > 0 
        ? Math.round((totalStudentEvaluationsDone / totalStudentEvaluationsRequired) * 100) 
        : (totalAssignedPlans === 0 ? 0 : 0);

      let overallStatus = "Chưa đánh giá";
      if (totalAssignedPlans === 0) overallStatus = "Chưa được gán kế hoạch";
      else if (overallProgress === 100) overallStatus = "Đã hoàn thành 100%";
      else if (overallProgress > 0) overallStatus = `Đang đánh giá (${overallProgress}%)`;

      let note = "";
      if (totalAssignedPlans === 0) {
        note = "Lớp chưa được phân bổ kế hoạch HĐTN trong năm";
      } else if (totalStudentEvaluationsPending > 0) {
        note = `Cần đôn đốc đánh giá ${totalStudentEvaluationsPending} lượt HS còn thiếu`;
      } else {
        note = "Hoàn thành đầy đủ hồ sơ sư phạm";
      }

      gvcnSummaryList.push({
        stt: gvcnSummaryList.length + 1,
        campusName,
        grade,
        className: cls.className,
        homeroomTeacherName: gvcnName,
        teacherCode: gvcnCode || "—",
        teacherEmail: gvcnEmail || "—",
        teacherPhone: gvcnPhone || "—",
        classSize: classStudentsCount,
        assignedPlansCount: totalAssignedPlans,
        totalRequired: totalStudentEvaluationsRequired,
        totalEvaluated: totalStudentEvaluationsDone,
        totalPending: totalStudentEvaluationsPending,
        progressPercent: `${overallProgress}%`,
        status: overallStatus,
        note
      });
    }

    // Return JSON if requested for UI preview modal
    if (format === "json") {
      return NextResponse.json({
        academicYearName: yearName,
        totalGVCN: gvcnSummaryList.length,
        totalClasses: classes.length,
        totalActivities: normalizedActivities.length,
        totalUnevaluatedRecords: unevaluatedStudentsDetailList.length,
        summary: gvcnSummaryList,
        details: gvcnDetailList,
        unevaluatedStudents: unevaluatedStudentsDetailList
      });
    }

    // 7. BUILD MULTI-SHEET EXCEL WORKBOOK
    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng hợp theo từng GVCN
    const ws1Data = gvcnSummaryList.map(item => ({
      "STT": item.stt,
      "Cơ sở": item.campusName,
      "Khối": item.grade,
      "Lớp chủ nhiệm": item.className,
      "Họ và tên GVCN": item.homeroomTeacherName,
      "Mã GVCN": item.teacherCode,
      "Email GVCN": item.teacherEmail,
      "Sĩ số lớp (HS)": item.classSize,
      "Số Kế hoạch được gán": item.assignedPlansCount,
      "Tổng lượt HS cần ĐG": item.totalRequired,
      "Lượt HS ĐÃ đánh giá": item.totalEvaluated,
      "Lượt HS CHƯA đánh giá": item.totalPending,
      "Tiến độ hoàn thành": item.progressPercent,
      "Tình trạng đánh giá": item.status,
      "Đôn đốc / Ghi chú": item.note
    }));
    const ws1 = XLSX.utils.json_to_sheet(ws1Data);
    ws1["!cols"] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Cơ sở
      { wch: 12 }, // Khối
      { wch: 15 }, // Lớp
      { wch: 24 }, // Họ tên GVCN
      { wch: 14 }, // Mã GV
      { wch: 26 }, // Email
      { wch: 14 }, // Sĩ số
      { wch: 20 }, // Số KH được gán
      { wch: 20 }, // Tổng lượt cần ĐG
      { wch: 18 }, // Lượt đã ĐG
      { wch: 20 }, // Lượt chưa ĐG
      { wch: 18 }, // Tiến độ %
      { wch: 22 }, // Tình trạng
      { wch: 38 }  // Ghi chú
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "1. Tong_Hop_Theo_GVCN");

    // Sheet 2: Chi tiết từng kế hoạch của từng GVCN
    const ws2Data = gvcnDetailList.map(item => ({
      "STT": item.stt,
      "Cơ sở": item.campusName,
      "Khối": item.grade,
      "Lớp chủ nhiệm": item.className,
      "Họ và tên GVCN": item.homeroomTeacherName,
      "Mã GV": item.teacherCode,
      "Mã Kế hoạch": item.activityCode,
      "Tên Kế hoạch hoạt động": item.activityName,
      "Chủ đề giáo dục": item.themeName,
      "Thời gian / Học kỳ": item.timeRange,
      "Sĩ số lớp (HS)": item.totalStudents,
      "HS ĐÃ đánh giá": item.evaluatedCount,
      "HS CHƯA đánh giá": item.pendingCount,
      "Tiến độ đánh giá": item.progressPercent,
      "Trạng thái kế hoạch": item.statusLabel,
      "Danh sách HS chưa đánh giá (Tóm tắt)": item.unevaluatedPreview
    }));
    const ws2 = XLSX.utils.json_to_sheet(ws2Data);
    ws2["!cols"] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Cơ sở
      { wch: 12 }, // Khối
      { wch: 15 }, // Lớp
      { wch: 24 }, // GVCN
      { wch: 14 }, // Mã GV
      { wch: 16 }, // Mã KH
      { wch: 35 }, // Tên KH
      { wch: 25 }, // Chủ đề
      { wch: 22 }, // Thời gian
      { wch: 14 }, // Sĩ số
      { wch: 16 }, // Đã ĐG
      { wch: 18 }, // Chưa ĐG
      { wch: 16 }, // Tiến độ
      { wch: 22 }, // Trạng thái
      { wch: 45 }  // HS chưa ĐG tóm tắt
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "2. Tien_Do_Ke_Hoach_GVCN");

    // Sheet 3: Danh sách chi tiết từng học sinh chưa đánh giá
    const ws3Data = unevaluatedStudentsDetailList.map(item => ({
      "STT": item.stt,
      "Cơ sở": item.campusName,
      "Khối": item.grade,
      "Lớp": item.className,
      "Họ và tên GVCN": item.homeroomTeacherName,
      "Mã học sinh": item.studentCode,
      "Họ và tên học sinh": item.studentName,
      "Giới tính": item.gender,
      "Mã Kế hoạch": item.activityCode,
      "Tên Kế hoạch hoạt động": item.activityName,
      "Thời gian / Học kỳ": item.timeRange,
      "Tình trạng hồ sơ": item.evalStatus
    }));
    const ws3 = XLSX.utils.json_to_sheet(ws3Data);
    ws3["!cols"] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Cơ sở
      { wch: 12 }, // Khối
      { wch: 15 }, // Lớp
      { wch: 24 }, // GVCN
      { wch: 14 }, // Mã HS
      { wch: 26 }, // Tên HS
      { wch: 10 }, // Giới tính
      { wch: 16 }, // Mã KH
      { wch: 35 }, // Tên KH
      { wch: 22 }, // Thời gian
      { wch: 32 }  // Tình trạng
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "3. Danh_Sach_HS_Chua_Danh_Gia");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Theo_Doi_Ke_Hoach_GVCN_HDTN_${yearName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${dateStr}.xlsx`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });

  } catch (error: any) {
    console.error("GET /api/admin/experiential-activities/export-gvcn-tracking error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
