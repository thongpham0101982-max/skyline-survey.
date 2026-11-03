import { prisma } from '@/lib/db';
import { EXAM_FAMILY_META, EXAM_TYPE_META } from './ruleEngine';

export type NotificationScenarioCode =
  | 'CONGRATS_RESULT'
  | 'CERT_READY_PICKUP'
  | 'GVCN_CLASS_HONOR'
  | 'NEXT_LEVEL_ADVISORY';

export interface RecipientPreviewItem {
  resultId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  campusCode: string;
  examType: string;
  examLabel: string;
  summaryScoreLabel: string;
  skillSummaryText: string;
  certificateStatus: string;
  certificateNumber: string;
  homeroomTeachers: {
    teacherId: string;
    userId: string;
    teacherCode: string;
    teacherName: string;
    phone: string;
    email: string;
  }[];
  parents: {
    parentId: string;
    userId: string;
    parentCode: string;
    parentName: string;
    phone: string;
    email: string;
  }[];
}

export interface SendIntlExamNotificationInput {
  resultIds: string[];
  scenario: NotificationScenarioCode;
  sendToGVCN: boolean;
  sendToParent: boolean;
  sendToStudentPortal: boolean;
  customTitle?: string;
  customMessageNote?: string;
  senderName?: string;
}

function getNextLevelSuggestion(examType: string): string {
  switch (examType) {
    case 'STARTERS':
      return 'Cambridge YLE Movers (A1)';
    case 'MOVERS':
      return 'Cambridge YLE Flyers (A2)';
    case 'FLYERS':
      return 'Cambridge A2 Key (KET)';
    case 'KET':
      return 'Cambridge B1 Preliminary (PET)';
    case 'PET':
      return 'IELTS Academic (Mục tiêu Band 6.0 - 6.5+)';
    case 'IELTS':
      return 'Nâng cao Band IELTS mục tiêu 7.0+ / Hồ sơ học bổng Quốc tế';
    case 'PEARSON_IPRIMARY':
      return 'Pearson Edexcel International Lower Secondary / Cambridge Checkpoint';
    case 'CHECKPOINT_PRIMARY':
      return 'Cambridge Lower Secondary Checkpoint (Stage 9)';
    case 'CHECKPOINT_LOWER_SECONDARY':
      return 'Cambridge IGCSE / IELTS Academic';
    default:
      return 'Cấp độ Khảo thí Quốc tế tiếp theo trong lộ trình Sky-Line';
  }
}

