'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  Filter,
  FlaskConical,
  FlipVertical,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  Palette,
  Printer,
  QrCode,
  RefreshCw,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Unlock,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DEFAULT_NAMEPLATE_CONFIG,
  NAMEPLATE_COLOR_THEME_LIST,
  NAMEPLATE_COLOR_THEMES,
  NAMEPLATE_TEMPLATE_LIST,
  NAMEPLATE_TEMPLATES,
  resolveColorThemeBySystemAndCampus,
  resolveLevelDisplayLabel,
  resolveTemplateByGrade,
} from '@/lib/nameplates/config';
import {
  CharacterIllustrationMode,
  NameplateColorThemeId,
  NameplatePrintConfig,
  NameplateStudentItem,
  NameplateTemplateId,
  PreviewViewMode,
} from '@/lib/nameplates/types';
import {
  Nameplate3DTentPreview,
  NameplateA4Sheet,
  NameplateBackFace,
  NameplateFrontFace,
} from '@/components/nameplates/NameplateCard';

/**
 * Danh sách học sinh mẫu dùng cho chế độ Kiểm thử (Tên dài, đa cấp học)
 * Không ghi vào CSDL, chỉ phục vụ kiểm tra hiển thị và nghiệm thu bản in.
 */
const DEMO_STRESS_TEST_STUDENTS: NameplateStudentItem[] = [
  {
    id: 'demo-1',
    studentCode: '0701030404',
    studentName: 'Nguyễn Khánh Linh',
    gender: 'Nữ',
    classId: 'demo-class',
    className: '4S',
    grade: '4',
    level: 'Tiểu học',
    educationSystem: 'Global',
    campusId: 'cs1',
    campusCode: 'CS1',
    campusName: 'Sky-Line Riverside',
    academicYearId: 'ay-current',
    academicYearName: '2025-2026',
    qrStatus: 'ACTIVE',
    verifyUrl: 'https://ssm.skylineschool.edu.vn/profile/verify/0701030404',
    hasPortalPhoto: true,
    photoUrl: '/api/student-photos/cmscqypgm0019gt30xd9lj94k?code=0601050323',
  },
  {
    id: 'demo-2',
    studentCode: '0101000123',
    studentName: 'Nguyễn Hoàng Phương Huyền Trân',
    gender: 'Nữ',
    classId: 'demo-class',
    className: '1G1',
    grade: '1',
    level: 'Tiểu học',
    educationSystem: 'Global',
    campusId: 'cs1',
    campusCode: 'CS1',
    campusName: 'Sky-Line Riverside',
    academicYearId: 'ay-current',
    academicYearName: '2025-2026',
    qrStatus: 'ACTIVE',
    verifyUrl: 'https://ssm.skylineschool.edu.vn/profile/verify/0101000123',
    hasPortalPhoto: true,
    photoUrl: '/api/student-photos/cmscqxmbb0011gt30jv7b2gpm?code=0601011411',
  },
  {
    id: 'demo-3',
    studentCode: '0602000789',
    studentName: 'Lê Hoàng Nam',
    gender: 'Nam',
    classId: 'demo-class',
    className: '7G1',
    grade: '7',
    level: 'THCS',
    educationSystem: 'Global',
    campusId: 'cs3',
    campusCode: 'CS3',
    campusName: 'Sky-Line Global',
    academicYearId: 'ay-current',
    academicYearName: '2025-2026',
    qrStatus: 'ACTIVE',
    verifyUrl: 'https://ssm.skylineschool.edu.vn/profile/verify/0602000789',
    hasPortalPhoto: true,
    photoUrl: '/api/student-photos/cmscqxmg90013gt30ymvup66y?code=0601030168',
  },
  {
    id: 'demo-4',
    studentCode: '1003000521',
    studentName: 'Trần Bảo Ngọc',
    gender: 'Nữ',
    classId: 'demo-class',
    className: '11GAC',
    grade: '11',
    level: 'THPT',
    educationSystem: 'Global',
    campusId: 'cs1',
    campusCode: 'CS1',
    campusName: 'Sky-Line Riverside',
    academicYearId: 'ay-current',
    academicYearName: '2025-2026',
    qrStatus: 'ACTIVE',
    verifyUrl: 'https://ssm.skylineschool.edu.vn/profile/verify/1003000521',
    hasPortalPhoto: true,
    photoUrl: '/api/student-photos/cmscqypm5001bgt30nwl70eq5?code=0601011437',
  },
];

