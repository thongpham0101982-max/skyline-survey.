// @ts-nocheck
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  ArrowLeft, Check, CheckCheck, CheckCircle2, ChevronRight, Save, Send, Plus, 
  Trash2, Layers, Calendar, Users, Building2, BookOpen, Clock, 
  Tag, Award, Sparkles, AlertCircle, Info, Shield, Compass, Leaf, User, GraduationCap,
  Mail, AtSign, MessageSquare, Eye, EyeOff, CheckSquare, Square, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  ACTIVITY_STRANDS, SKYLINE_ACTIVITY_TYPES, ACTIVITY_SCALES,
  CRITERIA_LIBRARY, DEFAULT_1_CRITERION, DEFAULT_3_CRITERIA,
  DEFAULT_5_CRITERIA, DEFAULT_THRESHOLDS, EVAL_LEVELS,
  ACTIVITY_PRESETS, ActivityPreset
} from '@/lib/experiential/constants';


// Standard Sky-Line classes generator for 100% reliable UI fallback
const generateStandardSkylineClasses = (camps = []) => {
  const defaultCampuses = camps && camps.length > 0 ? camps : [
    { id: 'cs1', campusCode: 'CS1', campusName: 'Sky-Line Riverside (CS1)' },
    { id: 'cs2', campusCode: 'CS2', campusName: 'Sky-Line Central (CS2)' },
    { id: 'cs3', campusCode: 'CS3', campusName: 'Sky-Line International (CS3)' },
    { id: 'cs4', campusCode: 'CS4', campusName: 'Sky-Line Beach-D (CS4)' },
    { id: 'cs5', campusCode: 'CS5', campusName: 'Sky-Line Hill (CS5)' },
  ];

  const gradesConfig = [
    { grade: '1', level: 'Tieu hoc', classes: ['1/1', '1/2', '1/3'] },
    { grade: '2', level: 'Tieu hoc', classes: ['2/1', '2/2', '2/3'] },
    { grade: '3', level: 'Tieu hoc', classes: ['3/1', '3/2', '3/3'] },
    { grade: '4', level: 'Tieu hoc', classes: ['4/1', '4/2', '4/3'] },
    { grade: '5', level: 'Tieu hoc', classes: ['5/1', '5/2', '5/3'] },
    { grade: '6', level: 'THCS', classes: ['6/1', '6/2', '6/3'] },
    { grade: '7', level: 'THCS', classes: ['7/1', '7/2', '7/3'] },
    { grade: '8', level: 'THCS', classes: ['8/1', '8/2', '8/3'] },
    { grade: '9', level: 'THCS', classes: ['9/1', '9/2', '9/3'] },
    { grade: '10', level: 'THPT', classes: ['10/1', '10/2'] },
    { grade: '11', level: 'THPT', classes: ['11/1', '11/2'] },
    { grade: '12', level: 'THPT', classes: ['12/1', '12/2'] },
    { grade: 'Mầm', level: 'MAM_NON', classes: ['Mầm 1', 'Mầm 2'] },
    { grade: 'Chồi', level: 'MAM_NON', classes: ['Chồi 1', 'Chồi 2'] },
    { grade: 'Lá', level: 'MAM_NON', classes: ['Lá 1', 'Lá 2'] },
  ];

  const result = [];
  defaultCampuses.forEach(cp => {
    gradesConfig.forEach(gc => {
      gc.classes.forEach(clsName => {
        const fullClassName = `${clsName}_${cp.campusCode}`;
        const id = `gen_${cp.campusCode}_${gc.grade}_${clsName}`.replace(/[/\s]/g, '_');
        result.push({
          id,
          classCode: id,
          className: fullClassName,
          grade: gc.grade,
          level: gc.level,
          campusId: cp.id,
          campusCode: cp.campusCode,
          campus: cp,
          homeroomTeacher: { id: 'gvcn', teacherName: 'GVCN ' + fullClassName, email: '' },
          teachingAssignments: []
        });
      });
    });
  });
  return result;
};