export async function resolveRecipientsForResults(
  resultIds?: string[]
): Promise<RecipientPreviewItem[]> {
  const results = await prisma.intlExamResult.findMany({
    where: {
      studentId: { not: null },
      isStudentVerified: true,
      sittingStatus: 'COMPLETED',
      ...(resultIds && resultIds.length > 0 ? { id: { in: resultIds } } : {}),
    },
    include: {
      skillResults: { orderBy: { displayOrder: 'asc' } },
      certificate: true,
    },
    orderBy: [{ academicYearText: 'desc' }, { updatedAt: 'desc' }],
  });

  if (results.length === 0) return [];

  const studentIds = Array.from(
    new Set(results.map((r) => r.studentId).filter((id): id is string => Boolean(id)))
  );

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    include: {
      class: {
        include: {
          campus: true,
          teachers: {
            include: {
              teacher: true,
            },
          },
        },
      },
      campus: true,
      parents: {
        include: {
          parent: true,
        },
      },
    },
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Also load all active teachers to resolve homeroomTeacherId or homeroomClass fallback
  const allTeachers = await prisma.teacher.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      userId: true,
      teacherCode: true,
      teacherName: true,
      phone: true,
      email: true,
      homeroomClass: true,
    },
  });
  const teacherById = new Map(allTeachers.map((t) => [t.id, t]));

  // Also load parents by P + studentCode fallback
  const studentCodes = students.map((s) => s.studentCode).filter(Boolean);
  const candidateParentCodes = Array.from(
    new Set([...studentCodes, ...studentCodes.map((c) => `P${c}`)])
  );
  const fallbackParents =
    candidateParentCodes.length > 0
      ? await prisma.parent.findMany({
          where: { parentCode: { in: candidateParentCodes }, status: 'ACTIVE' },
        })
      : [];

  const previewList: RecipientPreviewItem[] = [];

  for (const r of results) {
    if (!r.studentId) continue;
    const st = studentMap.get(r.studentId);
    if (!st) continue;

    // 1. Resolve GVCN (Homeroom Teacher)
    const gvcnMap = new Map<
      string,
      {
        teacherId: string;
        userId: string;
        teacherCode: string;
        teacherName: string;
        phone: string;
        email: string;
      }
    >();

    if (st.class?.homeroomTeacherId) {
      const ids = st.class.homeroomTeacherId
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      for (const tid of ids) {
        const t = teacherById.get(tid);
        if (t && t.userId) {
          gvcnMap.set(t.userId, {
            teacherId: t.id,
            userId: t.userId,
            teacherCode: t.teacherCode,
            teacherName: t.teacherName,
            phone: t.phone || '',
            email: t.email || '',
          });
        }
      }
    }

    if (st.class?.teachers) {
      for (const tc of st.class.teachers) {
        if (tc.teacher && tc.teacher.userId) {
          gvcnMap.set(tc.teacher.userId, {
            teacherId: tc.teacher.id,
            userId: tc.teacher.userId,
            teacherCode: tc.teacher.teacherCode,
            teacherName: tc.teacher.teacherName,
            phone: tc.teacher.phone || '',
            email: tc.teacher.email || '',
          });
        }
      }
    }

    if (gvcnMap.size === 0 && st.class?.className) {
      const normClass = st.class.className.trim().toLowerCase();
      for (const t of allTeachers) {
        if (
          t.homeroomClass &&
          t.homeroomClass
            .toLowerCase()
            .split(/[,;]/)
            .map((x) => x.trim())
            .includes(normClass)
        ) {
          gvcnMap.set(t.userId, {
            teacherId: t.id,
            userId: t.userId,
            teacherCode: t.teacherCode,
            teacherName: t.teacherName,
            phone: t.phone || '',
            email: t.email || '',
          });
        }
      }
    }

    // 2. Resolve Parents
    const parentMap = new Map<
      string,
      {
        parentId: string;
        userId: string;
        parentCode: string;
        parentName: string;
        phone: string;
        email: string;
      }
    >();

    if (st.parents) {
      for (const pl of st.parents) {
        if (pl.parent && pl.parent.userId) {
          parentMap.set(pl.parent.userId, {
            parentId: pl.parent.id,
            userId: pl.parent.userId,
            parentCode: pl.parent.parentCode,
            parentName: pl.parent.parentName,
            phone: pl.parent.phone || '',
            email: pl.parent.email || '',
          });
        }
      }
    }

    if (parentMap.size === 0 && st.studentCode) {
      const cleanCode = st.studentCode.trim();
      for (const fp of fallbackParents) {
        if (
          fp.parentCode === cleanCode ||
          fp.parentCode.toUpperCase() === `P${cleanCode.toUpperCase()}`
        ) {
          parentMap.set(fp.userId, {
            parentId: fp.id,
            userId: fp.userId,
            parentCode: fp.parentCode,
            parentName: fp.parentName,
            phone: fp.phone || '',
            email: fp.email || '',
          });
        }
      }
    }

    const examMeta = EXAM_TYPE_META[r.examType as keyof typeof EXAM_TYPE_META];
    const examLabel = examMeta?.label || r.examType;
    const skillSummaryText = (r.skillResults || [])
      .map(
        (s) =>
          `${s.componentName || s.componentCode}: ${s.numericScore ?? '-'}${
            s.officialBandCode &&
            !String(s.officialBandCode).includes('SHIELD') &&
            !String(s.officialBandCode).includes('BAND_')
              ? ` (${s.officialBandCode})`
              : ''
          }`
      )
      .join(' • ');

    previewList.push({
      resultId: r.id,
      studentId: st.id,
      studentCode: st.studentCode,
      studentName: st.studentName,
      className: st.class?.className || r.classNameSnapshot || '',
      campusCode: st.campus?.campusCode || r.campusCodeSnapshot || '',
      examType: r.examType,
      examLabel,
      summaryScoreLabel: r.summaryScoreLabel || '',
      skillSummaryText,
      certificateStatus: r.certificate?.certificateStatus || 'RECEIVED_AT_SCHOOL',
      certificateNumber: r.certificate?.certificateNumber || '',
      homeroomTeachers: Array.from(gvcnMap.values()),
      parents: Array.from(parentMap.values()),
    });
  }

  return previewList;
}

