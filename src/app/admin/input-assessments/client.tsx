"use client"
import * as XLSX from "xlsx"
import { useRef } from "react"
import { useState, useEffect } from "react"
import { BarChart, Plus, Pencil, UserCheck, Trash2, CalendarDays, Layers, User, BookOpen, Settings, X, Check, Tag, ListChecks, Users, Search, Upload, FileSpreadsheet, Download, Lock, Unlock, Award } from "lucide-react"

const CAT_TYPES = [
  { key: "DIEN_KS", label: "Diện khảo sát", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "HINH_THUC_KS", label: "Hình thức KS", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { key: "LOAI_TUYEN_SINH", label: "Loại tuyển sinh", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "KQGD_TIEU_HOC", label: "Hồ sơ CT Bộ (Khối 1-5)", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { key: "KQ_HOC_TAP", label: "Hồ sơ CT Bộ (Khối 6-12)", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "HS_CT_QUOC_TE", label: "Hồ sơ CT Quốc tế", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "KQ_REN_LUYEN", label: "KQ Rèn luyện", color: "bg-teal-100 text-teal-700 border-teal-200" },
]


export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers,subjects: initialSubjects, eduSystems, grades, configs: initialConfigs, teachers = [], departments = [] }: any) {
  const [viewResultsGroup,setViewResultsGroup] = useState<any>(null);
  const [viewResultsData,setViewResultsData] = useState<any>(null);
  const [isFetchingResults,setIsFetchingResults] = useState(false);
  const [reviewUnlockPeriod,setReviewUnlockPeriod] = useState<any>(null);
  const [activeTab,setActiveTab] = useState<"periods"|"categories"|"subjects"|"mapping"|"students"|"assignments"|"reports">("periods");
  const [selectedYearId,setSelectedYearId] = useState(academicYears?.[0]?.id || "");
  const [periods,setPeriods] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [isPeriodOpen,setIsPeriodOpen] = useState(false);
  const [isBatchOpen,setIsBatchOpen] = useState(false);
  const [editingPeriodId,setEditingPeriodId] = useState<string|null>(null);
  const [editingBatchId,setEditingBatchId] = useState<string|null>(null);
  const [currentPeriodIdForBatch,setCurrentPeriodIdForBatch] = useState<string|null>(null);
  const [periodForm,setPeriodForm] = useState({ type:"DOT_LE", code:"", name:"", description:"",startDate:"", endDate:"", campusId:"", assignedUserId:"" });
  const [batchForm,setBatchForm] = useState({ batchNumber:1, name:"",startDate:"", endDate:"" });
  const [subjectsList,setSubjectsList] = useState<any[]>(initialSubjects||[]);
  const [isSubjectOpen,setIsSubjectOpen] = useState(false);
  const [isColumnConfigOpen,setIsColumnConfigOpen] = useState(false);
  const [columnConfigForm,setColumnConfigForm] = useState({ subjectId: "", name: "",scoreNames: [], commentNames: [],showScoreInReport: [],showCommentInReport: [],scoreColumns: 1, commentColumns: 1 });
  const [editingSubjectId,setEditingSubjectId] = useState<string|null>(null);
  const [subjectForm,setSubjectForm] = useState({ code:"", name:"", subjectType:"",scoreColumns: 1, commentColumns: 1,status: "ACTIVE" });
  const [selGrades,setSelGrades] = useState<string[]>((grades && grades.length) ? [grades[0]]:[]);
  const [selEdus,setSelEdus] = useState<string[]>((eduSystems && eduSystems.length) ? [eduSystems[0].code]:[]);
  const [mappings,setMappings] = useState<any[]>([]);
  const [mappingLoading,setMappingLoading] = useState(false);
  const [configsList,setConfigsList] = useState<any[]>(initialConfigs||[]);
  const [isConfigOpen,setIsConfigOpen] = useState(false);
  const [editingConfigId,setEditingConfigId] = useState<string|null>(null);
  const [configForm,setConfigForm] = useState({ categoryType:"", code:"", name:"", academicYearId:"" });
  const [hkYearId,setHkYearId] = useState(academicYears?.[0]?.id || "");
  const [studentPeriodId,setStudentPeriodId] = useState("");
  const [studentBatchId,setStudentBatchId] = useState("");
  const [studentsList,setStudentsList] = useState([]);
  const [studentsLoading,setStudentsLoading] = useState(false);
  const [isStudentOpen,setIsStudentOpen] = useState(false);
  const [editingStudentId,setEditingStudentId] = useState(null);
  const [studentForm,setStudentForm] = useState({studentCode:"",fullName:"",dateOfBirth:"",admissionCriteria:"",surveyFormType:"",targetType:"",hocKy:"",kqgdTieuHoc:"",kqHocTap:"",hoSoCtQuocTe:"",kqRenLuyen:"",periodId:"",batchId:"",grade:""});
  const [selectedStudentIds,setSelectedStudentIds] = useState([]);
  const [studentSearch,setStudentSearch] = useState("");
  const [importing,setImporting] = useState(false);

  const [assignPeriodId,setAssignPeriodId] = useState("");
  const [assignBatchId,setAssignBatchId] = useState("");
  const [assignTeacherId,setAssignTeacherId] = useState("");
  const [assignDepartmentId,setAssignDepartmentId] = useState("");
  const [assignSelSubjects,setAssignSelSubjects] = useState<string[]>([]);
  const [assignSelGrades,setAssignSelGrades] = useState<string[]>([]);
  const [assignSelEdus,setAssignSelEdus] = useState<string[]>([]);
  const [assignments,setAssignments] = useState<any[]>([]);
  const [assignmentsLoading,setAssignmentsLoading] = useState(false);
  const [selectedAssignmentIds,setSelectedAssignmentIds] = useState<string[]>([]);

  const fetchAssignments = async () => {
    if (!assignPeriodId) return;
   setAssignmentsLoading(true);
    try {
      const r = await fetch("/api/input-assessment-assignments?periodId=" + assignPeriodId);
      if (r.ok)setAssignments(await r.json());
    } catch (e) {}
   setAssignmentsLoading(false);
  };
  useEffect(() => { if (assignPeriodId) fetchAssignments(); }, [assignPeriodId]);

  
  const resolveUnlockRequest = async (assignmentId:string,status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Bạn có chắc chắn muốn ${status === 'APPROVED' ? 'ĐỒNG Ý' : 'TỪ CHỐI'} yêu cầu này?`)) return;
    const r = await fetch("/api/input-assessment-assignments", { 
        method: "PUT", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ action: "RESOLVE_UNLOCK", id: assignmentId,status }) 
    });
    if (r.ok) {
        fetchAssignments();
    } else {
        alert("LỗiServer");
    }
  };
  const handleAssignSubmit = async () => {
    if(!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0) {
      alert("Vui lòng chọn đủ Môn, Khối, Hệ, và Giáo viên!"); return;
    }
    const payload: any[] = [];
    assignSelSubjects.forEach(s => {
      assignSelGrades.forEach(g => {
        assignSelEdus.forEach(e => {
          payload.push({ teacherId: assignTeacherId, subjectId: s, grade: g, educationSystem: e });
        });
      });
    });
    const r = await fetch("/api/input-assessment-assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BULK_ASSIGN", periodId: assignPeriodId, batchId: assignBatchId, assignments: payload })
    });
    if (r.ok) {
      alert("Ph�n c�ng th�nh c�ng!");
      fetchAssignments();
    } else {
      const errData = await r.json();
      alert("Lỗi: " + (errData.error || errData.message || "Kh�ng x�c �?nh"));
    }
  };

  
  const toggleAllAssignments = () => {
    if (selectedAssignmentIds.length === assignments.length)setSelectedAssignmentIds([]);
    elsesetSelectedAssignmentIds(assignments.map((a:any) => a.id));
  };
  const deleteSelectedAssignments = async () => {
    if (!confirm("X�a " +selectedAssignmentIds.length + " ph�n c�ng �? ch?n?")) return;
    await fetch("/api/input-assessment-assignments?ids=" +selectedAssignmentIds.join(","), { method: "DELETE" });
   setSelectedAssignmentIds([]);
    fetchAssignments();
  };
  const editAssignment = (a: any) => {
   setAssignTeacherId(a.userId);
   setAssignBatchId(a.batchId || "");
   setAssignSelSubjects([a.subjectId]);
   setAssignSelGrades([a.grade]);
   setAssignSelEdus([a.educationSystem]);
    // Scroll up
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAssignment = async (id:string) => {
    if (!confirm("X�a ph�n c�ng n�y?")) return;
    await fetch("/api/input-assessment-assignments?id="+id, {method:"DELETE"});
    fetchAssignments();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(()=>{if(selectedYearId)fetchPeriods()},[selectedYearId]);
  useEffect(()=>{if(selGrades.length&&selEdus.length)fetchMappings();elsesetMappings([])},[selGrades,selEdus]);

  const fetchPeriods=async()=>{setLoading(true);try{const r=await fetch("/api/input-assessments?academicYearId="+selectedYearId);if(r.ok)setPeriods(await r.json())}catch(e){}setLoading(false)};
  const generateAutoCode=(t:string)=>{const p=t+"_";leCột điểm=0;periods.filter(x=>x.code?.startsWith(p)).forEach(x=>{const n=parseInt(x.code.split('_').pop());if(!isNaN(n)&&n>m)m=n});return p+(m+1).toString().padStart(2,'0')};
  const handleOpenNewPeriod=()=>{setEditingPeriodId(null);const c=generateAutoCode("DOT_LE");setPeriodForm({type:"DOT_LE",code:c,name:c,description:"",startDate:"",endDate:"",campusId:"",assignedUserId:""});setIsPeriodOpen(true)};
  const handlePeriodTypeChange=(t:string)=>{const c=generateAutoCode(t);setPeriodForm({...periodForm,type:t,code:c,name:c})};
  const handlePeriodSubmit=async(e:React.FormEvent)=>{e.preventDefault();const r=await fetch("/api/input-assessments",{method:editingPeriodId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:editingPeriodId?"UPDATE_PERIOD":"CREATE_PERIOD",id:editingPeriodId,data:{...periodForm,academicYearId:selectedYearId}})});if(r.ok){setIsPeriodOpen(false);fetchPeriods()}else alert((await r.json()).error)};
  const handleBatchSubmit=async(e:React.FormEvent)=>{e.preventDefault();const r=await fetch("/api/input-assessments",{method:editingBatchId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:editingBatchId?"UPDATE_BATCH":"CREATE_BATCH",id:editingBatchId,data:{...batchForm,periodId:currentPeriodIdForBatch}})});if(r.ok){setIsBatchOpen(false);fetchPeriods()}else alert((await r.json()).error)};
  
  const togglePeriodStatus = async (p: any) => {
    const newStatus = p.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    if (!confirm(`B?n c� ch?c mu?n ${newStatus === 'ACTIVE' ? 'M? KH�A' : 'KH�A'} đợt n�y?`)) return;
    const payload = { 
       action: "UPDATE_PERIOD",
       id: p.id,
       data: {
         ...p,
        startDate: p.startDate,
         endDate: p.endDate,
        status: newStatus
       }
    };
    const r = await fetch("/api/input-assessments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) fetchPeriods();
    else alert((await r.json()).error || "��? x?y ra l?i");
  };
  const deletePeriod=async(id:string)=>{if(!confirm("X�a ky?"))return;await fetch("/api/input-assessments?id="+id+"&type=period",{method:"DELETE"});fetchPeriods()};
  const deleteBatch=async(id:string)=>{if(!confirm("X�a dot?"))return;await fetch("/api/input-assessments?id="+id+"&type=batch",{method:"DELETE"});fetchPeriods()};
  const fmtDate=(d:string)=>d?new Date(d).toISOString().slice(0,10):"";
  const fetchSubjects=async()=>{const r=await fetch("/api/input-assessment-categories?type=subject");if(r.ok)setSubjectsList(await r.json())};
     const handleColumnConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = {
      type: "subject",
      id: columnConfigForm.subjectId,
      data: {
        columnNames: JSON.stringify({
         scores: columnConfigForm.scoreNames,
          comments: columnConfigForm.commentNames,
         showScoreInReport: columnConfigForm.showScoreInReport,
         showCommentInReport: columnConfigForm.showCommentInReport
        })
      }
    };
    const r = await fetch("/api/input-assessment-categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (r.ok) {
     setIsColumnConfigOpen(false);
      fetchSubjects();
    } else alert((await r.json()).error);
};     
  const handleSubjectSubmit=async(e:React.FormEvent)=>{e.preventDefault();const p=editingSubjectId?{type:"subject",id:editingSubjectId,data:{name:subjectForm.name,subjectType:subjectForm.subjectType||null,scoreColumns:ubjectForm.scoreColumns, commentColumns:ubjectForm.commentColumns,status:ubjectForm.status||"ACTIVE"}}:{type:"subject",data:{code:subjectForm.code,name:subjectForm.name,subjectType:subjectForm.subjectType||null,scoreColumns:ubjectForm.scoreColumns, commentColumns:ubjectForm.commentColumns,status:ubjectForm.status||"ACTIVE"}};const r=await fetch("/api/input-assessment-categories",{method:editingSubjectId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(r.ok){setIsSubjectOpen(false);fetchSubjects()}else alert((await r.json()).error)};
  const deleteSubject=async(id:string)=>{if(!confirm("X�a?"))return;await fetch("/api/input-assessment-categories?type=subject&id="+id,{method:"DELETE"});fetchSubjects()};
  const fetchMappings=async()=>{setMappingLoading(true);try{const r=await fetch("/api/grade-subject-mappings?grades="+selGrades.join(",")+"&eduSystems="+selEdus.join(","));if(r.ok)setMappings(await r.json())}catch(e){}setMappingLoading(false)};
  const addMapping=async(sid:string)=>{const r=await fetch("/api/grade-subject-mappings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grades:selGrades,eduSystems:selEdus,subjectId:sid})});if(r.ok)fetchMappings();else alert((await r.json()).error)};
  const removeMapping=async(sid:string)=>{await fetch("/api/grade-subject-mappings?subjectId="+sid+"&grades="+selGrades.join(",")+"&eduSystems="+selEdus.join(","),{method:"DELETE"});fetchMappings()};
  const assignedIds=[...new Set(mappings.map(m=>m.subjectId))];
  const uniqueAssigned=assignedIds.map(sid=>mappings.find(x=>x.subjectId===sid)).filter(Boolean);
  const availableSubjects=subjectsList.filter(s=>!assignedIds.includes(s.id));
  const toggleGrade=(g:string)=>setSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const toggleEdu=(c:string)=>setSelEdus(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);

  const fetchConfigs=async()=>{const r=await fetch("/api/assessment-configs");if(r.ok)setConfigsList(await r.json())};
  const handleConfigSubmit=async(e:React.FormEvent)=>{e.preventDefault();if(editingConfigId){const r=await fetch("/api/assessment-configs",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editingConfigId,name:configForm.name})});if(r.ok){setIsConfigOpen(false);fetchConfigs()}else alert((await r.json()).error)}else{const r=await fetch("/api/assessment-configs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...configForm, academicYearId: configForm.categoryType==="HOC_KY"?hkYearId:undefined})});if(r.ok){setIsConfigOpen(false);fetchConfigs()}else alert((await r.json()).error)}};
  
  const fetchStudents=async()=>{if(!studentPeriodId)return;setStudentsLoading(true);try{let url="/api/input-assessment-students?periodId="+studentPeriodId;if(studentBatchId)url+="&batchId="+studentBatchId;const r=await fetch(url);if(r.ok)setStudentsList(await r.json())}catch(e){}setStudentsLoading(false)};
  useEffect(()=>{if(studentPeriodId)fetchStudents()},[studentPeriodId,studentBatchId]);
  const handleOpenNewStudent=()=>{setEditingStudentId(null);setStudentForm({studentCode:"",fullName:"",dateOfBirth:"",admissionCriteria:"",surveyFormType:"",targetType:"",hocKy:"",kqgdTieuHoc:"",kqHocTap:"",kqRenLuyen:"",periodId:studentPeriodId,batchId:studentBatchId,grade:""});setIsStudentOpen(true)};
  const handleStudentSubmit=async(e)=>{e.preventDefault();const payload=editingStudentId?{id:editingStudentId,data:{...studentForm}}:{action:"CREATE",data:{...studentForm,periodId:studentPeriodId,batchId:studentBatchId||null}};const r=await fetch("/api/input-assessment-students",{method:editingStudentId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(r.ok){setIsStudentOpen(false);fetchStudents()}else alert((await r.json()).error)};
  const deleteStudent=async(id)=>{if(!confirm("X�a hocHồ sơinh nay?"))return;await fetch("/api/input-assessment-students?id="+id,{method:"DELETE"});fetchStudents()};
  const deleteSelectedStudents=async()=>{if(selectedStudentIds.length===0)return;if(!confirm("X�a "+selectedStudentIds.length+" hocHồ sơinh �? ch?n?"))return;await fetch("/api/input-assessment-students?ids="+selectedStudentIds.join(","),{method:"DELETE"});setSelectedStudentIds([]);fetchStudents()};
  const toggleStudentSelect=(id)=>setSelectedStudentIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleAllStudents=()=>{if(selectedStudentIds.length===filteredStudents.length)setSelectedStudentIds([]);elsesetSelectedStudentIds(filteredStudents.map(s=>s.id))};
  const dksOptions=configsList.filter(c=>c.categoryType==="DIEN_KS");
  const htksOptions=configsList.filter(c=>c.categoryType==="HINH_THUC_KS");
  constHồ sơelPeriodYearId = periods.find((p:any) => p.id ===tudentPeriodId)?.academicYearId;
  const hkOptions=configsList.filter((c:any)=>c.categoryType==="HOC_KY" && (!selPeriodYearId || c.academicYearId===selPeriodYearId));
  const kqgdThOptions=configsList.filter(c=>c.categoryType==="KQGD_TIEU_HOC");
  const kqhtOptions=configsList.filter(c=>c.categoryType==="KQ_HOC_TAP");
  const hsQuocTeOptions=configsList.filter(c=>c.categoryType==="HS_CT_QUOC_TE");
  const kqrlOptions=configsList.filter(c=>c.categoryType==="KQ_REN_LUYEN");
  const ltsOptions=configsList.filter(c=>c.categoryType==="LOAI_TUYEN_SINH");
  const filteredStudents=studentsList.filter(s=>{if(!studentSearch)return true;const q=studentSearch.toLowerCase();returns.studentCode?.toLowerCase().includes(q)||s.fullName?.toLowerCase().includes(q)});

  const COLUMN_MAP = {
    "Ma_HS_KS": "studentCode", "Ma HS KS": "studentCode", "MaHS": "studentCode", "studentCode": "studentCode",
    "Ho ten": "fullName", "Ho va Ten": "fullName", "HoTen": "fullName", "fullName": "fullName",
    "NgayHồ sơinh": "dateOfBirth", "NgaySinh": "dateOfBirth", "dateOfBirth": "dateOfBirth",
    "Khoi KS": "grade", "Khoi": "grade", "Khối": "grade", "grade": "grade",
    "Dien khaoHồ sơat": "admissionCriteria", "Dien KS": "admissionCriteria", "DienKS": "admissionCriteria", "admissionCriteria": "admissionCriteria",
    "Hinh thuc KS": "surveyFormType", "HinhThucKS": "surveyFormType", "surveyFormType": "surveyFormType",
    "Loai tuyenHồ sơinh": "targetType", "LoaiTuyenSinh": "targetType", "targetType": "targetType",
    "KQGD Tieu hoc": "kqgdTieuHoc", "kqgdTieuHoc": "kqgdTieuHoc",
    "KQ Hoc tap": "kqHocTap", "kqHocTap": "kqHocTap",
    "KQ Ren luyen": "kqRenLuyen", "kqRenLuyen": "kqRenLuyen",
    "Lop": "className", "className": "className",
    "Hoc ky": "hocKy", "HocKy": "hocKy", "hocKy": "hocKy",
    "N�m h?c tuyển sinh": "hocKy", "H?c k?": "hocKy",
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !studentPeriodId) return;
   setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) { alert("File Excel kh�ng c� d? li?u!");setImporting(false); return; }
      consCột điểmapped = rows.map((row) => {
        const item = { periodId:tudentPeriodId, batchId:tudentBatchId || null };
        Object.keys(row).forEach(key => {
          const k = key.trim();
          const field = COLUMN_MAP[k];
          if (field) {
            let val = row[key];
            if (field === "dateOfBirth" && val) {
              if (typeof val === "number") {
                const d = XLSX.SSF.parse_date_code(val);
                val = d.y + "-" + String(d.m).padStart(2,"0") + "-" + String(d.d).padStart(2,"0");
              } else { val = String(val); }
            } else { val = String(val || ""); }
            item[field] = val;
          }
        });
        return item;
      }).filter(r => r.studentCode && r.fullName);
      if (mapped.length === 0) { alert("Kh�ng t?m th?y d? li?u h?p l?. Ki?m tra tên c?t: Ma_HS_KS, Ho ten, NgayHồ sơinh...");setImporting(false); return; }
      const r = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BULK_CREATE", data: mapped })
      });
      const res = await r.json();
      if (res.success) {
        leCột điểmsg = "Import th�nh c�ng: " + res.created + "/" + mapped.length + " họcHồ sơinh.";
        if (res.errors?.length > 0) msg += "\nLoi " + res.errors.length + " dong: " + res.errors.map(e => "Dong " + e.row + " (" + e.code + "): " + e.error).join("\n");
        alert(msg);
        fetchStudents();
      } else { alert("Lỗi: " + (res.error || "Unknown")); }
    } catch (err) { alert("L?i �?c file: " + err.message); }
   setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const headers = ["Ma_HS_KS", "Ho ten", "NgayHồ sơinh", "Dien khaoHồ sơat", "Hinh thuc KS", "Loai tuyenHồ sơinh", "Hoc ky", "KQGD Tieu hoc", "KQ Hoc tap", "KQ Ren luyen"];
    const ws = XLSX.utils.aoa_to_sheet([headers, ["HS_001", "Nguy?n V�n A", "2010-01-15", "", "", "", ""]]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DS_HS_KS");
    XLSX.writeFile(wb, "Mau_Import_HS_KS.xlsx");
  };

  const currentPeriodBatches=periods.find(p=>p.id===studentPeriodId)?.batches||[];

  const deleteConfig=async(id:string)=>{if(!confirm("X�a?"))return;await fetch("/api/assessment-configs?id="+id,{method:"DELETE"});fetchConfigs()};
  return (
    <div className="space-y-5">
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hiddenHồ sơhadow-sm">
        {[{key:"periods",label:"Kỳ khảo sát",icon:CalendarDays},{key:"categories",label:"Danh mục",icon:ListChecks},{key:"subjects",label:"Môn khảo sát",icon:BookOpen},{key:"mapping",label:"Cấu hình theo Khối",icon:Settings},{key:"students",label:"DS HS khảo sát",icon:Users},{key:"assignments",label:"Phân công GV",icon:UserCheck},{key:"reports",label:"Tổng hợp KQ",icon:BarChart}].map(tab=>(
          <button key={tab.key} onClick={()=>setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${activeTab===tab.key?"border-indigo-600 text-indigo-700 bg-indigo-50/50":"border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}><tab.icon className="w-4 h-4"/>{tab.label}</button>
        ))}
      </div>

      {/* TAB: DANH MUC */}
      {activeTab==="categories"&&(
        <div className="space-y-6">
          {CAT_TYPES.map(cat=>{
            const items=configsList.filter(c=>c.categoryType===cat.key);
            return(
              <div key={cat.key} className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500"/>{cat.label} <span className="text-sm font-normal text-slate-400">({items.length})</span></h3>
                  <button onClick={()=>{setEditingConfigId(null);setConfigForm({categoryType:cat.key,code:"",name:""});setIsConfigOpen(true)}} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-mediumHồ sơhadow-sm"><Plus className="w-3.5 h-3.5"/>Thêm</button>
                </div>
                <div className="p-4">
                  {items.length===0?<div className="text-sm text-slate-400 text-center py-4">Ch�a c� mục n�o.</div>:(
                    <div className="flex flex-wrap gap-2">
                      {items.map((item:any)=>(
                        <div key={item.id} className={`group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${cat.color}`}>
                          <span className="font-bold">{item.name}</span>
                          <span className="text-xs opacity-60 font-mono">{item.code}</span>
                          <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                            <button onClick={()=>{setEditingConfigId(item.id);setConfigForm({categoryType:item.categoryType,code:item.code,name:item.name});setIsConfigOpen(true)}} className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-indigo-500 hover:bg-indigo-50Hồ sơhadow-sm"><Pencil className="w-2.5 h-2.5"/></button>
                            <button onClick={()=>deleteConfig(item.id)} className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-red-500 hover:bg-red-50Hồ sơhadow-sm"><Trash2 className="w-2.5 h-2.5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* HOC KY - grouped by year */}
          <div className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-500"/>N�m h?c tuyển sinh</h3>
              <div className="flex items-center gap-3">
                <select value={hkYearId} onChange={e=>setHkYearId(e.target.value)} className="border rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-50 outline-none">
                  {academicYears.map((y:any)=><option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
                <button onClick={()=>{setEditingConfigId(null);setConfigForm({categoryType:"HOC_KY",code:"",name:"",academicYearId:hkYearId});setIsConfigOpen(true)}} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-mediumHồ sơhadow-sm"><Plus className="w-3.5 h-3.5"/>Thêm</button>
              </div>
            </div>
            <div className="p-4">
              {(()=>{
                const hkItems=configsList.filter(c=>c.categoryType==="HOC_KY"&&c.academicYearId===hkYearId);
                if(hkItems.length===0) return <div className="text-sm text-slate-400 text-center py-4">Ch�a c� N�m h?c tuyển sinh cho n�m h?c n�y. B?m Thêm �? t?o.</div>;
                return(<div className="flex flex-wrap gap-2">{hkItems.map((item:any)=>(
                  <div key={item.id} className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium bg-emerald-100 text-emerald-700 border-emerald-200">
                    <span className="font-bold">{item.name}</span>
                    <span className="text-xs opacity-60 font-mono">{item.code}</span>
                    <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                      <button onClick={()=>{setEditingConfigId(item.id);setConfigForm({categoryType:item.categoryType,code:item.code,name:item.name,academicYearId:item.academicYearId||""});setIsConfigOpen(true)}} className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-indigo-500 hover:bg-indigo-50Hồ sơhadow-sm"><Pencil className="w-2.5 h-2.5"/></button>
                      <button onClick={()=>deleteConfig(item.id)} className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-red-500 hover:bg-red-50Hồ sơhadow-sm"><Trash2 className="w-2.5 h-2.5"/></button>
                    </div>
                  </div>
                ))}</div>)
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB: KY KHAO SAT */}
      {activeTab==="periods"&&(<>
        <div className="glass-card p-6 rounded-2xl hover-lift border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3"><CalendarDays className="w-5 h-5 text-indigo-500"/><span className="font-semibold text-slate-800">Chọn Năm học:</span><select className="border rounded-lg px-3 py-1.5 outline-none text-sm font-medium bg-slate-50" value={selectedYearId} onChange={e=>setSelectedYearId(e.target.value)}>{academicYears.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <button onClick={handleOpenNewPeriod} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-mediumHồ sơhadow-sm"><Plus className="w-4 h-4"/>Thêm Kỳ KS</button>
        </div>
        {loading?<div className="text-center py-12 text-slate-500">Đang tải...</div>:periods.length===0?<div className="text-center py-16 bg-white rounded-xlHồ sơhadow-sm border text-slate-500">Ch�a c� Kỳ khảo sát.</div>:(
          <div className="grid gap-6">{periods.map(p=>{
            
    const pendingCount = p.InputAssessmentTeacherAssignment?.filter((a: any) => a.unlockRequestStatus === 'PENDING').length || 0;
    return (
            <div key={p.id} className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
               {pendingCount > 0 && (
                   <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex justify-between items-center cursor-pointer hover:bg-amber-100 transition-colors" onClick={() =>setReviewUnlockPeriod(p)}>
                       <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                           <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>
                           C� {pendingCount} y�u c?u xin Mở khóa điểm �đang chờ duyệt!
                       </div>
                       <button className="text-xs font-semibold px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded-lgHồ sơhadow-sm hover:bg-amber-50">Xem & Duyệt ngay?</button>
                   </div>
               )}
              <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">

                <div><h3 className="text-lg font-bold text-indigo-900">{p.name}<span className="text-sm font-medium text-slate-500 bg-white border px-2 py-0.5 rounded ml-2">{p.code}</span><span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded ml-2">{p.campus?.campusName||'Tất cả CS'}</span>{p.status !== 'ACTIVE' && <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded ml-2 flex items-center gap-1 inline-flex"><Lock className="w-3 h-3"/> KH�A �I?M</span>}</h3><div className="flex gap-4 mt-2 text-sm"><span className="text-slate-400">B�:</span><span className="font-medium text-slate-700">{p.startDate?new Date(p.startDate).toLocaleDateString('vi-VN'):'-'}</span><span className="text-slate-400 ml-4">Kết thúc:</span><span className="font-medium text-slate-700">{p.endDate?new Date(p.endDate).toLocaleDateString('vi-VN'):'-'}</span><span className="text-slate-400 ml-4">PT:</span><span className="font-medium text-slate-700 flex items-center gap-1"><User className="w-3.5 h-3.5"/>{p.assignedUser?.fullName||'Ch�a PC'}</span></div></div>
                <div className="flex gap-2"><button onClick={()=>{setEditingPeriodId(p.id);setPeriodForm({type:p.code?.startsWith('OPEN_DAY')?"OPEN_DAY":"DOT_LE",code:p.code,name:p.name,description:p.description||"",startDate:fmtDate(p.startDate),endDate:fmtDate(p.endDate),campusId:p.campusId||"",assignedUserId:p.assignedUserId||""});setIsPeriodOpen(true)}} className="px-3 py-1.5 text-sm bg-white border text-slate-600 rounded-lg hover:text-indigo-600 flex items-center gap-1.5Hồ sơhadow-sm"><Pencil className="w-3.5 h-3.5"/>Sửa</button><button onClick={() => togglePeriodStatus(p)} className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5Hồ sơhadow-sm border transition-colors ${p.status === 'ACTIVE' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
        {p.status === 'ACTIVE' ? <><Lock className="w-3.5 h-3.5"/> Khóa điểm</> : <><Unlock className="w-3.5 h-3.5"/> Mở khóa</>}
    </button>
    <button onClick={()=>deletePeriod(p.id)} className="px-3 py-1.5 text-sm bg-white border text-red-500 rounded-lg hover:bg-red-50Hồ sơhadow-sm"><Trash2 className="w-3.5 h-3.5"/></button></div>
              </div>
              <div className="p-5"><div className="flex justify-between items-center mb-4"><h4 className="font-semibold text-slate-700 flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400"/>Đợt KS ({p.batches?.length||0})</h4><button onClick={()=>{setCurrentPeriodIdForBatch(p.id);setEditingBatchId(null);setBatchForm({batchNumber:(p.batches?.length||0)+1,name:"Dot "+((p.batches?.length||0)+1),startDate:"",endDate:""});setIsBatchOpen(true)}} className="text-sm text-indigo-600 font-medium flex items-center gap-1"><Plus className="w-3.5 h-3.5"/>Thêm đợt</button></div>
                {p.batches?.length>0?(<div className="grid grid-cols-1 md:grid-cols-3 gap-4">{p.batches.map((b:any)=>(<div key={b.id} className="border rounded-xl p-4 hover:border-indigo-300 bg-whiteHồ sơhadow-sm relative group"><div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-1"><button onClick={()=>{setCurrentPeriodIdForBatch(p.id);setEditingBatchId(b.id);setBatchForm({batchNumber:b.batchNumber,name:b.name,startDate:fmtDate(b.startDate),endDate:fmtDate(b.endDate)});setIsBatchOpen(true)}} className="p-1 text-slate-400 hover:text-indigo-600 bg-white rounded-fullHồ sơhadow-sm border"><Pencil className="w-3 h-3"/></button><button onClick={()=>deleteBatch(b.id)} className="p-1 text-slate-400 hover:text-red-500 bg-white rounded-fullHồ sơhadow-sm border"><Trash2 className="w-3 h-3"/></button></div><div className="font-bold text-indigo-900 mb-2 flex items-center gap-2 pr-12"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">{b.batchNumber}</span>{b.name}</div><div className="space-y-1.5 mt-3"><div className="flex justify-between text-sm"><span className="text-slate-500">B�:</span><span className="font-medium">{b.startDate?new Date(b.startDate).toLocaleDateString('vi-VN'):'-'}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Kết thúc:</span><span className="font-medium">{b.endDate?new Date(b.endDate).toLocaleDateString('vi-VN'):'-'}</span></div></div></div>))}</div>):<div className="text-center py-6 text-sm text-slate-400 bg-slate-50 border border-dashed rounded-xl">Ch�a c� đợt.</div>}
              </div>
            </div>
          )})}</div>
        )}
      </>)}
      {/* TAB: MON KHAO SAT */}
      {activeTab==="subjects"&&(
        <div className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50/50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500"/>Môn khảo sát ({subjectsList.length})</h3><button onClick={()=>{setEditingSubjectId(null);setSubjectForm({code:"",name:"",subjectType:"",scoreColumns: 1, commentColumns: 1,status: "ACTIVE"});setIsSubjectOpen(true)}} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-mediumHồ sơhadow-sm"><Plus className="w-4 h-4"/>Thêm mới</button></div>
          {subjectsList.length===0?<div className="text-center py-12 text-slate-400">Ch�a c� môn KS.</div>:(
            <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-slate-600 text-xs uppercase"><th className="px-5 py-3 text-left w-12">STT</th><th className="px-5 py-3 text-left">Mã</th><th className="px-5 py-3 text-left">T�n môn</th><th className="px-5 py-3 text-left">Loại</th><th className="px-5 py-3 text-center">Cấu hình cột</th><th className="px-5 py-3 text-left">Trống th�i</th><th className="px-5 py-3 text-center w-24">Thao t�c</th></tr></thead>
              <tbody>{subjectsList.map((s:any,i:number)=>(<tr key={s.id} className="border-t hover:bg-indigo-50/30"><td className="px-5 py-3 text-slate-500">{i+1}</td><td className="px-5 py-3 font-mono font-bold text-indigo-700">{s.code}</td><td className="px-5 py-3 font-medium text-slate-800">{s.name}</td><td className="px-5 py-3">{s.subjectType?<span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{s.subjectType}</span>:'-'}</td><td className="px-5 py-3 text-center"><button type="button" onClick={()=>{let cn={scores:[],comments:[]}; try{if(s.columnNames) cn=JSON.parse(s.columnNames);}catch(e){}setColumnConfigForm({subjectId:s.id, name:s.name,scoreNames:cn.scores||[], commentNames:cn.comments||[],showScoreInReport:cn.showScoreInReport||[],showCommentInReport:cn.showCommentInReport||[],scoreColumns:s.scoreColumns||1, commentColumns:s.commentColumns||1});setIsColumnConfigOpen(true);}} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">{s.scoreColumns ?? 1} c?t �i?m / {s.commentColumns ?? 1} c?t NX</button></td><td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}`}>{s.status==='ACTIVE'?'Ho?t �?ng':'Ng�ng'}</span></td><td className="px-5 py-3 text-center"><div className="flex gap-1 justify-center"><button onClick={()=>{setEditingSubjectId(s.id);setSubjectForm({code:s.code,name:s.name,subjectType:s.subjectType||"",scoreColumns:s.scoreColumns ?? 1, commentColumns:s.commentColumns ?? 1,status:s.status || "ACTIVE"});setIsSubjectOpen(true)}} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Pencil className="w-3.5 h-3.5"/></button><button onClick={()=>deleteSubject(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button></div></td></tr>))}</tbody></table>
          )}
        </div>
      )}

      {/* TAB: CAU HINH MULTI */}
      {activeTab==="mapping"&&(
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-xlHồ sơhadow-sm border">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500"/>Cấu hình M�n KS theo Khối v� Hệ học</h3>
            <p className="text-sm text-slate-500 mb-4">Ch?n nhi?u Khối v� Hệ học �? g�n M�n KS �?ng lo?t.</p>
            <div className="flex gap-8 items-start flex-wrap">
              <div><span className="block font-semibold text-slate-700 text-sm mb-2">Khối:</span><div className="flex flex-wrap gap-2">
                <button onClick={()=>setSelGrades(selGrades.length===grades.length?[]:[...grades])} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selGrades.length===grades.length?'bg-indigo-600 text-white border-indigo-600':'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}>Tất cả</button>
                {grades.map((g:string)=>(<button key={g} onClick={()=>toggleGrade(g)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selGrades.includes(g)?'bg-indigo-100 text-indigo-700 border-indigo-300':'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{selGrades.includes(g)&&<Check className="w-3 h-3 inline mr-1"/>}K{g}</button>))}
              </div></div>
              <div><span className="block font-semibold text-slate-700 text-sm mb-2">Hệ học:</span><div className="flex flex-wrap gap-2">
                <button onClick={()=>setSelEdus(selEdus.length===eduSystems.length?[]:eduSystems.map((e:any)=>e.code))} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selEdus.length===eduSystems.length?'bg-purple-600 text-white border-purple-600':'bg-white text-purple-600 border-purple-300 hover:bg-purple-50'}`}>Tất cả</button>
                {eduSystems.map((es:any)=>(<button key={es.code} onClick={()=>toggleEdu(es.code)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selEdus.includes(es.code)?'bg-purple-100 text-purple-700 border-purple-300':'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>{selEdus.includes(es.code)&&<Check className="w-3 h-3 inline mr-1"/>}{es.code} - {es.name}</button>))}
              </div></div>
            </div>
            {selGrades.length>0&&selEdus.length>0&&(<div className="mt-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700"><strong>�Đang chọn:</strong> {selGrades.map(g=>"K"+g).join(", ")} x {selEdus.join(", ")} = <strong>{selGrades.length*selEdus.length}</strong> tổ hợp</div>)}
          </div>
          {selGrades.length>0&&selEdus.length>0&&(
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
                <div className="px-5 py-4 border-b bg-indigo-50/50"><h4 className="font-bold text-indigo-800 flex items-center gap-2"><BookOpen className="w-4 h-4"/>M�n �? g�n ({uniqueAssigned.length})</h4><p className="text-xs text-indigo-500 mt-1">BoHồ sơe xoa khoi tat ca tổ hợp</p></div>
                {mappingLoading?<div className="p-8 text-center text-slate-400">Đang tải...</div>:uniqueAssigned.length===0?<div className="p-8 text-center text-slate-400">Ch�a c� môn. Thêm t? b�n ph?i.</div>:(
                  <div className="p-4Hồ sơpace-y-2">{uniqueAssigned.map((m:any,i:number)=>(<div key={m.subjectId} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:border-indigo-300 group"><div className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{i+1}</span><div><span className="font-bold text-slate-800">{m.subject?.name}</span><span className="ml-2 text-xs font-mono text-slate-400">{m.subject?.code}</span>{m.subject?.subjectType&&<span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{m.subject.subjectType}</span>}</div></div><button onClick={()=>removeMapping(m.subjectId)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4"/></button></div>))}</div>
                )}
              </div>
              <div className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
                <div className="px-5 py-4 border-b bg-emerald-50/50"><h4 className="font-bold text-emerald-800 flex items-center gap-2"><Plus className="w-4 h-4"/>M�n ch�a g�n ({availableSubjects.length})</h4><p className="text-xs text-emerald-500 mt-1">G�n v�o {selGrades.length*selEdus.length} tổ hợp</p></div>
                {availableSubjects.length===0?<div className="p-8 text-center text-slate-400">�? g�n h?t.</div>:(
                  <div className="p-4Hồ sơpace-y-2">{availableSubjects.map((s:any)=>(<button key={s.id} onClick={()=>addMapping(s.id)} className="w-full flex items-center justify-between bg-white border border-dashed rounded-lg px-4 py-3 hover:border-emerald-400 hover:bg-emerald-50 text-left"><div className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Plus className="w-3.5 h-3.5"/></span><div><span className="font-bold text-slate-800">{s.name}</span><span className="ml-2 text-xs font-mono text-slate-400">{s.code}</span>{s.subjectType&&<span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.subjectType}</span>}</div></div><span className="text-xs text-emerald-600 font-medium">+ G�n</span></button>))}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: DS HS KHAO SAT */}
      {activeTab==="students"&&(
        <div className="space-y-5">
          <div className="glass-card p-6 rounded-2xl hover-lift border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500"/>
              <span className="font-semibold text-slate-800 text-sm">Kỳ KS:</span>
              <select className="border rounded-lg px-3 py-1.5 outline-none text-sm font-medium bg-slate-50 min-w-[180px]" value={studentPeriodId} onChange={e=>{setStudentPeriodId(e.target.value);setStudentBatchId("")}}>
                <option value="">-- Chọn Kỳ --</option>
                {periods.map((p)=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            {studentPeriodId && currentPeriodBatches.length>0 && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 text-sm">đợt:</span>
                <select className="border rounded-lg px-3 py-1.5 outline-none text-sm font-medium bg-slate-50" value={studentBatchId} onChange={e=>setStudentBatchId(e.target.value)}>
                  <option value="">Tất cả</option>
                  {currentPeriodBatches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex-1"/>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input placeholder="Tìm Mã HS, Họ tên..." value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} className="border rounded-lg pl-9 pr-3 py-1.5 text-sm w-56 outline-none focus:border-indigo-400"/>
            </div>
            {studentPeriodId && (<>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleExcelImport} className="hidden" id="excel-import-hs"/>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium" title="Tải mẫu Excel">
                <Download className="w-4 h-4"/>Mẫu Excel
              </button>
              <button onClick={()=>fileInputRef.current?.click()} disabled={importing} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-mediumHồ sơhadow-sm disabled:opacity-50">
                {importing ? <><FileSpreadsheet className="w-4 h-4 animate-pulse"/>�Đang import...</> : <><Upload className="w-4 h-4"/>Import Excel</>}
              </button>
              <button onClick={handleOpenNewStudent} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-mediumHồ sơhadow-sm">
                <Plus className="w-4 h-4"/>Thêm HS
              </button>
            </>)}
          </div>
          {!studentPeriodId ? (
            <div className="text-center py-16 bg-white rounded-xlHồ sơhadow-sm border text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300"/>
              <p className="font-medium">Ch?n Kỳ khảo sát �? xem danhHồ sơ�ch h?cHồ sơinh.</p>
            </div>
          ) :tudentsLoading ? (
            <div className="text-center py-12 text-slate-500">Đang tải...</div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500"/>DS HọcHồ sơinh KS <span className="text-sm font-normal text-slate-400">({filteredStudents.length})</span></h3>
                {selectedStudentIds.length>0 && (<button onClick={deleteSelectedStudents} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs font-mediumHồ sơhadow-sm"><Trash2 className="w-3.5 h-3.5"/>X�a {selectedStudentIds.length} �? ch?n</button>)}
              </div>
              {filteredStudents.length===0 ? (
                <div className="text-center py-12 text-slate-400">Ch�a c� h?cHồ sơinh n�o.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 w-10"><input type="checkbox" checked={selectedStudentIds.length===filteredStudents.length && filteredStudents.length>0} onChange={toggleAllStudents} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"/></th>
                        <th className="px-4 py-3 text-left w-10 text-xs uppercase tracking-wider text-slate-500 font-bold">STT</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">HọcHồ sơinh</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">Cấu hình Kh?oHồ sơ�t</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500 font-bold">Th�nh t�ch</th>
                        <th className="px-4 py-3 text-center w-24 text-xs uppercase tracking-wider text-slate-500 font-bold">Thao t�c</th>
                      </tr>
                    </thead>
                    <tbody>{filteredStudents.map((s,i)=>(
                      <tr key={s.id} className={"border-b last:border-b-0 hover:bg-slate-50/80 transition-colors " + (selectedStudentIds.includes(s.id)?'bg-indigo-50/60':'')}>
                        <td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={()=>toggleStudentSelect(s.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 mt-1"/></td>
                        <td className="px-4 py-4 text-slate-500 font-medium align-top pt-5">{i+1}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-base">{s.fullName}</span>
                              {s.grade && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">Khối {s.grade}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{s.studentCode}</span>
                              <span className="text-slate-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5"/> {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : 'Trống'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {s.admissionCriteria && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-violet-50 text-violet-700 font-medium border border-violet-100" title="Diện KS"><span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>{s.admissionCriteria}</span>}
                            {s.surveyFormType && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-cyan-50 text-cyan-700 font-medium border border-cyan-100" title="Hình thức"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>{s.surveyFormType}</span>}
                            {s.targetType && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-100" title="Loại TS"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>{s.targetType}</span>}
                            {s.hocKy && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100" title="N�m h?c tuyển sinh"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{s.hocKy}</span>}
                            {(!s.admissionCriteria && !s.surveyFormType && !s.targetType && !s.hocKy) && <span className="text-xs text-slate-400 italic">Ch�a thi?t l?p</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            {s.kqgdTieuHoc && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-16">CT Bộ:</span><span className="font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-rose-100">{s.kqgdTieuHoc}</span></div>}
                            {s.kqHocTap && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-16">Quốc tế:</span><span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-blue-100">{s.kqHocTap}</span></div>}
                            {s.kqRenLuyen && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-16">R�n luy?n:</span><span className="font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-teal-100">{s.kqRenLuyen}</span></div>}
                            {(!s.kqgdTieuHoc && !s.kqHocTap && !s.kqRenLuyen) && <span className="text-xs text-slate-400 italic">Trống</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          <div className="flex gap-2 justify-center pt-2">
                            <button onClick={()=>{setEditingStudentId(s.id);setStudentForm({studentCode:s.studentCode,fullName:s.fullName,dateOfBirth:s.dateOfBirth?new Date(s.dateOfBirth).toISOString().slice(0,10):"",admissionCriteria:s.admissionCriteria||"",surveyFormType:s.surveyFormType||"",targetType:s.targetType||"",hocKy:s.hocKy||"",kqgdTieuHoc:s.kqgdTieuHoc||"",kqHocTap:s.kqHocTap||"",kqRenLuyen:s.kqRenLuyen||"",grade:s.grade||"",periodId:s.periodId,batchId:s.batchId||""});setIsStudentOpen(true)}} className="p-2 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 bg-white transition-all shadow-sm"><Pencil className="w-4 h-4"/></button>
                            <button onClick={()=>deleteStudent(s.id)} className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 bg-white transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* TAB: PHAN CONG GV */}
      {activeTab==="assignments"&&(
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xlHồ sơhadow-sm border border-slate-200">
            <div className="flex flex-colHồ sơm:flex-rowHồ sơm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-xl mt-0.5">
                  <UserCheck className="w-6 h-6 text-indigo-600"/>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Ph�n c�ng Gi�o vi�n Kh?oHồ sơ�t</h3>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Giao nhi?m v? ph? tr�ch môn thi cho gi�o vi�n t? T? chuy�n môn</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column - Teacher Selection (5/12) */}
              <div className="lg:col-span-5Hồ sơpace-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-xl"></div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-boldHồ sơhadow-sm">1</div>
                   <h4 className="font-bold text-slate-700 text-base tracking-tight">K? Kh?oHồ sơ�t & Ng�?i ph? tr�ch</h4>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">K? Kh?oHồ sơ�t <span className="text-red-500">*</span></label>
                    <select className="w-full border-slate-300 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200Hồ sơhadow-sm transition-shadow bg-white" value={assignPeriodId} onChange={e=>{setAssignPeriodId(e.target.value);setAssignBatchId("")}}>
                      <option value="">-- Chọn Kỳ --</option>
                      {periods.map(p=><option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  {assignPeriodId && periods.find(p=>p.id===assignPeriodId)?.batches?.length > 0 && (
                    <div className="animate-in fade-inHồ sơlide-in-from-top-2 duration-300">
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Đợt KS</label>
                      <select className="w-full border-slate-300 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200Hồ sơhadow-sm transition-shadow bg-white" value={assignBatchId} onChange={e=>setAssignBatchId(e.target.value)}>
                        <option value="">T?t c? c�c đợt</option>
                        {periods.find(p=>p.id===assignPeriodId)?.batches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="border-t border-slate-200 my-2"></div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">L?c theo T? CM <span className="text-slate-400 font-normal normal-case tracking-normal text-[11px]">(Kh�ng b?t bu?c)</span></label>
                    <select className="w-full border-slate-300 rounded-xl px-4 py-3 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200Hồ sơhadow-sm transition-shadow bg-white" value={assignDepartmentId} onChange={e => {setAssignDepartmentId(e.target.value);setAssignTeacherId("")}}>
                      <option value="">T?t c? T? chuy�n môn</option>
                      {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Gi�o vi�n Ph? tr�ch <span className="text-red-500">*</span></label>
                    <select className="w-full border-indigo-200 rounded-xl px-4 py-3 outline-none text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200Hồ sơhadow-sm transition-shadow bg-indigo-50/50" value={assignTeacherId} onChange={e=>setAssignTeacherId(e.target.value)}>
                      <option value="">-- Ch?n Gi�o vi�n --</option>
                      {teachers?.filter((t: any) => !assignDepartmentId || t.departmentId === assignDepartmentId).map((t:any)=><option key={t.userId} value={t.userId}>{t.teacherName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column - Subject, Grade, Edu Selection (7/12) */}
              <div className="lg:col-span-7Hồ sơpace-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-xl"></div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-boldHồ sơhadow-sm">2</div>
                   <h4 className="font-bold text-slate-700 text-base tracking-tight">Ph?m vi Ph�n c�ng</h4>
                </div>

                <div className="space-y-8 flex-1">
                  {/* Subj */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">M�n Kh?oHồ sơ�t <span className="text-red-500">*</span></span>
                      <button onClick={()=>setAssignSelSubjects(assignSelSubjects.length===subjectsList.length?[]:subjectsList.map((s:any)=>s.id))} className="text-xs text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colorsHồ sơhadow-sm">
                        {assignSelSubjects.length===subjectsList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2.5 text-sm max-h-48 overflow-y-auto min-h-[40px] p-1">
                      {subjectsList.map((s:any)=><button key={s.id} onClick={()=>setAssignSelSubjects(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} className={"px-4 py-2 rounded-xl border font-medium transition-all duration-200 " + (assignSelSubjects.includes(s.id)?'bg-indigo-600 text-white border-indigo-600Hồ sơhadow-mdHồ sơhadow-indigo-200 ring-2 ring-indigo-200 ring-offset-1':'bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 border-slate-300Hồ sơhadow-sm')}>{s.name}</button>)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1Hồ sơm:grid-cols-2 gap-8 bg-white p-5 rounded-xl border border-slate-200Hồ sơhadow-sm">
                    {/* Grade */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Khối <span className="text-red-500">*</span></span>
                        <button onClick={()=>setAssignSelGrades(assignSelGrades.length===grades.length?[]:[...grades])} className="text-xs text-teal-700 hover:text-teal-900 font-bold bg-teal-100 hover:bg-teal-200 px-3 py-1.5 rounded-lg transition-colorsHồ sơhadow-sm">Chọn tất cả</button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {grades.map((g:string)=><button key={g} onClick={()=>setAssignSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g])} className={"px-4 py-2 rounded-xl border font-bold transition-all duration-200 " + (assignSelGrades.includes(g)?'bg-teal-500 text-white border-teal-500Hồ sơhadow-mdHồ sơhadow-teal-200 ring-2 ring-teal-200 ring-offset-1':'bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 border-slate-300Hồ sơhadow-sm')}>K{g}</button>)}
                      </div>
                    </div>

                    {/* Edu */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="block text-xs uppercase tracking-wider font-bold text-slate-500">Hệ học <span className="text-red-500">*</span></span>
                        <button onClick={()=>setAssignSelEdus(assignSelEdus.length===eduSystems.length?[]:eduSystems.map((e:any)=>e.code))} className="text-xs text-amber-700 hover:text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colorsHồ sơhadow-sm">Chọn tất cả</button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {eduSystems.map((es:any)=><button key={es.code} onClick={()=>setAssignSelEdus(p=>p.includes(es.code)?p.filter(x=>x!==es.code):[...p,es.code])} className={"px-4 py-2 rounded-xl border font-bold transition-all duration-200 " + (assignSelEdus.includes(es.code)?'bg-amber-500 text-white border-amber-500Hồ sơhadow-mdHồ sơhadow-amber-200 ring-2 ring-amber-200 ring-offset-1':'bg-white text-slate-600 hover:border-amber-400 hover:bg-amber-50 border-slate-300Hồ sơhadow-sm')}>{es.code}</button>)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-auto">
                  <button onClick={handleAssignSubmit} disabled={!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-extrabold text-base rounded-xlHồ sơhadow-lgHồ sơhadow-indigo-200 hover:from-indigo-700 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"><Check className="w-5 h-5"/> {(!assignPeriodId || !assignTeacherId || assignSelSubjects.length===0 || assignSelGrades.length===0 || assignSelEdus.length===0) ? "Vui l?ng ch?n �? th�ng tin" : "X�c nh?n & L�u Ph�n c�ng"}</button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {assignPeriodId && (
            <div className="glass-card rounded-2xl overflow-hiddenHồ sơhadow-xl border-slate-200">
               <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
                  <h4 className="font-bold text-slate-800">DanhHồ sơ�ch �? Ph�n c�ng ({assignments.length})</h4>
                  {selectedAssignmentIds.length > 0 && (
                    <button onClick={deleteSelectedAssignments} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs font-mediumHồ sơhadow-sm"><Trash2 className="w-3.5 h-3.5"/>X�a {selectedAssignmentIds.length} �? ch?n</button>
                  )}
               </div>
               {assignmentsLoading ? <div className="p-8 text-center text-slate-400">Đang tải...</div> : assignments.length === 0 ? <div className="p-8 text-center text-slate-400">Ch�a c� ph�n c�ng n�o.</div> : (
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 text-xs uppercaseHồ sơticky top-0Hồ sơhadow-sm z-10"><tr className="border-b">
                        <th className="py-3 px-4 w-10"><input type="checkbox" checked={selectedAssignmentIds.length===assignments.length && assignments.length>0} onChange={toggleAllAssignments} className="w-4 h-4 rounded"/></th>
                        <th className="py-3 px-4 text-left w-10">STT</th>
                        <th className="py-3 px-4 text-left">Gi�o vi�n</th>
                        <th className="py-3 px-4 text-left">đợt</th>
                        <th className="py-3 px-4 text-left">C�c M�n KS</th>
                        <th className="py-3 px-4 text-left">Khối</th>
                        <th className="py-3 px-4 text-left">Hệ học</th>
                        <th className="py-3 px-4 text-left">Y�u c?u M? form</th>
                        <th className="py-3 px-4 text-center">Thao t�c</th>
                      </tr></thead>
                      <tbody>
                      {(()=>{
                        consCột điểmap = new Map();
                        assignments.forEach(a => {
                          const key = a.userId + "_" + (a.batchId || "ALL");
                          if (!map.has(key)) {
                            map.set(key, { ...a, pendingRequests: a.unlockRequestStatus === 'PENDING' ? [{ id: a.id, reason: a.unlockReason || 'Kh�ng c� l? do' }] : [], subjectNames: new Set([a.subject?.name]),subjectsSet: new Set([a.subjectId]), gradesSet: new Set([a.grade]), edusSet: new Set([a.educationSystem]), ids: [a.id] });
                          } else {
                            const entry = map.get(key);
                            if(a.subject?.name) entry.subjectNames.add(a.subject.name);
                            if(a.subjectId) entry.subjectsSet.add(a.subjectId);
                            entry.gradesSet.add(a.grade);
                            entry.edusSet.add(a.educationSystem);
                            if (a.unlockRequestStatus === 'PENDING') { entry.pendingRequests = entry.pendingRequests || []; entry.pendingRequests.push({ id: a.id, reason: a.unlockReason || 'Kh�ng c� l? do' }); }
                            entry.ids.push(a.id);
                          }
                        });
                        return Array.from(map.values()).map((g:any, i) => {
                          const allSelected = g.ids.every(id =>selectedAssignmentIds.includes(id));
                          constHồ sơomeSelected = g.ids.some(id =>selectedAssignmentIds.includes(id));
                          
                          const toggleGroup = () => {
                             if (allSelected) {
                              setSelectedAssignmentIds(p => p.filter(id => !g.ids.includes(id)));
                             } else {
                              setSelectedAssignmentIds(p => [...new Set([...p, ...g.ids])]);
                             }
                          };

                          const deleteGroup = async () => {
                             if (!confirm("X�a to�n b? " + g.ids.length + " ph�n c�ng c?a gi�o vi�n n�y?")) return;
                             await fetch("/api/input-assessment-assignments?ids=" + g.ids.join(","), { method: "DELETE" });
                            setSelectedAssignmentIds(p => p.filter(id => !g.ids.includes(id)));
                             fetchAssignments();
                          };

                          const editGroup = () => {
                             const teacher = teachers.find((t: any) => t.userId === g.userId);
                             if (teacher?.departmentId)setAssignDepartmentId(teacher.departmentId);
                            setAssignTeacherId(g.userId);
                            setAssignBatchId(g.batchId || "");
                            setAssignSelSubjects(Array.from(g.subjectsSet));
                            setAssignSelGrades(Array.from(g.gradesSet));
                            setAssignSelEdus(Array.from(g.edusSet));
                             window.scrollTo({ top: 0, behavior: 'smooth' });
                          };

                          return (
                            <tr key={g.id} className={"border-b transition-colors " + (allSelected?'bg-indigo-50/50 hover:bg-indigo-50/80':'hover:bg-slate-50')}>
                              <td className="py-3 px-4"><input type="checkbox" checked={allSelected} ref={el => { if(el) el.indeterminate =omeSelected && !allSelected; }} onChange={toggleGroup} className="w-4 h-4 rounded"/></td>
                              <td className="py-3 px-4 text-slate-500 font-medium">{i+1}</td>
                              <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2 pt-4"><User className="w-4 h-4 text-slate-400" />{g.user?.fullName || "N/A"}</td>
                              <td className="py-3 px-4 text-slate-600">{g.batch?.name || "T?t c?"}</td>
                              <td className="py-3 px-4 max-w-[200px]">
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(g.subjectNames).map(name => <span key={name} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium text-xs border border-indigo-100">{name}</span>)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(g.gradesSet).sort().map(gr => <span key={gr} className="font-semibold text-slate-700 text-xs">K{gr}</span>)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(g.edusSet).sort().map(edu => <span key={edu} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-medium text-xs border border-purple-100">{edu}</span>)}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center"><div className="flex gap-1 justify-center">
                                <button onClick={editGroup} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50" title="Sửa"><Pencil className="w-4 h-4"/></button>
                                <button onClick={deleteGroup} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="X�a"><Trash2 className="w-4 h-4"/></button>
                              </div></td>
                            </tr>
                          );
                        });
                      })()}
                      </tbody></table>
                  </div>
               )}
            </div>
          )}
        </div>
      )}

      {/* TAB: VIEW RESULTS */}
      {activeTab==="reports"&&(
        <div className="space-y-5">
          <div className="glass-card p-6 rounded-2xl hover-lift border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <BarChart className="w-5 h-5 text-indigo-600"/>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tổng hợp Kết quả Kh?oHồ sơ�t</h3>
                <p className="text-[11px] font-medium text-slate-500">Xem �i?m v� xu?t b�o c�o</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto w-full lg:w-auto mt-2 lg:mt-0">
                <select className="border rounded-lg px-3 py-1.5 outline-none text-sm font-medium bg-slate-50 min-w-[200px]" onChange={async (e) => {
                    const periodId = e.target.value;
                    if (!periodId) returnsetViewResultsData(null);
                   setViewResultsData({ loading: true });
                    try {
                        const res = await fetch(`/api/teacher-assessments?action=getReport&periodId=${periodId}`);
                        constHồ sơtudents = await res.json();
                        const asgRes = await fetch(`/api/input-assessment-assignments?periodId=${periodId}`);
                        const assignments = asgRes.ok ? await asgRes.json() : [];
                       setViewResultsData({ loading: false, students, assignments });
                    } catch(err) {
                       setViewResultsData({ loading: false, students: [], assignments: [] });
                    }
                }}>
                  <option value="">-- Chọn Kỳ Kh?oHồ sơ�t --</option>
                  {periods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                
                <button 
                    disabled={!viewResultsData?.students || viewResultsData.students.length===0}
                    onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const wsData = [
                            ["STT", "H? T�n", "M? HS", "Ng�yHồ sơinh", "Khối", "Hệ học"], // Header row
                        ];
                        viewResultsData.students.forEach((s: any, i: number) => {
                            wsData.push([
                                i+1, s.fullName, s.studentCode || '', s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : '', s.grade || '', s.admissionCriteria ||s.surveySystem || ''
                            ]);
                        });
                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                        XLSX.utils.book_append_sheet(wb, ws, "KQ_KhaoSat");
                        XLSX.writeFile(wb, "KetQua_KhaoSat.xlsx");
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-mediumHồ sơhadow-sm disabled:opacity-50">
                  <Download className="w-4 h-4"/> Xuất Excel
                </button>
            </div>
          </div>

          {!viewResultsData ? (
            <div className="text-center py-20 bg-white rounded-2xlHồ sơhadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <BarChart className="w-8 h-8 text-slate-300"/>
              </div>
              <p className="font-semibold text-slate-500 text-lg">Vui l?ng ch?n Kỳ khảo sát �? xem k?t qu?.</p>
              <p className="text-sm text-slate-400 mt-2">D? li?uHồ sơ? ��?c t?ng h?p t? t?t c? c�c đợt trong k?.</p>
            </div>
          ) : viewResultsData.loading ? (
            <div className="text-center py-20 bg-white rounded-2xlHồ sơhadow-sm border flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <span className="text-slate-500 font-medium">��Đang tổng hợp dữ liệu...</span>
            </div>
          ) : viewResultsData.students?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xlHồ sơhadow-sm border text-slate-500 font-medium">Kỳ khảo sát n�y ch�a c� h?cHồ sơinh n�o.</div>
          ) : (
            <div className="bg-white rounded-xlHồ sơhadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b bg-indigo-50/30 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800">Kết quả ph�n t�ch <span className="text-slate-400 font-normal text-sm">({viewResultsData.students.length} h?cHồ sơinh)</span></h4>
                    <div className="text-xs font-medium text-slate-500 flex gap-4">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> đợt</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Kh�ng đợt</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Ch? nh?p/duy?t</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200Hồ sơticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-center w-12 border-r">STT</th>
                                <th className="px-5 py-3 text-left w-64 border-r">Th�ng tin H?cHồ sơinh</th>
                                <th className="px-5 py-3 text-left border-r min-w-[500px]">Chi tiết �i?m & Nh?n x�t c�c môn</th>
                                <th className="px-5 py-3 text-center w-40">Kết quả Duyệt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {viewResultsData.students.map((s:any, i:number) => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-4 text-center font-medium text-slate-400 border-r align-top pt-5">{i+1}</td>
                                    <td className="px-5 py-4 border-r align-top">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{s.fullName}</span>
                                                {s.grade && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 uppercase">Khối {s.grade}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{s.studentCode}</span>
                                                <span className="text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : 'Trống'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Diện KS: {s.admissionCriteria || '-'}</span>
                                                <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">H?: {s.surveySystem || '-'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 border-r align-top">
                                        {s.scores &&s.scores.length > 0 ? (
                                            <div className="flex flex-wrap gap-3">
                                                {s.scores.map((sc:any, idx:number) => {
                                                    let parsedScores: any[] = [];
                                                    let parsedComments: any[] = [];
                                                    let colNames: any = {scores: [], comments: [] };
                                                    try { parsedScores = JSON.parse(sc.scores || "[]"); } catch(e){}
                                                    try { parsedComments = JSON.parse(sc.comments || "[]"); } catch(e){}
                                                    try { 
                                                        const parsedJSON = JSON.parse(sc.subject?.columnNames || "{}");
                                                        colNames = {
                                                           scores: parsedJSON.scores || [],
                                                            comments: parsedJSON.comments || []
                                                        };
                                                    } catch(e){}
                                                    
                                                    const colors = ['bg-indigo-50 border-indigo-200 text-indigo-800', 'bg-cyan-50 border-cyan-200 text-cyan-800', 'bg-violet-50 border-violet-200 text-violet-800', 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800', 'bg-teal-50 border-teal-200 text-teal-800'];
                                                    const color = colors[Math.min(idx, colors.length - 1)];

const assignedTeacherName = (viewResultsData.assignments || []).find((a:any) => a.subjectId ===c.subjectId && a.grade ===s.grade && (a.educationSystem ===s.admissionCriteria || a.educationSystem ===s.surveySystem))?.user?.fullName;

                                                        return (
                                                            <div key={sc.id} className={`border rounded-xlHồ sơhadow-sm flex-none flex flex-col max-w-[650px] ${color}`}>
                                                                <div className="px-3 py-1.5 bg-white/40 text-[11px] font-bold uppercase tracking-wider border-b border-current/10 flex justify-between items-center gap-3">
                                                                    <span>{sc.subject?.name}</span>
                                                                    <div className="flex flex-col items-end text-right">
                                                                        {assignedTeacherName && <span className="text-[9px] font-black text-indigo-700 tracking-normal normal-caseHồ sơhrink-0" title={"GV Ph? tr�ch: " + assignedTeacherName}>PC: {assignedTeacherName}</span>}
                                                                        {sc.teacherName && <span className="text-[9px] font-medium opacity-60 tracking-normal normal-case italicHồ sơhrink-0" title={"Ng�?i nh?p: " +c.teacherName}>nh?p: {sc.teacherName}</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="p-1.5 flex flex-wrap items-stretch">
                                                                    {parsedScores.length > 0 && (
                                                                        <div className="flex gap-1 pr-2 border-r border-current/10 mr-2 items-center">
                                                                            {parsedScores.map((score: any, s_i: number) => (
                                                                                <div key={s_i} className="flex flex-col items-center justify-center bg-white/60 rounded px-2 min-w-[36px] py-1" title={colNames.scores[s_i] || `�i?m ${s_i+1}`}>
                                                                                    <span className="text-[9px] font-semibold opacity-70 mb-0.5">{colNames.scores[s_i] ? colNames.scores[s_i].slice(0,5)+'..' : `�${s_i+1}`}</span>
                                                                                    <span className="font-extrabold text-sm">{score || '-'}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col gap-1 flex-1 min-w-[150px] justify-center py-0.5">
                                                                        {parsedComments.map((com: any, c_i: number) => com && (
                                                                            <div key={c_i} className="text-xs font-medium leading-snug flex items-start gap-1">
                                                                                <span className="opacity-50Hồ sơhrink-0 font-semibold">{colNames.comments[c_i] || `NX ${c_i+1}`}:</span>
                                                                                <span>{com}</span>
                                                                            </div>
                                                                        ))}
                                                                        {parsedComments.every((c: any) => !c) && <span className="text-xs opacity-50 italic">Ch�a c� nh?n x�t.</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                })}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Ch�a c� d? li?u �i?m môn n�o.</span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle text-center">
                                        {/* Dropdown to approve/changestatus right here */}
                                        <div className="flex flex-col gap-2 relative">
                                            <select 
                                                value={s.admissionResult || ""}
                                                onChange={async (e) => {
                                                    const val = e.target.value;
                                                    // API call to updateHồ sơtudent admissionResult
                                                    const r = await fetch("/api/input-assessment-students", {
                                                        method: "PUT",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({ id:s.id, data: { admissionResult: val } })
                                                    });
                                                    if (r.ok) {
                                                       setViewResultsData((prev:any) => ({
                                                            ...prev,
                                                           tudents: prev.students.map((st:any) =>t.id ===s.id ? { ...st, admissionResult: val } :t)
                                                        }));
                                                    } else {
                                                        alert("L?i khi l�u k?t qu? ph� duy?t!");
                                                    }
                                                }}
                                                className={`w-full font-bold text-xs uppercase tracking-wide rounded-lg px-2 py-2.5 outline-none border transition-colorsHồ sơhadow-sm cursor-pointer ${
                                                   s.admissionResult === 'DAT' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                                   s.admissionResult === 'CAM_KET' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                                   s.admissionResult === 'KHONG_DAT' ? 'bg-red-50 text-red-700 border-red-300' :
                                                   s.admissionResult === 'KIEM_TRA_LAI' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                                    'bg-slate-50 text-slate-500 border-slate-300'
                                                }`}
                                            >
                                                <option value="">-- Chờ duyệt --</option>
                                                <option value="DAT">đợt</option>
                                                <option value="CAM_KET">Cam kết</option>
                                                <option value="KHONG_DAT">Kh�ng đợt</option>
                                                <option value="KIEM_TRA_LAI">Kiểm tra lại</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>
      )}
    
{/* MODALS */}
      {/* MODAL DANH MUC */}
      {isConfigOpen&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-mdHồ sơhadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50/80"><h3 className="font-bold text-slate-800 text-lg">{editingConfigId?'Sửa Danh mục':'Thêm Danh mục mới'}</h3><button onClick={()=>setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full p-1 borderHồ sơhadow-sm"><X className="w-5 h-5"/></button></div>
            <div className="p-5Hồ sơpace-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại danh mục</label><select value={configForm.categoryType} onChange={e=>setConfigForm({...configForm,categoryType:e.target.value})} disabled={!!editingConfigId} className="w-full border rounded-xl px-3 py-2.5 outline-none bg-slate-50 text-sm font-medium">{CAT_TYPES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}<option value="HOC_KY">N�m h?c tuyển sinh</option></select></div>
              {configForm.categoryType==="HOC_KY"&&(<div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">N�m h?c g?n k�m <span className="text-red-500">*</span></label><select value={configForm.academicYearId} onChange={e=>setConfigForm({...configForm,academicYearId:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 outline-none text-sm font-medium"><option value="">-- Ch?n N�m h?c --</option>{academicYears.map((y:any)=><option key={y.id} value={y.id}>{y.name}</option>)}</select></div>)}
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mã (Code) <span className="text-red-500">*</span></label><input autoFocus={!editingConfigId} value={configForm.code} onChange={e=>setConfigForm({...configForm,code:e.target.value})} className="w-full border-slate-300 rounded-xl px-3 py-2.5 font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm" placeholder="VD: MIEN_PHI, AP, HK1_2024"/></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">T�n hi?n th? <span className="text-red-500">*</span></label><input autoFocus={!!editingConfigId} value={configForm.name} onChange={e=>setConfigForm({...configForm,name:e.target.value})} className="w-full border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium" placeholder="VD: Mi?n ph� KS, Advanced Placement..."/></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-slate-50/50"><button onClick={()=>setIsConfigOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white hover:bg-slate-100 rounded-xl text-sm font-semibold borderHồ sơhadow-sm transition-colors">Hủy</button><button onClick={saveConfig} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-boldHồ sơhadow-sm transition-colors">{editingConfigId?'L�u thay �?i':'Thêm mới'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL MON KHAO SAT */}
      {isSubjectOpen&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-mdHồ sơhadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50/80"><h3 className="font-bold text-slate-800 text-lg">{editingSubjectId?'Sửa M�n Kh?oHồ sơ�t':'Thêm M�n Kh?oHồ sơ�Cột điểm?i'}</h3><button onClick={()=>setIsSubjectOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full p-1 borderHồ sơhadow-sm"><X className="w-5 h-5"/></button></div>
            <div className="p-5Hồ sơpace-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">M? M�n <span className="text-red-500">*</span></label><input autoFocus={!editingSubjectId} value={subjectForm.code} onChange={e=>setSubjectForm({...subjectForm,code:e.target.value})} disabled={!!editingSubjectId} className="w-full border-slate-300 rounded-xl px-3 py-2.5 font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm" placeholder="VD: TOAN_EQ"/></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">T�n M�n <span className="text-red-500">*</span></label><input autoFocus={!!editingSubjectId} value={subjectForm.name} onChange={e=>setSubjectForm({...subjectForm,name:e.target.value})} className="w-full border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium" placeholder="VD: To�n (EQ)"/></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Thuộc loại / Hệ</label><input value={subjectForm.subjectType} onChange={e=>setSubjectForm({...subjectForm,subjectType:e.target.value})} className="w-full border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm" placeholder="VD: Chuy�n, Th�?ng (T�y ch?n)"/></div>
              <div className="flex gap-4">
                  <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trống th�i</label><select value={subjectForm.status} onChange={e=>setSubjectForm({...subjectForm,status:e.target.value})} className="w-full border rounded-xl px-3 py-2.5 outline-none bg-slate-50 text-sm font-medium"><option value="ACTIVE">Ho?t �?ng</option><option value="INACTIVE">Ng�ng ho?t �?ng</option></select></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-slate-50/50"><button onClick={()=>setIsSubjectOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white hover:bg-slate-100 rounded-xl text-sm font-semibold borderHồ sơhadow-sm transition-colors">Hủy</button><button onClick={saveSubject} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-boldHồ sơhadow-sm transition-colors">{editingSubjectId?'L�u thay �?i':'Thêm mới'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL HS */}
      {isStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-3xlHồ sơhadow-2xl overflow-hidden my-auto">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50/80"><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><User className="w-5 h-5 text-indigo-500"/>{editingStudentId ? 'Sửa th�ng tin H?cHồ sơinh' : 'Thêm H?cHồ sơinh Kh?oHồ sơ�t'}</h3><button onClick={() =>setIsStudentOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full p-1 borderHồ sơhadow-sm"><X className="w-5 h-5"/></button></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                    <h4 className="font-bold text-indigo-900 border-b pb-2 text-sm uppercase">Th�ng tin c� b?n</h4>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mã HọcHồ sơinh <span className="text-red-500">*</span></label><input value={studentForm.studentCode} onChange={e =>setStudentForm({...studentForm, studentCode: e.target.value})} disabled={!!editingStudentId} className="w-full border rounded-xl px-3 py-2 font-mono text-sm uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50" placeholder="Mã HS..."/></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">H? v� T�n <span className="text-red-500">*</span></label><input value={studentForm.fullName} onChange={e =>setStudentForm({...studentForm, fullName: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:font-normal" placeholder="T�n HS..."/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ng�yHồ sơinh</label><input type="date" value={studentForm.dateOfBirth} onChange={e =>setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"/></div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Khối <span className="text-red-500">*</span></label>
                            <select value={studentForm.grade} onChange={e =>setStudentForm({...studentForm, grade: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white">
                                <option value="">-- Ch?n --</option>
                                {grades.map((g:string) => <option key={g} value={g}>K{g}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="font-bold text-indigo-900 border-b pb-2 text-sm uppercase">Thi?t l?p đợt & Kh?oHồ sơ�t</h4>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Đợt KS</label><select value={studentForm.batchId} onChange={e =>setStudentForm({...studentForm, batchId: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"><option value="">T?t c? đợt trong k?</option>{currentPeriodBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">N�m h?c Tuy?nHồ sơinh</label><select value={studentForm.hocKy} onChange={e=>setStudentForm({...studentForm, hocKy: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none"><option value="">-- Ch?n --</option>{configsList.filter(c=>c.categoryType==='HOC_KY').map(c => <option key={c.id} value={c.code}>{c.name}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Loại Tuy?nHồ sơinh</label><select value={studentForm.targetType} onChange={e=>setStudentForm({...studentForm, targetType: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none"><option value="">-- Ch?n --</option>{configsList.filter(c=>c.categoryType==='LOAI_TUYEN_SINH').map(c => <option key={c.id} value={c.code}>{c.name}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diện KS</label><select value={studentForm.admissionCriteria} onChange={e=>setStudentForm({...studentForm, admissionCriteria: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none"><option value="">-- Ch?n --</option>{configsList.filter(c=>c.categoryType==='DIEN_KS').map(c => <option key={c.id} value={c.code}>{c.name}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hình thức</label><select value={studentForm.surveyFormType} onChange={e=>setStudentForm({...studentForm, surveyFormType: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm outline-none"><option value="">-- Ch?n --</option>{configsList.filter(c=>c.categoryType==='HINH_THUC_KS').map(c => <option key={c.id} value={c.code}>{c.name}</option>)}</select></div>
                    </div>
                </div>
                
                {studentForm.grade && parseInt(studentForm.grade) && (
                    <div className="col-span-1 md:col-span-2Hồ sơpace-y-4 mt-2 border-t pt-4">
                        <h4 className="font-bold text-teal-800 flex items-center gap-2 text-sm uppercase"><Award className="w-4 h-4"/> Th�nh t�ch & H?Hồ sơ�</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{parseInt(studentForm.grade) <= 5 ? 'H?Hồ sơ� T�m t?t theo CT B?' : 'Kết quả Học tập theo CT Bộ'}</label><select value={studentForm.kqgdTieuHoc} onChange={e=>setStudentForm({...studentForm, kqgdTieuHoc: e.target.value})} className="w-full border border-rose-200 bg-rose-50 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"><option value="">-- Chon --</option>{configsList.filter(c => parseInt(studentForm.grade) <= 5 ? c.categoryType === 'KQGD_TIEU_HOC' : c.categoryType === 'KQ_HOC_TAP').map(c => (<option key={c.id} value={c.code}>{c.name}</option>))}</select></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kết quả HSTT theo CT Quốc tế</label><select value={studentForm.kqHocTap} onChange={e=>setStudentForm({...studentForm, kqHocTap: e.target.value})} className="w-full border border-blue-200 bg-blue-50 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"><option value="">-- Chon --</option>{configsList.filter(c => c.categoryType === 'HS_CT_QUOC_TE').map(c => (<option key={c.id} value={c.code}>{c.name}</option>))}</select></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kết quả R�n luy?n theo CT B?</label><select value={studentForm.kqRenLuyen} onChange={e=>setStudentForm({...studentForm, kqRenLuyen: e.target.value})} className="w-full border border-teal-200 bg-teal-50 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"><option value="">-- Chon --</option>{configsList.filter(c => c.categoryType === 'KQ_REN_LUYEN').map(c => (<option key={c.id} value={c.code}>{c.name}</option>))}</select></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-slate-50/80 mt-2">
                <button onClick={() =>setIsStudentOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white hover:bg-slate-100 rounded-xl text-sm font-semibold borderHồ sơhadow-sm transition-colors">Hủy</button>
                <button onClick={handleStudentSubmit} disabled={!studentForm.studentCode || !studentForm.fullName || !studentForm.grade} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-boldHồ sơhadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4"/> {editingStudentId ? 'Cập nhật HọcHồ sơinh' : 'L�u H?cHồ sơinh m?i'}</button>
            </div>
            </div>
        </div>
      )}
      
      {/* MODAL CAU HINH SO COT */}
      {isColumnConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lgHồ sơhadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b bg-indigo-50/50">
              <div>
                <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2"><Settings className="w-5 h-5"/>Cấu hình C?t �i?m & Nh?n x�t</h3>
                <p className="text-xs text-indigo-600 mt-1 font-medium">M�n: {columnConfigForm.name}</p>
              </div>
              <button onClick={()=>setIsColumnConfigOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 rounded-full p-1.5 borderHồ sơhadow-sm"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="p-5 overflow-y-autoHồ sơpace-y-6 flex-1">
                {/* SO COT DIEM */}
                <div className="bg-slate-50 border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b">
                        <h4 className="font-bold text-slate-700 text-sm">S? c?t �I?M S?:</h4>
                        <input type="number" min="0" max="10" className="w-16 border rounded bg-white px-2 py-1 text-center font-bold text-indigo-700 outline-none" value={columnConfigForm.scoreColumns} onChange={e => {
                            const num = parseInt(e.target.value) || 0;
                           setColumnConfigForm(p => ({
                                ...p, 
                               scoreColumns: num, 
                               scoreNames: Array(num).fill("").map((_,i) => p.scoreNames[i] || ""),
                               showScoreInReport: Array(num).fill(true).map((_,i) => p.showScoreInReport[i] ?? true)
                            }));
                        }} />
                    </div>
                    <div className="space-y-2">
                        {Array.from({length: columnConfigForm.scoreColumns || 0}).map((_, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="text-xs font-semibold text-slate-500 w-12">�i?m {i+1}</span>
                                <input value={columnConfigForm.scoreNames[i] || ""} onChange={e=>{
                                    const arr = [...columnConfigForm.scoreNames];
                                    arr[i] = e.target.value;
                                   setColumnConfigForm(p=>({...p,scoreNames: arr}));
                                }} className="flex-1 border rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-400" placeholder={`T�n c?t �i?m ${i+1}. VD: B�i 1...`} />
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100">
                                    <input type="checkbox" checked={columnConfigForm.showScoreInReport[i] !== false} onChange={e => {
                                        const arr = [...columnConfigForm.showScoreInReport];
                                        arr[i] = e.target.checked;
                                       setColumnConfigForm(p=>({...p,showScoreInReport: arr}));
                                    }} className="w-3 h-3 rounded" /> Hiện BC
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SO COT NHAN XET */}
                <div className="bg-slate-50 border rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b">
                        <h4 className="font-bold text-slate-700 text-sm">S? c?t NH?N X�T:</h4>
                        <input type="number" min="0" max="10" className="w-16 border rounded bg-white px-2 py-1 text-center font-bold text-teal-700 outline-none" value={columnConfigForm.commentColumns} onChange={e => {
                            const num = parseInt(e.target.value) || 0;
                           setColumnConfigForm(p => ({
                                ...p, 
                                commentColumns: num, 
                                commentNames: Array(num).fill("").map((_,i) => p.commentNames[i] || ""),
                               showCommentInReport: Array(num).fill(true).map((_,i) => p.showCommentInReport[i] ?? true)
                            }));
                        }} />
                    </div>
                    <div className="space-y-2">
                        {Array.from({length: columnConfigForm.commentColumns || 0}).map((_, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="text-xs font-semibold text-slate-500 w-12">NX {i+1}</span>
                                <input value={columnConfigForm.commentNames[i] || ""} onChange={e=>{
                                    const arr = [...columnConfigForm.commentNames];
                                    arr[i] = e.target.value;
                                   setColumnConfigForm(p=>({...p, commentNames: arr}));
                                }} className="flex-1 border rounded px-2 py-1.5 text-sm outline-none focus:border-teal-400" placeholder={`T�n c?t nh?n x�t ${i+1}...`} />
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border px-2 py-1.5 rounded cursor-pointer hover:bg-slate-100">
                                    <input type="checkbox" checked={columnConfigForm.showCommentInReport[i] !== false} onChange={e => {
                                        const arr = [...columnConfigForm.showCommentInReport];
                                        arr[i] = e.target.checked;
                                       setColumnConfigForm(p=>({...p,showCommentInReport: arr}));
                                    }} className="w-3 h-3 rounded text-teal-600 focus:ring-teal-500" /> Hiện BC
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-slate-50">
                <button onClick={()=>setIsColumnConfigOpen(false)} className="px-4 py-2 text-slate-600 bg-white hover:bg-slate-100 rounded-lg text-sm font-semibold borderHồ sơhadow-sm transition-colors">Hủy</button>
                <button onClick={saveColumnConfig} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-boldHồ sơhadow-sm transition-colors flex items-center gap-2"><Check className="w-4 h-4"/>L�u c?u h?nh c?t</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