// Strict helper: ONLY return GVBM who strictly belongs to the selected TCM or teaches the selected Subject
const findMatchedGVBM = (cls, form) => {
  if (!cls) return null;
  const assignments = cls.teachingAssignments || [];
  const targetDeptId = form.departmentId || '';
  const targetDeptName = (form.departmentName || '').toLowerCase().trim();
  const targetSubId = form.subjectId || '';
  const targetSubName = (form.subjectName || '').toLowerCase().trim();

  // If no TCM or Subject is selected, this is a general homeroom activity
  if (!targetDeptId && !targetDeptName && !targetSubId && !targetSubName) {
    return null;
  }

  const normalize = (str = '') => str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();

  // CASE 1: TCM (Tổ Chuyên Môn / Department) is selected
  if (targetDeptId || (targetDeptName && !targetSubId)) {
    const normDept = normalize(targetDeptName);

    const matchByTCM = assignments.find(ta => {
      const t = ta.teacher;
      if (!t) return false;

      // Check teacher's direct department
      if (targetDeptId && t.departmentId === targetDeptId) return true;
      if (targetDeptId && t.departmentRel && t.departmentRel.id === targetDeptId) return true;

      // Check teacher's department name
      if (normDept && t.departmentRel && t.departmentRel.name) {
        const tDept = normalize(t.departmentRel.name);
        if (tDept === normDept || tDept.includes(normDept) || normDept.includes(tDept)) return true;
      }

      // Check teacher's department assignments (kiêm nhiệm)
      if (Array.isArray(t.departmentAssignments)) {
        return t.departmentAssignments.some(da => {
          if (targetDeptId && (da.departmentId === targetDeptId || da.department?.id === targetDeptId)) return true;
          if (normDept && da.department?.name) {
            const daDept = normalize(da.department.name);
            return daDept === normDept || daDept.includes(normDept) || normDept.includes(daDept);
          }
          return false;
        });
      }

      return false;
    });

    if (matchByTCM && matchByTCM.teacher && matchByTCM.teacher.teacherName) {
      return matchByTCM.teacher;
    }

    // STRICT: If no teacher teaching this class belongs to the selected TCM, return null
    return null;
  }

  // CASE 2: Subject (Bộ Môn / Môn Học) is selected
  if (targetSubId || targetSubName) {
    const normSub = normalize(targetSubName);

    const matchBySubject = assignments.find(ta => {
      if (targetSubId && (ta.subjectId === targetSubId || ta.subject?.id === targetSubId)) return true;
      if (normSub && ta.subject) {
        const sName = normalize(ta.subject.subjectName || '');
        const sCode = normalize(ta.subject.subjectCode || '');
        if (sName === normSub || (sName && (sName.includes(normSub) || normSub.includes(sName)))) return true;
        if (sCode && sCode === normSub) return true;
      }
      return false;
    });

    if (matchBySubject && matchBySubject.teacher && matchBySubject.teacher.teacherName) {
      return matchBySubject.teacher;
    }

    // STRICT: If no teacher teaches this subject for this class, return null
    return null;
  }

  return null;
};
export default function CreateActivityWizard() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const basePath = pathname.startsWith("/admin") ? "/admin/experiential-activities" : "/teacher/experiential-activities";
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId') || searchParams.get('id') || '';
  const isEditMode = !!editId;

  // Wizard Step (1 to 4)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // System master data
  const [academicYears, setAcademicYears] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Step 1: Info & Classification
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    academicYearId: '',
    campusId: '',
    campusCode: '',
    campusName: '',
    selectedCampusIds: [],
    educationLevel: 'PHO_THONG',
    grades: ['1'],
    departmentId: '',
    departmentName: '',
    subjectId: '',
    subjectName: '',
    date: new Date().toISOString().split('T')[0],
    timeRange: '08:00 - 11:30',
    location: '',
    description: '',
    objectives: '',
    evidenceUrls: [''],
    strand: 'BAN_THAN',
    activityTypeId: 'SU_KIEN',
    activityTypeName: 'Sự kiện / Lễ hội',
    scale: 'KHOI',
    deadline: ''
  });

  // Step 4: Email Notification & Sender Settings
  const [emailSettings, setEmailSettings] = useState({
    sendEmail: true,
    senderOption: 'CTHS', // 'CTHS' | 'KTDBCL' | 'BGH' | 'TCM' | 'CUSTOM'
    senderName: 'Tổ CTHS - Ban HĐNGLL',
    senderEmail: 'bankhaothi@skylineschool.edu.vn',
    replyTo: '',
    customMessage: 'Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp.',
    includeGdcs: true,
    gdcsEmails: [] as string[]
  });
  const [customGdcsInput, setCustomGdcsInput] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Vui lòng nhập địa chỉ email hợp lệ để nhận thử nghiệm');
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch('/api/experiential-activities/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail,
          activityName: formData.name || 'Hoạt động trải nghiệm mẫu',
          activityCode: formData.code || 'HDTN-TEST',
          strand: formData.strand,
          activityTypeName: formData.activityTypeName,
          subjectName: formData.subjectName,
          date: formData.date,
          timeRange: formData.timeRange,
          location: formData.location,
          deadline: formData.deadline,
          senderName: getResolvedSenderName(),
          senderEmail: emailSettings.senderEmail,
          replyTo: emailSettings.replyTo,
          customMessage: emailSettings.customMessage,
          assignedClasses
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Đã gửi email thử nghiệm thành công tới ${testEmail}`);
      } else {
        toast.error(data.error || 'Lỗi khi gửi email thử nghiệm');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSendingTest(false);
    }
  };

  // Step 2: Evaluation Settings
  const [evalMode, setEvalMode] = useState('CRITERIA'); // 'PARTICIPATION_ONLY' | 'CRITERIA'
  const [criteria, setCriteria] = useState(DEFAULT_3_CRITERIA);
  const [formulaType, setFormulaType] = useState('EQUAL_WEIGHT'); // 'EQUAL_WEIGHT' | 'WEIGHTED'
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [mandatoryRules, setMandatoryRules] = useState([]);
  const [criteriaPreset, setCriteriaPreset] = useState('3'); // '1' | '3' | '5' | 'custom'
  const [showPresets, setShowPresets] = useState(true);

  const handleApplyPreset = (preset: ActivityPreset) => {
    const typeObj = SKYLINE_ACTIVITY_TYPES.find(t => t.id === preset.activityTypeId);
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      strand: preset.strand,
      activityTypeId: preset.activityTypeId,
      activityTypeName: typeObj ? typeObj.name : 'Hoạt động Trải nghiệm',
      scale: preset.scale,
      description: preset.description,
      objectives: preset.objectives
    }));
    setEvalMode(preset.evalMode);
    setCriteria(preset.criteria);
    setFormulaType(preset.formulaType === 'CUSTOM_WEIGHT' ? 'WEIGHTED' : 'EQUAL_WEIGHT');
    setThresholds(preset.thresholds);
    setCriteriaPreset(String(preset.criteria.length));
    toast.success(`Đã áp dụng mẫu kế hoạch: "${preset.name}"!`);
  };


  // Helper to extract grade name accurately (e.g. 1, 2, ..., 12, Mầm, Chồi, Lá)
  const getClassGrade = (cls) => {
    if (!cls) return '';
    let g = String(cls.grade || '').trim().replace(/^Khối\s*/i, '').replace(/^K/i, '');
    if (g && g !== 'null' && g !== 'undefined') return g;
    const name = String(cls.className || '').trim();
    const numMatch = name.match(/^(\d{1,2})/);
    if (numMatch) return numMatch[1];
    if (/mầm|mam/i.test(name)) return 'Mầm';
    if (/chồi|choi/i.test(name)) return 'Chồi';
    if (/lá|la/i.test(name)) return 'Lá';
    if (/nhà trẻ|nhatre/i.test(name)) return 'Nhà trẻ';
    return name.split(/[\._\-\s]/)[0] || '1';
  };

  // Helper to check if class matches selected education level
  const isClassMatchLevel = (cls, level) => {
    if (!level || level === 'TOAN_TRUONG') return true;
    const g = getClassGrade(cls);
    const numG = parseInt(g);
    const l = (cls.level || '').toLowerCase();
    const cName = (cls.className || '').toLowerCase();

    if (level === 'MAM_NON') {
      return ['mầm', 'chồi', 'lá', 'nhà trẻ', 'mam', 'choi', 'la', 'nhatre'].includes(g.toLowerCase()) || 
             l.includes('mam') || l.includes('mầm') || cName.includes('mầm') || cName.includes('chồi') || cName.includes('lá');
    }
    if (level === 'PHO_THONG') {
      if (!isNaN(numG) && numG >= 1 && numG <= 12) return true;
      return !l.includes('mam') && !l.includes('mầm') && !['mầm', 'chồi', 'lá', 'nhà trẻ', 'mam', 'choi', 'la', 'nhatre'].includes(g.toLowerCase());
    }
    if (level === 'Tieu hoc') {
      return (!isNaN(numG) && numG >= 1 && numG <= 5) || l.includes('tieu') || l.includes('tiểu') || /^[1-5][\._]/.test(cls.className || '');
    }
    if (level === 'THCS') {
      return (!isNaN(numG) && numG >= 6 && numG <= 9) || l.includes('thcs') || /^[6-9][\._]/.test(cls.className || '');
    }
    if (level === 'THPT') {
      return (!isNaN(numG) && numG >= 10 && numG <= 12) || l.includes('thpt') || /^1[0-2][\._]/.test(cls.className || '');
    }
    return true;
  };

  // Step 3: Class Assignment
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [selectedFilterGrades, setSelectedFilterGrades] = useState<any[]>([]);

  // Load existing activity if in Edit mode
  useEffect(() => {
    if (editId) {
      fetch(`/api/experiential-activities/${editId}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.canManage === false) {
            toast.error('Bạn không có quyền chỉnh sửa kế hoạch hoạt động được giao từ cấp trên');
            router.push(`${basePath}/${editId}`);
            return;
          }
          if (data && !data.error) {
            setFormData({
              code: data.code || '',
              name: data.name || '',
              academicYearId: data.academicYearId || '',
              campusId: data.campusId || '',
              campusCode: data.campusCode || '',
              campusName: data.campusName || '',
              selectedCampusIds: data.selectedCampusIds || (data.campusId ? [data.campusId] : []),
              educationLevel: data.educationLevel || 'PHO_THONG',
              grades: Array.isArray(data.grades) ? data.grades : (data.grades ? [data.grades] : ['1']),
              subjectId: data.subjectId || '',
              subjectName: data.subjectName || '',
              date: data.date || new Date().toISOString().split('T')[0],
              timeRange: data.timeRange || '08:00 - 11:30',
              location: data.location || '',
              description: data.description || '',
              objectives: data.objectives || '',
              evidenceUrls: data.evidenceUrls || [''],
              strand: data.strand || 'BAN_THAN',
              activityTypeId: data.activityTypeId || 'SU_KIEN',
              activityTypeName: data.activityTypeName || 'Sự kiện / Lễ hội',
              scale: data.scale || 'KHOI',
              deadline: data.deadline || ''
            });

            if (data.evalMode) setEvalMode(data.evalMode);
            if (Array.isArray(data.criteria) && data.criteria.length > 0) {
              setCriteria(data.criteria);
              if (data.criteria.length === 1) setCriteriaPreset('1');
              else if (data.criteria.length === 3) setCriteriaPreset('3');
              else if (data.criteria.length === 5) setCriteriaPreset('5');
              else setCriteriaPreset('custom');
            }
            if (data.formulaType) setFormulaType(data.formulaType);
            if (data.thresholds) setThresholds(data.thresholds);
            if (data.mandatoryRules) setMandatoryRules(data.mandatoryRules);
            if (Array.isArray(data.assignedClasses)) setAssignedClasses(data.assignedClasses);
            if (data.emailSettings) {
              setEmailSettings(prev => ({
                ...prev,
                ...data.emailSettings
              }));
            }
          }
        })
        .catch(console.error);
    }
  }, [editId]);

  // Load Years, Campuses & Classes
  useEffect(() => {
    Promise.all([
      fetch('/api/academic-years').then(r => r.json()).catch(() => []),
      fetch('/api/campuses').then(r => r.json()).catch(() => []),
      fetch('/api/subjects').then(r => r.json()).catch(() => []),
      fetch('/api/departments').then(r => r.json()).catch(() => [])
    ]).then(([years, camps, subs, depts]) => {
      if (Array.isArray(subs)) setSubjects(subs);
      if (Array.isArray(depts)) setDepartments(depts);
      if (Array.isArray(years) && years.length > 0) {
        setAcademicYears(years);
        if (!editId) {
          const active = years.find(y => y.status === 'ACTIVE' && !y.isOff) || years[0];
          setFormData(prev => ({ ...prev, academicYearId: active?.id || '' }));
        }
      }
      if (Array.isArray(camps) && camps.length > 0) {
        setCampuses(camps);
        if (!editId) {
          const allCampIds = camps.map(c => c.id);
          setFormData(prev => ({
            ...prev,
            campusId: camps[0].id,
            campusCode: camps[0].campusCode,
            campusName: camps[0].campusName,
            selectedCampusIds: allCampIds
          }));
        }
      }
    });
  }, [editId]);

  // Fetch classes when year or campus changes with guaranteed standard fallback
  useEffect(() => {
    let url = '/api/classes';
    if (formData.academicYearId) {
      url += `?academicYearId=${formData.academicYearId}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setClasses(data);
        } else {
          fetch('/api/classes')
            .then(r2 => r2.json())
            .then(allData => {
              if (Array.isArray(allData) && allData.length > 0) {
                setClasses(allData);
              } else {
                setClasses(generateStandardSkylineClasses(campuses));
              }
            })
            .catch(() => {
              setClasses(generateStandardSkylineClasses(campuses));
            });
        }
      })
      .catch(() => {
        setClasses(generateStandardSkylineClasses(campuses));
      });
  }, [formData.academicYearId, campuses]);

  // Helper to resolve display sender name
  const getResolvedSenderName = () => {
    if (emailSettings.senderOption === 'CUSTOM') return emailSettings.senderName || 'Ban Tổ Chức';
    if (emailSettings.senderOption === 'KTDBCL') return 'Ban Khảo thí & Đảm bảo Chất lượng';
    if (emailSettings.senderOption === 'BGH') return 'Ban Giám hiệu Nhà trường';
    if (emailSettings.senderOption === 'TCM') {
      if (formData.departmentName) return `Tổ Chuyên môn ${formData.departmentName}`;
      if (formData.subjectName) return `Tổ Bộ môn ${formData.subjectName}`;
      return 'Tổ Chuyên môn';
    }
    return 'Tổ CTHS - Ban HĐNGLL';
  };

  // Preset switch
  const handleSelectCriteriaPreset = (preset) => {
    setCriteriaPreset(preset);
    if (preset === '1') {
      setCriteria(DEFAULT_1_CRITERION);
      setFormulaType('EQUAL_WEIGHT');
    } else if (preset === '3') {
      setCriteria(DEFAULT_3_CRITERIA);
      setFormulaType('EQUAL_WEIGHT');
    } else if (preset === '5') {
      setCriteria(DEFAULT_5_CRITERIA);
      setFormulaType('EQUAL_WEIGHT');
    }
  };

  const handleAddCriterionFromLib = (item) => {
    if (criteria.some(c => c.id === item.id || c.name === item.name)) {
      toast.error('Tiêu chí này đã có trong danh sách');
      return;
    }
    const newCrit = {
      ...item,
      id: 'CRIT_' + Date.now().toString().slice(-4),
      order: criteria.length + 1
    };
    setCriteria(prev => [...prev, newCrit]);
    setCriteriaPreset('custom');
    toast.success(`Đã thêm tiêu chí: ${item.name}`);
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length <= 1) {
      toast.error('Hoạt động cần có ít nhất 1 tiêu chí đánh giá');
      return;
    }
    setCriteria(prev => prev.filter(c => c.id !== id));
    setCriteriaPreset('custom');
  };

  const handleUpdateCriterion = (id, field, value) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setCriteriaPreset('custom');
  };

  // Toggle class selection in Step 3
  const handleToggleClass = (cls) => {
    const exists = assignedClasses.some(c => c.classId === cls.id);
    if (exists) {
      setAssignedClasses(prev => prev.filter(c => c.classId !== cls.id));
    } else {
      const campusObj = campuses.find(cp => cp.id === cls.campusId) || { campusCode: 'CS', campusName: 'Sky-Line' };
      const teacherObj = (cls.teachers || []).find(t => t.roleInClass === 'GVCN') || {};
      const matchedTeacher = findMatchedGVBM(cls, formData);
      const newClassItem = {
        classId: cls.id,
        className: cls.className,
        campusId: cls.campusId,
        campusCode: campusObj.campusCode || '',
        campusName: campusObj.campusName || '',
        grade: cls.grade || '',
        level: cls.level || '',
        homeroomTeacherId: teacherObj.teacherId || cls.homeroomTeacherId || '',
        homeroomTeacherName: teacherObj.teacher?.teacherName || cls.homeroomTeacher?.teacherName || 'GVCN',
        subjectTeacherId: matchedTeacher ? matchedTeacher.id : '',
        subjectTeacherName: matchedTeacher ? matchedTeacher.teacherName : '',
        totalStudents: cls._count?.students || (cls.students ? cls.students.length : 30),
        evaluatedStudents: 0,
        status: 'DRAFT'
      };
      setAssignedClasses(prev => [...prev, newClassItem]);
    }
  };

  const handleSelectAllClassesInGrade = (gradeClasses) => {
    const allSelected = gradeClasses.every(cls => assignedClasses.some(c => c.classId === cls.id));
    if (allSelected) {
      const gradeClassIds = new Set(gradeClasses.map(c => c.id));
      setAssignedClasses(prev => prev.filter(c => !gradeClassIds.has(c.classId)));
    } else {
      const newItems = [];
      gradeClasses.forEach(cls => {
        if (!assignedClasses.some(c => c.classId === cls.id)) {
          const campusObj = campuses.find(cp => cp.id === cls.campusId) || { campusCode: 'CS', campusName: 'Sky-Line' };
          const teacherObj = (cls.teachers || []).find(t => t.roleInClass === 'GVCN') || {};
          const matchedTeacher = findMatchedGVBM(cls, formData);
          newItems.push({
            classId: cls.id,
            className: cls.className,
            campusId: cls.campusId,
            campusCode: campusObj.campusCode || '',
            campusName: campusObj.campusName || '',
            grade: cls.grade || '',
            level: cls.level || '',
            homeroomTeacherId: teacherObj.teacherId || cls.homeroomTeacherId || '',
            homeroomTeacherName: teacherObj.teacher?.teacherName || cls.homeroomTeacher?.teacherName || 'GVCN',
            subjectTeacherId: matchedTeacher ? matchedTeacher.id : '',
            subjectTeacherName: matchedTeacher ? matchedTeacher.teacherName : '',
            totalStudents: cls._count?.students || (cls.students ? cls.students.length : 30),
            evaluatedStudents: 0,
            status: 'DRAFT'
          });
        }
      });
      setAssignedClasses(prev => [...prev, ...newItems]);
    }
  };

  // Submit handler
  const handleSubmit = async (isDraft = false) => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập Tên hoạt động');
      setCurrentStep(1);
      return;
    }
    if (assignedClasses.length === 0) {
      toast.error('Vui lòng gán ít nhất một lớp tham gia');
      setCurrentStep(3);
      return;
    }

    if (evalMode === 'CRITERIA' && formulaType === 'WEIGHTED') {
      const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        toast.error(`Tổng trọng số các tiêu chí phải bằng 100% (Hiện tại: ${totalWeight}%)`);
        setCurrentStep(2);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const resolvedSender = getResolvedSenderName();
      const payload = {
        ...formData,
        evalMode,
        criteria: evalMode === 'CRITERIA' ? criteria : [],
        formulaType,
        thresholds,
        mandatoryRules,
        status: isDraft ? 'DRAFT' : 'ASSIGNED',
        assignedClasses,
        emailSettings: {
          sendEmail: emailSettings.sendEmail,
          senderOption: emailSettings.senderOption,
          senderName: resolvedSender,
          senderEmail: emailSettings.senderEmail,
          replyTo: emailSettings.replyTo,
          customMessage: emailSettings.customMessage,
          includeGdcs: emailSettings.includeGdcs,
          gdcsEmails: emailSettings.gdcsEmails
        }
      };

      const url = isEditMode ? `/api/experiential-activities/${editId}` : '/api/experiential-activities';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(isEditMode ? 'Đã cập nhật kế hoạch hoạt động thành công!' : (isDraft ? 'Đã lưu nháp hoạt động thành công!' : 'Đã giao hoạt động và gửi thông báo thành công cho GVCN & GĐCS!'));
        router.push(basePath);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Lỗi khi lưu kế hoạch hoạt động');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-sky-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* TOP HEADER */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(basePath)}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-black text-slate-700 hover:text-[#003B3A] transition-all flex items-center gap-2 shadow-2xs"
            title="Quay về trang Quản lý Hoạt động trải nghiệm"
          >
            <ArrowLeft className="w-4 h-4 text-[#00A99D]" />
            <span>← Quay về Quản lý Hoạt động</span>
          </button>
          <div className="text-xs font-black text-slate-500 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            {isEditMode ? 'Hiệu chỉnh Kế hoạch Hoạt động' : 'Hệ thống Quản trị Chất lượng Giáo dục Sky-Line'}
          </div>
        </div>

        {/* WIZARD PROGRESS STEPPER */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md shadow-slate-200/40">
          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Bước 1', desc: 'Thông tin hoạt động' },
              { num: 2, title: 'Bước 2', desc: 'Thiết lập đánh giá' },
              { num: 3, title: 'Bước 3', desc: 'Gán lớp & GVCN' },
              { num: 4, title: 'Bước 4', desc: 'Kiểm tra & Phát hành' }
            ].map(step => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`cursor-pointer p-3 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-xs'
                      : isPast
                      ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        isActive
                          ? 'bg-[#00A99D] text-white'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5" /> : step.num}
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-[10px] font-black uppercase text-slate-400">{step.title}</div>
                      <div className="text-xs font-black text-slate-800 line-clamp-1">{step.desc}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: THNG TIN HO?T ?NG */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Bước 1: Thông tin & Phân loại Hoạt động</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Nhập các thông tin cơ bản, chọn mạch hoạt động, loại hoạt động và quy mô tổ chức
              </p>
            </div>

            {/* 1-CLICK ACTIVITY PRESETS BANNER */}
            <div className="bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-sky-50/50 rounded-2xl p-4 sm:p-5 border border-teal-200/80 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00A99D] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-800">Thư viện Kế hoạch Sự kiện Mẫu (1-Click Presets)</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-200">
                        Sky-Line Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Chọn nhanh mẫu sự kiện đã được cấu hình sẵn mục tiêu, mô tả và ma trận tiêu chí đánh giá chuẩn
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-lg bg-teal-100/70 hover:bg-teal-200/80 transition-colors shrink-0"
                >
                  {showPresets ? 'Thu gọn' : 'Xem 6 mẫu sự kiện'}
                </button>
              </div>

              {showPresets && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {ACTIVITY_PRESETS.map(preset => {
                    const strandInfo = ACTIVITY_STRANDS.find(s => s.id === preset.strand);
                    const isSelected = formData.name === preset.name;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer bg-white hover:shadow-md hover:border-[#00A99D] flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#00A99D] ring-2 ring-[#00A99D]/20 bg-teal-50/20'
                            : 'border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {preset.tag}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                              preset.strand === 'XA_HOI' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              preset.strand === 'TU_NHIEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              preset.strand === 'HUONG_NGHIEP' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-sky-50 text-sky-700 border-sky-200'
                            }`}>
                              {strandInfo?.name || preset.strand}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-[#00A99D] transition-colors leading-snug line-clamp-2">
                              {preset.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1">
                              {preset.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-500 font-bold">
                            {preset.criteria.length} tiêu chí đánh giá
                          </span>
                          <span className="inline-flex items-center gap-1 font-black text-[#00A99D] group-hover:translate-x-0.5 transition-transform">
                            {isSelected ? 'Đang chọn' : 'Áp dụng mẫu'}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Tên hoạt động trải nghiệm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hội chợ Xuân Kết nối Yêu thương 2026, STEM Khám phá Hệ Sinh thái..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">Quy mô hoạt động</label>
                <select
                  value={formData.scale}
                  onChange={e => setFormData({ ...formData, scale: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                >
                  {ACTIVITY_SCALES.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  TCM Phụ trách (nếu có)
                </label>
                <select
                  value={formData.departmentId || formData.subjectId || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const dept = departments.find(d => d.id === val);
                    const sub = subjects.find(s => s.id === val);
                    setFormData({
                      ...formData,
                      departmentId: dept ? dept.id : '',
                      departmentName: dept ? dept.name : '',
                      subjectId: sub ? sub.id : (dept ? dept.id : ''),
                      subjectName: sub ? sub.subjectName : (dept ? dept.name : '')
                    });
                  }}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                >
                  <option value="">Hoạt động chung / Liên tổ (Không gắn riêng TCM)</option>
                  {departments && departments.length > 0 && (
                    <optgroup label="Tổ Chuyên Môn (TCM)">
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>TCM: {d.name} ({d.code || 'TCM'})</option>
                      ))}
                    </optgroup>
                  )}
                  {subjects && subjects.length > 0 && (
                    <optgroup label="Bộ Môn / Môn Học">
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>Môn: {s.subjectName} ({s.subjectCode || 'Môn'})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Khi không chọn TCM: Hoạt động sẽ gán và gửi email trực tiếp cho GVCN. Khi chọn TCM: Hoạt động sẽ gán và gửi email đồng thời cho Giáo viên thuộc TCM / GVBM phụ trách và GVCN để phối hợp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Ngày tổ chức <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Thời gian thực hiện</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 08:00 - 11:30 hoặc Cả ngày"
                  value={formData.timeRange}
                  onChange={e => setFormData({ ...formData, timeRange: e.target.value })}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5">Địa điểm tổ chức</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Sân trường Sky-Line Beach-D, Trung tâm Văn hóa TP Đà Nẵng..."
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>
            </div>

            {/* MẠCH HOẠT ĐỘNG TRẢI NGHIỆM */}
            <div className="space-y-2 pt-3">
              <label className="block text-xs font-black text-slate-800">
                Chọn Mạch hoạt động trải nghiệm <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ACTIVITY_STRANDS.map(strand => {
                  const isSelected = formData.strand === strand.id;
                  return (
                    <div
                      key={strand.id}
                      onClick={() => setFormData({ ...formData, strand: strand.id })}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-sm'
                          : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{strand.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#00A99D]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{strand.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LOẠI HOẠT ĐỘNG SKY-LINE */}
            <div className="space-y-2 pt-3">
              <label className="block text-xs font-black text-slate-800">
                Loại hoạt động Sky-Line <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {SKYLINE_ACTIVITY_TYPES.map(type => {
                  const isSelected = formData.activityTypeId === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        activityTypeId: type.id,
                        activityTypeName: type.name
                      })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <span className="line-clamp-1">{type.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mô tả & Mức tiu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={3}
                  placeholder="Nêu khái quát nội dung chính của hoạt động..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Mục tiêu cần đạt</label>
                <textarea
                  rows={3}
                  placeholder="Học sinh phát triển kỹ năng làm việc nhóm, giao tiếp, sáng tạo..."
                  value={formData.objectives}
                  onChange={e => setFormData({ ...formData, objectives: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#00A99D]/30 focus:border-[#00A99D] outline-none"
                />
              </div>
            </div>

            {/* Navigation Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (!formData.name.trim()) { toast.error('Vui lòng nhập Tên hoạt động'); return; }
                  setCurrentStep(2);
                }}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-2xl shadow-md shadow-[#00A99D]/20 flex items-center gap-2"
              >
                <span>Sang Bước 2: Thiết lập đánh giá</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: THIẾT LẬP ĐÁNH GIÁ */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Bước 2: Thiết lập tiêu chí & Công thức đánh giá</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Chọn hình thức ghi nhận, bộ tiêu chí đánh giá, thang 4 mức và quy tắc tính kết quả
              </p>
            </div>

            {/* Hình thức đánh giá */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">Hình thức đánh giá</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setEvalMode('PARTICIPATION_ONLY')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    evalMode === 'PARTICIPATION_ONLY'
                      ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">Hình thức 1: Chỉ ghi nhận tham gia</span>
                    {evalMode === 'PARTICIPATION_ONLY' && <CheckCircle2 className="w-4 h-4 text-[#00A99D]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Không chấm điểm theo tiêu chí. Kết quả phân loại thành: Tham gia / Không tham gia / Miễn.
                  </p>
                </div>

                <div
                  onClick={() => setEvalMode('CRITERIA')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                    evalMode === 'CRITERIA'
                      ? 'bg-[#00A99D]/10 border-[#00A99D] shadow-xs'
                      : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">Hình thức 2: Đánh giá theo tiêu chí năng lực</span>
                    {evalMode === 'CRITERIA' && <CheckCircle2 className="w-4 h-4 text-[#00A99D]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Chấm điểm theo 1, 3, 5 tiêu chí hoặc tùy chỉnh. Kết quả xếp loại: Nổi bật, Tốt, Đạt, Cần hỗ trợ.
                  </p>
                </div>
              </div>
            </div>

            {/* If Criteria Mode is selected */}
            {evalMode === 'CRITERIA' && (
              <div className="space-y-6 pt-2">
                {/* Preset Selector */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-800">Chọn nhanh bộ tiêu chí chuẩn:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSelectCriteriaPreset('1')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          criteriaPreset === '1'
                            ? 'bg-[#003B3A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        [1 tiêu chí]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectCriteriaPreset('3')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          criteriaPreset === '3'
                            ? 'bg-[#003B3A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        [3 tiêu chí chuẩn]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectCriteriaPreset('5')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          criteriaPreset === '5'
                            ? 'bg-[#003B3A] text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        [5 tiêu chí nâng cao]
                      </button>
                    </div>
                  </div>

                  {/* Criteria List */}
                  <div className="space-y-2.5 pt-2">
                    {criteria.map((crit, idx) => (
                      <div key={crit.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 font-black text-xs text-slate-500 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="space-y-1 flex-1">
                            <input
                              type="text"
                              value={crit.name}
                              onChange={e => handleUpdateCriterion(crit.id, 'name', e.target.value)}
                              className="w-full font-black text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#00A99D] outline-none"
                              placeholder="Tên tiêu chí"
                            />
                            <input
                              type="text"
                              value={crit.description || ''}
                              onChange={e => handleUpdateCriterion(crit.id, 'description', e.target.value)}
                              className="w-full text-[11px] text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#00A99D] outline-none"
                              placeholder="Mô tả hướng dẫn chấm (hiển thị tooltip)"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          {formulaType === 'WEIGHTED' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 font-bold">Trọng số:</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={crit.weight}
                                onChange={e => handleUpdateCriterion(crit.id, 'weight', parseInt(e.target.value) || 0)}
                                className="w-16 py-1 px-2 text-center text-xs font-black bg-slate-50 border border-slate-200 rounded-lg outline-none"
                              />
                              <span className="text-xs text-slate-500">%</span>
                            </div>
                          )}

                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={crit.isRequired}
                              onChange={e => handleUpdateCriterion(crit.id, 'isRequired', e.target.checked)}
                              className="rounded text-[#00A99D] focus:ring-0"
                            />
                            <span className="text-[11px] font-bold text-slate-600">Bắt buộc</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(crit.id)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                            title="Xóa tiêu chí"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* THƯ VIỆN TIÊU CHÍ GỢI Ý (12 TIÊU CHÍ) */}
                  <div className="pt-3 border-t border-slate-200">
                    <span className="block text-[11px] font-black text-slate-600 mb-2 uppercase tracking-wider">
                      Chọn thêm từ thư viện tiêu chí chuẩn (12 tiêu chí):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CRITERIA_LIBRARY.map(libItem => (
                        <button
                          key={libItem.id}
                          type="button"
                          onClick={() => handleAddCriterionFromLib(libItem)}
                          className="px-2.5 py-1 bg-white hover:bg-[#00A99D]/10 hover:text-[#003B3A] text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200 hover:border-[#00A99D]/40 transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-[#00A99D]" />
                          <span>{libItem.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* THANG NH GI 4 M?C */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">Thang đánh giá 4 mức thống nhất:</span>
                    <span className="text-[11px] text-slate-400 font-bold">Hiển thị trực quan cho GVCN</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {EVAL_LEVELS.map(lvl => (
                      <div key={lvl.level} className={`p-3 rounded-xl border bg-white shadow-2xs space-y-1 ${lvl.badgeCls}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{lvl.level}  {lvl.name}</span>
                          <span className="text-[10px] font-black uppercase opacity-70">{lvl.points}</span>
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight">
                          {lvl.level === 4 ? 'Vượt trội, sáng tạo xuất sắc' : lvl.level === 3 ? 'Hoàn thành tốt, chủ động' : lvl.level === 2 ? 'Đạt yêu cầu cơ bản' : 'Cần hướng dẫn và hỗ trợ'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CÔNG THỨC VÀ NGƯỠNG TÍNH */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-black text-slate-800 block">Công thức tính kết quả:</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="formulaType"
                          value="EQUAL_WEIGHT"
                          checked={formulaType === 'EQUAL_WEIGHT'}
                          onChange={() => setFormulaType('EQUAL_WEIGHT')}
                          className="text-[#00A99D]"
                        />
                        <span className="text-xs font-bold text-slate-700">Công thức A: Đồng trọng số (Tổng điểm / Điểm tối đa * 100%)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="formulaType"
                          value="WEIGHTED"
                          checked={formulaType === 'WEIGHTED'}
                          onChange={() => setFormulaType('WEIGHTED')}
                          className="text-[#00A99D]"
                        />
                        <span className="text-xs font-bold text-slate-700">Công thức B: Theo trọng số riêng từng tiêu chí</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-black text-slate-800 block">Ngưỡng xếp loại kết quả:</span>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Nổi bật (≥ %)</span>
                        <input
                          type="number"
                          value={thresholds.outstanding}
                          onChange={e => setThresholds({ ...thresholds, outstanding: parseInt(e.target.value) || 85 })}
                          className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg font-black text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Tốt (≥ %)</span>
                        <input
                          type="number"
                          value={thresholds.good}
                          onChange={e => setThresholds({ ...thresholds, good: parseInt(e.target.value) || 70 })}
                          className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg font-black text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Đạt (≥ %)</span>
                        <input
                          type="number"
                          value={thresholds.pass}
                          onChange={e => setThresholds({ ...thresholds, pass: parseInt(e.target.value) || 50 })}
                          className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg font-black text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Quay lại Bước 1
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-2xl shadow-md shadow-[#00A99D]/20 flex items-center gap-2"
              >
                <span>Sang Bước 3: Gán lớp</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: GÁN LỚP & PHÂN CÔNG GVCN / GVBM */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-800">Bước 3: Gán Lớp Tham Gia & Phân Công GVCN / GVBM</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Chọn Bậc học, Cơ sở, Khối và Lớp tham gia. Hệ thống tự động liên kết GVCN và GVBM tương ứng.
                </p>
              </div>
              <div className="bg-[#003B3A]/5 px-3 py-1.5 rounded-xl border border-[#00A99D]/20 self-start sm:self-auto">
                <span className="text-xs font-black text-[#003B3A]">
                  Đã chọn: <strong className="text-[#00A99D]">{assignedClasses.length}</strong> lớp
                </span>
              </div>
            </div>

            {/* SECTION 1: BẬC HỌC & CƠ SỞ */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    1. Bậc học áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.educationLevel}
                    onChange={e => setFormData({ ...formData, educationLevel: e.target.value })}
                    className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
                  >
                    <option value="PHO_THONG">Phổ thông (Tiểu học, THCS, THPT)</option>
                    <option value="Tieu hoc">Tiểu học (Khối 1 - 5)</option>
                    <option value="THCS">THCS (Khối 6 - 9)</option>
                    <option value="THPT">THPT (Khối 10 - 12)</option>
                    <option value="MAM_NON">Mầm non</option>
                    <option value="TOAN_TRUONG">Toàn trường / Liên cấp (Tất cả)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700">
                      2. Chọn Cơ sở (Chọn 1 hoặc nhiều cơ sở) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = campuses.map(c => c.id);
                          setFormData({ ...formData, selectedCampusIds: allIds });
                        }}
                        className="text-[11px] font-black text-[#00A99D] hover:underline"
                      >
                        ⚡ Chọn tất cả cơ sở
                      </button>
                      <span className="text-slate-300 text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, selectedCampusIds: [] })}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {campuses.map(cp => {
                      const isSelected = (formData.selectedCampusIds || []).includes(cp.id);
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          onClick={() => {
                            const current = formData.selectedCampusIds || [];
                            let next;
                            if (current.includes(cp.id)) {
                              next = current.filter(id => id !== cp.id);
                            } else {
                              next = [...current, cp.id];
                            }
                            setFormData({
                              ...formData,
                              selectedCampusIds: next,
                              campusId: next[0] || cp.id,
                              campusCode: cp.campusCode,
                              campusName: cp.campusName
                            });
                          }}
                          className={`p-2 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#00A99D]' : 'text-slate-400'}`} />
                            <span className="truncate">{cp.campusName || cp.campusCode}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: CHỌN KHỐI (1 HAY NHIỀU KHỐI) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700">
                  3. Chọn Khối tham gia (Chọn 1 hoặc nhiều khối)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allAvailableGrades = Array.from(new Set(
                        classes
                          .filter(c => isClassMatchLevel(c, formData.educationLevel))
                          .map(c => getClassGrade(c))
                          .filter(Boolean)
                      ));
                      setSelectedFilterGrades(allAvailableGrades);
                    }}
                    className="text-[11px] font-black text-[#00A99D] hover:underline"
                  >
                    ⚡ Chọn tất cả khối
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFilterGrades([])}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(() => {
                  const availableGrades = Array.from(new Set(
                    classes
                      .filter(c => isClassMatchLevel(c, formData.educationLevel))
                      .map(c => getClassGrade(c))
                      .filter(Boolean)
                  ));

                  const displayGrades = availableGrades.length > 0 ? availableGrades : (
                    formData.educationLevel === 'MAM_NON' 
                      ? ['Mầm', 'Chồi', 'Lá', 'Nhà trẻ']
                      : formData.educationLevel === 'Tieu hoc'
                      ? ['1', '2', '3', '4', '5']
                      : formData.educationLevel === 'THCS'
                      ? ['6', '7', '8', '9']
                      : formData.educationLevel === 'THPT'
                      ? ['10', '11', '12']
                      : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
                  );

                  return displayGrades
                    .sort((a, b) => {
                      const numA = parseInt(a);
                      const numB = parseInt(b);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.localeCompare(b);
                    })
                    .map(grade => {
                      const isSelected = selectedFilterGrades.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            if (selectedFilterGrades.includes(grade)) {
                              setSelectedFilterGrades(prev => prev.filter(g => g !== grade));
                            } else {
                              setSelectedFilterGrades(prev => [...prev, grade]);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>Khối {grade}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    });
                })()}
              </div>
            </div>

            {/* SECTION 3: DANH SÁCH & CHỌN LỚP */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#00A99D]" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    4. Danh sách Lớp (Chọn 1 hoặc nhiều lớp)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const activeCampuses = (formData.selectedCampusIds && formData.selectedCampusIds.length > 0)
                        ? campuses.filter(cp => formData.selectedCampusIds.includes(cp.id) || formData.selectedCampusIds.includes(cp.campusCode))
                        : campuses;

                      const matchClasses = classes.filter(c => {
                        const matchCampus = activeCampuses.some(cp => cp.id === c.campusId || cp.campusCode === c.campusCode || cp.campusCode === c.campus?.campusCode);
                        const matchLevel = isClassMatchLevel(c, formData.educationLevel);
                        const cleanG = getClassGrade(c);
                        const matchGrade = selectedFilterGrades.length === 0 || selectedFilterGrades.includes(cleanG);
                        return matchCampus && matchLevel && matchGrade;
                      });

                      const newItems = matchClasses.map(cls => {
                        const campusObj = campuses.find(cp => cp.id === cls.campusId) || { campusCode: 'CS', campusName: 'Sky-Line' };
                        const teacherObj = (cls.teachers || []).find(t => t.roleInClass === 'GVCN') || {};
                        const matchedTeaching = (cls.teachingAssignments || []).find(ta => ta.subjectId === formData.subjectId || ta.subject?.id === formData.subjectId) || {};
                        return {
                          classId: cls.id,
                          className: cls.className,
                          campusId: cls.campusId,
                          campusCode: campusObj.campusCode || '',
                          campusName: campusObj.campusName || '',
                          grade: cls.grade || '',
                          level: cls.level || '',
                          homeroomTeacherId: teacherObj.teacherId || cls.homeroomTeacherId || '',
                          homeroomTeacherName: teacherObj.teacher?.teacherName || cls.homeroomTeacher?.teacherName || 'GVCN',
                          subjectTeacherId: matchedTeaching.teacherId || matchedTeaching.teacher?.id || '',
                          subjectTeacherName: matchedTeaching.teacher?.teacherName || '',
                          totalStudents: cls._count?.students || (cls.students ? cls.students.length : 30),
                          evaluatedStudents: 0,
                          status: 'DRAFT'
                        };
                      });

                      setAssignedClasses(newItems);
                      toast.success(`Đã gán toàn bộ ${newItems.length} lớp theo Cơ sở & Khối đã chọn!`);
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>⚡ Gán TOÀN BỘ lớp theo Cơ sở & Khối</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignedClasses([]);
                      toast.success('Đã bỏ chọn tất cả các lớp');
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              {/* Class Tree */}
              <div className="space-y-4">
                {(() => {
                  const renderedCampusBlocks = campuses
                    .filter(cp => !formData.selectedCampusIds || formData.selectedCampusIds.length === 0 || formData.selectedCampusIds.includes(cp.id) || formData.selectedCampusIds.includes(cp.campusCode))
                    .map(campus => {
                      const campusClasses = classes.filter(c => {
                        const matchCampus = c.campusId === campus.id || c.campusCode === campus.campusCode || c.campus?.campusCode === campus.campusCode || c.campus?.id === campus.id || (c.className && c.className.toLowerCase().includes(campus.campusCode.toLowerCase()));
                        const matchLevel = isClassMatchLevel(c, formData.educationLevel);
                        const cleanG = getClassGrade(c);
                        const matchGrade = selectedFilterGrades.length === 0 || selectedFilterGrades.includes(cleanG);
                        return matchCampus && matchLevel && matchGrade;
                      });
                      if (campusClasses.length === 0) return null;

                      const isCampusAllSelected = campusClasses.length > 0 && campusClasses.every(cls => assignedClasses.some(c => c.classId === cls.id));
                      const uniqueGrades = Array.from(new Set(campusClasses.map(c => getClassGrade(c)).filter(Boolean))).sort((a, b) => {
                        const numA = parseInt(a);
                        const numB = parseInt(b);
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return a.localeCompare(b);
                      });

                      return (
                        <div key={campus.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#00A99D]" />
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                {campus.campusName || campus.campusCode}
                              </span>
                              <span className="text-[11px] text-slate-400 font-bold">({campusClasses.length} lớp)</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isCampusAllSelected) {
                                    setAssignedClasses(prev => prev.filter(c => !campusClasses.some(cls => cls.id === c.classId)));
                                  } else {
                                    const newItems = [];
                                    campusClasses.forEach(cls => {
                                      if (!assignedClasses.some(c => c.classId === cls.id)) {
                                        const campusObj = campuses.find(cp => cp.id === cls.campusId) || { campusCode: 'CS', campusName: 'Sky-Line' };
                                        const teacherObj = (cls.teachers || []).find(t => t.roleInClass === 'GVCN') || {};
                                        const matchedTeaching = (cls.teachingAssignments || []).find(ta => ta.subjectId === formData.subjectId || ta.subject?.id === formData.subjectId) || {};
                                        newItems.push({
                                          classId: cls.id,
                                          className: cls.className,
                                          campusId: cls.campusId,
                                          campusCode: campusObj.campusCode || '',
                                          campusName: campusObj.campusName || '',
                                          grade: cls.grade,
                                          level: cls.level,
                                          homeroomTeacherId: teacherObj.teacherId || cls.homeroomTeacherId || '',
                                          homeroomTeacherName: teacherObj.teacher?.teacherName || cls.homeroomTeacher?.teacherName || 'GVCN',
                                          subjectTeacherId: matchedTeaching.teacherId || matchedTeaching.teacher?.id || '',
                                          subjectTeacherName: matchedTeaching.teacher?.teacherName || '',
                                          totalStudents: cls._count?.students || (cls.students ? cls.students.length : 30),
                                          evaluatedStudents: 0,
                                          status: 'DRAFT'
                                        });
                                      }
                                    });
                                    setAssignedClasses(prev => [...prev, ...newItems]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 ${
                                  isCampusAllSelected
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-teal-50 text-[#003B3A] border border-[#00A99D]/30 hover:bg-teal-100'
                                }`}
                              >
                                <Sparkles className="w-3 h-3 text-[#00A99D]" />
                                <span>{isCampusAllSelected ? 'Bỏ chọn toàn bộ cơ sở này' : '⚡ Gán TOÀN BỘ lớp cơ sở này'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3 pl-2">
                            {uniqueGrades.map(grade => {
                              const gradeClasses = campusClasses.filter(c => getClassGrade(c) === grade);
                              const isGradeAllSelected = gradeClasses.every(cls => assignedClasses.some(c => c.classId === cls.id));

                              return (
                                <div key={grade} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800">Khối {grade} ({gradeClasses.length} lớp)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllClassesInGrade(gradeClasses)}
                                      className="text-[11px] font-black text-[#00A99D] hover:underline"
                                    >
                                      {isGradeAllSelected ? 'Bỏ chọn toàn khối' : 'Chọn toàn khối'}
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                    {gradeClasses.map(cls => {
                                      const isSelected = assignedClasses.some(c => c.classId === cls.id);
                                      const matchedTeaching = (cls.teachingAssignments || []).find(ta => ta.subjectId === formData.subjectId || ta.subject?.id === formData.subjectId);
                                      return (
                                        <button
                                          key={cls.id}
                                          type="button"
                                          onClick={() => handleToggleClass(cls)}
                                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                            isSelected
                                              ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-md shadow-[#003B3A]/20'
                                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black">{cls.className}</span>
                                            {isSelected ? (
                                              <Check className="w-3.5 h-3.5 text-white" />
                                            ) : (
                                              <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                                            )}
                                          </div>
                                          <div className="text-[10px] space-y-0.5 opacity-90">
                                            <div className={isSelected ? 'text-teal-200' : 'text-slate-500'}>
                                              GVCN: {cls.homeroomTeacher?.teacherName || 'Chưa gán'}
                                            </div>
                                            {formData.subjectName && (
                                              <div className={`flex items-center gap-1 ${isSelected ? 'text-amber-200 font-bold' : 'text-amber-700 font-bold'}`}>
                                                <BookOpen className="w-2.5 h-2.5" />
                                                <span>TCM / GVBM: {(() => { const gv = findMatchedGVBM(cls, formData); return gv ? gv.teacherName : 'Chưa phân công'; })()}</span>
                                              </div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }).filter(Boolean);

                  if (renderedCampusBlocks.length > 0) return renderedCampusBlocks;

                  // Fallback: If no campus-matched classes found, group all matching classes by Grade directly
                  const generalClasses = classes.filter(c => {
                    const matchLevel = isClassMatchLevel(c, formData.educationLevel);
                    const cleanG = getClassGrade(c);
                    const matchGrade = selectedFilterGrades.length === 0 || selectedFilterGrades.includes(cleanG);
                    return matchLevel && matchGrade;
                  });

                  if (generalClasses.length > 0) {
                    const uniqueGrades = Array.from(new Set(generalClasses.map(c => getClassGrade(c)).filter(Boolean))).sort((a, b) => {
                      const numA = parseInt(a);
                      const numB = parseInt(b);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.localeCompare(b);
                    });

                    return (
                      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#00A99D]" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Danh sách Lớp theo Khối
                            </span>
                            <span className="text-[11px] text-slate-400 font-bold">({generalClasses.length} lớp)</span>
                          </div>
                        </div>

                        <div className="space-y-3 pl-2">
                          {uniqueGrades.map(grade => {
                            const gradeClasses = generalClasses.filter(c => getClassGrade(c) === grade);
                            const isGradeAllSelected = gradeClasses.every(cls => assignedClasses.some(c => c.classId === cls.id));

                            return (
                              <div key={grade} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-slate-800">Khối {grade} ({gradeClasses.length} lớp)</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllClassesInGrade(gradeClasses)}
                                    className="text-[11px] font-black text-[#00A99D] hover:underline"
                                  >
                                    {isGradeAllSelected ? 'Bỏ chọn toàn khối' : 'Chọn toàn khối'}
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                  {gradeClasses.map(cls => {
                                    const isSelected = assignedClasses.some(c => c.classId === cls.id);
                                    const matchedTeaching = (cls.teachingAssignments || []).find(ta => ta.subjectId === formData.subjectId || ta.subject?.id === formData.subjectId);
                                    return (
                                      <button
                                        key={cls.id}
                                        type="button"
                                        onClick={() => handleToggleClass(cls)}
                                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                          isSelected
                                            ? 'bg-[#003B3A] text-white border-[#003B3A] shadow-md shadow-[#003B3A]/20'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-black">{cls.className}</span>
                                          {isSelected ? (
                                            <Check className="w-3.5 h-3.5 text-white" />
                                          ) : (
                                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                                          )}
                                        </div>
                                        <div className="text-[10px] space-y-0.5 opacity-90">
                                          <div className={isSelected ? 'text-teal-200' : 'text-slate-500'}>
                                            GVCN: {cls.homeroomTeacher?.teacherName || 'Chưa gán'}
                                          </div>
                                          {(formData.departmentName || formData.subjectName) && (() => {
                                            const matchedGV = findMatchedGVBM(cls, formData);
                                            return (
                                              <div className={`flex items-center gap-1 ${isSelected ? 'text-amber-200 font-bold' : 'text-amber-700 font-bold'}`}>
                                                <BookOpen className="w-2.5 h-2.5" />
                                                <span>TCM / GVBM: {matchedGV ? matchedGV.teacherName : 'Chưa phân công'}</span>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-black text-slate-600">
                        Chưa có lớp nào phù hợp với Cơ sở và Khối đang chọn.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Quý Thầy/Cô vui lòng nhấn <strong>"⚡ Chọn tất cả cơ sở"</strong> hoặc chọn thêm Khối để hiển thị danh sách lớp.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* SECTION 4: DEADLINE CONFIG */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-slate-800 block">5. Thời hạn GV hoàn thành đánh giá (Deadline):</span>
                <span className="text-[11px] text-slate-500">Giáo viên sẽ nhận được thông báo nhắc nhở khi đến hạn</span>
              </div>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Quay lại Bước 2
              </button>
              <button
                type="button"
                onClick={() => {
                  if (assignedClasses.length === 0) {
                    toast.error('Vui lòng chọn ít nhất 1 lớp');
                    return;
                  }
                  setCurrentStep(4);
                }}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#008F85] text-white text-xs font-black rounded-2xl shadow-md shadow-[#00A99D]/20 flex items-center gap-2"
              >
                <span>Sang Bước 4: Kiểm tra & Phát hành</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: KI?M TRA V PHT HNH (PREVIEW & PUBLISH) */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800">Bước 4: Kiểm Tra & Phát Hành Hoạt Động</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Xem lại toàn bộ thông tin cấu hình trước khi lưu nháp hoặc giao cho các Giáo viên Chủ nhiệm
              </p>
            </div>

            {/* Summary Grid Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Thông tin cơ bản</span>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400 font-bold">Tên hoạt động:</span> <strong className="text-slate-800 text-sm block">{formData.name}</strong></div>
                  <div><span className="text-slate-400 font-bold">Mạch hoạt động:</span> <strong className="text-slate-800">{ACTIVITY_STRANDS.find(s => s.id === formData.strand)?.name}</strong></div>
                  <div><span className="text-slate-400 font-bold">Loại hoạt động:</span> <strong className="text-slate-800">{formData.activityTypeName}</strong></div>
                  <div><span className="text-slate-400 font-bold">Thời gian:</span> <strong className="text-slate-800">{formData.date} ({formData.timeRange})</strong></div>
                  <div><span className="text-slate-400 font-bold">Địa điểm:</span> <strong className="text-slate-800">{formData.location || 'Chưa ghi'}</strong></div>
                  <div><span className="text-slate-400 font-bold">Hạn nộp đánh giá:</span> <strong className="text-emerald-700">{formData.deadline || 'Theo kế hoạch'}</strong></div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Thiết lập đánh giá & Lớp</span>
                <div className="space-y-2 text-xs">
                  <div><span className="text-slate-400 font-bold">Hình thức:</span> <strong className="text-slate-800">{evalMode === 'PARTICIPATION_ONLY' ? 'Chỉ ghi nhận tham gia' : 'Đánh giá theo tiêu chí năng lực'}</strong></div>
                  {evalMode === 'CRITERIA' && (
                    <>
                      <div><span className="text-slate-400 font-bold">Số tiêu chí:</span> <strong className="text-slate-800">{criteria.length} tiêu chí ({formulaType === 'EQUAL_WEIGHT' ? 'Đồng trọng số' : 'Theo trọng số'})</strong></div>
                      <div>
                        <span className="text-slate-400 font-bold">Danh sách tiêu chí:</span>
                        <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-700 space-y-0.5">
                          {criteria.map((c, i) => (
                            <li key={c.id}>{c.name} {formulaType === 'WEIGHTED' ? `(${c.weight}%)` : ''} {c.isRequired ? '(Bắt buộc)' : ''}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400 font-bold">Lớp tham gia:</span>
                      <strong className="text-[#003B3A]">{assignedClasses.length} lớp</strong>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {assignedClasses.map(c => (
                        <div key={c.classId} className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-[11px] gap-2">
                          <span className="font-black text-[#003B3A]">{c.className}</span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end text-[10px]">
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold">
                              GVCN: {c.homeroomTeacherName || 'Chưa gán'}
                            </span>
                            {(formData.departmentName || formData.subjectName) && (() => {
                              const rawCls = classes.find(cl => cl.id === c.classId || cl.className === c.className);
                              const matchedGV = (c.subjectTeacherName && c.subjectTeacherName !== 'Chưa phân công')
                                ? { teacherName: c.subjectTeacherName }
                                : findMatchedGVBM(rawCls, formData);
                              const displayName = matchedGV ? matchedGV.teacherName : 'Chưa phân công';
                              return (
                                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <BookOpen className="w-3 h-3 text-amber-600" />
                                  GVBM {formData.departmentName || formData.subjectName}: {displayName}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EMAIL NOTIFICATION & SENDER CONFIGURATION */}
            <div className="bg-gradient-to-br from-teal-50/40 via-white to-sky-50/40 p-5 sm:p-6 rounded-3xl border border-teal-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-100/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#00A99D] text-white flex items-center justify-center shadow-md shadow-[#00A99D]/20">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span>Cấu hình Đẩy Mail Tự Động cho GVCN & GĐCS</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00A99D]/10 text-[#003B3A]">
                        Tự động hóa
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Hệ thống sẽ tự động gửi email thông tin & phân loại hoạt động đến tất cả GVCN và CC Giám đốc cơ sở
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={emailSettings.sendEmail}
                    onChange={e => setEmailSettings({ ...emailSettings, sendEmail: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00A99D]"></div>
                  <span className="text-xs font-black text-slate-700">
                    {emailSettings.sendEmail ? 'Bật gửi email' : 'Tắt gửi email'}
                  </span>
                </label>
              </div>

              {emailSettings.sendEmail && (
                <div className="space-y-5">
                  {/* SENDER SELECTION */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#00A99D]" />
                      <span>1. Tùy chọn Người gửi / Đơn vị thông báo (Sender):</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'CTHS', label: 'Tổ CTHS - Ban HĐNGLL', desc: 'Công tác học sinh' },
                        { id: 'KTDBCL', label: 'Ban Khảo thí & ĐBCL', desc: 'Đảm bảo chất lượng' },
                        { id: 'BGH', label: 'Ban Giám hiệu', desc: 'BGH Nhà trường' },
                        { id: 'TCM', label: formData.departmentName ? `TCM ${formData.departmentName}` : (formData.subjectName ? `Tổ môn ${formData.subjectName}` : 'Tổ Chuyên môn'), desc: 'Chuyên môn / Bộ môn' },
                        { id: 'CUSTOM', label: 'Tùy chỉnh khác', desc: 'Tự nhập tên đơn vị' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEmailSettings({ ...emailSettings, senderOption: opt.id })}
                          className={`p-2.5 rounded-2xl border text-left transition-all ${
                            emailSettings.senderOption === opt.id
                              ? 'bg-[#00A99D] text-white border-[#00A99D] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11.5px] font-black truncate">{opt.label}</div>
                          <div className={`text-[9.5px] font-semibold truncate ${emailSettings.senderOption === opt.id ? 'text-teal-100' : 'text-slate-400'}`}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>

                    {emailSettings.senderOption === 'CUSTOM' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={emailSettings.senderName}
                          onChange={e => setEmailSettings({ ...emailSettings, senderName: e.target.value })}
                          placeholder="Nhập tên người gửi / đơn vị (ví dụ: Ban Tổ chức Hội thao, Tổ Ngoại ngữ,...)"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] font-black text-slate-500 block mb-1">Email phản hồi (Reply-To / Tuỳ chọn):</span>
                        <div className="relative">
                          <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            value={emailSettings.replyTo}
                            onChange={e => setEmailSettings({ ...emailSettings, replyTo: e.target.value })}
                            placeholder="vd: thongpn@skylineschool.edu.vn"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#00A99D]/30 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-slate-500 block mb-1">Tên đơn vị hiển thị trên Email:</span>
                        <div className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-[#003B3A] truncate">
                          {getResolvedSenderName()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GDCS & CC CONFIGURATION */}
                  <div className="space-y-2 pt-3 border-t border-teal-100/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#00A99D]" />
                        <span>2. Email Giám đốc Cơ sở (GĐCS) & CC đồng gửi:</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#003B3A]">
                        <input
                          type="checkbox"
                          checked={emailSettings.includeGdcs}
                          onChange={e => setEmailSettings({ ...emailSettings, includeGdcs: e.target.checked })}
                          className="rounded text-[#00A99D] focus:ring-[#00A99D]"
                        />
                        <span>Tự động CC GĐCS theo từng cơ sở</span>
                      </label>
                    </div>

                    {/* Detected Campuses Badge */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        📍 Cơ sở có lớp tham gia & GĐCS tiếp nhận:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(assignedClasses.map(c => c.campusCode || (c.className.includes('_') ? c.className.split('_').pop() : 'CS')))).map(code => {
                          const matchedCampus = campuses.find(cp => cp.campusCode === code);
                          const managerEmail = matchedCampus?.manager?.email;
                          const managerName = matchedCampus?.manager?.fullName;
                          return (
                            <div key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                              <Building2 className="w-3.5 h-3.5 text-[#00A99D]" />
                              <span className="font-extrabold text-slate-800">Sky-Line {code}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-600 font-semibold text-[11px]">
                                {managerEmail ? `GĐCS: ${managerName ? managerName + ' (' + managerEmail + ')' : managerEmail}` : 'Tự động tra cứu email GĐCS'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Manual Extra CC Emails */}
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">Bổ sung thêm Email CC (Ban Giám hiệu, Tổ trưởng,...):</span>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={customGdcsInput}
                            onChange={e => setCustomGdcsInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customGdcsInput.trim() && customGdcsInput.includes('@')) {
                                  if (!emailSettings.gdcsEmails.includes(customGdcsInput.trim())) {
                                    setEmailSettings({
                                      ...emailSettings,
                                      gdcsEmails: [...emailSettings.gdcsEmails, customGdcsInput.trim()]
                                    });
                                    setCustomGdcsInput('');
                                  }
                                }
                              }
                            }}
                            placeholder="Nhập email cần CC thêm và nhấn Thêm..."
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#00A99D]/30"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customGdcsInput.trim() && customGdcsInput.includes('@')) {
                                if (!emailSettings.gdcsEmails.includes(customGdcsInput.trim())) {
                                  setEmailSettings({
                                    ...emailSettings,
                                    gdcsEmails: [...emailSettings.gdcsEmails, customGdcsInput.trim()]
                                  });
                                  setCustomGdcsInput('');
                                }
                              } else {
                                toast.error('Vui lòng nhập định dạng email hợp lệ');
                              }
                            }}
                            className="px-3.5 py-1.5 bg-[#003B3A] text-white rounded-xl text-xs font-bold hover:bg-[#002B2A] transition-all"
                          >
                            + Thêm CC
                          </button>
                        </div>

                        {emailSettings.gdcsEmails.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {emailSettings.gdcsEmails.map((em, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
                                {em}
                                <button
                                  type="button"
                                  onClick={() => setEmailSettings({
                                    ...emailSettings,
                                    gdcsEmails: emailSettings.gdcsEmails.filter((_, i) => i !== idx)
                                  })}
                                  className="hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MANDATORY MESSAGE & INSTRUCTIONS */}
                  <div className="space-y-2 pt-3 border-t border-teal-100/60">
                    <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#00A99D]" />
                        <span>3. Lời nhắn & Yêu cầu trọng tâm gửi đến GVCN:</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✨ Nội dung bắt buộc chuẩn Sky-Line
                      </span>
                    </label>

                    <div className="relative">
                      <textarea
                        rows={2}
                        value={emailSettings.customMessage}
                        onChange={e => setEmailSettings({ ...emailSettings, customMessage: e.target.value })}
                        placeholder="Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp..."
                        className="w-full p-3 bg-white border border-teal-300/80 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#00A99D]/30 outline-none shadow-2xs"
                      />
                    </div>
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-[11.5px] text-amber-900 leading-relaxed font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Email gửi đi sẽ tự động đính kèm đầy đủ: <strong>Thông tin & Phân loại Hoạt động</strong>, Mạch hoạt động, Loại hình, Môn học tích hợp, Thời gian, Địa điểm, Danh sách lớp và Nút bấm trực tiếp mở Sổ đánh giá học sinh cho GVCN.
                      </span>
                    </div>
                  </div>

                  {/* LIVE EMAIL PREVIEW BUTTON */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="inline-flex items-center gap-2 text-xs font-black text-[#003B3A] hover:text-[#00A99D] transition-colors"
                    >
                      {showEmailPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{showEmailPreview ? 'Ẩn xem trước mẫu Email' : '👁️ Xem trước nội dung Email sẽ gửi đến GVCN & GĐCS'}</span>
                    </button>

                    {showEmailPreview && (
                      <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-inner space-y-3 font-sans">
                        <div className="p-4 bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white rounded-xl text-center">
                          <div className="text-xs font-black uppercase tracking-wider">QUẢN LÝ HOẠT ĐỘNG TRẢI NGHIỆM SKY-LINE</div>
                          <div className="text-[11px] font-bold text-teal-100 mt-0.5">{getResolvedSenderName().toUpperCase()}</div>
                          <div className="inline-block bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black mt-2">
                            Mã HĐ: {formData.code || 'HDTN-AUTO'}
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="font-extrabold text-slate-800">Kính gửi Thầy/Cô [Tên GVCN],</div>
                          <div className="text-slate-600 leading-relaxed">
                            Lớp chủ nhiệm của Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm</strong> từ <strong>{getResolvedSenderName()}</strong>.
                          </div>

                          <div className="bg-teal-50 border-l-4 border-[#00A99D] p-2.5 rounded-r-xl text-[#003B3A] font-bold text-[11.5px] leading-relaxed">
                            📌 <strong>Yêu cầu từ Ban Tổ Chức:</strong><br/>
                            "{emailSettings.customMessage}"
                          </div>

                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1 text-slate-700">
                            <div>🎯 <strong>Tên HĐ:</strong> <span className="font-extrabold text-[#003B3A]">{formData.name || 'Tên hoạt động'}</span></div>
                            <div>🏷️ <strong>Mạch HĐ:</strong> {ACTIVITY_STRANDS.find(s => s.id === formData.strand)?.name} ({formData.activityTypeName})</div>
                            {formData.subjectName && <div>📚 <strong>Môn học:</strong> {formData.subjectName}</div>}
                            <div>🗓️ <strong>Thời gian:</strong> {formData.date} ({formData.timeRange})</div>
                            <div>📍 <strong>Địa điểm:</strong> {formData.location || 'Tại các cơ sở Sky-Line'}</div>
                            <div>👥 <strong>Lớp phụ trách:</strong> {assignedClasses.map(c => c.className).join(', ') || 'Danh sách lớp'}</div>
                            <div>⏰ <strong>Hạn nộp đánh giá:</strong> <span className="text-emerald-700 font-bold">{formData.deadline || 'Theo kế hoạch'}</span></div>
                          </div>

                          <div className="text-center py-2">
                            <span className="inline-block bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md">
                              TRUY CẬP VÀ ĐÁNH GIÁ VAI TRÒ HỌC SINH &rarr;
                            </span>
                          </div>

                          {/* TEST EMAIL TOOLBAR */}
                          <div className="pt-3 border-t border-slate-200 mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-[#00A99D]" />
                              <span>Gửi thử nghiệm đến Email của bạn:</span>
                            </div>
                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                              <input
                                type="email"
                                value={testEmail}
                                onChange={e => setTestEmail(e.target.value)}
                                placeholder="Nhập email của bạn..."
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#00A99D]/30 w-full sm:w-56"
                              />
                              <button
                                type="button"
                                disabled={sendingTest}
                                onClick={handleSendTestEmail}
                                className="px-3 py-1.5 bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-2xs"
                              >
                                {sendingTest ? 'Đang gửi...' : 'Gửi thử'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
              >
                Quay lại Bước 3
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  <span>Lưu bản nháp</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-[#003B3A] via-[#00A99D] to-[#48BFE3] hover:from-[#002B2A] hover:to-[#008F85] text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-[#00A99D]/25 transition-all flex items-center justify-center gap-2.5 transform active:scale-95"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>{isEditMode ? 'Cập nhật kế hoạch ngay' : 'Giao hoạt động ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