export default function NameplateGeneratorClient() {
  // Dữ liệu phân quyền & danh mục từ SSM
  const [loading, setLoading] = useState(true);
  const [accessScope, setAccessScope] = useState<string>('GVCN');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [campuses, setCampuses] = useState<any[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('ALL');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClassMeta, setSelectedClassMeta] = useState<any>(null);
  const [students, setStudents] = useState<NameplateStudentItem[]>([]);

  // Trạng thái chọn học sinh & tìm kiếm
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [printScopeMode, setPrintScopeMode] = useState<'ALL' | 'SELECTED'>('ALL');
  const [focusedStudentId, setFocusedStudentId] = useState<string>('');
  const [isDemoTestMode, setIsDemoTestMode] = useState<boolean>(false);

  // Cấu hình thiết kế mẫu & quy cách in
  const [config, setConfig] = useState<NameplatePrintConfig>(DEFAULT_NAMEPLATE_CONFIG);
  const [previewMode, setPreviewMode] = useState<PreviewViewMode>('TENT_3D');
  const [currentA4Page, setCurrentA4Page] = useState<number>(0);

  // Trạng thái xuất PDF / In & Tải ảnh Cổng ảnh học sinh
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [updatingQrCode, setUpdatingQrCode] = useState<string | null>(null);
  const [uploadingPhotoStudentId, setUploadingPhotoStudentId] = useState<string | null>(null);
  const [targetPhotoStudent, setTargetPhotoStudent] = useState<NameplateStudentItem | null>(null);

  const previewSectionRef = useRef<HTMLDivElement>(null);
  const printBatchContainerRef = useRef<HTMLDivElement>(null);
  const studentPhotoInputRef = useRef<HTMLInputElement>(null);

  // Tải dữ liệu lớp và danh sách học sinh từ SSM
  const fetchNameplateData = async (opts?: {
    yearId?: string;
    campusId?: string;
    classId?: string;
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const yId = opts?.yearId !== undefined ? opts.yearId : selectedYearId;
      const cId = opts?.campusId !== undefined ? opts.campusId : selectedCampusId;
      const clsId = opts?.classId !== undefined ? opts.classId : selectedClassId;

      if (yId) params.set('academicYearId', yId);
      if (cId && cId !== 'ALL') params.set('campusId', cId);
      if (clsId) params.set('classId', clsId);

      const res = await fetch(`/api/learning-resources/nameplates?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || 'Không thể tải dữ liệu lớp chủ nhiệm.');
        setLoading(false);
        return;
      }

      setAccessScope(json.accessScope || 'GVCN');
      setAcademicYears(json.academicYears || []);
      if (json.selectedAcademicYearId && !yId) {
        setSelectedYearId(json.selectedAcademicYearId);
      }
      setCampuses(json.campuses || []);
      setClasses(json.classes || []);
      setSelectedClassMeta(json.selectedClass || null);

      const activeClassId = json.selectedClass?.id || '';
      setSelectedClassId(activeClassId);

      const loadedStudents: NameplateStudentItem[] = Array.isArray(json.students)
        ? json.students
        : [];
      setStudents(loadedStudents);

      // Mặc định chọn tất cả học sinh trong lớp & ưu tiên hiển thị học sinh đã có ảnh trên Cổng ảnh học sinh
      setSelectedIds(new Set(loadedStudents.map((s) => s.id)));
      const firstStudentWithPhoto =
        loadedStudents.find((s) => s.hasPortalPhoto) || loadedStudents[0];
      setFocusedStudentId(firstStudentWithPhoto?.id || '');
      setCurrentA4Page(0);

      // Tự động gợi ý Mẫu thiết kế theo Khối lớp, Bảng màu theo Hệ học và Chủ đề năm học từ SSM
      const activeYearTheme =
        json.selectedClass?.academicYearTheme ||
        json.selectedAcademicYearTheme ||
        (json.academicYears || []).find(
          (y: any) => y.id === (json.selectedAcademicYearId || yId)
        )?.theme ||
        'Vững nội lực - Hướng tương lai';

      if (json.selectedClass) {
        const autoTemplate = resolveTemplateByGrade(
          json.selectedClass.grade || json.selectedClass.className
        );
        const autoTheme = resolveColorThemeBySystemAndCampus(
          json.selectedClass.educationSystem,
          json.selectedClass.campusCode || json.selectedClass.campusName,
          json.selectedClass.className
        );
        setConfig((prev) => ({
          ...prev,
          templateId:
            prev.templateId === 'MODEL_05_MASCOT' ||
            prev.templateId === 'MODEL_06_MASCOT_PHONE'
              ? prev.templateId
              : autoTemplate,
          colorThemeId: autoTheme,
          backMotto: activeYearTheme,
          academicYearName: json.selectedClass.academicYearName || '',
        }));
      } else {
        setConfig((prev) => ({
          ...prev,
          backMotto: activeYearTheme,
        }));
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi tải danh sách học sinh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNameplateData();
  }, []);

  // Danh sách học sinh đang sử dụng (Dữ liệu thật SSM hoặc Chế độ Kiểm thử mẫu)
  const activeDataset = useMemo(() => {
    return isDemoTestMode ? DEMO_STRESS_TEST_STUDENTS : students;
  }, [isDemoTestMode, students]);

  // Lọc tìm kiếm trên bảng
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeDataset;
    const q = searchQuery.toLowerCase().trim();
    return activeDataset.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [activeDataset, searchQuery]);

  // Danh sách học sinh sẽ đưa vào in / xuất PDF
  const studentsToPrint = useMemo(() => {
    if (isDemoTestMode) return DEMO_STRESS_TEST_STUDENTS;
    if (printScopeMode === 'ALL') return activeDataset;
    return activeDataset.filter((s) => selectedIds.has(s.id));
  }, [activeDataset, isDemoTestMode, printScopeMode, selectedIds]);

  // Học sinh đang được chọn để xem trước đơn lẻ (Mặt trước / Mặt sau / Gập chữ A)
  const previewStudent = useMemo(() => {
    const found =
      activeDataset.find((s) => s.id === focusedStudentId) ||
      studentsToPrint[0] ||
      activeDataset[0] ||
      DEMO_STRESS_TEST_STUDENTS[0];
    return found;
  }, [activeDataset, focusedStudentId, studentsToPrint]);

  // Chia thành từng cặp 02 bảng tên trên mỗi tờ A4
  const a4Pairs = useMemo(() => {
    const list =
      studentsToPrint.length > 0 ? studentsToPrint : [previewStudent];
    const pairs: Array<[NameplateStudentItem, NameplateStudentItem?]> = [];
    for (let i = 0; i < list.length; i += 2) {
      pairs.push([list[i], list[i + 1]]);
    }
    return pairs;
  }, [studentsToPrint, previewStudent]);

  // Đảm bảo chỉ số trang A4 hợp lệ
  const safeA4PageIndex = Math.min(
    Math.max(0, currentA4Page),
    Math.max(0, a4Pairs.length - 1)
  );

  // Chọn / Bỏ chọn 1 học sinh
  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPrintScopeMode('SELECTED');
  };

  // Chọn tất cả / Bỏ chọn tất cả học sinh đang lọc
  const toggleSelectAllFiltered = () => {
    const allFilteredSelected =
      filteredStudents.length > 0 &&
      filteredStudents.every((s) => selectedIds.has(s.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredStudents.forEach((s) => next.delete(s.id));
      } else {
        filteredStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  // Thao tác Khóa / Mở hoặc Đổi liên kết QR của học sinh (Mục 5)
  const handleQrAction = async (
    student: NameplateStudentItem,
    action: 'toggleQrStatus' | 'rotateQrToken'
  ) => {
    if (isDemoTestMode) {
      toast.success('Đã mô phỏng cập nhật trạng thái QR trong chế độ Kiểm thử.');
      return;
    }
    setUpdatingQrCode(student.studentCode);
    try {
      const res = await fetch('/api/learning-resources/nameplates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          studentCode: student.studentCode,
          classId: student.classId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Không thể cập nhật mã QR.');
        return;
      }

      setStudents((prev) =>
        prev.map((item) =>
          item.studentCode === student.studentCode
            ? {
                ...item,
                qrStatus: json.qrStatus,
                qrToken: json.qrToken,
                verifyUrl: json.verifyUrl,
              }
            : item
        )
      );

      if (action === 'toggleQrStatus') {
        toast.success(
          json.qrStatus === 'ACTIVE'
            ? `Đã kích hoạt lại mã QR của ${student.studentName}`
            : `Đã vô hiệu hóa mã QR của ${student.studentName}`
        );
      } else {
        toast.success(`Đã cấp mới liên kết mã QR cho ${student.studentName}`);
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật mã QR.');
    } finally {
      setUpdatingQrCode(null);
    }
  };

  // Tải lên / Cập nhật ảnh học sinh trực tiếp vào Cổng ảnh học sinh (/api/student-photos/[studentId])
  const handleTriggerUploadPhoto = (student: NameplateStudentItem) => {
    if (isDemoTestMode) {
      toast('Đang ở chế độ Kiểm thử mẫu (Tắt kiểm thử để tải ảnh thật lên Cổng ảnh học sinh).');
      return;
    }
    setTargetPhotoStudent(student);
    setTimeout(() => {
      studentPhotoInputRef.current?.click();
    }, 30);
  };

  const handleStudentPhotoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !targetPhotoStudent) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    const student = targetPhotoStudent;
    setUploadingPhotoStudentId(student.id);
    const toastId = toast.loading(
      `Đang đồng bộ ảnh của ${student.studentName} lên Cổng ảnh học sinh...`
    );

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/student-photos/${encodeURIComponent(student.id)}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Không thể tải ảnh lên Cổng ảnh học sinh.', {
          id: toastId,
        });
        return;
      }

      const bustedUrl = `/api/student-photos/${encodeURIComponent(student.id)}?code=${encodeURIComponent(student.studentCode)}&t=${Date.now()}`;
      setStudents((prev) =>
        prev.map((item) =>
          item.id === student.id || item.studentCode === student.studentCode
            ? {
                ...item,
                hasPortalPhoto: true,
                photoUrl: bustedUrl,
              }
            : item
        )
      );
      setFocusedStudentId(student.id);
      toast.success(
        `Đã cập nhật ảnh của ${student.studentName} lên Cổng ảnh học sinh!`,
        { id: toastId }
      );
    } catch {
      toast.error('Lỗi kết nối khi tải ảnh lên Cổng ảnh học sinh.', {
        id: toastId,
      });
    } finally {
      setUploadingPhotoStudentId(null);
      setTargetPhotoStudent(null);
    }
  };

  // Đảm bảo toàn bộ hình nền, ảnh học sinh và mã QR trong vùng in đã tải & giải mã 100% trước khi In / Xuất PDF
  const waitForAllPrintImagesReady = async (container: HTMLElement | null) => {
    if (!container) return;
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map(async (img) => {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            setTimeout(done, 3500);
          });
        }
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => {});
        }
      })
    );
  };

  // Xử lý In trực tiếp đúng tỷ lệ 100% khổ A4
  const handleTriggerPrint = async (mode: 'ALL' | 'SELECTED') => {
    setPrintScopeMode(mode);
    if (mode === 'SELECTED' && selectedIds.size === 0 && !isDemoTestMode) {
      toast.error('Vui lòng chọn ít nhất 01 học sinh để in bảng tên.');
      return;
    }
    const toastId = toast.loading('Đang chuẩn bị hình ảnh bản in A4...');
    await new Promise((r) => setTimeout(r, 200));
    await waitForAllPrintImagesReady(printBatchContainerRef.current);
    toast.dismiss(toastId);
    window.print();
  };

  // Xuất file PDF chất lượng cao chuẩn A4 (210 × 297 mm) qua Puppeteer Server Engine
  const handleExportPdf = async (mode?: 'ALL' | 'SELECTED') => {
    const targetMode = mode || printScopeMode;
    if (mode) setPrintScopeMode(mode);

    const targetStudents = isDemoTestMode
      ? DEMO_STRESS_TEST_STUDENTS
      : targetMode === 'ALL'
        ? activeDataset
        : activeDataset.filter((s) => selectedIds.has(s.id));

    if (targetStudents.length === 0) {
      toast.error('Không có học sinh nào được chọn để xuất PDF.');
      return;
    }

    setIsExportingPdf(true);
    const toastId = toast.loading(
      `Đang tạo PDF chất lượng cao (${targetStudents.length} bảng tên / ${Math.ceil(
        targetStudents.length / 2
      )} trang A4)...`
    );

    try {
      // Đợi DOM render đầy đủ các trang A4 và giải mã toàn bộ hình ảnh trong vùng print container
      await new Promise((r) => setTimeout(r, 300));

      const printEl = printBatchContainerRef.current;
      if (!printEl) {
        throw new Error('Không tìm thấy vùng dữ liệu trang in A4.');
      }

      await waitForAllPrintImagesReady(printEl);

      // Thu thập toàn bộ CSS hiện hành để gửi sang Puppeteer
      let inlinedStyles = '';
      try {
        Array.from(document.querySelectorAll('style')).forEach((el) => {
          if (el.textContent) inlinedStyles += el.textContent + '\n';
        });
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.cssRules) {
              Array.from(sheet.cssRules).forEach((rule) => {
                inlinedStyles += rule.cssText + '\n';
              });
            }
          } catch (_) {}
        });
      } catch (_) {}

      const classLabel = (
        selectedClassMeta?.className || 'SkyLine'
      ).replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Bang_Ten_Hop_PHHS_Lop_${classLabel}_${targetStudents.length}HS.pdf`;

      const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <base href="${window.location.origin}/" />
  <title>${fileName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Montserrat:wght@600;700;800;900&family=Quicksand:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    ${inlinedStyles}
    @page {
      size: A4 portrait;
      margin: 0mm !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      background: #FFFFFF !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .nameplate-a4-sheet:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  </style>
</head>
<body>
  ${printEl.innerHTML}
</body>
</html>`;

      const res = await fetch('/api/admin/student-profiles/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: fullHtml,
          fileName,
        }),
      });

      if (!res.ok) {
        throw new Error('Server PDF render failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      toast.success(
        `Đã xuất thành công ${fileName} (${Math.ceil(
          targetStudents.length / 2
        )} trang A4)!`,
        { id: toastId }
      );
    } catch (err) {
      toast.dismiss(toastId);
      toast(
        'Đang mở chế độ Lưu PDF chuẩn A4 trực tiếp từ trình duyệt (Tỷ lệ 100%)...',
        { icon: '🖨️' }
      );
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeTemplateMeta =
    NAMEPLATE_TEMPLATES[config.templateId] || NAMEPLATE_TEMPLATES.MODEL_02_G2_5;
  const activeColorMeta =
    NAMEPLATE_COLOR_THEMES[config.colorThemeId] ||
    NAMEPLATE_COLOR_THEMES.GLOBAL_PURPLE;

  return (
    <>
      {/* CSS IN ẤN VẬT LÝ CHÍNH XÁC A4 (210 × 297 mm - TỶ LỆ 100%) */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Montserrat:wght@600;700;800;900&family=Quicksand:wght@600;700;800&display=swap');

        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          aside,
          header,
          footer,
          nav,
          .no-print,
          [class*='Sidebar'],
          [class*='ChatBot'],
          [class*='MobileBottomNav'] {
            display: none !important;
          }
          html,
          body,
          main,
          div.flex.h-screen {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #nameplate-batch-print-root {
            display: block !important;
            position: static !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .nameplate-a4-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* GIAO DIỆN ĐIỀU KHIỂN DÀNH CHO GVCN / QUẢN LÝ (Ẩn khi nhấn lệnh In) */}
      <div className="no-print space-y-6 pb-12">
        {/* BANNER TIÊU ĐỀ & ĐƯỜNG DẪN CHỨC NĂNG */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#4C1D95] to-[#003B3A] rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-purple-400/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                <span>SSM SKY-LINE</span>
                <span>•</span>
                <span>Học liệu</span>
                <span>•</span>
                <span>Họp PHHS</span>
                <span>•</span>
                <span className="text-amber-300">Bảng tên học sinh</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
                <QrCode className="w-6 h-6 text-amber-300 shrink-0" />
                <span>Thiết Kế &amp; In Bảng Tên Học Sinh – Họp Phụ Huynh Sky-Line</span>
              </h1>
              <p className="text-xs sm:text-sm text-purple-100/90 max-w-3xl">
                Tự động đồng bộ danh sách học sinh từ SSM, sinh mã QR Hồ sơ học tập cá nhân bảo mật và dàn trang chuẩn khổ A4 đứng (02 bảng tên gập chữ A <strong className="text-white">21 × 7 cm</strong> trên mỗi tờ A4).
              </p>
            </div>

            {/* CÁC NÚT CHỨC NĂNG CHÍNH (Mục 6.D) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPreviewMode('A4_SHEET');
                  previewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-300" />
                <span>Xem trước A4</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerPrint('ALL')}
                disabled={activeDataset.length === 0 || isExportingPdf}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>In tất cả ({activeDataset.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerPrint('SELECTED')}
                disabled={selectedIds.size === 0 || isExportingPdf}
                className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <CheckSquare className="w-4 h-4" />
                <span>In HS đã chọn ({selectedIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportPdf()}
                disabled={studentsToPrint.length === 0 || isExportingPdf}
                className="px-4 py-2 rounded-xl bg-white text-[#2E1065] hover:bg-purple-50 text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                ) : (
                  <FileDown className="w-4 h-4 text-purple-700" />
                )}
                <span>Xuất PDF ({Math.ceil(studentsToPrint.length / 2)} trang A4)</span>
              </button>
            </div>
          </div>
        </div>

        {/* A. THANH ĐIỀU KHIỂN (Mục 6.A) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#5B21B6]" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                A. Thanh Điều Khiển Lớp Chủ Nhiệm &amp; Mẫu Thiết Kế
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút bật/tắt chế độ Kiểm thử đa cấp học & tên dài (Mục 11.5) */}
              <button
                type="button"
                onClick={() => {
                  const next = !isDemoTestMode;
                  setIsDemoTestMode(next);
                  if (next) {
                    setFocusedStudentId(DEMO_STRESS_TEST_STUDENTS[0].id);
                    toast.success(
                      'Đã bật dữ liệu Kiểm thử (Học sinh tên dài & 4 khối lớp tiêu biểu)!'
                    );
                  } else {
                    setFocusedStudentId(students[0]?.id || '');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                  isDemoTestMode
                    ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Kiểm thử nghiệm thu với học sinh có họ tên dài (30+ ký tự) và nhiều cấp học"
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-700" />
                <span>
                  {isDemoTestMode ? 'Đang bật dữ liệu Kiểm thử mẫu' : 'Kiểm thử Tên dài & Đa cấp học'}
                </span>
              </button>

              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#007A75] border border-teal-200 text-[11px] font-bold">
                Quyền:{' '}
                {accessScope === 'ADMIN_KTDBCL'
                  ? 'Ban KT&ĐBCL / Quản trị'
                  : accessScope === 'CAMPUS_MANAGER'
                    ? 'Quản lý Cơ sở'
                    : 'Giáo viên Chủ nhiệm (GVCN)'}
              </span>
            </div>
          </div>

          {/* Hàng 1: Cơ sở • Năm học • Chủ đề năm học • Lớp chủ nhiệm • Hệ học & Màu sắc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Cơ sở */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>1. Cơ sở (Tự động theo quyền)</span>
              </label>
              <select
                value={selectedCampusId}
                disabled={accessScope === 'GVCN' && campuses.length <= 1}
                onChange={(e) => {
                  const newCampus = e.target.value;
                  setSelectedCampusId(newCampus);
                  fetchNameplateData({
                    yearId: selectedYearId,
                    campusId: newCampus,
                    classId: '',
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 disabled:opacity-75"
              >
                {accessScope !== 'GVCN' && (
                  <option value="ALL">Tất cả Cơ sở được phân quyền</option>
                )}
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.campusCode} – {c.campusName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Năm học hiện hành */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>2. Năm học hiện hành</span>
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => {
                  const newYear = e.target.value;
                  setSelectedYearId(newYear);
                  fetchNameplateData({
                    yearId: newYear,
                    campusId: selectedCampusId,
                    classId: '',
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    Năm học {ay.name} {ay.status === 'ACTIVE' ? '(Hiện hành)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Chủ đề năm học (Đồng bộ tự động từ Năm học SSM) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>3. Chủ đề năm học (SSM)</span>
              </label>
              <input
                type="text"
                value={config.backMotto}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    backMotto: e.target.value,
                  }))
                }
                placeholder="Vững nội lực - Hướng tương lai"
                className="w-full px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200 text-xs font-extrabold text-[#35186B] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                title="Chủ đề năm học tự động đồng bộ theo Năm học trên SSM (Hiển thị trên cả Mặt trước và Mặt sau bảng tên)"
              />
            </div>

            {/* 4. Lớp chủ nhiệm */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>4. Lớp chủ nhiệm</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const newCls = e.target.value;
                  setSelectedClassId(newCls);
                  setIsDemoTestMode(false);
                  fetchNameplateData({
                    yearId: selectedYearId,
                    campusId: selectedCampusId,
                    classId: newCls,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-purple-50/60 border border-purple-200 text-xs font-extrabold text-[#2E1065] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              >
                {classes.length === 0 ? (
                  <option value="">-- Chưa có lớp phân công --</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.className} ({cls.studentCount} HS •{' '}
                      {cls.campusCode || 'CS1'}
                      {cls.educationSystem ? ` • Hệ ${cls.educationSystem}` : ''})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 5. Hệ học & Quy tắc màu sắc */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>
                  5. Hệ học ({selectedClassMeta?.educationSystem || 'Global'}) &amp; Bảng màu
                </span>
              </label>
              <select
                value={config.colorThemeId}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    colorThemeId: e.target.value as NameplateColorThemeId,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              >
                {NAMEPLATE_COLOR_THEME_LIST.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hàng 2: Chọn 04 Nhóm Mẫu Thiết Kế theo Cấp Học (Mục 3) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5B21B6]" />
                <span>5. Chọn Mẫu Thiết Kế Bảng Tên Theo Cấp Học (04 Nhóm Mẫu Chuẩn Sky-Line)</span>
              </label>
              <span className="text-[11px] font-semibold text-purple-700">
                Đang chọn: <strong>{activeTemplateMeta.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {NAMEPLATE_TEMPLATE_LIST.map((tpl) => {
                const isSelected = config.templateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, templateId: tpl.id }))
                    }
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-50/90 border-[#5B21B6] ring-2 ring-[#5B21B6]/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-[#5B21B6] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tpl.gradeRangeLabel}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#5B21B6] shrink-0" />
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 mt-1">
                        {tpl.name}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {tpl.styleSummary}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-semibold text-slate-400 truncate">
                      Họa tiết: {tpl.motifs}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hàng 3: Tùy chọn Đồng phục minh họa, Phạm vi in và Chế độ kỹ thuật in */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Ảnh học sinh qua Cổng ảnh học sinh & Minh họa */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                <span>Ảnh Học Sinh (Cổng Ảnh HS) &amp; Minh Họa</span>
                <a
                  href="/admin/student-portal"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-extrabold text-[#5B21B6] hover:underline inline-flex items-center gap-0.5 normal-case"
                  title="Mở Cổng ảnh học sinh để quản lý hoặc tải ảnh hàng loạt"
                >
                  <span>Cổng ảnh HS</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <select
                value={config.illustrationMode}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    illustrationMode: e.target.value as CharacterIllustrationMode,
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs font-extrabold text-[#2E1065]"
              >
                <option value="STUDENT_PHOTO">
                  100% Ảnh Học sinh qua Cổng ảnh học sinh (Mặc định)
                </option>
                <option value="STUDENT_PHOTO_FALLBACK">
                  Ảnh Cổng ảnh HS (Tự động dự phòng minh họa nếu thiếu ảnh)
                </option>
                <option value="AUTO_GENDER">
                  Minh họa Học sinh đồng phục Sky-Line (Tự động Nam/Nữ)
                </option>
                <option value="GIRL">
                  Minh họa Nữ sinh Sky-Line (Áo Polo trắng cổ xanh/tím)
                </option>
                <option value="BOY">
                  Minh họa Nam sinh Sky-Line (Áo Polo trắng cổ xanh/tím)
                </option>
                <option value="CAMPUS_ONLY">
                  Mẫu Trung tính (Không ảnh/nhân vật – Kiến trúc Sky-Line)
                </option>
              </select>
            </div>

            {/* Chế độ chọn in */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Phạm vi xuất bản in
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintScopeMode('ALL')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    printScopeMode === 'ALL'
                      ? 'bg-[#2E1065] text-white border-[#2E1065]'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  In tất cả ({activeDataset.length} HS)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintScopeMode('SELECTED')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    printScopeMode === 'SELECTED'
                      ? 'bg-[#00A19A] text-white border-[#00A19A]'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  In đã chọn ({selectedIds.size} HS)
                </button>
              </div>
            </div>

            {/* Các công tắc kỹ thuật in */}
            <div className="flex flex-wrap items-center gap-3 pt-4 md:pt-5">
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.showCutLines}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      showCutLines: e.target.checked,
                    }))
                  }
                  className="rounded text-[#5B21B6]"
                />
                <span>Đường cắt &amp; gấp</span>
              </label>

              <label
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none"
                title="Khi gập đôi tờ giấy theo đường ngang giữa thành chữ A, mặt cảm ơn cần xoay 180 độ khi trải phẳng để đứng đúng chiều."
              >
                <input
                  type="checkbox"
                  checked={config.rotateBackSide180}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      rotateBackSide180: e.target.checked,
                    }))
                  }
                  className="rounded text-[#5B21B6]"
                />
                <span>Xoay 180° mặt sau (Gập chữ A)</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.ecoInkMode}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ecoInkMode: e.target.checked,
                    }))
                  }
                  className="rounded text-[#5B21B6]"
                />
                <span>Tiết kiệm mực</span>
              </label>
            </div>
          </div>
        </div>

        {/* BỐ CỤC 2 CỘT: B. DANH SÁCH HỌC SINH (TRÁI) & C. XEM TRƯỚC TRỰC QUAN (PHẢI) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* B. DANH SÁCH HỌC SINH (5 CỘT TRÊN MÀN HÌNH LỚN) */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
            {/* Input ẩn phục vụ tải ảnh trực tiếp lên Cổng ảnh học sinh */}
            <input
              ref={studentPhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleStudentPhotoFileChange}
            />

            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#5B21B6]" />
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    B. Danh Sách Học Sinh ({filteredStudents.length})
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200"
                    title="Số lượng học sinh trong lớp đã có ảnh chân dung trên Cổng ảnh học sinh"
                  >
                    Ảnh Cổng HS:{' '}
                    {activeDataset.filter((s) => s.hasPortalPhoto).length}/
                    {activeDataset.length}
                  </span>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Đã chọn in: {selectedIds.size}/{activeDataset.length}
                  </span>
                </div>
              </div>

              {/* Thanh tìm kiếm & Chọn tất cả */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm họ tên học sinh hoặc mã HS..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-purple-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
                >
                  Chọn tất cả
                </button>
              </div>
            </div>

            {/* Bảng danh sách: STT | Họ tên học sinh | Mã HS | Lớp | Trạng thái QR | Chọn in */}
            <div className="max-h-[620px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-[#5B21B6]" />
                  <span className="text-xs font-bold">
                    Đang đồng bộ danh sách học sinh từ SSM...
                  </span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-14 px-6 text-center space-y-2">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold text-slate-700">
                    Không tìm thấy học sinh trong lớp này
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bạn có thể chọn lớp khác hoặc bấm nút &ldquo;Kiểm thử Tên dài &amp; Đa cấp học&rdquo; ở phía trên để xem bản mẫu.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 pl-3 pr-1.5 text-center w-9">STT</th>
                      <th className="py-2.5 px-2">Họ tên học sinh</th>
                      <th className="py-2.5 px-2">Mã HS</th>
                      <th className="py-2.5 px-1.5 text-center">Lớp</th>
                      <th className="py-2.5 px-2 text-center">Trạng thái QR</th>
                      <th className="py-2.5 pl-1.5 pr-3 text-center">Chọn in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStudents.map((s, idx) => {
                      const isChecked = selectedIds.has(s.id);
                      const isFocused = previewStudent?.id === s.id;
                      const isBusy = updatingQrCode === s.studentCode;

                      return (
                        <tr
                          key={s.id}
                          onClick={() => setFocusedStudentId(s.id)}
                          className={`transition cursor-pointer ${
                            isFocused
                              ? 'bg-purple-50/90 font-bold'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 pl-3 pr-1.5 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2.5">
                              {/* Ảnh đại diện từ Cổng ảnh học sinh + nút bấm tải ảnh nhanh */}
                              <div
                                className="relative w-8 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerUploadPhoto(s);
                                }}
                                title="Bấm để tải lên hoặc thay đổi ảnh học sinh trên Cổng ảnh học sinh"
                              >
                                {s.hasPortalPhoto ? (
                                  <img
                                    src={
                                      s.photoUrl ||
                                      `/api/student-photos/${encodeURIComponent(s.id)}?code=${encodeURIComponent(s.studentCode)}`
                                    }
                                    alt={s.studentName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Camera className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5B21B6]" />
                                )}
                                {uploadingPhotoStudentId === s.id && (
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B21B6]" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 leading-snug">
                                  {s.studentName}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {s.hasPortalPhoto ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 rounded">
                                      Đã có ảnh Cổng HS
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTriggerUploadPhoto(s);
                                      }}
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded cursor-pointer"
                                    >
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>+ Tải ảnh Cổng HS</span>
                                    </button>
                                  )}
                                  {s.studentName.length >= 25 && (
                                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                                      Co chữ ({s.studentName.length} ký tự)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] font-bold text-[#35186B]">
                            {s.studentCode}
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {s.className}
                            </span>
                          </td>
                          <td
                            className="py-2.5 px-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              {s.qrStatus === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Sẵn sàng
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                  <Lock className="w-3 h-3" />
                                  Đã khóa
                                </span>
                              )}

                              {/* Nút Khóa/Mở QR & Đổi link QR */}
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleQrAction(s, 'toggleQrStatus')
                                }
                                title={
                                  s.qrStatus === 'ACTIVE'
                                    ? 'Tạm vô hiệu hóa mã QR của học sinh này'
                                    : 'Kích hoạt lại mã QR của học sinh này'
                                }
                                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                              >
                                {s.qrStatus === 'ACTIVE' ? (
                                  <Lock className="w-3 h-3" />
                                ) : (
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleQrAction(s, 'rotateQrToken')
                                }
                                title="Đổi liên kết bảo mật mới cho mã QR của học sinh này"
                                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-purple-700 transition cursor-pointer"
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${
                                    isBusy ? 'animate-spin' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                          <td
                            className="py-2.5 pl-1.5 pr-3 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectStudent(s.id);
                            }}
                          >
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-purple-100 text-[#5B21B6] cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#5B21B6]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Chân bảng danh sách: Bảo mật QR */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  QR chỉ chứa liên kết xác thực SSM, không lộ điểm số khi chưa đăng nhập.
                </span>
              </span>
            </div>
          </div>

          {/* C. KHU VỰC XEM TRƯỚC TRỰC QUAN (7 CỘT TRÊN MÀN HÌNH LỚN - Mục 6.C) */}
          <div
            ref={previewSectionRef}
            className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5"
          >
            {/* Thanh chuyển 4 chế độ Xem trước */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#5B21B6]" />
                  <span>C. Xem Trước Trực Quan &amp; Kiểm Tra Kỹ Thuật In</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đang xem mẫu của:{' '}
                  <strong className="text-[#35186B]">
                    {previewStudent?.studentName}
                  </strong>{' '}
                  ({previewStudent?.studentCode})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewMode('TENT_3D')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    previewMode === 'TENT_3D'
                      ? 'bg-white text-[#35186B] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1. Phối cảnh 3D &amp; Thiết kế phẳng
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('FACES')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    previewMode === 'FACES'
                      ? 'bg-white text-[#35186B] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2. Mặt trước &amp; Mặt sau lớn
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('A4_SHEET')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    previewMode === 'A4_SHEET'
                      ? 'bg-white text-[#35186B] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3. Tờ A4 (02 bảng)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('INSPECT_SPECS')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    previewMode === 'INSPECT_SPECS'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Ruler className="w-3 h-3" />
                  <span>4. Kiểm tra lề in</span>
                </button>
              </div>
            </div>

            {/* NỘI DUNG XEM TRƯỚC THEO CHẾ ĐỘ */}
            {previewMode === 'FACES' && previewStudent && (
              <div className="space-y-6 bg-slate-50/80 rounded-2xl p-4 sm:p-6 border border-slate-200/70 overflow-x-auto">
                {/* MẶT TRƯỚC (21 × 7 cm) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#35186B] uppercase tracking-wider">
                      MẶT TRƯỚC – THÔNG TIN HỌC SINH (21 × 7 cm / 210 × 70 mm)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {activeTemplateMeta.gradeRangeLabel} • {activeColorMeta.systemLabel}
                    </span>
                  </div>
                  <div className="w-full overflow-x-auto flex justify-center py-2">
                    <div
                      className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white shrink-0"
                      style={{
                        width: '630px',
                        height: '210px',
                      }}
                    >
                      <div
                        style={{
                          transform: 'scale(0.7937)',
                          transformOrigin: 'top left',
                          width: '210mm',
                          height: '70mm',
                        }}
                      >
                        <NameplateFrontFace
                          student={previewStudent}
                          config={config}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* MẶT SAU (21 × 7 cm) */}
                <div className="space-y-2 pt-2 border-t border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#35186B] uppercase tracking-wider">
                      MẶT SAU – LỜI CẢM ƠN QUÝ PHỤ HUYNH (21 × 7 cm / 210 × 70 mm)
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Khi in trên tờ A4 sẽ tự động xoay 180° để gập chữ A đứng thuận chiều
                    </span>
                  </div>
                  <div className="w-full overflow-x-auto flex justify-center py-2">
                    <div
                      className="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white shrink-0"
                      style={{
                        width: '630px',
                        height: '210px',
                      }}
                    >
                      <div
                        style={{
                          transform: 'scale(0.7937)',
                          transformOrigin: 'top left',
                          width: '210mm',
                          height: '70mm',
                        }}
                      >
                        <NameplateBackFace config={config} student={previewStudent} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {previewMode === 'TENT_3D' && previewStudent && (
              <Nameplate3DTentPreview
                student={previewStudent}
                config={config}
              />
            )}

            {(previewMode === 'A4_SHEET' || previewMode === 'INSPECT_SPECS') && (
              <div className="space-y-4">
                {/* Thanh điều hướng phân trang A4 */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span>
                      Khổ A4 đứng (210 × 297 mm) • 02 bảng tên / trang • Lề trên &amp; dưới: 8.5 mm (tổng 17 mm)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safeA4PageIndex <= 0}
                      onClick={() =>
                        setCurrentA4Page((p) => Math.max(0, p - 1))
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-extrabold text-[#35186B] px-2">
                      Trang A4 {safeA4PageIndex + 1} / {a4Pairs.length}
                    </span>
                    <button
                      type="button"
                      disabled={safeA4PageIndex >= a4Pairs.length - 1}
                      onClick={() =>
                        setCurrentA4Page((p) =>
                          Math.min(a4Pairs.length - 1, p + 1)
                        )
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Khung hiển thị tờ A4 thu phóng vừa màn hình */}
                <div className="bg-slate-200/80 rounded-2xl p-4 sm:p-6 flex justify-center overflow-x-auto border border-slate-300/80">
                  <div
                    className="shadow-2xl bg-white shrink-0"
                    style={{
                      width: '540px',
                      height: '764px',
                    }}
                  >
                    <div
                      style={{
                        transform: 'scale(0.68)',
                        transformOrigin: 'top left',
                        width: '210mm',
                        height: '297mm',
                      }}
                    >
                      {a4Pairs[safeA4PageIndex] && (
                        <NameplateA4Sheet
                          pair={a4Pairs[safeA4PageIndex]}
                          config={config}
                          pageIndex={safeA4PageIndex}
                          totalPages={a4Pairs.length}
                          inspectMode={previewMode === 'INSPECT_SPECS'}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tóm tắt thông số kỹ thuật chuẩn in ấn (Mục 2) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Khổ giấy chuẩn
                </div>
                <div className="text-xs font-black text-slate-800 mt-0.5">
                  A4 Đứng (210 × 297 mm)
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Trải phẳng / Gập chữ A
                </div>
                <div className="text-xs font-black text-slate-800 mt-0.5">
                  210×140 mm / 210×70 mm
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Số lượng / Trang A4
                </div>
                <div className="text-xs font-black text-[#5B21B6] mt-0.5">
                  02 Bảng tên (Lề 17 mm)
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Tổng số trang cần in
                </div>
                <div className="text-xs font-black text-emerald-700 mt-0.5">
                  {a4Pairs.length} trang A4 ({studentsToPrint.length} HS)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VÙNG DÀN TRANG A4 HÀNG LOẠT PHỤC VỤ IN TRỰC TIẾP & XUẤT PDF */}
      <div
        id="nameplate-batch-print-root"
        ref={printBatchContainerRef}
        className="fixed -left-[9999px] top-0 w-[210mm] opacity-0 pointer-events-none print:static print:opacity-100 print:pointer-events-auto print:block"
      >
        {a4Pairs.map((pair, idx) => (
          <NameplateA4Sheet
            key={`a4-sheet-${idx}-${pair[0]?.id || idx}`}
            pair={pair}
            config={config}
            pageIndex={idx}
            totalPages={a4Pairs.length}
            inspectMode={false}
          />
        ))}
      </div>
    </>
  );
}
