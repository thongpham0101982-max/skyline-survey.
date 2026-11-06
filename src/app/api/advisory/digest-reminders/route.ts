import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureTriPartyTables } from '@/lib/advisory/triparty-sync';
import { normalizeGoalCategory, getStandardCategoryMeta } from '@/lib/advisory/advisoryWeights';

export const dynamic = 'force-dynamic';

const CHECKPOINTS = [
  { code: 'GIUA_KY_1', label: 'Giữa kỳ 1', semester: 'HK1' },
  { code: 'CUOI_KY_1', label: 'Cuối kỳ 1', semester: 'HK1' },
  { code: 'GIUA_KY_2', label: 'Giữa kỳ 2', semester: 'HK2' },
  { code: 'CUOI_KY_2', label: 'Cuối kỳ 2', semester: 'HK2' },
] as const;

const CATEGORIES = ['HOC_TAP', 'KY_NANG', 'THE_CHAT', 'DINH_HUONG'] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTriPartyTables();

    const { searchParams } = new URL(req.url);
    const schoolYear = searchParams.get('schoolYear') || '2025-2026';
    const campusId = searchParams.get('campusId') || 'ALL';
    const gradeLevel = searchParams.get('gradeLevel') || 'ALL';
    const classId = searchParams.get('classId') || 'ALL';

    const userRole = ((session.user as any).role || '').toUpperCase();
    const userEmail = ((session.user as any).email || '').toLowerCase();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'BGH', 'GDCS', 'GĐCS', 'GIAO_VU'].some(r => userRole.includes(r));

    // 1. Load authorized classes
    const classWhere: any = {};
    if (campusId && campusId !== 'ALL') classWhere.campusId = campusId;
    if (classId && classId !== 'ALL') classWhere.id = classId;

    const allClasses = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: true,
        homeroomTeacher: true,
      },
    });

    const authorizedClasses = allClasses.filter(c => {
      if (gradeLevel && gradeLevel !== 'ALL') {
        const g = String(c.grade || '').replace(/[^0-9]/g, '');
        if (g !== String(gradeLevel).replace(/[^0-9]/g, '')) return false;
      }
      if (isAdmin) return true;
      if (classId && classId !== 'ALL' && c.id === classId) return true;
      const hrEmail = (c.homeroomTeacher?.email || '').toLowerCase();
      return hrEmail && hrEmail === userEmail;
    });

    const classIds = authorizedClasses.map(c => c.id);
    const students = classIds.length > 0
      ? await prisma.student.findMany({
          where: { classId: { in: classIds } },
          select: { id: true, studentCode: true, studentName: true, classId: true },
        })
      : [];

    const studentIds = new Set(students.map(s => s.id));
    const studentCodes = new Set(students.map(s => s.studentCode).filter(Boolean));
    const classMap = new Map(authorizedClasses.map(c => [c.id, c]));

    // 2. Query advisory tables in parallel
    const [
      goalMetaRows,
      trackingLogs,
      feedbackRows,
      companionTasks,
      orientationRows,
      hollandRows,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentGoalMeta" WHERE "schoolYear" = ?`,
        schoolYear
      ).catch(() => []),
      studentIds.size > 0
        ? prisma.studentGoalTrackingLog.findMany({
            where: { studentId: { in: Array.from(studentIds) } },
            select: {
              studentId: true,
              checkPoint: true,
              category: true,
              progressStatus: true,
              goalCompletionLevel: true,
              updatedAt: true,
            },
          }).catch(() => [])
        : Promise.resolve([]),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "StudentAdvisoryFeedback" WHERE "schoolYear" = ? ORDER BY "createdAt" DESC`,
        schoolYear
      ).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "SubjectTeacherAdvisoryTask" WHERE "schoolYear" = ? ORDER BY "createdAt" DESC`,
        schoolYear
      ).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "OrientationAdvisoryRecord" WHERE "schoolYear" = ? ORDER BY "updatedAt" DESC`,
        schoolYear
      ).catch(() => []),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT "id", "studentId", "studentCode", "topCode", "completedAt" FROM "StudentHollandAssessment" WHERE "status" = 'COMPLETED' ORDER BY "completedAt" DESC`
      ).catch(() => []),
    ]);

    const inScope = (stId?: string, stCode?: string, clsId?: string) => {
      if (clsId && classMap.has(clsId)) return true;
      if (stId && (studentIds.has(stId) || studentCodes.has(stId))) return true;
      if (stCode && (studentCodes.has(stCode) || studentIds.has(stCode))) return true;
      return false;
    };

    const scopedGoalMetas = goalMetaRows.filter(r => inScope(r.studentId, r.studentCode, r.classId));
    const scopedFeedbacks = feedbackRows.filter(r => inScope(r.studentId, r.studentCode, r.classId));
    const scopedTasks = companionTasks.filter(r => inScope(r.studentId, r.studentId, r.classId));
    const scopedOrientations = orientationRows.filter(r => inScope(r.studentId, r.studentCode, r.classId));
    const scopedHollands = hollandRows.filter(r => inScope(r.studentId, r.studentCode));

    // 3. Build Smart Reminder Digest Items
    const todayIso = new Date().toISOString().slice(0, 10);
    const digestItems: Array<{
      id: string;
      category: 'HOLLAND_UNASSIGNED' | 'COMPANION_PENDING_ACCEPT' | 'COMPANION_OVERDUE' | 'SUPPORT_PENDING_CONFIRM' | 'STUDENT_FEEDBACK_ATTENTION' | 'GOAL_DUE_SOON';
      categoryLabel: string;
      priority: 'URGENT' | 'HIGH' | 'NORMAL';
      studentId: string;
      studentName: string;
      className: string;
      title: string;
      assigneeName: string;
      assigneeEmail: string;
      dueDate: string;
      targetTab: string;
    }> = [];

    // 3a. Holland completed but unassigned to TLHN
    const orientByStudent = new Map<string, any>();
    scopedOrientations.forEach(o => {
      orientByStudent.set(o.studentId, o);
      if (o.studentCode) orientByStudent.set(o.studentCode, o);
    });

    const seenHollandStudents = new Set<string>();
    scopedHollands.forEach(h => {
      const key = h.studentCode || h.studentId;
      if (!key || seenHollandStudents.has(key)) return;
      seenHollandStudents.add(key);
      const oRec = orientByStudent.get(h.studentId) || orientByStudent.get(h.studentCode);
      if (!oRec || oRec.status === 'DA_KHAO_SAT' || oRec.status === 'CHO_PHAN_CONG') {
        const st = students.find(s => s.id === h.studentId || s.studentCode === h.studentCode || s.studentCode === h.studentId);
        const cls = st ? classMap.get(st.classId) : undefined;
        digestItems.push({
          id: `DIGEST_HOLLAND_${key}`,
          category: 'HOLLAND_UNASSIGNED',
          categoryLabel: 'Holland chờ phân công TLHN',
          priority: 'HIGH',
          studentId: st?.studentCode || key,
          studentName: st?.studentName || key,
          className: cls?.className || '',
          title: `Học sinh đã hoàn thành khảo sát Holland (${h.topCode || 'RIASEC'}) — Chờ phân công GV Tổ TLHN tư vấn định hướng`,
          assigneeName: cls?.homeroomTeacher?.teacherName || 'GVCN / Điều phối TLHN',
          assigneeEmail: cls?.homeroomTeacher?.email || '',
          dueDate: todayIso,
          targetTab: 'companion_support',
        });
      }
    });

    // 3b. Companion Tasks (Pending Accept, Overdue, Pending Confirm)
    scopedTasks.forEach(t => {
      const cls = classMap.get(t.classId);
      const isOverdue =
        t.dueDate &&
        t.dueDate.slice(0, 10) < todayIso &&
        t.status !== 'APPROVED' &&
        t.status !== 'SENT_TO_PARENT' &&
        t.status !== 'DECLINED';

      if (t.status === 'ASSIGNED') {
        digestItems.push({
          id: `DIGEST_TASK_ACCEPT_${t.id}`,
          category: 'COMPANION_PENDING_ACCEPT',
          categoryLabel: 'Nhiệm vụ chờ tiếp nhận',
          priority: isOverdue ? 'URGENT' : 'HIGH',
          studentId: t.studentId,
          studentName: t.studentName || t.studentId,
          className: t.className || cls?.className || '',
          title: `[${t.companionType === 'TLHN' ? 'Tổ TLHN' : 'GVBM'}] Chờ tiếp nhận hỗ trợ mục tiêu: ${t.goalTitle || t.subjectName}`,
          assigneeName: t.assignedToName || t.assignedToEmail || 'Giáo viên đồng hành',
          assigneeEmail: t.assignedToEmail || '',
          dueDate: t.acceptDeadline || t.dueDate || todayIso,
          targetTab: 'companion_support',
        });
      } else if (t.status === 'RESPONDED') {
        digestItems.push({
          id: `DIGEST_TASK_CONFIRM_${t.id}`,
          category: 'SUPPORT_PENDING_CONFIRM',
          categoryLabel: 'Kết quả hỗ trợ chờ xác nhận',
          priority: 'HIGH',
          studentId: t.studentId,
          studentName: t.studentName || t.studentId,
          className: t.className || cls?.className || '',
          title: `${t.assignedToName || 'GV đồng hành'} đã gửi báo cáo kết quả hỗ trợ (${t.subjectName}) — Chờ GVCN xác nhận`,
          assigneeName: cls?.homeroomTeacher?.teacherName || t.assignedByName || 'GVCN / CVHT',
          assigneeEmail: cls?.homeroomTeacher?.email || t.assignedByEmail || '',
          dueDate: todayIso,
          targetTab: 'companion_support',
        });
      } else if (isOverdue) {
        digestItems.push({
          id: `DIGEST_TASK_OVERDUE_${t.id}`,
          category: 'COMPANION_OVERDUE',
          categoryLabel: 'Nhiệm vụ đồng hành quá hạn',
          priority: 'URGENT',
          studentId: t.studentId,
          studentName: t.studentName || t.studentId,
          className: t.className || cls?.className || '',
          title: `Quá hạn báo cáo nhiệm vụ hỗ trợ (${t.subjectName}): ${t.requestSummary || ''}`,
          assigneeName: t.assignedToName || 'Giáo viên đồng hành',
          assigneeEmail: t.assignedToEmail || '',
          dueDate: t.dueDate || todayIso,
          targetTab: 'companion_support',
        });
      }
    });

    // 3c. Unprocessed Student Feedback / Needs Attention
    scopedFeedbacks.forEach(fb => {
      if (fb.advisorStatus !== 'CONFIRMED') {
        const st = students.find(s => s.id === fb.studentId || s.studentCode === fb.studentCode);
        const cls = st ? classMap.get(st.classId) : classMap.get(fb.classId);
        digestItems.push({
          id: `DIGEST_FB_${fb.id}`,
          category: 'STUDENT_FEEDBACK_ATTENTION',
          categoryLabel: fb.needsAttention ? 'Phản hồi HS cần quan tâm' : 'Phản hồi HS chờ xử lý',
          priority: fb.needsAttention ? 'URGENT' : 'HIGH',
          studentId: fb.studentCode || fb.studentId,
          studentName: fb.studentName || st?.studentName || fb.studentId,
          className: cls?.className || '',
          title: fb.feedbackType === 'POST_CONSULTATION'
            ? `Phản hồi sau tư vấn: "${(fb.feelingAfter || fb.supportRequestText || 'Cần GVCN xem xét').slice(0, 90)}"`
            : `Tự đánh giá mục tiêu: "${(fb.difficultiesText || fb.supportNeededText || fb.actionsTaken || 'Chờ phản hồi').slice(0, 90)}"`,
          assigneeName: cls?.homeroomTeacher?.teacherName || 'GVCN / CVHT',
          assigneeEmail: cls?.homeroomTeacher?.email || '',
          dueDate: (fb.createdAt || todayIso).slice(0, 10),
          targetTab: 'student_feedback',
        });
      }
    });

    // 4. Build Longitudinal Progress Trend across 4 Checkpoints (GIUA_KY_1 -> CUOI_KY_1 -> GIUA_KY_2 -> CUOI_KY_2)
    const mapTrackingToOutcome = (status?: string, level?: number | null) => {
      const s = (status || '').toUpperCase();
      if (s === 'DAT_MUC_TIEU' || s === 'DAT' || s === 'COMPLETED' || (level && level >= 4)) return 'DAT_MUC_TIEU';
      if (s === 'CO_TIEN_BO' || s === 'TIEN_TRIEN' || (level && level === 3)) return 'CO_TIEN_BO';
      if (s === 'CHUA_GHI_NHAN_TIEN_BO' || s === 'CAN_CO_GANG' || s === 'CHUA_DAT' || (level && level <= 2 && level > 0)) {
        return 'CHUA_GHI_NHAN_TIEN_BO';
      }
      return 'CHUA_DU_DU_LIEU';
    };

    const checkpointTrends = CHECKPOINTS.map(cp => {
      const logsAtCp = trackingLogs.filter(l => (l.checkPoint || 'GIUA_KY_1').toUpperCase() === cp.code);
      const metasAtCp = scopedGoalMetas.filter(m => {
        if (cp.code === 'GIUA_KY_1' && (!m.semester || m.semester === 'HK1')) return true;
        if (cp.code === 'CUOI_KY_1' && m.semester === 'HK1') return true;
        if (cp.code === 'GIUA_KY_2' && m.semester === 'HK2') return true;
        if (cp.code === 'CUOI_KY_2' && m.semester === 'HK2') return true;
        return false;
      });

      let achieved = 0;
      let progressed = 0;
      let noProgress = 0;
      let insufficient = 0;

      logsAtCp.forEach(l => {
        const out = mapTrackingToOutcome(l.progressStatus, l.goalCompletionLevel);
        if (out === 'DAT_MUC_TIEU') achieved++;
        else if (out === 'CO_TIEN_BO') progressed++;
        else if (out === 'CHUA_GHI_NHAN_TIEN_BO') noProgress++;
        else insufficient++;
      });

      metasAtCp.forEach(m => {
        const out = mapTrackingToOutcome(m.progressOutcome, null);
        if (out === 'DAT_MUC_TIEU') achieved++;
        else if (out === 'CO_TIEN_BO') progressed++;
        else if (out === 'CHUA_GHI_NHAN_TIEN_BO') noProgress++;
        else insufficient++;
      });

      const total = achieved + progressed + noProgress + insufficient;
      const positiveRate = total > 0 ? Math.round(((achieved + progressed) / total) * 100) : 0;
      const achievedRate = total > 0 ? Math.round((achieved / total) * 100) : 0;

      return {
        code: cp.code,
        label: cp.label,
        semester: cp.semester,
        totalEvaluatedGoals: total,
        achieved,
        progressed,
        noProgress,
        insufficient,
        positiveRate,
        achievedRate,
      };
    });

    // 5. Category Breakdown across the 4 standardized Goal Categories
    const categoryTrends = CATEGORIES.map(catCode => {
      const meta = getStandardCategoryMeta(catCode);
      const logsForCat = trackingLogs.filter(l => normalizeGoalCategory(l.category || '') === catCode);
      const metasForCat = scopedGoalMetas.filter(m => normalizeGoalCategory(m.goalCategory || '') === catCode);

      let achieved = 0;
      let progressed = 0;
      let noProgress = 0;
      let insufficient = 0;

      logsForCat.forEach(l => {
        const out = mapTrackingToOutcome(l.progressStatus, l.goalCompletionLevel);
        if (out === 'DAT_MUC_TIEU') achieved++;
        else if (out === 'CO_TIEN_BO') progressed++;
        else if (out === 'CHUA_GHI_NHAN_TIEN_BO') noProgress++;
        else insufficient++;
      });

      metasForCat.forEach(m => {
        const out = mapTrackingToOutcome(m.progressOutcome, null);
        if (out === 'DAT_MUC_TIEU') achieved++;
        else if (out === 'CO_TIEN_BO') progressed++;
        else if (out === 'CHUA_GHI_NHAN_TIEN_BO') noProgress++;
        else insufficient++;
      });

      const total = achieved + progressed + noProgress + insufficient;
      const positiveRate = total > 0 ? Math.round(((achieved + progressed) / total) * 100) : 0;

      return {
        categoryCode: catCode,
        categoryLabel: meta.shortLabel,
        total,
        achieved,
        progressed,
        noProgress,
        insufficient,
        positiveRate,
      };
    });

    return NextResponse.json({
      digestSummary: {
        totalItems: digestItems.length,
        urgentCount: digestItems.filter(i => i.priority === 'URGENT').length,
        hollandUnassignedCount: digestItems.filter(i => i.category === 'HOLLAND_UNASSIGNED').length,
        companionPendingAcceptCount: digestItems.filter(i => i.category === 'COMPANION_PENDING_ACCEPT').length,
        companionOverdueCount: digestItems.filter(i => i.category === 'COMPANION_OVERDUE').length,
        supportPendingConfirmCount: digestItems.filter(i => i.category === 'SUPPORT_PENDING_CONFIRM').length,
        feedbackAttentionCount: digestItems.filter(i => i.category === 'STUDENT_FEEDBACK_ATTENTION').length,
      },
      digestItems: digestItems.slice(0, 50),
      checkpointTrends,
      categoryTrends,
    });
  } catch (err: any) {
    console.error('[GET /api/advisory/digest-reminders]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTriPartyTables();
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];

    // Deduplication check: do not send duplicate reminder within 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const recentNotifs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "recipientEmail", "title" FROM "AdvisoryTriPartyNotification" WHERE "createdAt" >= ?`,
      twelveHoursAgo
    ).catch(() => []);

    const recentKeySet = new Set(
      recentNotifs.map(n => `${(n.recipientEmail || '').toLowerCase()}__${n.title || ''}`)
    );

    let sentCount = 0;
    let skippedDuplicateCount = 0;

    for (const item of items.slice(0, 25)) {
      const email = (item.assigneeEmail || '').trim().toLowerCase();
      const title = `[Nhắc việc CVHT] ${item.categoryLabel}: ${item.studentName}`;
      const dedupeKey = `${email}__${title}`;
      if (recentKeySet.has(dedupeKey)) {
        skippedDuplicateCount++;
        continue;
      }
      recentKeySet.add(dedupeKey);

      await createAdvisoryNotification({
        recipientRole: 'TEACHER',
        recipientId: email || item.studentId,
        recipientEmail: email,
        studentId: item.studentId,
        studentName: item.studentName,
        title,
        message: `${item.title}. Người phụ trách: ${item.assigneeName}.`,
        link: `/teacher/co-van-hoc-tap?tab=${encodeURIComponent(item.targetTab || 'dashboard')}`,
        eventType: 'SMART_DIGEST_REMINDER',
      });
      sentCount++;
    }

    return NextResponse.json({
      success: true,
      sentCount,
      skippedDuplicateCount,
    });
  } catch (err: any) {
    console.error('[POST /api/advisory/digest-reminders]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
