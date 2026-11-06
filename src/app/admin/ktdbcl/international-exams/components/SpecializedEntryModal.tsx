'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Shield,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  EXAM_FAMILY_META,
  EXAM_TYPE_META,
  ExamFamilyCode,
  ExamTypeCode,
  calculateOfficialIeltsOverall,
  classifyCheckpoint50Score,
  classifyKetScale,
  classifyPetScale,
  classifyYleShieldGroup,
  formatYleResultCode,
  parseYleResultCode,
  suggestPearsonBandReference,
} from '@/lib/intl-exams/ruleEngine';
import {
  SaveExamResultInput,
  getStudentsByClassForIntlExamAction,
  saveIntlExamResultAction,
  searchStudentsForIntlExamAction,
} from '../actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingRecord?: any | null;
  preselectedStudent?: any | null;
  defaultExamFamily?: ExamFamilyCode;
  defaultAcademicYear?: string;
  ssmCampuses?: Array<{ id: string; campusCode: string; campusName: string }>;
  ssmClasses?: Array<{
    id: string;
    classCode: string;
    className: string;
    grade: string;
    campusId: string;
    campusCode: string;
    campusName: string;
    academicYearName: string;
    educationSystem: string;
    studentCount?: number;
  }>;
  onSaved: () => void;
}