export function buildScenarioContent(
  item: RecipientPreviewItem,
  scenario: NotificationScenarioCode,
  customNote?: string
) {
  const nextLevel = getNextLevelSuggestion(item.examType);
  const skillPart = item.skillSummaryText ? ` | Chi tiết: ${item.skillSummaryText}` : '';
  const certPart = item.certificateNumber ? ` (Số hiệu CC: ${item.certificateNumber})` : '';
  const extraNote = customNote?.trim() ? `\n📌 Lời nhắn: ${customNote.trim()}` : '';

  switch (scenario) {
    case 'CERT_READY_PICKUP':
      return {
        gvcnTitle: `📜 Chứng chỉ ${item.examLabel} của HS ${item.studentName} (${item.className}) đã về trường`,
        gvcnMessage: `Học sinh ${item.studentName} (Mã HS: ${item.studentCode} - Lớp ${item.className}) đạt kết quả ${item.summaryScoreLabel}${skillPart}${certPart}. Bản gốc chứng chỉ đã có tại trường, kính nhờ Thầy/Cô GVCN phối hợp thông tin tới Phụ huynh và vinh danh học sinh trước lớp.${extraNote}`,
        parentTitle: `📜 Mời Quý Phụ huynh nhận Chứng chỉ Quốc tế ${item.examLabel} của con ${item.studentName}`,
        parentMessage: `Nhà trường trân trọng thông báo: Chứng chỉ chính thức kỳ thi ${item.examLabel} của học sinh ${item.studentName} (Lớp ${item.className} - Kết quả: ${item.summaryScoreLabel}${skillPart}${certPart}) đã có tại trường. Kính mời Quý Phụ huynh liên hệ GVCN hoặc Văn phòng Cơ sở ${item.campusCode} để nhận chứng chỉ.${extraNote}`,
        studentHighlight: `🎉 Chúc mừng em ${item.studentName} đã nhận Chứng chỉ Quốc tế ${item.examLabel}! Kết quả: ${item.summaryScoreLabel}${skillPart}${certPart}. Hãy tiếp tục chinh phục mục tiêu tiếp theo: ${nextLevel}!${extraNote}`,
      };

    case 'GVCN_CLASS_HONOR':
      return {
        gvcnTitle: `🌟 Đề xuất Vinh danh HS ${item.studentName} (${item.className}) đạt Chứng chỉ ${item.examLabel}`,
        gvcnMessage: `Ban KT&ĐBCL thông báo: Học sinh ${item.studentName} (Lớp ${item.className}) đã xuất sắc hoàn thành kỳ thi ${item.examLabel} với kết quả ${item.summaryScoreLabel}${skillPart}. Kính đề nghị GVCN biểu dương học sinh trong giờ Sinh hoạt lớp và hướng dẫn em cập nhật vào Sổ Mục tiêu 360°.${extraNote}`,
        parentTitle: `🌟 Thư biểu dương thành tích Khảo thí Quốc tế của con ${item.studentName}`,
        parentMessage: `Chúc mừng Gia đình và học sinh ${item.studentName} (Lớp ${item.className}) đã đạt thành tích ấn tượng trong kỳ thi ${item.examLabel}: ${item.summaryScoreLabel}${skillPart}. Thành tích của con đã được gửi tới GVCN lớp để vinh danh và lưu vào Hồ sơ Học sinh 360° Sky-Line.${extraNote}`,
        studentHighlight: `🏆 [VINH DANH KHẢO THÍ QUỐC TẾ] Chúc mừng em ${item.studentName} đạt thành tích xuất sắc kỳ thi ${item.examLabel}: ${item.summaryScoreLabel}${skillPart}. Thầy Cô và Nhà trường rất tự hào về sự nỗ lực của em!${extraNote}`,
      };

    case 'NEXT_LEVEL_ADVISORY':
      return {
        gvcnTitle: `🧭 Định hướng lộ trình Quốc tế tiếp theo cho HS ${item.studentName} (${item.className})`,
        gvcnMessage: `Từ kết quả kỳ thi ${item.examLabel} (${item.summaryScoreLabel}${skillPart}), Ban KT&ĐBCL khuyến nghị lộ trình cấp độ tiếp theo cho HS ${item.studentName} là: ${nextLevel}. Kính nhờ GVCN đồng hành cùng học sinh và Phụ huynh trong kỳ cố vấn học tập.${extraNote}`,
        parentTitle: `🧭 Tư vấn lộ trình Khảo thí Quốc tế tiếp theo cho con ${item.studentName}`,
        parentMessage: `Dựa trên kết quả kỳ thi ${item.examLabel} (${item.summaryScoreLabel}${skillPart}), Ban Khảo thí & ĐBCL Sky-Line khuyến nghị lộ trình chinh phục cấp độ tiếp theo của con ${item.studentName} là: ${nextLevel}. Quý Phụ huynh có thể xem chi tiết phân tích kỹ năng trong Hồ sơ 360° của con.${extraNote}`,
        studentHighlight: `🧭 [ĐỊNH HƯỚNG LỘ TRÌNH QUỐC TẾ] Chúc mừng em hoàn thành ${item.examLabel} (${item.summaryScoreLabel}${skillPart}). Cột mốc chinh phục tiếp theo dành cho em: ${nextLevel}!${extraNote}`,
      };

    case 'CONGRATS_RESULT':
    default:
      return {
        gvcnTitle: `🎓 Học sinh ${item.studentName} (Lớp ${item.className}) đạt Chứng chỉ ${item.examLabel}`,
        gvcnMessage: `Thông báo tới GVCN Lớp ${item.className}: Học sinh ${item.studentName} (Mã HS: ${item.studentCode}) đã đạt kết quả kỳ thi ${item.examLabel}: ${item.summaryScoreLabel}${skillPart}${certPart}. Dữ liệu đã được đồng bộ vào Hồ sơ Học sinh 360° của lớp.${extraNote}`,
        parentTitle: `🏆 Chúc mừng con ${item.studentName} đạt Chứng chỉ Quốc tế ${item.examLabel}`,
        parentMessage: `Ban Khảo thí & ĐBCL Hệ thống Giáo dục Sky-Line trân trọng chúc mừng Quý Phụ huynh và học sinh ${item.studentName} (Lớp ${item.className}) đã đạt kết quả kỳ thi ${item.examLabel}: ${item.summaryScoreLabel}${skillPart}${certPart}. Quý Phụ huynh có thể tra cứu chi tiết điểm thành phần và chứng chỉ tại Hồ sơ 360° của con.${extraNote}`,
        studentHighlight: `🎓 [CHỨNG CHỈ QUỐC TẾ SKY-LINE] Chúc mừng em ${item.studentName} đã đạt kết quả kỳ thi ${item.examLabel}: ${item.summaryScoreLabel}${skillPart}${certPart}. Lộ trình gợi ý tiếp theo: ${nextLevel}.${extraNote}`,
      };
  }
}

