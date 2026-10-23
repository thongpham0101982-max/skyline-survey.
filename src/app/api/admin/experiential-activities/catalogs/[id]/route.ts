import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasModulePermission } from '@/lib/permissions';
import { normalizeActivityName } from '@/lib/experiential/name-normalizer';
import { sendTLHNAllocationNotification } from '@/lib/experiential/email-notification';
import { formatTimeFrameAndSemester } from '@/lib/experiential/timeframe-helper';

export const dynamic = 'force-dynamic';

async function checkAdminOrCTHSPermission(session: any) {
  if (!session?.user?.id) return false;
  const userRole = (session?.user as any)?.role || '';
  const upper = userRole.toUpperCase().trim();
  const ALLOWED = [
    'ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN', 
    'KT_DBCL', 'KTDBCL', 'GDCS', 'GIAO_VU_CS', 'GIAO_VU', 
    'BGH', 'QLCM', 'TTCM', 
    'CTHS', 'CONG_TAC_HOC_SINH', 'BAN_CTHS', 'GV_HDTN', 'BP_NK'
  ];
  if (ALLOWED.some(r => upper.includes(r))) return true;
  return await hasModulePermission(userRole, ['EXPERIENTIAL_ACTIVITIES', 'EXP_ACT_MANAGE'], 'canUpdate');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã hoạt động' }, { status: 400 });
    }
    const catalog = await prisma.activityCatalog.findUnique({
      where: { id },
      include: {
        group: true,
        type: true,
        theme: true,
        records: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            organizerId: true,
            teacherId: true
          }
        }
      }
    });

    if (!catalog) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động trong danh mục' }, { status: 404 });
    }

    let meta: any = {};
    if (catalog.description && catalog.description.startsWith('{')) {
      try {
        meta = JSON.parse(catalog.description);
      } catch {}
    } else {
      meta.plainDescription = catalog.description || '';
    }

    if (meta.timeFrame) {
      const timeInfo = formatTimeFrameAndSemester(meta.timeFrame, meta.academicYearId || '2026-2027', meta.semester);
      meta.timeFrame = timeInfo.formattedTime;
      meta.semester = timeInfo.semester;
    }

    return NextResponse.json({
      id: catalog.id,
      code: catalog.code,
      name: catalog.name,
      level: catalog.level,
      status: catalog.status,
      records: catalog.records,
      meta
    });
  } catch (error: any) {
    console.error('Error getting catalog item:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Không có quyền cập nhật' }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã hoạt động (ID)' }, { status: 400 });
    }
    const body = await req.json();
    const { name, meta = {}, action } = body;

    const existing = await prisma.activityCatalog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động trong danh mục' }, { status: 404 });
    }

    // Merge existing meta with new meta
    let currentMeta: any = {};
    if (existing.description && existing.description.startsWith('{')) {
      try {
        currentMeta = JSON.parse(existing.description);
      } catch {}
    }

    const updatedMeta = { ...currentMeta, ...meta };

    if (updatedMeta.timeFrame) {
      const timeInfo = formatTimeFrameAndSemester(updatedMeta.timeFrame, updatedMeta.academicYearId || '2026-2027', updatedMeta.semester);
      updatedMeta.timeFrame = timeInfo.formattedTime;
      updatedMeta.semester = timeInfo.semester;
    }

    // Đồng bộ nếu có mảng cthsTeachers
    if (Array.isArray(updatedMeta.cthsTeachers)) {
      const teachersList = updatedMeta.cthsTeachers;
      updatedMeta.cthsTeacherName = teachersList.map((t: any) => t.teacherName).filter(Boolean).join(', ');
      updatedMeta.cthsTeacherId = teachersList[0]?.id || '';
      updatedMeta.cthsTeacherCode = teachersList[0]?.teacherCode || '';
      updatedMeta.cthsTeacherEmail = teachersList[0]?.email || '';
    }

    // Action: ALLOCATE_CAMPUSES (Đẩy hoạt động xuống cơ sở)
    let emailResult: any = null;
    if (action === 'ALLOCATE_CAMPUSES' && Array.isArray(body.allocatedCampuses)) {
      updatedMeta.allocatedCampuses = body.allocatedCampuses;

      // Tự động khởi tạo hoặc đồng bộ ActivityRecord cho từng cơ sở nếu có phân bổ lớp
      for (const alloc of body.allocatedCampuses) {
        if (Array.isArray(alloc.assignedClasses) && alloc.assignedClasses.length > 0) {
          try {
            let validYear = null;
            if (updatedMeta.academicYearId) {
              validYear = await prisma.academicYear.findUnique({ where: { id: updatedMeta.academicYearId } });
              if (!validYear) {
                validYear = await prisma.academicYear.findFirst({ where: { name: updatedMeta.academicYearId } });
              }
            }
            if (!validYear) {
              validYear = await prisma.academicYear.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.academicYear.findFirst();
            }
            const academicYearId = validYear?.id;
            if (!academicYearId) {
              console.warn('[ALLOCATE_CAMPUSES] Không tìm thấy năm học hợp lệ trong hệ thống');
              continue;
            }

            let actRecord = null;
            if (alloc.recordId) {
              actRecord = await prisma.activityRecord.findUnique({ where: { id: alloc.recordId } });
            }
            if (!actRecord) {
              actRecord = await prisma.activityRecord.findFirst({
                where: {
                  catalogId: existing.id,
                  organizerId: alloc.campusId
                }
              });
            }

            const recordMeta = {
              campusId: alloc.campusId,
              campusCode: alloc.campusCode,
              campusName: alloc.campusName,
              educationLevel: updatedMeta.educationLevel || existing.level,
              grades: alloc.selectedGrades || updatedMeta.grades || [],
              themeName: updatedMeta.themeName,
              themeAxis: updatedMeta.themeAxis,
              integratedSubjects: updatedMeta.integratedSubjects,
              primarySubjectName: updatedMeta.primarySubjectName,
              coopSubjectNames: updatedMeta.coopSubjectNames,
              deliverables: updatedMeta.deliverables,
              expectedLocation: updatedMeta.expectedLocation,
              timeFrame: updatedMeta.timeFrame,
              evalMode: updatedMeta.evaluationConfig?.mode || 'RUBRIC',
              assignedClasses: alloc.assignedClasses,
              status: 'ASSIGNED',
              departmentId: alloc.departmentId || updatedMeta.departmentId || null,
              departmentName: alloc.departmentName || updatedMeta.departmentName || null,
              subjectTeacherId: alloc.subjectTeacherId || alloc.tlhnTeacherId || null,
              subjectTeacherName: alloc.subjectTeacherName || alloc.tlhnTeacherName || null,
              subjectTeacherEmail: alloc.subjectTeacherEmail || alloc.tlhnTeacherEmail || null,
              tlhnTeacherId: alloc.tlhnTeacherId,
              tlhnTeacherName: alloc.tlhnTeacherName
            };

            if (!actRecord) {
              let repTeacher = null;
              const targetTeacherId = alloc.subjectTeacherId || alloc.tlhnTeacherId;
              if (targetTeacherId) {
                repTeacher = await prisma.teacher.findUnique({ where: { id: targetTeacherId } });
              }
              if (!repTeacher) {
                repTeacher = await prisma.teacher.findFirst({ where: { campusId: alloc.campusId } }) || await prisma.teacher.findFirst();
              }

              if (repTeacher) {
                const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                const recordCode = `HDTN-${alloc.campusCode || 'CS'}-${Date.now().toString().slice(-6)}-${randomSuffix}`;
                actRecord = await prisma.activityRecord.create({
                  data: {
                    code: recordCode,
                    name: existing.name,
                    catalogId: existing.id,
                    date: new Date(),
                    semester: Number(updatedMeta.semester) || 1,
                    academicYearId,
                    levelId: updatedMeta.educationLevel || null,
                    formatId: 'LOP',
                    organizerId: alloc.campusId,
                    teacherId: repTeacher.id,
                    locationId: JSON.stringify(recordMeta),
                    status: 'SUBMITTED'
                  }
                });
                alloc.recordId = actRecord.id;
                alloc.status = 'DA_TRIEN_KHAI';
              }
            } else {
              await prisma.activityRecord.update({
                where: { id: actRecord.id },
                data: {
                  locationId: JSON.stringify(recordMeta),
                  status: 'SUBMITTED'
                }
              });
              alloc.recordId = actRecord.id;
              alloc.status = 'DA_TRIEN_KHAI';
            }

            // Khởi tạo ActivityParticipant cho học sinh của các lớp được chọn
            if (actRecord) {
              const classIds = alloc.assignedClasses.map((c: any) => c.classId).filter(Boolean);
              if (classIds.length > 0) {
                const students = await prisma.student.findMany({
                  where: {
                    classId: { in: classIds },
                    NOT: { status: { in: ['INACTIVE', 'DELETED', 'CHUYEN_TRUONG', 'THOI_HOC'] } }
                  },
                  select: { id: true, classId: true }
                });

                if (students.length > 0) {
                  const existingParts = await prisma.activityParticipant.findMany({
                    where: { recordId: actRecord.id },
                    select: { studentId: true }
                  });
                  const existingStudentIds = new Set(existingParts.map(p => p.studentId));

                  const newParticipants = students
                    .filter(s => !existingStudentIds.has(s.id))
                    .map(s => ({
                      recordId: actRecord.id,
                      studentId: s.id,
                      roleId: 'TV',
                      evalLevelId: null,
                      note: JSON.stringify({ attendance: 'PRESENT', role: 'Thành viên' })
                    }));

                  if (newParticipants.length > 0) {
                    await prisma.activityParticipant.createMany({
                      data: newParticipants
                    });
                  }
                }
              }
            }
          } catch (deployErr) {
            console.error('[ALLOCATE_CAMPUSES] Lỗi khi tự động khởi tạo ActivityRecord:', deployErr);
          }
        }
      }

      // Gửi email thông báo cho GVCN các lớp & GVBM Phụ trách tại các cơ sở được phân bổ (KHÔNG gửi email cho Tổ TLHN)
      if (body.sendEmail !== false && body.allocatedCampuses.length > 0) {
        try {
          emailResult = await sendTLHNAllocationNotification({
            catalogId: existing.id,
            catalogCode: existing.code,
            activityName: existing.name,
            educationLevel: updatedMeta.educationLevel || existing.level,
            programType: updatedMeta.programType,
            sheetCode: updatedMeta.sheetCode,
            grades: updatedMeta.grades,
            themeName: updatedMeta.themeName,
            integratedSubjects: updatedMeta.integratedSubjects,
            primarySubjectName: updatedMeta.primarySubjectName,
            coopSubjectNames: updatedMeta.coopSubjectNames,
            educationalContent: updatedMeta.educationalContent,
            learningOutcomes: updatedMeta.learningOutcomes,
            organizationFormat: updatedMeta.organizationFormat,
            timeFrame: updatedMeta.timeFrame,
            semester: updatedMeta.semester,
            expectedLocation: updatedMeta.expectedLocation,
            partners: updatedMeta.partners,
            cthsTeacherName: updatedMeta.cthsTeacherName,
            senderName: session.user?.name || 'BP HĐNGLL - Tổ CTHS',
            senderEmail: session.user?.email || undefined,
            allocatedCampuses: body.allocatedCampuses
          });
        } catch (emailErr) {
          console.error('[ALLOCATE_CAMPUSES] Lỗi khi gửi email thông báo phân bổ cho GVCN / GVBM:', emailErr);
        }
      }
    }

    const finalName = name !== undefined ? normalizeActivityName(name.trim()) : existing.name;

    const updated = await prisma.activityCatalog.update({
      where: { id },
      data: {
        name: finalName,
        level: updatedMeta.educationLevel || existing.level,
        status: body.status !== undefined ? body.status : existing.status,
        description: JSON.stringify(updatedMeta)
      }
    });

    return NextResponse.json({
      success: true,
      catalog: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        meta: updatedMeta
      },
      emailNotification: emailResult ? {
        sent: emailResult.success,
        count: emailResult.count
      } : null
    });
  } catch (error: any) {
    console.error('Error updating catalog item:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await auth();
    const isAllowed = await checkAdminOrCTHSPermission(session);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã hoạt động' }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const cancelInstead = searchParams.get('cancelInstead') === 'true';

    const existing = await prisma.activityCatalog.findUnique({
      where: { id },
      include: {
        records: {
          select: {
            id: true,
            participants: { select: { id: true } }
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động' }, { status: 404 });
    }

    if (cancelInstead) {
      await prisma.activityCatalog.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json({ success: true, message: 'Đã chuyển hoạt động sang trạng thái HỦY' });
    }

    const hasParticipants = existing.records.some(r => r.participants.length > 0);
    if (hasParticipants) {
      return NextResponse.json({ 
        error: `Không thể xóa vĩnh viễn vì hoạt động đã có học sinh tham gia đánh giá. Bạn có thể chuyển sang trạng thái "HỦY" để ngưng áp dụng.`,
        canCancelInstead: true
      }, { status: 400 });
    }

    // Clean up empty records
    const recordIds = existing.records.map(r => r.id);
    if (recordIds.length > 0) {
      await prisma.activityRecord.deleteMany({ where: { id: { in: recordIds } } });
    }

    await prisma.activityCatalog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa hoạt động khỏi danh mục thành công' });
  } catch (error: any) {
    console.error('Error deleting catalog item:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
