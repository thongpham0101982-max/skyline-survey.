import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from '@/lib/permissions';
import { sendExperientialActivityNotification } from '@/lib/experiential/email-notification';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId');
    let campusId = searchParams.get('campusId');

    const userRole = (session?.user as any)?.role || '';
    const upperRole = userRole.toUpperCase().trim();
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU', 'BGH', 'QLCM', 'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS', 'BP_NK'].includes(upperRole);

    // If teacher / TLHN, find their campus
    let teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { campus: true }
    });

    if (!campusId && teacher?.campusId) {
      campusId = teacher.campusId;
    }

    // Fetch all catalogs
    const catalogs = await prisma.activityCatalog.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const dispatchedActivities: any[] = [];

    for (const c of catalogs) {
      if (!c.description || !c.description.startsWith('{')) continue;

      let meta: any = {};
      try {
        meta = JSON.parse(c.description);
      } catch {
        continue;
      }

      if (academicYearId && meta.academicYearId && meta.academicYearId !== academicYearId) {
        continue;
      }

      const allocatedCampuses = meta.allocatedCampuses || [];
      if (allocatedCampuses.length === 0) continue;

      // Filter by campus if requested or teacher
      const matchedAllocations = allocatedCampuses.filter((alloc: any) => {
        if (!campusId || campusId === 'ALL') return true;
        return alloc.campusId === campusId || alloc.campusCode === campusId;
      });

      if (matchedAllocations.length === 0 && !isManagement) continue;

      for (const alloc of (matchedAllocations.length > 0 ? matchedAllocations : allocatedCampuses)) {
        // Find existing ActivityRecord if created
        let record = null;
        if (alloc.recordId) {
          record = await prisma.activityRecord.findUnique({
            where: { id: alloc.recordId },
            include: {
              participants: { select: { id: true, studentId: true, evalLevelId: true } }
            }
          });
        }

        let recordMeta: any = {};
        if (record?.locationId && record.locationId.startsWith('{')) {
          try {
            recordMeta = JSON.parse(record.locationId);
          } catch {}
        }

        dispatchedActivities.push({
          catalogId: c.id,
          catalogCode: c.code,
          activityName: c.name,
          educationLevel: meta.educationLevel || c.level,
          programType: meta.programType,
          sheetCode: meta.sheetCode,
          grades: meta.grades || [],
          themeName: meta.themeName,
          integratedSubjects: meta.integratedSubjects,
          educationalContent: meta.educationalContent,
          learningOutcomes: meta.learningOutcomes,
          organizationFormat: meta.organizationFormat,
          timeFrame: meta.timeFrame,
          semester: meta.semester || 1,
          expectedLocation: meta.expectedLocation,
          partners: meta.partners,
          primarySubjectName: meta.primarySubjectName,
          coopSubjectNames: meta.coopSubjectNames,
          deliverables: meta.deliverables,
          notes: meta.notes,
          campusId: alloc.campusId,
          campusCode: alloc.campusCode,
          campusName: alloc.campusName,
          tlhnStatus: alloc.status || 'CHUA_TIEP_NHAN', // CHUA_TIEP_NHAN | DA_TIEP_NHAN | DA_TRIEN_KHAI
          receivedAt: alloc.receivedAt,
          deployedAt: alloc.deployedAt,
          tlhnTeacherId: alloc.tlhnTeacherId,
          tlhnTeacherName: alloc.tlhnTeacherName,
          recordId: alloc.recordId || null,
          assignedClasses: recordMeta.assignedClasses || [],
          totalClassesCount: recordMeta.assignedClasses?.length || 0
        });
      }
    }

    return NextResponse.json(dispatchedActivities);
  } catch (error: any) {
    console.error('Error fetching campus dispatched activities:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, catalogId, campusId, assignedClasses = [] } = body;

    if (!catalogId || !campusId) {
      return NextResponse.json({ error: 'Thiếu catalogId hoặc campusId' }, { status: 400 });
    }

    const catalog = await prisma.activityCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog) {
      return NextResponse.json({ error: 'Không tìm thấy danh mục hoạt động' }, { status: 404 });
    }

    let meta: any = {};
    if (catalog.description && catalog.description.startsWith('{')) {
      try {
        meta = JSON.parse(catalog.description);
      } catch {}
    }

    let teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: { campus: true }
    });

    const teacherName = teacher?.teacherName || session.user.name || 'GV Tổ TLHN';

    let allocatedCampuses = meta.allocatedCampuses || [];
    let targetAllocIndex = allocatedCampuses.findIndex((a: any) => a.campusId === campusId || a.campusCode === campusId);

    if (targetAllocIndex === -1) {
      // Create allocation if missing
      allocatedCampuses.push({
        campusId,
        campusCode: teacher?.campus?.campusCode || campusId,
        campusName: teacher?.campus?.campusName || `Cơ sở ${campusId}`,
        status: 'CHUA_TIEP_NHAN'
      });
      targetAllocIndex = allocatedCampuses.length - 1;
    }

    const currentAlloc = allocatedCampuses[targetAllocIndex];

    if (action === 'ACCEPT') {
      // GV Tổ TLHN Tiếp nhận hoạt động
      currentAlloc.status = 'DA_TIEP_NHAN';
      currentAlloc.receivedAt = new Date().toISOString();
      currentAlloc.tlhnTeacherId = teacher?.id || session.user.id;
      currentAlloc.tlhnTeacherName = teacherName;

      meta.allocatedCampuses = allocatedCampuses;
      await prisma.activityCatalog.update({
        where: { id: catalogId },
        data: { description: JSON.stringify(meta) }
      });

      return NextResponse.json({
        success: true,
        message: 'Đã tiếp nhận hoạt động thành công',
        status: 'DA_TIEP_NHAN'
      });
    }

    if (action === 'DEPLOY') {
      // GV Tổ TLHN Triển khai xuống các lớp tại cơ sở
      if (!Array.isArray(assignedClasses) || assignedClasses.length === 0) {
        return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 lớp để triển khai hoạt động' }, { status: 400 });
      }

      currentAlloc.status = 'DA_TRIEN_KHAI';
      currentAlloc.deployedAt = new Date().toISOString();
      currentAlloc.tlhnTeacherId = teacher?.id || session.user.id;
      currentAlloc.tlhnTeacherName = teacherName;
      currentAlloc.assignedClassesCount = assignedClasses.length;

      // Find active academic year
      let academicYearId = meta.academicYearId;
      if (!academicYearId) {
        const activeYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.academicYear.findFirst();
        academicYearId = activeYear?.id || '';
      }

      // Check if ActivityRecord already exists for this catalog & campus
      let activityRecord = null;
      if (currentAlloc.recordId) {
        activityRecord = await prisma.activityRecord.findUnique({ where: { id: currentAlloc.recordId } });
      }

      const formattedAssignedClasses = assignedClasses.map((cls: any) => ({
        classId: cls.classId,
        className: cls.className,
        campusId: cls.campusId || campusId,
        campusCode: cls.campusCode || currentAlloc.campusCode,
        campusName: cls.campusName || currentAlloc.campusName,
        grade: cls.grade || '',
        level: cls.level || meta.educationLevel,
        homeroomTeacherId: cls.homeroomTeacherId || '',
        homeroomTeacherName: cls.homeroomTeacherName || '',
        homeroomTeacherEmail: cls.homeroomTeacherEmail || '',
        departmentId: cls.departmentId || '',
        departmentName: cls.departmentName || '',
        subjectTeacherId: cls.subjectTeacherId || '',
        subjectTeacherName: cls.subjectTeacherName || '',
        subjectTeacherEmail: cls.subjectTeacherEmail || '',
        subjectId: cls.subjectId || meta.primarySubjectId || '',
        subjectName: cls.subjectName || meta.primarySubjectName || '',
        totalStudents: cls.totalStudents || 0,
        evaluatedStudents: cls.evaluatedStudents || 0,
        evalStatus: 'DA_TIEP_NHAN', // Trạng thái của GV: Đã tiếp nhận, Đang đánh giá, Đã đánh giá
        status: 'DRAFT',
        progressPercent: 0
      }));

      // Kế thừa Cấu hình & Tiêu chí đánh giá từ Danh mục Hoạt động
      const evalCfg = meta.evaluationConfig || {};
      const evalMode = evalCfg.mode || 'CRITERIA';
      const criteria = (evalCfg.criteria && evalCfg.criteria.length > 0)
        ? evalCfg.criteria.map((c: any, idx: number) => ({
            id: c.id || `crit_${idx + 1}`,
            name: c.name,
            description: c.description || '',
            weight: Number(c.weight) || 0,
            maxScore: Number(c.maxScore) || 10,
            isRequired: true,
            order: idx + 1
          }))
        : [
            { id: 'crit_1', name: 'Thái độ & Ý thức tham gia', description: 'Tự giác, kỷ luật, hợp tác', weight: 40, isRequired: true, order: 1 },
            { id: 'crit_2', name: 'Kỹ năng & Mức độ đạt chuẩn', description: 'Thực hiện yêu cầu, kỹ năng thực tế', weight: 30, isRequired: true, order: 2 },
            { id: 'crit_3', name: 'Sản phẩm & Thu hoạch', description: 'Chất lượng sản phẩm / bài viết', weight: 30, isRequired: false, order: 3 }
          ];

      const formulaType = evalCfg.formulaType === 'AVERAGE' ? 'EQUAL_WEIGHT' : 'WEIGHTED';

      const fullRecordMeta = {
        campusId,
        campusCode: currentAlloc.campusCode,
        campusName: currentAlloc.campusName,
        educationLevel: meta.educationLevel,
        grades: meta.grades || [],
        themeName: meta.themeName,
        integratedSubjects: meta.integratedSubjects,
        educationalContent: meta.educationalContent,
        learningOutcomes: meta.learningOutcomes,
        organizationFormat: meta.organizationFormat,
        primarySubjectName: meta.primarySubjectName,
        coopSubjectNames: meta.coopSubjectNames,
        deliverables: meta.deliverables,
        notes: meta.notes,
        strand: 'BAN_THAN',
        activityTypeId: 'SU_KIEN',
        activityTypeName: meta.organizationFormat || 'Hoạt động trải nghiệm',
        scale: 'LOP',
        evalMode,
        criteria,
        formulaType,
        hasRoleAssessment: evalCfg.hasRoleAssessment !== undefined ? evalCfg.hasRoleAssessment : true,
        rolesList: evalCfg.rolesList || [],
        completionBenchmark: evalCfg.completionBenchmark || 'Điểm TB >= 5.0',
        thresholds: { outstanding: 85, good: 70, pass: 50 },
        mandatoryRules: [],
        assignedClasses: formattedAssignedClasses,
        status: 'ASSIGNED',
        dispatchedByTLHN: {
          teacherId: teacher?.id || session.user.id,
          teacherName,
          deployedAt: new Date().toISOString()
        }
      };

      if (!activityRecord) {
        // Ensure teacher profile exists
        if (!teacher) {
          const defaultCampus = await prisma.campus.findFirst();
          teacher = await prisma.teacher.create({
            data: {
              teacherCode: `TLHN_${Date.now().toString().slice(-4)}`,
              teacherName,
              email: session.user.email || '',
              userId: session.user.id,
              campusId: defaultCampus?.id || campusId
            }
          });
        }

        const recordCode = `HDTN-${currentAlloc.campusCode || 'CS'}-${Date.now().toString().slice(-6)}`;
        activityRecord = await prisma.activityRecord.create({
          data: {
            code: recordCode,
            name: catalog.name,
            catalogId: catalog.id,
            date: new Date(),
            semester: meta.semester || 1,
            academicYearId,
            levelId: meta.educationLevel || null,
            formatId: 'LOP',
            organizerId: campusId,
            teacherId: teacher.id,
            locationId: JSON.stringify(fullRecordMeta),
            status: 'SUBMITTED'
          }
        });

        currentAlloc.recordId = activityRecord.id;
      } else {
        // Update existing record
        await prisma.activityRecord.update({
          where: { id: activityRecord.id },
          data: {
            locationId: JSON.stringify(fullRecordMeta),
            status: 'SUBMITTED'
          }
        });
      }

      // Initialize ActivityParticipant records for students of assigned classes
      const classIds = formattedAssignedClasses.map((c: any) => c.classId).filter(Boolean);
      if (classIds.length > 0) {
        const students = await prisma.student.findMany({
          where: {
            classId: { in: classIds },
            NOT: { status: { in: ['INACTIVE', 'DELETED', 'CHUYEN_TRUONG', 'THOI_HOC'] } }
          },
          select: { id: true, classId: true }
        });

        // Delete existing draft participants to prevent duplicates
        await prisma.activityParticipant.deleteMany({
          where: { recordId: activityRecord.id }
        });

        if (students.length > 0) {
          const participantRows = students.map(s => ({
            recordId: activityRecord.id,
            studentId: s.id,
            roleId: 'TV',
            evalLevelId: null,
            note: JSON.stringify({
              attendance: 'PRESENT',
              roles: ['Thành viên'],
              criteriaScores: {},
              calculatedPercent: 0,
              finalResult: 'CHUA_DANH_GIA',
              remarksQuick: [],
              remarksCustom: ''
            })
          }));

          await prisma.activityParticipant.createMany({
            data: participantRows
          });
        }
      }

      meta.allocatedCampuses = allocatedCampuses;
      await prisma.activityCatalog.update({
        where: { id: catalogId },
        data: { description: JSON.stringify(meta) }
      });

      // Tự động gửi email thông báo cho GVCN và GVBM các lớp được gán (kèm CC GĐCS)
      try {
        sendExperientialActivityNotification({
          activityId: activityRecord.id,
          activityCode: activityRecord.code || `HDTN-${catalog.code}`,
          activityName: catalog.name,
          strand: fullRecordMeta.strand || 'BAN_THAN',
          activityTypeId: fullRecordMeta.activityTypeId || 'SU_KIEN',
          activityTypeName: meta.organizationFormat || 'Hoạt động trải nghiệm & Ngoại khóa',
          subjectId: meta.primarySubjectId || null,
          subjectName: meta.primarySubjectName || null,
          scale: 'LOP',
          evalMode: fullRecordMeta.evalMode || 'CRITERIA',
          criteria: fullRecordMeta.criteria || [],
          date: new Date().toISOString(),
          location: meta.expectedLocation || '',
          senderName: `${teacherName} (Tổ TLHN CS ${currentAlloc.campusCode || ''})`,
          senderEmail: session.user.email || teacher?.email || undefined,
          customMessage: `Các thầy cô vừa nhận được Kế hoạch hoạt động ngoại khóa/trải nghiệm từ BP HĐNGLL - Tổ CTHS. Kính nhờ các thầy cô vui lòng triển khai kế hoạch đến GVCN, GVBM liên quan tại cơ sở và tiến hành đánh giá học sinh theo đúng tiêu chí được giao. Xin cảm ơn.`,
          includeGdcs: true,
          assignedClasses: formattedAssignedClasses
        }).catch(err => console.error('[Campus Dispatch Email Error]:', err));
      } catch (emailErr) {
        console.error('[Campus Dispatch Notification Trigger Error]:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Đã triển khai hoạt động xuống lớp thành công và gửi email thông báo đến GVCN & GVBM',
        activityRecordId: activityRecord.id,
        assignedClassesCount: formattedAssignedClasses.length
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling campus dispatch action:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