export async function dispatchIntlExamNotifications(input: SendIntlExamNotificationInput) {
  const recipients = await resolveRecipientsForResults(input.resultIds);
  let gvcnNotificationsSent = 0;
  let parentNotificationsSent = 0;
  let studentPortalHighlightsCreated = 0;

  for (const item of recipients) {
    const content = buildScenarioContent(item, input.scenario, input.customMessageNote);

    // 1. Send to GVCN account(s)
    if (input.sendToGVCN && item.homeroomTeachers.length > 0) {
      for (const gv of item.homeroomTeachers) {
        await prisma.notification.create({
          data: {
            userId: gv.userId,
            title: input.customTitle?.trim() || content.gvcnTitle,
            message: content.gvcnMessage,
            link: `/teacher/ho-so-hoc-sinh?studentId=${item.studentId}`,
            type: 'SUCCESS',
            category: 'INTL_EXAM_CERTIFICATE',
            priority: 'HIGH',
            sourceModule: 'KTDBCL_INTERNATIONAL_EXAMS',
            sourceId: item.resultId,
          },
        });
        gvcnNotificationsSent++;
      }
    }

    // 2. Send to Parent account(s)
    if (input.sendToParent && item.parents.length > 0) {
      for (const pr of item.parents) {
        await prisma.notification.create({
          data: {
            userId: pr.userId,
            title: input.customTitle?.trim() || content.parentTitle,
            message: content.parentMessage,
            link: `/parent/children/profile?studentId=${item.studentId}`,
            type: 'SUCCESS',
            category: 'INTL_EXAM_CERTIFICATE',
            priority: 'HIGH',
            sourceModule: 'KTDBCL_INTERNATIONAL_EXAMS',
            sourceId: item.resultId,
          },
        });
        parentNotificationsSent++;
      }
    }

    // 3. Send to Student Portal & 360 Highlight Comments
    if (input.sendToStudentPortal && item.studentId) {
      const teacherRef = item.homeroomTeachers[0];
      await prisma.studentHighlightComment.create({
        data: {
          studentId: item.studentId,
          teacherId: teacherRef?.teacherId || 'KTDBCL_SYSTEM',
          teacherName:
            input.senderName ||
            (teacherRef?.teacherName
              ? `Ban KT&ĐBCL & GVCN ${teacherRef.teacherName}`
              : 'Ban Khảo thí & ĐBCL Sky-Line'),
          comment: content.studentHighlight,
          category: 'INTL_EXAM_CERTIFICATE',
        },
      });
      studentPortalHighlightsCreated++;
    }
  }

  return {
    studentsProcessed: recipients.length,
    gvcnNotificationsSent,
    parentNotificationsSent,
    studentPortalHighlightsCreated,
  };
}