export default function SpecializedEntryModal({
  isOpen,
  onClose,
  editingRecord,
  preselectedStudent,
  defaultExamFamily = 'CAMBRIDGE_YLE',
  defaultAcademicYear = '2026-2027',
  ssmCampuses = [],
  ssmClasses = [],
  onSaved,
}: Props) {
  const [examFamily, setExamFamily] = useState<ExamFamilyCode>(defaultExamFamily);
  const [examType, setExamType] = useState<ExamTypeCode>('STARTERS');
  const [academicYearText, setAcademicYearText] = useState('2026-2027');
  const [semesterCode, setSemesterCode] = useState<'HK1' | 'HK2' | 'SUMMER'>('HK1');
  const [examMonth, setExamMonth] = useState<string>('10');
  const [examDate, setExamDate] = useState('');
  const [sittingStatus, setSittingStatus] = useState<'COMPLETED' | 'ABSENT'>('COMPLETED');
  const [isHistoricalOverallOnly, setIsHistoricalOverallOnly] = useState(false);

  // Student info (Strictly auto-populated from SSM)
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentDob, setStudentDob] = useState('');
  const [campusCode, setCampusCode] = useState('');
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [eduSystem, setEduSystem] = useState('');

  // SSM Directory cascade selector (Campus -> Class -> Student)
  const [pickerCampusCode, setPickerCampusCode] = useState<string>('ALL');
  const [pickerClassId, setPickerClassId] = useState<string>('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);

  // Student search autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1. YLE Fields
  const [yleRw, setYleRw] = useState<number>(5);
  const [yleListening, setYleListening] = useState<number>(5);
  const [yleSpeaking, setYleSpeaking] = useState<number>(5);
  const [yleQuickCode, setYleQuickCode] = useState('RW5-L5-S5');
  const [yleTotalOnly, setYleTotalOnly] = useState<number>(15);

  // 2. KET / PET Fields
  const [camReading, setCamReading] = useState<string>('135');
  const [camWriting, setCamWriting] = useState<string>('135');
  const [camListening, setCamListening] = useState<string>('140');
  const [camSpeaking, setCamSpeaking] = useState<string>('142');
  const [camOverallScale, setCamOverallScale] = useState<string>('138');
  const [camRawStatement, setCamRawStatement] = useState<string>('');

  // 3. IELTS Fields
  const [ieltsListening, setIeltsListening] = useState<string>('7.0');
  const [ieltsReading, setIeltsReading] = useState<string>('7.0');
  const [ieltsWriting, setIeltsWriting] = useState<string>('6.0');
  const [ieltsSpeaking, setIeltsSpeaking] = useState<string>('6.5');
  const [ieltsOverallBand, setIeltsOverallBand] = useState<string>('6.5');

  // 4. Pearson Edexcel Fields (Math, Science, English)
  const [pearsonMathScore, setPearsonMathScore] = useState<string>('52');
  const [pearsonMathBand, setPearsonMathBand] = useState<string>('P3');
  const [pearsonSciScore, setPearsonSciScore] = useState<string>('46');
  const [pearsonSciBand, setPearsonSciBand] = useState<string>('P2');
  const [pearsonEngScore, setPearsonEngScore] = useState<string>('');
  const [pearsonEngBand, setPearsonEngBand] = useState<string>('');

  // 5. Cambridge Checkpoint Fields (ESL, Math, Science)
  const [chkScaleType, setChkScaleType] = useState<'CHECKPOINT_50' | 'CHECKPOINT_6'>('CHECKPOINT_50');
  const [chkEslScore, setChkEslScore] = useState<string>('38');
  const [chkEslBand, setChkEslBand] = useState<string>('HIGH');
  const [chkMathScore, setChkMathScore] = useState<string>('44');
  const [chkMathBand, setChkMathBand] = useState<string>('OUTSTANDING');
  const [chkSciScore, setChkSciScore] = useState<string>('36');
  const [chkSciBand, setChkSciBand] = useState<string>('HIGH');

  // Certificate fields
  const [certificateNumber, setCertificateNumber] = useState('');
  const [candidateNumber, setCandidateNumber] = useState('');
  const [centerNumber, setCenterNumber] = useState('');
  const [certificateStatus, setCertificateStatus] = useState('RECEIVED_AT_SCHOOL');
  const [certificateFileUrl, setCertificateFileUrl] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [autoNotifyStakeholders, setAutoNotifyStakeholders] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (editingRecord) {
      setExamFamily(editingRecord.examFamily);
      setExamType(editingRecord.examType);
      setAcademicYearText(editingRecord.academicYearText || '2026-2027');
      setSemesterCode(editingRecord.semesterCode || 'HK1');
      setExamMonth(editingRecord.examMonth ? String(editingRecord.examMonth) : '10');
      setExamDate(editingRecord.examDate ? editingRecord.examDate.slice(0, 10) : '');
      setSittingStatus(editingRecord.sittingStatus || 'COMPLETED');
      setIsHistoricalOverallOnly(editingRecord.dataCompleteness === 'HISTORICAL_OVERALL_ONLY');
      setStudentId(editingRecord.studentId || null);
      setStudentCode(editingRecord.studentCodeSnapshot || '');
      setStudentName(editingRecord.studentNameSnapshot || '');
      setStudentDob(editingRecord.studentDobSnapshot ? editingRecord.studentDobSnapshot.slice(0, 10) : '');
      setCampusCode(editingRecord.campusCodeSnapshot || 'CS1');
      setGrade(editingRecord.gradeSnapshot || '');
      setClassName(editingRecord.classNameSnapshot || '');
      setEduSystem(editingRecord.eduSystemSnapshot || 'Hội nhập');

      const skills = editingRecord.skillResults || [];
      if (editingRecord.examFamily === 'CAMBRIDGE_YLE') {
        const rw = skills.find((s: any) => s.componentCode === 'RW')?.numericScore ?? 5;
        const l = skills.find((s: any) => s.componentCode === 'LISTENING')?.numericScore ?? 5;
        const s = skills.find((s: any) => s.componentCode === 'SPEAKING')?.numericScore ?? 5;
        setYleRw(rw);
        setYleListening(l);
        setYleSpeaking(s);
        setYleQuickCode(editingRecord.yleResultCode || formatYleResultCode(rw, l, s));
        setYleTotalOnly(editingRecord.yleTotalShields ?? 15);
      } else if (editingRecord.examFamily === 'CAMBRIDGE_MAIN') {
        setCamReading(String(skills.find((s: any) => s.componentCode === 'READING')?.numericScore ?? ''));
        setCamWriting(String(skills.find((s: any) => s.componentCode === 'WRITING')?.numericScore ?? ''));
        setCamListening(String(skills.find((s: any) => s.componentCode === 'LISTENING')?.numericScore ?? ''));
        setCamSpeaking(String(skills.find((s: any) => s.componentCode === 'SPEAKING')?.numericScore ?? ''));
        setCamOverallScale(String(editingRecord.camOverallScale ?? ''));
        setCamRawStatement(editingRecord.camOfficialStatement || '');
      } else if (editingRecord.examFamily === 'IELTS') {
        setIeltsListening(String(skills.find((s: any) => s.componentCode === 'LISTENING')?.numericScore ?? ''));
        setIeltsReading(String(skills.find((s: any) => s.componentCode === 'READING')?.numericScore ?? ''));
        setIeltsWriting(String(skills.find((s: any) => s.componentCode === 'WRITING')?.numericScore ?? ''));
        setIeltsSpeaking(String(skills.find((s: any) => s.componentCode === 'SPEAKING')?.numericScore ?? ''));
        setIeltsOverallBand(String(editingRecord.ieltsOverallBand ?? ''));
      } else if (editingRecord.examFamily === 'PEARSON_EDEXCEL') {
        const m = skills.find((s: any) => s.componentCode === 'MATH');
        const sc = skills.find((s: any) => s.componentCode === 'SCIENCE');
        const en = skills.find((s: any) => s.componentCode === 'ENGLISH');
        setPearsonMathScore(m?.numericScore !== undefined ? String(m.numericScore) : '');
        setPearsonMathBand(m?.officialBandCode || '');
        setPearsonSciScore(sc?.numericScore !== undefined ? String(sc.numericScore) : '');
        setPearsonSciBand(sc?.officialBandCode || '');
        setPearsonEngScore(en?.numericScore !== undefined ? String(en.numericScore) : '');
        setPearsonEngBand(en?.officialBandCode || '');
      } else if (editingRecord.examFamily === 'CAMBRIDGE_CHECKPOINT') {
        const esl = skills.find((s: any) => s.componentCode === 'ESL');
        const m = skills.find((s: any) => s.componentCode === 'MATH');
        const sc = skills.find((s: any) => s.componentCode === 'SCIENCE');
        setChkEslScore(esl?.numericScore !== undefined ? String(esl.numericScore) : '');
        setChkEslBand(esl?.officialBandCode || 'HIGH');
        setChkMathScore(m?.numericScore !== undefined ? String(m.numericScore) : '');
        setChkMathBand(m?.officialBandCode || 'HIGH');
        setChkSciScore(sc?.numericScore !== undefined ? String(sc.numericScore) : '');
        setChkSciBand(sc?.officialBandCode || 'HIGH');
      }

      setCertificateNumber(editingRecord.certificate?.certificateNumber || '');
      setCandidateNumber(editingRecord.certificate?.candidateNumber || '');
      setCenterNumber(editingRecord.certificate?.centerNumber || '');
      setCertificateStatus(editingRecord.certificate?.certificateStatus || 'RECEIVED_AT_SCHOOL');
      setCertificateFileUrl(editingRecord.certificate?.fileUrl || '');
      setIssueDate(editingRecord.certificate?.issueDate ? editingRecord.certificate.issueDate.slice(0, 10) : '');
      setRemarks(editingRecord.remarks || '');
    } else if (preselectedStudent) {
      setExamFamily(defaultExamFamily);
      const defaultTypes = EXAM_FAMILY_META[defaultExamFamily].examTypes;
      setExamType(defaultTypes[0]);
      const studentYear = preselectedStudent.academicYearName || defaultAcademicYear || '2026-2027';
      setAcademicYearText(studentYear);
      setStudentId(preselectedStudent.id);
      setStudentCode(preselectedStudent.studentCode || '');
      setStudentName(preselectedStudent.studentName || '');
      setStudentDob(preselectedStudent.dateOfBirth ? preselectedStudent.dateOfBirth.slice(0, 10) : '');
      setCampusCode(preselectedStudent.campusCode || '');
      setGrade(preselectedStudent.grade || '');
      setClassName(preselectedStudent.className || '');
      setEduSystem(preselectedStudent.eduSystem || 'Hội nhập');
      setPickerCampusCode(preselectedStudent.campusCode || 'ALL');
      setPickerClassId(preselectedStudent.classId || '');
      if (preselectedStudent.classId) {
        getStudentsByClassForIntlExamAction(preselectedStudent.classId)
          .then((list) => setClassStudents(list))
          .catch(() => setClassStudents([]));
      } else {
        setClassStudents([]);
      }
      setIsHistoricalOverallOnly(false);
    } else {
      setExamFamily(defaultExamFamily);
      const defaultTypes = EXAM_FAMILY_META[defaultExamFamily].examTypes;
      setExamType(defaultTypes[0]);
      setAcademicYearText(
        defaultAcademicYear && defaultAcademicYear !== 'ALL' ? defaultAcademicYear : '2026-2027'
      );
      setStudentId(null);
      setStudentCode('');
      setStudentName('');
      setStudentDob('');
      setCampusCode('');
      setGrade('');
      setClassName('');
      setEduSystem('');
      setPickerCampusCode('ALL');
      setPickerClassId('');
      setClassStudents([]);
      setIsHistoricalOverallOnly(false);
    }
  }, [isOpen, editingRecord, preselectedStudent, defaultExamFamily, defaultAcademicYear]);

  const handleClassPickerChange = async (nextClassId: string) => {
    setPickerClassId(nextClassId);
    if (!nextClassId) {
      setClassStudents([]);
      return;
    }
    setLoadingClassStudents(true);
    try {
      const list = await getStudentsByClassForIntlExamAction(nextClassId);
      setClassStudents(list);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const handleAcademicYearChange = async (nextYear: string) => {
    setAcademicYearText(nextYear);
    if (pickerClassId) {
      const currentCls = ssmClasses.find((cl) => cl.id === pickerClassId);
      if (currentCls && currentCls.academicYearName !== nextYear) {
        const matchingClsInNewYear = ssmClasses.find(
          (cl) =>
            cl.academicYearName === nextYear &&
            cl.campusCode === currentCls.campusCode &&
            cl.className === currentCls.className
        );
        if (matchingClsInNewYear) {
          setPickerClassId(matchingClsInNewYear.id);
          setLoadingClassStudents(true);
          try {
            const list = await getStudentsByClassForIntlExamAction(matchingClsInNewYear.id);
            setClassStudents(list);
            const sameStudent = studentCode
              ? list.find((s: any) => s.studentCode === studentCode)
              : null;
            if (sameStudent) {
              selectStudentFromDirectory(sameStudent);
            } else {
              setStudentId(null);
              setStudentCode('');
              setStudentName('');
              setStudentDob('');
              setClassName('');
              setGrade('');
            }
          } finally {
            setLoadingClassStudents(false);
          }
        } else {
          setPickerClassId('');
          setClassStudents([]);
          setStudentId(null);
          setStudentCode('');
          setStudentName('');
          setStudentDob('');
          setClassName('');
          setGrade('');
        }
      }
    }
  };

  // Handle family switch
  const handleFamilyChange = (fam: ExamFamilyCode) => {
    setExamFamily(fam);
    const defaultType = EXAM_FAMILY_META[fam].examTypes[0];
    setExamType(defaultType);
  };

  // Student search handler
  const handleSearchStudent = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const list = await searchStudentsForIntlExamAction(q, academicYearText);
      setSearchResults(list);
    } finally {
      setIsSearching(false);
    }
  };

  const selectStudentFromDirectory = (st: any) => {
    setStudentId(st.id);
    setStudentCode(st.studentCode || '');
    setStudentName(st.studentName || '');
    setClassName(st.className || '');
    setGrade(st.grade || '');
    setCampusCode(st.campusCode || '');
    setEduSystem(st.eduSystem || '');
    if (st.academicYearName) setAcademicYearText(st.academicYearName);
    if (st.campusCode) setPickerCampusCode(st.campusCode);
    if (st.classId && st.classId !== pickerClassId) {
      handleClassPickerChange(st.classId);
    }
    if (st.dateOfBirth) setStudentDob(st.dateOfBirth);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  // Live computed previews
  const yleComputedTotal = isHistoricalOverallOnly
    ? yleTotalOnly
    : yleRw + yleListening + yleSpeaking;
  const yleComputedCode = isHistoricalOverallOnly
    ? null
    : formatYleResultCode(yleRw, yleListening, yleSpeaking);
  const yleComputedGroup = classifyYleShieldGroup(yleComputedTotal);

  const camSuggestedAvg =
    !isHistoricalOverallOnly &&
    camReading !== '' &&
    camWriting !== '' &&
    camListening !== '' &&
    camSpeaking !== ''
      ? Math.round(
          (Number(camReading) + Number(camWriting) + Number(camListening) + Number(camSpeaking)) / 4
        )
      : null;
  const camActiveOverall = Number(camOverallScale) || camSuggestedAvg || 130;
  const camLiveRule =
    examType === 'PET' ? classifyPetScale(camActiveOverall) : classifyKetScale(camActiveOverall);

  const ieltsSuggestedBand =
    !isHistoricalOverallOnly &&
    ieltsListening !== '' &&
    ieltsReading !== '' &&
    ieltsWriting !== '' &&
    ieltsSpeaking !== ''
      ? calculateOfficialIeltsOverall(
          Number(ieltsListening),
          Number(ieltsReading),
          Number(ieltsWriting),
          Number(ieltsSpeaking)
        )
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !studentName.trim()) {
      setErrorMsg(
        'Vui lòng chọn Học sinh từ hệ thống SSM (chọn theo Cơ sở -> Lớp hoặc tìm kiếm Mã HS / Họ tên). Hệ thống không tự động thêm mới học sinh ngoài SSM.'
      );
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload: SaveExamResultInput = {
        id: editingRecord?.id,
        examFamily,
        examType,
        academicYearText,
        semesterCode,
        examMonth: examMonth ? Number(examMonth) : null,
        examDate: examDate || null,
        studentId,
        studentCode: studentCode || null,
        studentName,
        studentDob: studentDob || null,
        campusCode,
        grade,
        className,
        eduSystem,
        sittingStatus,
        isHistoricalOverallOnly,
        yleRw,
        yleListening,
        yleSpeaking,
        yleTotalOnly,
        camReading: camReading !== '' ? Number(camReading) : null,
        camWriting: camWriting !== '' ? Number(camWriting) : null,
        camListening: camListening !== '' ? Number(camListening) : null,
        camSpeaking: camSpeaking !== '' ? Number(camSpeaking) : null,
        camOverallScale: camOverallScale !== '' ? Number(camOverallScale) : camSuggestedAvg,
        camRawStatement: camRawStatement || null,
        ieltsListening: ieltsListening !== '' ? Number(ieltsListening) : null,
        ieltsReading: ieltsReading !== '' ? Number(ieltsReading) : null,
        ieltsWriting: ieltsWriting !== '' ? Number(ieltsWriting) : null,
        ieltsSpeaking: ieltsSpeaking !== '' ? Number(ieltsSpeaking) : null,
        ieltsOverallBand:
          ieltsOverallBand !== '' ? Number(ieltsOverallBand) : ieltsSuggestedBand,
        subjectScores:
          examFamily === 'PEARSON_EDEXCEL'
            ? [
                {
                  componentCode: 'MATH',
                  componentName: 'Mathematics',
                  numericScore: pearsonMathScore !== '' ? Number(pearsonMathScore) : null,
                  officialBandCode: pearsonMathBand || null,
                },
                {
                  componentCode: 'SCIENCE',
                  componentName: 'Science',
                  numericScore: pearsonSciScore !== '' ? Number(pearsonSciScore) : null,
                  officialBandCode: pearsonSciBand || null,
                },
                {
                  componentCode: 'ENGLISH',
                  componentName: 'English',
                  numericScore: pearsonEngScore !== '' ? Number(pearsonEngScore) : null,
                  officialBandCode: pearsonEngBand || null,
                },
              ]
            : examFamily === 'CAMBRIDGE_CHECKPOINT'
            ? [
                {
                  componentCode: 'ESL',
                  componentName: 'English as a Second Language (ESL)',
                  numericScore: chkEslScore !== '' ? Number(chkEslScore) : null,
                  officialBandCode: chkEslBand || null,
                  scaleType: chkScaleType,
                },
                {
                  componentCode: 'MATH',
                  componentName: 'Mathematics',
                  numericScore: chkMathScore !== '' ? Number(chkMathScore) : null,
                  officialBandCode: chkMathBand || null,
                  scaleType: chkScaleType,
                },
                {
                  componentCode: 'SCIENCE',
                  componentName: 'Science',
                  numericScore: chkSciScore !== '' ? Number(chkSciScore) : null,
                  officialBandCode: chkSciBand || null,
                  scaleType: chkScaleType,
                },
              ]
            : undefined,
        certificateNumber: certificateNumber || null,
        candidateNumber: candidateNumber || null,
        centerNumber: centerNumber || null,
        certificateStatus,
        certificateFileUrl: certificateFileUrl || null,
        issueDate: issueDate || null,
        remarks: remarks || null,
        autoNotifyStakeholders,
      };

      await saveIntlExamResultAction(payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu kết quả thi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
              Biểu mẫu Nhập Kết quả & Chứng chỉ Chuyên biệt
            </span>
            <h2 className="text-lg font-black text-slate-900">
              {editingRecord ? 'Cập nhật Kết quả Kỳ thi Quốc tế' : 'Nhập Kết quả Kỳ thi Quốc tế Mới'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Chọn Nhóm Kỳ thi & Bài thi */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Bước 1: Chọn Tổ chức Khảo thí & Bài thi Chính thức
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {(Object.keys(EXAM_FAMILY_META) as ExamFamilyCode[]).map((fam) => {
                const meta = EXAM_FAMILY_META[fam];
                const active = examFamily === fam;
                return (
                  <button
                    type="button"
                    key={fam}
                    onClick={() => handleFamilyChange(fam)}
                    className={`p-3 rounded-xl border text-left transition ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] font-semibold opacity-75">{meta.organization}</div>
                    <div className="text-xs font-black mt-0.5">{meta.shortLabel}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cấp độ / Bài thi cụ thể
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as ExamTypeCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  {EXAM_FAMILY_META[examFamily].examTypes.map((t) => (
                    <option key={t} value={t}>
                      {EXAM_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Năm học</label>
                <select
                  value={academicYearText}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2022-2023">2022-2023</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kỳ học</label>
                <select
                  value={semesterCode}
                  onChange={(e) => setSemesterCode(e.target.value as 'HK1' | 'HK2' | 'SUMMER')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="HK1">Học kỳ I</option>
                  <option value="HK2">Học kỳ II</option>
                  <option value="SUMMER">Học kỳ Hè</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tháng thi</label>
                <select
                  value={examMonth}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setExamMonth(e.target.value);
                    if (m >= 8 && m <= 12) setSemesterCode('HK1');
                    else if (m >= 1 && m <= 5) setSemesterCode('HK2');
                    else if (m === 6 || m === 7) setSemesterCode('SUMMER');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={String(m)}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày thi</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => {
                    setExamDate(e.target.value);
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        const m = d.getMonth() + 1;
                        setExamMonth(String(m));
                        if (m >= 8 && m <= 12) setSemesterCode('HK1');
                        else if (m >= 1 && m <= 5) setSemesterCode('HK2');
                        else setSemesterCode('SUMMER');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Trạng thái dự thi
                </label>
                <select
                  value={sittingStatus}
                  onChange={(e) => setSittingStatus(e.target.value as 'COMPLETED' | 'ABSENT')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                  <option value="ABSENT">Vắng thi (ABSENT)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Thông tin Học sinh & Liên thông Hồ sơ SSM */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Bước 2: Chọn Học sinh từ Dữ liệu Gốc SSM (Tự động điền Họ tên, Mã HS, Cơ sở, Lớp)
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chỉ ghi nhận học sinh có trong hệ thống SSM • Không tự động thêm mới học sinh ngoài SSM
                </p>
              </div>
              {studentId ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                  <UserCheck className="w-3.5 h-3.5" />
                  Đã chọn từ SSM: {studentName} ({studentCode})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                  Chưa chọn học sinh SSM
                </span>
              )}
            </div>

            {/* Cách 1: Chọn theo Cơ sở -> Lớp -> Học sinh trong SSM */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  1. Lọc theo Cơ sở SSM
                </label>
                <select
                  value={pickerCampusCode}
                  onChange={(e) => {
                    setPickerCampusCode(e.target.value);
                    setPickerClassId('');
                    setClassStudents([]);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="ALL">-- Tất cả Cơ sở SSM --</option>
                  {ssmCampuses.map((c) => (
                    <option key={c.id} value={c.campusCode}>
                      {c.campusCode} - {c.campusName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  2. Chọn Lớp học SSM ({academicYearText})
                </label>
                <select
                  value={pickerClassId}
                  onChange={(e) => handleClassPickerChange(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="">-- Chọn Lớp năm {academicYearText} --</option>
                  {ssmClasses
                    .filter(
                      (cl) =>
                        (!academicYearText ||
                          academicYearText === 'ALL' ||
                          cl.academicYearName === academicYearText) &&
                        (pickerCampusCode === 'ALL' || cl.campusCode === pickerCampusCode)
                    )
                    .map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        Lớp {cl.className} ({cl.campusCode} • {cl.academicYearName}
                        {typeof cl.studentCount === 'number' ? ` • ${cl.studentCount} HS` : ''})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  3. Chọn Học sinh trong Lớp ({classStudents.length})
                </label>
                <select
                  value={studentId || ''}
                  disabled={!pickerClassId || loadingClassStudents}
                  onChange={(e) => {
                    const found = classStudents.find((s) => s.id === e.target.value);
                    if (found) selectStudentFromDirectory(found);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg border border-teal-400 text-xs font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {loadingClassStudents
                      ? 'Đang tải danh sách lớp...'
                      : pickerClassId
                      ? '-- Chọn Học sinh trong lớp --'
                      : '-- Chọn Lớp trước --'}
                  </option>
                  {classStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.studentName} ({st.studentCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cách 2: Tìm kiếm nhanh theo Tên hoặc Mã HS trong SSM */}
            <div className="relative">
              <div className="flex items-center border border-teal-300 rounded-xl bg-teal-50/30 px-3 py-2">
                <Search className="w-4 h-4 text-teal-600 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchStudent(e.target.value)}
                  placeholder="Hoặc gõ tìm nhanh Họ và tên / Mã HS trong SSM để tự động lấy Mã HS, Cơ sở, Lớp..."
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => selectStudentFromDirectory(st)}
                      className="w-full px-4 py-2.5 text-left hover:bg-teal-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900">{st.studentName}</span>
                        <span className="ml-2 text-slate-500 font-mono">({st.studentCode})</span>
                      </div>
                      <div className="text-[11px] font-semibold text-teal-700">
                        Lớp {st.className} • {st.campusCode} ({st.academicYearName || academicYearText})
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Các trường Thông tin Học sinh tự động lấy từ SSM (Read-only) */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Họ và tên Học sinh * <span className="text-[10px] text-teal-700">(Tự động từ SSM)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  required
                  value={studentName}
                  placeholder="Chọn học sinh từ SSM ở trên..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-900 text-xs font-extrabold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mã HS <span className="text-[10px] text-teal-700">(Tự động SSM)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={studentCode}
                  placeholder="Tự động lấy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-xs font-mono font-bold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cơ sở <span className="text-[10px] text-teal-700">(Tự động SSM)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={campusCode}
                  placeholder="Tự động lấy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-xs font-bold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Lớp <span className="text-[10px] text-teal-700">(Tự động SSM)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={className}
                  placeholder="Tự động lấy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-xs font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* 3. BIỂU MẪU ĐIỂM CHUYÊN BIỆT THEO TỪNG KỲ THI */}
          {sittingStatus === 'COMPLETED' && (
            <div className="bg-white rounded-2xl p-5 border-2 border-teal-600/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                    Bước 3: Cấu trúc Điểm & Quy chuẩn Đánh giá Chính thức
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    {EXAM_FAMILY_META[examFamily].label}
                  </h3>
                </div>
                {(examFamily === 'CAMBRIDGE_YLE' ||
                  examFamily === 'CAMBRIDGE_MAIN' ||
                  examFamily === 'IELTS') && (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHistoricalOverallOnly}
                      onChange={(e) => setIsHistoricalOverallOnly(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>Chế độ dữ liệu lịch sử (Chỉ có Điểm tổng / Overall)</span>
                  </label>
                )}
              </div>

              {/* A. FORM STARTERS / MOVERS / FLYERS */}
              {examFamily === 'CAMBRIDGE_YLE' && (
                <div className="space-y-4">
                  {!isHistoricalOverallOnly ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[
                          { label: 'Reading & Writing (0–5 khiên)', val: yleRw, setter: setYleRw },
                          { label: 'Listening (0–5 khiên)', val: yleListening, setter: setYleListening },
                          { label: 'Speaking (0–5 khiên)', val: yleSpeaking, setter: setYleSpeaking },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                          >
                            <label className="block text-xs font-extrabold text-slate-700 mb-2">
                              {item.label}
                            </label>
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2, 3, 4, 5].map((num) => (
                                <button
                                  type="button"
                                  key={num}
                                  onClick={() => item.setter(num)}
                                  className={`w-8 h-8 rounded-lg text-xs font-black transition ${
                                    item.val === num
                                      ? 'bg-teal-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
                          <label className="block text-xs font-extrabold text-teal-900 mb-1">
                            Nhập nhanh Mã kết quả
                          </label>
                          <input
                            type="text"
                            value={yleQuickCode}
                            onChange={(e) => {
                              setYleQuickCode(e.target.value);
                              const parsed = parseYleResultCode(e.target.value);
                              if (parsed) {
                                setYleRw(parsed.rw);
                                setYleListening(parsed.listening);
                                setYleSpeaking(parsed.speaking);
                              }
                            }}
                            placeholder="RW4-L5-S5"
                            className="w-full px-3 py-1.5 rounded-lg border border-teal-300 text-xs font-mono font-bold bg-white"
                          />
                          <div className="text-[11px] text-teal-700 mt-1.5">
                            Tự động tạo: <strong>{yleComputedCode}</strong>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="max-w-xs">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tổng số khiên lịch sử (0–15 khiên)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={yleTotalOnly}
                        onChange={(e) => setYleTotalOnly(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black"
                      />
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-emerald-900">Tổng khiên tự động tính: </span>
                      <span className="text-base font-black text-emerald-700 ml-1">
                        {yleComputedTotal} / 15 khiên
                      </span>
                      {yleComputedCode && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-white border border-emerald-300 font-mono font-bold text-emerald-900">
                          {yleComputedCode}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-emerald-800">
                      Nhóm quản trị Sky-Line: <span className="underline">{yleComputedGroup}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* B. FORM KET / PET */}
              {examFamily === 'CAMBRIDGE_MAIN' && (
                <div className="space-y-4">
                  {!isHistoricalOverallOnly && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: '1. Reading (Scale)', val: camReading, setter: setCamReading },
                        { label: '2. Writing (Scale)', val: camWriting, setter: setCamWriting },
                        { label: '3. Listening (Scale)', val: camListening, setter: setCamListening },
                        { label: '4. Speaking (Scale)', val: camSpeaking, setter: setCamSpeaking },
                      ].map((sk) => (
                        <div key={sk.label}>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {sk.label}
                          </label>
                          <input
                            type="number"
                            min={80}
                            max={170}
                            value={sk.val}
                            onChange={(e) => sk.setter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-extrabold text-blue-900 mb-1">
                        5. Overall Cambridge Scale Chính thức *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={80}
                          max={170}
                          required
                          value={camOverallScale}
                          onChange={(e) => setCamOverallScale(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-blue-400 text-sm font-black text-blue-900"
                        />
                        {camSuggestedAvg !== null && (
                          <button
                            type="button"
                            onClick={() => setCamOverallScale(String(camSuggestedAvg))}
                            className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 text-[11px] font-bold shrink-0"
                          >
                            Gợi ý TB: {camSuggestedAvg}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="text-[11px] font-bold text-blue-700">
                        6. Kết quả phân loại (Tự động quy chiếu)
                      </div>
                      <div className="text-sm font-black text-blue-950 mt-0.5">
                        {camLiveRule.statement} ({camLiveRule.gradeCode})
                      </div>
                      <div className="text-[11px] text-blue-700 mt-0.5">
                        {camLiveRule.awardedCertificate
                          ? 'Đủ điều kiện cấp chứng chỉ'
                          : 'Dưới dải cấp chứng chỉ (Không ép thành Grade C)'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
                      <div className="text-[11px] font-bold text-teal-800">7. CEFR Level</div>
                      <div className="text-lg font-black text-teal-800 mt-0.5">
                        {camLiveRule.cefr}
                      </div>
                      <div className="text-[11px] text-teal-800">
                        Quy chuẩn: {examType === 'KET' ? 'KET 2020 (120–150)' : 'PET 2020 (140–170)'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* C. FORM IELTS */}
              {examFamily === 'IELTS' && (
                <div className="space-y-4">
                  {!isHistoricalOverallOnly && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Listening (Band 0–9)', val: ieltsListening, setter: setIeltsListening },
                        { label: 'Reading (Band 0–9)', val: ieltsReading, setter: setIeltsReading },
                        { label: 'Writing (Band 0–9)', val: ieltsWriting, setter: setIeltsWriting },
                        { label: 'Speaking (Band 0–9)', val: ieltsSpeaking, setter: setIeltsSpeaking },
                      ].map((sk) => (
                        <div key={sk.label}>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {sk.label}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={9}
                            value={sk.val}
                            onChange={(e) => sk.setter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-rose-900 mb-1">
                        Overall Band trên TRF Chính thức (0.0–9.0, bước 0.5) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          max={9}
                          required
                          value={ieltsOverallBand}
                          onChange={(e) => setIeltsOverallBand(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border-2 border-rose-400 text-sm font-black text-rose-900"
                        />
                        {ieltsSuggestedBand !== null && (
                          <button
                            type="button"
                            onClick={() => setIeltsOverallBand(String(ieltsSuggestedBand))}
                            className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold shrink-0"
                          >
                            Gợi ý chuẩn IELTS: {ieltsSuggestedBand.toFixed(1)}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center">
                      <div>
                        <div className="font-extrabold">Quy tắc làm tròn IELTS chính thức:</div>
                        <div className="text-[11px] mt-0.5">
                          Trung bình 4 kỹ năng lẻ .25 làm tròn lên .5; lẻ .75 làm tròn lên 1.0. Hệ thống ưu tiên lưu Overall trên bảng điểm TRF chính thức.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* D. FORM PEARSON EDEXCEL */}
              {examFamily === 'PEARSON_EDEXCEL' && (
                <div className="space-y-3">
                  <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl border border-teal-200">
                    Lưu điểm chính thức và mức đánh giá gốc (<strong>P1, P2, P3</strong> cho iPrimary; <strong>S1, S2, S3, S4</strong> cho iLowerSecondary) riêng từng môn học. Học sinh chỉ dự thi 1 môn có thể để trống môn còn lại.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        title: '1. Mathematics (Toán Quốc tế)',
                        score: pearsonMathScore,
                        setScore: setPearsonMathScore,
                        band: pearsonMathBand,
                        setBand: setPearsonMathBand,
                      },
                      {
                        title: '2. Science (Khoa học Quốc tế)',
                        score: pearsonSciScore,
                        setScore: setPearsonSciScore,
                        band: pearsonSciBand,
                        setBand: setPearsonSciBand,
                      },
                      {
                        title: '3. English (Tùy chọn mở rộng)',
                        score: pearsonEngScore,
                        setScore: setPearsonEngScore,
                        band: pearsonEngBand,
                        setBand: setPearsonEngBand,
                      },
                    ].map((sub) => (
                      <div
                        key={sub.title}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                      >
                        <div className="text-xs font-extrabold text-slate-800">{sub.title}</div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">
                            Điểm chính thức
                          </label>
                          <input
                            type="number"
                            value={sub.score}
                            onChange={(e) => {
                              sub.setScore(e.target.value);
                              if (e.target.value !== '' && !sub.band) {
                                sub.setBand(
                                  suggestPearsonBandReference(
                                    Number(e.target.value),
                                    examType as 'IPRIMARY' | 'ILOWERSECONDARY'
                                  )
                                );
                              }
                            }}
                            placeholder="Để trống nếu không thi"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">
                            Mức đánh giá gốc trên bảng điểm
                          </label>
                          <select
                            value={sub.band}
                            onChange={(e) => sub.setBand(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                          >
                            <option value="">-- Chọn mức --</option>
                            {examType === 'IPRIMARY' ? (
                              <>
                                <option value="P3">P3 (Highest Achievement)</option>
                                <option value="P2">P2 (Expected Standard)</option>
                                <option value="P1">P1 (Developing Standard)</option>
                                <option value="BELOW_P1">Unclassified (Dưới P1)</option>
                              </>
                            ) : (
                              <>
                                <option value="S4">S4 (Exceptional)</option>
                                <option value="S3">S3 (High)</option>
                                <option value="S2">S2 (Expected)</option>
                                <option value="S1">S1 (Developing)</option>
                                <option value="BELOW_S1">Unclassified (Dưới S1)</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* E. FORM CAMBRIDGE CHECKPOINT */}
              {examFamily === 'CAMBRIDGE_CHECKPOINT' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <span>
                      Quy chuẩn Checkpoint (0–50): 0 Unclassified • 1–10 Basic • 11–20 Aspiring • 21–30 Good • 31–40 High • 41–50 Outstanding.
                    </span>
                    <select
                      value={chkScaleType}
                      onChange={(e) => setChkScaleType(e.target.value as any)}
                      className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-bold"
                    >
                      <option value="CHECKPOINT_50">Thang chuẩn 0–50 (Hiện hành)</option>
                      <option value="CHECKPOINT_6">Thang lịch sử 0.0–6.0 (Cũ)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        title: '1. English as a Second Language (ESL)',
                        score: chkEslScore,
                        setScore: setChkEslScore,
                        band: chkEslBand,
                        setBand: setChkEslBand,
                      },
                      {
                        title: '2. Mathematics (Toán Quốc tế)',
                        score: chkMathScore,
                        setScore: setChkMathScore,
                        band: chkMathBand,
                        setBand: setChkMathBand,
                      },
                      {
                        title: '3. Science (Khoa học Quốc tế)',
                        score: chkSciScore,
                        setScore: setChkSciScore,
                        band: chkSciBand,
                        setBand: setChkSciBand,
                      },
                    ].map((sub) => (
                      <div
                        key={sub.title}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                      >
                        <div className="text-xs font-extrabold text-slate-800">{sub.title}</div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">
                            Điểm môn ({chkScaleType === 'CHECKPOINT_50' ? '0–50' : '0.0–6.0'})
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={chkScaleType === 'CHECKPOINT_50' ? 50 : 6}
                            step={chkScaleType === 'CHECKPOINT_50' ? 1 : 0.1}
                            value={sub.score}
                            onChange={(e) => {
                              sub.setScore(e.target.value);
                              if (e.target.value !== '' && chkScaleType === 'CHECKPOINT_50') {
                                const c = classifyCheckpoint50Score(Number(e.target.value));
                                sub.setBand(c.bandCode);
                              }
                            }}
                            placeholder="Để trống nếu không thi"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">
                            Performance Band (Tự động / Chỉnh sửa)
                          </label>
                          <select
                            value={sub.band}
                            onChange={(e) => sub.setBand(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                          >
                            <option value="OUTSTANDING">Outstanding (41–50)</option>
                            <option value="HIGH">High (31–40)</option>
                            <option value="GOOD">Good (21–30)</option>
                            <option value="ASPIRING">Aspiring (11–20)</option>
                            <option value="BASIC">Basic (1–10)</option>
                            <option value="UNCLASSIFIED">Unclassified (0)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Lưu Minh chứng Chứng chỉ */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Bước 4: Quản lý Hồ sơ Chứng chỉ & Minh chứng (Statement of Results / TRF)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Số hiệu Chứng chỉ / TRF Number
                </label>
                <input
                  type="text"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="VD: C1234567 / TRF..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Trạng thái Chứng chỉ
                </label>
                <select
                  value={certificateStatus}
                  onChange={(e) => setCertificateStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="PENDING">Đang chờ chứng chỉ gốc (PENDING)</option>
                  <option value="RECEIVED_AT_SCHOOL">Đã về trường (RECEIVED_AT_SCHOOL)</option>
                  <option value="ISSUED_TO_STUDENT">Đã bàn giao Học sinh (ISSUED_TO_STUDENT)</option>
                  <option value="DIGITAL_VERIFIED">Đã xác thực bản số (DIGITAL_VERIFIED)</option>
                  <option value="NOT_AWARDED">Không cấp chứng chỉ (NOT_AWARDED)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ngày cấp chứng chỉ
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Link file Scan Chứng chỉ (PDF/Ảnh)
                </label>
                <input
                  type="text"
                  value={certificateFileUrl}
                  onChange={(e) => setCertificateFileUrl(e.target.value)}
                  placeholder="https://... hoặc /uploads/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Ghi chú Chuyên môn / Đối soát
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Ghi chú thêm (nếu có)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50/80 border border-teal-200 cursor-pointer">
              <input
                type="checkbox"
                checked={autoNotifyStakeholders}
                onChange={(e) => setAutoNotifyStakeholders(e.target.checked)}
                className="mt-0.5 rounded text-teal-600"
              />
              <div className="text-xs">
                <div className="font-extrabold text-teal-900">
                  Tự động gửi Thông báo & Đồng bộ 3 Chiều tới: Tài khoản GVCN Lớp • Giao diện Phụ huynh • Cổng Học sinh
                </div>
                <div className="text-[11px] text-teal-700 mt-0.5">
                  Khi lưu kết quả đạt chứng chỉ, hệ thống tự động thông báo cho GVCN lớp ({className || 'SSM'}), gửi tin chúc mừng tới Tài khoản Phụ huynh và hiển thị Huy hiệu Vinh danh trên Cổng Học sinh.
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : editingRecord ? 'Lưu Cập Nhật Kết Quả' : 'Lưu Kết Quả Kỳ Thi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
