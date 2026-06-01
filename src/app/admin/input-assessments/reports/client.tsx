"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Baby, Clock, Settings, Users, BarChart3, Calendar,
  Plus, Trash2, Edit2, Search, RefreshCw, ChevronDown, ChevronUp, Pencil,
  X, CheckCircle, CheckCircle2, AlertCircle, Download, Upload, Star, Heart, Sparkles, UserCheck, Eye, Send, ClipboardList, Mail, GraduationCap, Phone, Loader2, PenLine, Tag, Check, Printer
} from "lucide-react"

// Types
interface Campus { id: string; campusName: string; campusCode?: string; manager?: { fullName?: string } }
interface Period { id: string; code: string; name: string; status: string; batches: Batch[] }
interface Batch { id: string; periodId: string; batchNumber: number; name: string; startDate: string; endDate: string; status: string; campusId?: string }
interface AcademicYear { id: string; name: string }

const DEFAULT_WATERMARK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23007A87'><path d='M10,80 Q50,40 90,20 Q60,50 10,80 Z'/><path d='M30,80 Q60,55 90,35 Q65,60 30,80 Z'/></svg>";

const getCampusFullName = (codeOrName: string) => {
  const clean = (codeOrName || "").toUpperCase();
  if (clean.includes("CS1") || clean.includes("RIVERSIDE")) return "Sky-Line Riverside";
  if (clean.includes("CS2") || clean.includes("CENTRAL")) return "Sky-Line Central";
  if (clean.includes("CS3") || clean.includes("GLOBAL")) return "Sky-Line Global";
  if (clean.includes("CS4") || clean.includes("HILL")) return "Sky-Line Hill";
  if (clean.includes("CS5") || clean.includes("BEACH")) return "Sky-Line Beach";
  return codeOrName;
};

const getCampusDefaultManager = (campusCodeOrName: string) => {
  const clean = (campusCodeOrName || "").toUpperCase();
  if (clean.includes("CS1") || clean.includes("RIVERSIDE")) return "Tống Thiên Long";
  if (clean.includes("CS2") || clean.includes("CENTRAL")) return "Lê Thị Hoàng Yến";
  if (clean.includes("CS3") || clean.includes("GLOBAL")) return "Trần Thị Thanh";
  if (clean.includes("CS4") || clean.includes("HILL")) return "Cao Thanh Trung";
  if (clean.includes("CS5") || clean.includes("BEACH")) return "Đỗ Quang Trung";
  return "Trần Thị Thanh";
};

// Default template strings
const defaultPreschoolInvitation = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.

Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào hệ {{surveyFormType}} năm học {{academicYear}}.

• Thời gian khảo sát: Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.
• Nội dung khảo sát: Đánh giá tư duy ngôn ngữ, tư duy logic tự nhiên và khả năng tương tác xã hội phù hợp theo độ tuổi.

Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.

Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

const defaultPreschoolCongratulations = `Chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Con đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường Mầm non Sky-Line (Cơ sở {{admissionCampus}}) – một cột mốc quan trọng trong hành trình phát triển của con.

Thầy cô tại Sky-Line vui mừng chào đón con đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp con phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, con sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.

Nhà trường hy vọng rằng, với sự nhanh nhẹn và đáng yêu của mình, con sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Nơi đây, con sẽ được học hỏi những điều mới lạ, được chơi đùa cùng các bạn và được các cô giáo yêu thương chăm sóc.

Chúc con có những năm tháng học tập đầy ý nghĩa và trải nghiệm thú vị tại Sky-Line. Hãy luôn giữ vững niềm vui thích học hỏi và khát khao khám phá thế giới xung quanh con nhé!`;

const defaultPreschoolCommitment = `Hệ thống Giáo dục Sky-Line chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết rèn luyện này.

Gia đình cam kết thực hiện đầy đủ các nội dung sau:
1. Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và kỹ năng tự phục vụ cơ bản phù hợp với độ tuổi mầm non.
2. Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý của con và tích cực trao đổi thông tin thường xuyên.
3. Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.

Bản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;

const defaultThuMoi = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.

Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, kiến thức của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}.

• Thời gian khảo sát: Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.
• Nội dung khảo sát: Đánh giá tư duy toán học, tư duy ngôn ngữ và khả năng tương tác xã hội.

Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.

Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

const defaultThuChucMung = `Chúc mừng em đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} học kì {{hocKy}} hệ {{surveyFormType}} năm học {{academicYear}}. Em đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường TH, THCS, THPT Sky-Line – một cột mốc quan trọng trong hành trình học tập của em.

Thầy cô tại Sky-Line vui mừng chào đón em đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp em phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, em sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.

Nhà trường hy vọng rằng, với sự tự tin và khát khao học hỏi của mình, em sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Hãy luôn giữ vững niềm vui thích học hỏi và khát khao khám phá thế giới xung quanh em nhé!`;

const defaultCamKet = `Hệ thống Giáo dục Sky-Line chúc mừng em đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} học kì {{hocKy}} hệ {{surveyFormType}} năm học {{academicYear}}. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết học tập này.

Gia đình cam kết thực hiện đầy đủ các nội dung sau:
1. Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và học tập.
2. Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý và học tập của con.
3. Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.

Bản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;

const renderTemplate = (content: string, student: any) => {
  if (!content) return "";
  const comSubs = Array.isArray(student?.committedSubjects) 
    ? student.committedSubjects.join(", ") 
    : (student?.committedSubjects || "");
  return content
    .replace(/\{\{fullName\}\}/g, student?.fullName || "")
    .replace(/\{\{grade\}\}/g, student?.grade || "")
    .replace(/\{\{admissionCampus\}\}/g, student?.admissionCampus || "")
    .replace(/\{\{academicYear\}\}/g, student?.academicYear || "2025-2026")
    .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "")
    .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
    .replace(/\{\{committedSubjects\}\}/g, comSubs || "Tiếng Anh")
    .replace(/\{\{signatureName\}\}/g, student?.signatureName || "");
};

const inp = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm";

function Toast({ msg, type }: { msg: string; type: string }) {
  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-right-4 fade-in duration-300 ${type === "err" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
      {type === "err" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
      {msg}
    </div>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer, size = "md" }: any) {
  if (!open) return null;
  const sizeMap: Record<string, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizeMap[size]} overflow-hidden animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-500" />{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh]">{children}</div>
        {footer && <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">{footer}</div>}
      </div>
    </div>
  );
}

export function ReportsClient({
  academicYears, campuses, giaoVuCSUsers, gdcsUsers, teachers, departments, generalPeriods, preschoolPeriods, currentUser
}: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [tab, setTab] = useState("report_config");
  const [selectedLevel, setSelectedLevel] = useState<"preschool" | "high">("high");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);

  const notify = (msg: string, type: string = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Report config states
  const [rcCampusId, setRcCampusId] = useState("");
  const [rcReportType, setRcReportType] = useState("thu_chuc_mung");
  const [rcTargetGroup, setRcTargetGroup] = useState("all");
  const [rcTitle, setRcTitle] = useState("");
  const [rcContent, setRcContent] = useState("");
  const [rcDirectorName, setRcDirectorName] = useState("");
  const [rcLogo, setRcLogo] = useState("");
  const [rcSignature, setRcSignature] = useState("");
  const [rcBackground, setRcBackground] = useState("");
  const [rcFooter, setRcFooter] = useState("");
  const [previewPage, setPreviewPage] = useState<1 | 2>(1);
  useEffect(() => {
    if (rcReportType !== "thu_chuc_mung" || selectedLevel !== "high") {
      setPreviewPage(1);
    }
  }, [rcReportType, selectedLevel]);

  const reportDocGroups = [
    { id: "all", label: "Tất cả các khối (Mặc định)" },
    { id: "khoi_1", label: "Hồ sơ Khối 1" },
    { id: "khoi_2_5", label: "Hồ sơ Khối 2-5" },
    { id: "khoi_6", label: "Hồ sơ Khối 6" },
    { id: "khoi_10_noi_tinh", label: "Hồ sơ Khối 10 (Nội tỉnh)" },
    { id: "khoi_10_ngoai_tinh", label: "Hồ sơ Khối 10 (Ngoại tỉnh)" }
  ];

  // Active periods depending on level
  // --- ADMISSION DOCUMENTS STATES & DEFAULTS ---
  const [configs, setConfigs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/assessment-configs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConfigs(data);
      })
      .catch(() => {});
  }, []);

  const defaultDocumentsGrade1 = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 1"] },
    { id: 2, name: "Đơn xin nhập học lớp 1", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 1"] },
    { id: 3, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 1"] },
  ], []);

  const defaultDocumentsGrade2_5 = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 2, name: "Học bạ Tiểu học (bản gốc)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 3, name: "Giấy giới thiệu chuyển của trường nơi đi", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 4, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 5, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 6, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
  ], []);

  const defaultDocumentsGrade6 = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 2, name: "Học bạ Tiểu học (bản gốc)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 3, name: "Giấy chứng nhận HTCT Tiểu học", qty: "1", note: "Nếu có", targets: ["Nội tỉnh"], grades: ["Khối 6"] },
    { id: 4, name: "Giấy giới thiệu chuyển của trường nơi đi (nhập học sau 15/8)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 6"] },
    { id: 5, name: "Giấy giới thiệu chuyển của trường nơi đi (nếu nhập học sau 15/8)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 6, name: "Giấy giới thiệu chuyển trường do UBND/ Sở GD&ĐT nơi đi (Trường trực thuộc sở)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 7, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 8, name: "Ảnh thẻ 3x4", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 9, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 10, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
  ], []);

  const defaultDocumentsGrade10NoiTinh = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 2, name: "Học bạ THCS (bản gốc)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 3, name: "Giấy chứng nhận tốt nghiệp THCS tạm thời hoặc Bằng tốt nghiệp THCS", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 4, name: "Giấy giới thiệu chuyển của trường nơi đi (nếu nhập học sau 15/8)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 5, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 6, name: "Ảnh thẻ 3x4", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 7, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 8, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
  ], []);

  const defaultDocumentsGrade10NgoaiTinh = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 2, name: "Học bạ THCS (bản gốc)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 3, name: "Giấy giới thiệu chuyển của trường nơi đi (nếu nhập học sau 15/8)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 4, name: "Giấy giới thiệu chuyển trường do Sở GD&ĐT nơi đi (Trường trực phục sở hoặc ngoại tỉnh)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 5, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 6, name: "Ảnh thẻ 3x4", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 7, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 8, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
  ], []);

  const previewDocList = useMemo(() => {
    if (typeof window === "undefined") return [];
    const group = rcTargetGroup === "all" ? "khoi_1" : rcTargetGroup;
    const saved = localStorage.getItem('admission_docs_' + group);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    if (group === "khoi_2_5") return defaultDocumentsGrade2_5;
    if (group === "khoi_6") return defaultDocumentsGrade6;
    if (group === "khoi_10_noi_tinh") return defaultDocumentsGrade10NoiTinh;
    if (group === "khoi_10_ngoai_tinh") return defaultDocumentsGrade10NgoaiTinh;
    return defaultDocumentsGrade1;
  }, [rcTargetGroup, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh]);

  // Admission Documents State
  const defaultDocGroups = useMemo(() => [
    { id: "khoi_1", label: "Khối 1" },
    { id: "khoi_2_5", label: "Khối 2 đến 5" },
    { id: "khoi_6", label: "Khối 6" },
    { id: "khoi_7_9", label: "Khối 7 đến 9" },
    { id: "khoi_10_noi_tinh", label: "Khối 10 - Nội tỉnh" },
    { id: "khoi_10_ngoai_tinh", label: "Khối 10 - Ngoại tỉnh" },
    { id: "khoi_11_12", label: "Khối 11 đến 12" },
    { id: "doi_tuong_tuyen_sinh", label: "Đối tượng Hồ sơ" },
  ], []);
  const [customDocGroups, setCustomDocGroups] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGroups = localStorage.getItem('admission_doc_groups');
      if (savedGroups) {
        try {
          setCustomDocGroups(JSON.parse(savedGroups));
        } catch (e) {}
      } else {
        setCustomDocGroups(defaultDocGroups);
      }
    }
  }, [defaultDocGroups]);

  const docGroups = useMemo(() => {
    return customDocGroups;
  }, [customDocGroups]);

  const [docGroupTargets, setDocGroupTargets] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTargets = localStorage.getItem('admission_doc_targets');
      let parsed = {};
      if (savedTargets) {
        try {
          parsed = JSON.parse(savedTargets);
        } catch (e) {}
      }
      let updated = false;
      if (!parsed["khoi_1"]) {
        parsed["khoi_1"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_2_5"]) {
        parsed["khoi_2_5"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_6"]) {
        parsed["khoi_6"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_10_noi_tinh"]) {
        parsed["khoi_10_noi_tinh"] = ["Nội tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_10_ngoai_tinh"]) {
        parsed["khoi_10_ngoai_tinh"] = ["Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_10"]) {
        parsed["khoi_10"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (updated) {
        localStorage.setItem('admission_doc_targets', JSON.stringify(parsed));
      }
      setDocGroupTargets(parsed);
    }
  }, []);

  const [docGroupGrades, setDocGroupGrades] = useState<Record<string, string[]>>({
    "khoi_1": ["Khối 1"],
    "khoi_2_5": ["Khối 2", "Khối 3", "Khối 4", "Khối 5"],
    "khoi_6": ["Khối 6"],
    "khoi_7_9": ["Khối 7", "Khối 8", "Khối 9"],
    "khoi_10_noi_tinh": ["Khối 10"],
    "khoi_10_ngoai_tinh": ["Khối 10"],
    "khoi_11_12": ["Khối 11", "Khối 12"]
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGrades = localStorage.getItem('admission_doc_grades_mapping');
      if (savedGrades) {
        try {
          setDocGroupGrades(JSON.parse(savedGrades));
        } catch (e) {}
      }
    }
  }, []);

  const [selectedDocGroup, setSelectedDocGroup] = useState("khoi_1");
  const getDocStorageKey = (group: string) => 'admission_docs_' + group;

  const [docList, setDocList] = useState<any[]>([]);
  const filteredDocList = useMemo(() => {
    const activeTargets = docGroupTargets[selectedDocGroup] || [];
    const activeGrades = docGroupGrades[selectedDocGroup] || [];
    return docList.filter(d => {
      const matchTarget = activeTargets.length === 0 || !d.targets || d.targets.length === 0 || d.targets.some(t => activeTargets.includes(t));
      const matchGrade = activeGrades.length === 0 || !d.grades || d.grades.length === 0 || d.grades.some(g => activeGrades.includes(g));
      return matchTarget && matchGrade;
    });
  }, [docList, selectedDocGroup, docGroupTargets, docGroupGrades]);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docFormName, setDocFormName] = useState("");
  const [docFormQty, setDocFormQty] = useState("");
  const [docFormNote, setDocFormNote] = useState("");
  const [docFormSelectedTargets, setDocFormSelectedTargets] = useState<string[]>([]);
  const [docFormSelectedGrades, setDocFormSelectedGrades] = useState<string[]>([]);


  // Student print/export modal states - declared BEFORE modalDocList useMemo which depends on them
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReportStudent, setSelectedReportStudent] = useState(null);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isCommitment, setIsCommitment] = useState(false);

  // One-time automatic migration for new default checklists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMigrated = localStorage.getItem('admission_docs_migrated_reports_v4');
      if (!isMigrated) {
        localStorage.removeItem('admission_doc_groups');
        localStorage.removeItem('admission_docs_khoi_1');
        localStorage.removeItem('admission_docs_khoi_2_5');
        localStorage.removeItem('admission_docs_khoi_6');
        localStorage.removeItem('admission_docs_khoi_10_noi_tinh');
        localStorage.removeItem('admission_docs_khoi_10_ngoai_tinh');
        localStorage.removeItem('admission_doc_targets');
        localStorage.removeItem('admission_doc_grades_mapping');
        localStorage.setItem('admission_docs_migrated_reports_v4', 'true');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGroups = localStorage.getItem('admission_doc_groups');
      if (savedGroups) {
        try { setCustomDocGroups(JSON.parse(savedGroups)); } catch (e) {}
      }
      const savedTargets = localStorage.getItem('admission_doc_targets');
      if (savedTargets) {
        try { setDocGroupTargets(JSON.parse(savedTargets)); } catch (e) {}
      }
      const savedGrades = localStorage.getItem('admission_doc_grades_mapping');
      if (savedGrades) {
        try { setDocGroupGrades(JSON.parse(savedGrades)); } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = getDocStorageKey(selectedDocGroup);
      const savedDocs = localStorage.getItem(storageKey);
      if (savedDocs) {
        try {
          setDocList(JSON.parse(savedDocs));
        } catch (e) {
          setDocList([]);
        }
      } else if (selectedDocGroup === "khoi_1") {
        setDocList(defaultDocumentsGrade1);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade1));
      } else if (selectedDocGroup === "khoi_2_5") {
        setDocList(defaultDocumentsGrade2_5);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade2_5));
      } else if (selectedDocGroup === "khoi_6") {
        setDocList(defaultDocumentsGrade6);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade6));
      } else if (selectedDocGroup === "khoi_10_noi_tinh") {
        setDocList(defaultDocumentsGrade10NoiTinh);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade10NoiTinh));
      } else if (selectedDocGroup === "khoi_10_ngoai_tinh") {
        setDocList(defaultDocumentsGrade10NgoaiTinh);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade10NgoaiTinh));
      } else {
        setDocList([]);
      }
    }
  }, [selectedDocGroup, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh]);

  const modalDocList = useMemo(() => {
    if (typeof window === "undefined" || !selectedReportStudent) return [];
    
    let studentGroup = "khoi_1";
    const getNumericGrade = (g: any) => {
      if (!g) return null;
      const match = g.toString().match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };
    const sGradeNum = getNumericGrade(selectedReportStudent.grade);
    
    const gradeMatchedGroups = docGroups.filter(g => {
      const mappedGrades = docGroupGrades[g.id] || [];
      const hasGradeMatch = mappedGrades.some(gradeStr => {
        if (!selectedReportStudent.grade) return false;
        const sGrade = selectedReportStudent.grade.toString().toLowerCase();
        const gStr = gradeStr.toLowerCase();
        return sGrade === gStr || sGrade.includes(gStr) || gStr.includes(sGrade);
      });
      if (hasGradeMatch) return true;
      
      if (sGradeNum !== null) {
        if (g.id === "khoi_1" && sGradeNum === 1) return true;
        if (g.id === "khoi_2_5" && sGradeNum >= 2 && sGradeNum <= 5) return true;
        if (g.id === "khoi_6" && sGradeNum === 6) return true;
        if (g.id === "khoi_10_noi_tinh" && sGradeNum === 10) return true;
        if (g.id === "khoi_10_ngoai_tinh" && sGradeNum === 10) return true;
      }
      return false;
    });

    if (selectedReportStudent.targetType) {
      const studentTargets = selectedReportStudent.targetType.split(',').map((x: any) => x.trim().toLowerCase()).filter(Boolean);
      
      const targetMatch = gradeMatchedGroups.find(g => {
        const mappedTs = docGroupTargets[g.id] || [];
        return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
      });
      
      if (targetMatch) {
        studentGroup = targetMatch.id;
      } else {
        const anyTargetMatch = docGroups.find(g => {
          const mappedTs = docGroupTargets[g.id] || [];
          return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
        });
        if (anyTargetMatch) {
          studentGroup = anyTargetMatch.id;
        } else {
          studentGroup = gradeMatchedGroups[0]?.id || "doi_tuong_tuyen_sinh";
        }
      }
    } else {
      studentGroup = gradeMatchedGroups[0]?.id || "khoi_1";
    }
    
    const saved = localStorage.getItem('admission_docs_' + studentGroup);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    
    if (studentGroup === "khoi_2_5") return defaultDocumentsGrade2_5;
    if (studentGroup === "khoi_6") return defaultDocumentsGrade6;
    if (studentGroup === "khoi_10_noi_tinh") return defaultDocumentsGrade10NoiTinh;
    if (studentGroup === "khoi_10_ngoai_tinh") return defaultDocumentsGrade10NgoaiTinh;
    return defaultDocumentsGrade1;
  }, [selectedReportStudent, docGroups, docGroupTargets, docGroupGrades, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh]);


  const activePeriods = useMemo(() => {
    return selectedLevel === "preschool" ? preschoolPeriods : generalPeriods;
  }, [selectedLevel, preschoolPeriods, generalPeriods]);

  // Unified loading of configuration
  useEffect(() => {
    if (typeof window === "undefined" || !rcCampusId) return;
    const campusObj = campuses.find((c: any) => c.id === rcCampusId);
    
    // Resolve key
    const typeKey = selectedLevel === "preschool" 
      ? rcReportType + "_preschool"
      : rcReportType + "_" + rcTargetGroup;
      
    const savedCampus = localStorage.getItem('report_config_' + rcCampusId + '_' + typeKey);
    const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);

    let campusData: any = {};
    let globalData: any = {};

    if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch(e) {} }
    if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch(e) {} }

    // Load defaults if no saved configs
    const defaultText = selectedLevel === "preschool"
      ? (rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations)
      : (rcReportType === "thu_moi" ? defaultThuMoi : rcReportType === "cam_ket_hoc_tap" ? defaultCamKet : defaultThuChucMung);

    const mLogo = localStorage.getItem('report_config_master_logo') || "";
    const mBg = localStorage.getItem('report_config_master_background') || "";
    const mFooter = localStorage.getItem('report_config_master_footer') || "";
    const mSig = localStorage.getItem('report_config_master_signature') || "";

    setRcLogo(mLogo || globalData.logo || campusData.logo || "");
    setRcBackground(mBg || globalData.background || campusData.background || "");
    setRcFooter(mFooter || globalData.footer || campusData.footer || "");
    setRcContent(globalData.content || campusData.content || defaultText);
    setRcTitle(globalData.title || campusData.title || (rcReportType === "thu_moi" ? "THƯ MỜI" : rcReportType === "cam_ket_hoc_tap" ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG"));
    
    const savedSignature = localStorage.getItem('report_config_signature_' + rcCampusId) || campusData.signature || mSig || "";
    const savedDirector = localStorage.getItem('report_config_director_' + rcCampusId) || campusData.directorName || campusObj?.manager?.fullName || getCampusDefaultManager(campusObj?.campusName || "");
    
    setRcSignature(savedSignature);
    setRcDirectorName(savedDirector);
  }, [rcCampusId, rcReportType, rcTargetGroup, selectedLevel, campuses]);

  // Force Congratulations report type for preschool level to exclude invitation and commitment templates
  useEffect(() => {
    if (selectedLevel === "preschool") {
      setRcReportType("thu_chuc_mung");
    }
  }, [selectedLevel]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcLogo(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcSignature(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcBackground(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcFooter(reader.result as string); }; reader.readAsDataURL(file); }
  };

  const reclaimLocalStorageSpace = () => {
    if (typeof window === "undefined") return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("report_config_global_") || key.startsWith("report_config_"))) {
          if (
            key === "report_config_master_logo" ||
            key === "report_config_master_background" ||
            key === "report_config_master_footer" ||
            key === "report_config_master_signature" ||
            key.startsWith("report_config_signature_") ||
            key.startsWith("report_config_director_")
          ) {
            continue;
          }
          
          const val = localStorage.getItem(key);
          if (val && val.includes("data:image")) {
            try {
              const parsed = JSON.parse(val);
              let changed = false;
              if (parsed.logo) { delete parsed.logo; changed = true; }
              if (parsed.background) { delete parsed.background; changed = true; }
              if (parsed.footer) { delete parsed.footer; changed = true; }
              if (parsed.signature) { delete parsed.signature; changed = true; }
              
              if (changed) {
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch (e) {}
          }
        }
      }
      console.log("Successfully reclaimed localStorage space.");
    } catch (err) {
      console.error("Reclaim space error:", err);
    }
  };

  const saveReportConfig = () => {
    try {
      if (!rcCampusId) return notify("Vui lòng chọn Cơ sở", "err");
      if (!rcReportType) return notify("Vui lòng chọn Loại báo cáo", "err");
      
      // Auto-reclaim space to prevent QuotaExceededError
      reclaimLocalStorageSpace();
      
      const typeKey = selectedLevel === "preschool" 
        ? rcReportType + "_preschool"
        : rcReportType + "_" + rcTargetGroup;

      const globalData = { title: rcTitle, content: rcContent };
      
      try {
        localStorage.setItem('report_config_global_' + typeKey, JSON.stringify(globalData));
        localStorage.setItem('report_config_master_logo', rcLogo || "");
        localStorage.setItem('report_config_master_background', rcBackground || "");
        localStorage.setItem('report_config_master_footer', rcFooter || "");
        localStorage.setItem('report_config_master_signature', rcSignature || "");
        localStorage.setItem('report_config_signature_' + rcCampusId, rcSignature || "");
        localStorage.setItem('report_config_director_' + rcCampusId, rcDirectorName || "");
        
        const campusData = { directorName: rcDirectorName, title: rcTitle, content: rcContent };
        localStorage.setItem('report_config_' + rcCampusId + '_' + typeKey, JSON.stringify(campusData));
      } catch (storageErr) {
        console.error("Local storage error:", storageErr);
        return notify("Lỗi trình duyệt (localStorage): " + (storageErr.message || "Không thể ghi vào bộ nhớ"), "err");
      }
      
      notify("Lưu cấu hình báo cáo thành công!");
    } catch (err) {
      console.error("Save config error:", err);
      notify("Lỗi hệ thống: " + (err.message || "Lỗi không xác định"), "err");
    }
  };

  // Student Export Tab States
  const [cPeriodId, setCPeriodId] = useState("");
  const [cBatchId, setCBatchId] = useState("all");
  const [cCampusId, setCCampusId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  // Auto select first period when level changes
  useEffect(() => {
    if (activePeriods.length > 0) {
      setCPeriodId(activePeriods[0].id);
      setCBatchId("all");
    } else {
      setCPeriodId("");
      setCBatchId("all");
    }
    setStudents([]);
  }, [selectedLevel, activePeriods]);

  // Load students based on filters
  useEffect(() => {
    if (!cPeriodId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    const apiRoute = selectedLevel === "preschool"
      ? "/api/preschool-input-assessment-students"
      : "/api/input-assessment-students";

    fetch(`${apiRoute}?periodId=${cPeriodId}&batchId=${cBatchId || "all"}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
        } else {
          setStudents([]);
        }
        setLoadingStudents(false);
      })
      .catch(err => {
        console.error("Fetch students error:", err);
        setStudents([]);
        setLoadingStudents(false);
      });
  }, [cPeriodId, cBatchId, selectedLevel]);

  const activePeriod = activePeriods.find(p => p.id === cPeriodId);
  const activeBatches = activePeriod?.batches || [];

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // search query
      const matchQuery = !searchQuery ? true : (
        s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchQuery;
    });
  }, [students, searchQuery]);

  // Print modal configuration resolver
  const studentCampusConfig = useMemo(() => {
    if (typeof window === "undefined" || !selectedReportStudent) return null;
    const effCampus = selectedReportStudent.admissionCampus;
    let targetCampus = campuses.find((c: any) => 
      c.id === effCampus || c.campusName === effCampus || c.campusCode === effCampus ||
      effCampus?.includes(c.campusCode) || effCampus?.includes(c.campusName)
    );
    if (!targetCampus && campuses.length > 0) targetCampus = campuses[0];

    if (targetCampus) {
      // Guess group/grade logic
      let studentGroup = "all";
      const gClean = String(selectedReportStudent.grade || "").toLowerCase();
      if (gClean.includes("mầm non") || gClean.includes("nhóm") || selectedLevel === "preschool") {
        studentGroup = "preschool";
      } else if (gClean.includes("6") || gClean.includes("7") || gClean.includes("8") || gClean.includes("9")) {
        studentGroup = "khoi_6";
      } else if (gClean.includes("10") || gClean.includes("11") || gClean.includes("12")) {
        studentGroup = "khoi_10_noi_tinh"; // guess
      } else {
        studentGroup = "khoi_1";
      }

      const baseKey = isInvitation ? 'thu_moi' : isCommitment ? 'cam_ket_hoc_tap' : 'thu_chuc_mung';
      const typeKey = selectedLevel === "preschool" ? baseKey + "_preschool" : baseKey + "_" + studentGroup;
      const fallbackTypeKey = selectedLevel === "preschool" ? baseKey + "_preschool" : baseKey + "_all";

      let savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + typeKey);
      let savedGlobal = localStorage.getItem('report_config_global_' + typeKey);

      if (!savedGlobal) {
        savedGlobal = localStorage.getItem('report_config_global_' + fallbackTypeKey);
      }
      if (!savedCampus) {
        savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + fallbackTypeKey);
      }

      let campusData: any = {};
      let globalData: any = {};
      if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch (e) {} }
      if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch (e) {} }

      const mergedTitle = globalData.title || campusData.title || (isInvitation ? "THƯ MỜI" : isCommitment ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG");
      const mLogo = localStorage.getItem('report_config_master_logo') || "";
      const mBg = localStorage.getItem('report_config_master_background') || "";
      const mFooter = localStorage.getItem('report_config_master_footer') || "";
      const mSig = localStorage.getItem('report_config_master_signature') || "";

      const mergedLogo = mLogo || globalData.logo || campusData.logo || "";
      const mergedBackground = mBg || globalData.background || campusData.background || "";
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";
      const campusSig = localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || mSig || "";
      const campusDir = localStorage.getItem('report_config_director_' + targetCampus.id) || campusData.directorName || targetCampus.manager?.fullName || getCampusDefaultManager(targetCampus.campusName || "");

      return {
        title: mergedTitle,
        logo: mergedLogo,
        background: mergedBackground,
        content: mergedContent,
        footer: mergedFooter,
        signature: campusSig,
        directorName: campusDir
      };
    }
    return null;
  }, [selectedReportStudent, isInvitation, isCommitment, selectedLevel, campuses]);

  // Selected campus and its specific department emails (Giáo vụ, GĐCS, Tư vấn)
  const selectedCampusObj = useMemo(() => {
    // 1. Try direct batch campusId relation
    const selectedBatch = cBatchId !== "all" ? activeBatches.find(b => b.id === cBatchId) : null;
    const batchCampusId = selectedBatch?.campusId;
    if (batchCampusId) {
      const found = campuses.find((c: any) => c.id === batchCampusId);
      if (found) return found;
    }

    // 2. Try parsing batch name for campus prefix/code (e.g. CS1, CS2, CS3, CS4, CS5)
    if (selectedBatch && selectedBatch.name) {
      const bName = selectedBatch.name.toUpperCase();
      const matchedCampus = campuses.find((c: any) => {
        const cCode = (c.campusCode || "").toUpperCase();
        const cName = (c.campusName || "").toUpperCase();
        return (cCode && bName.includes(cCode)) || (cName && bName.includes(cName));
      });
      if (matchedCampus) return matchedCampus;
    }

    // 2b. Try parsing period name for campus prefix/code
    if (activePeriod && activePeriod.name) {
      const pName = activePeriod.name.toUpperCase();
      const matchedCampus = campuses.find((c: any) => {
        const cCode = (c.campusCode || "").toUpperCase();
        const cName = (c.campusName || "").toUpperCase();
        return (cCode && pName.includes(cCode)) || (cName && pName.includes(cName));
      });
      if (matchedCampus) return matchedCampus;
    }

    // 3. Try parsing students' campus in the filtered list
    if (students && students.length > 0) {
      const firstStudentCampus = students[0].admissionCampus;
      const found = campuses.find((c: any) => 
        c.id === firstStudentCampus || c.campusName === firstStudentCampus || c.campusCode === firstStudentCampus ||
        firstStudentCampus?.includes(c.campusCode) || firstStudentCampus?.includes(c.campusName)
      );
      if (found) return found;
    }
    return campuses[0];
  }, [cBatchId, activeBatches, campuses, students, activePeriod]);

  const campusLabel = useMemo(() => {
    if (!selectedCampusObj) return "Toàn Hệ thống";
    const name = (selectedCampusObj.campusName || "").toUpperCase();
    if (name.includes("CS1") || name.includes("RIVERSIDE")) return "CS1 - Riverside";
    if (name.includes("CS2") || name.includes("CENTRAL")) return "CS2 - Central";
    if (name.includes("CS3") || name.includes("GLOBAL")) return "CS3 - Global";
    if (name.includes("CS4") || name.includes("HILL")) return "CS4 - Hill";
    if (name.includes("CS5") || name.includes("BEACH")) return "CS5 - Beach";
    return name;
  }, [selectedCampusObj]);

  const campusEmails = useMemo(() => {
    if (!selectedCampusObj) {
      return {
        tuyensinh: "bankhaothi@skylineschool.edu.vn",
        giaovu: "giaovu.cs3@skylineschool.edu.vn",
        gdcs: "gdcs.cs3@skylineschool.edu.vn",
        bghmn: "bghmn.cs3@skylineschool.edu.vn"
      };
    }

    const name = (selectedCampusObj.campusName || "").toUpperCase();
    let suffix = "cs3";
    if (name.includes("CS1") || name.includes("RIVERSIDE")) suffix = "cs1";
    if (name.includes("CS2") || name.includes("CENTRAL")) suffix = "cs2";
    if (name.includes("CS3") || name.includes("GLOBAL")) suffix = "cs3";
    if (name.includes("CS4") || name.includes("HILL")) suffix = "cs4";
    if (name.includes("CS5") || name.includes("BEACH")) suffix = "cs5";

    // 1. GĐCS Email
    let gdcsEmail = "";
    
    // Try to get email from manager's teacher record
    if (selectedCampusObj.manager?.teacher?.email) {
      gdcsEmail = selectedCampusObj.manager.teacher.email;
    } else if (selectedCampusObj.manager?.email && selectedCampusObj.manager.email.includes("@")) {
      gdcsEmail = selectedCampusObj.manager.email;
    }
    
    // If not resolved, try to find in teachers list where the teacher represents GĐCS or GĐ_CS or user is campus manager
    if (!gdcsEmail && teachers && teachers.length > 0) {
      // Find teacher who matches the campus manager's name
      if (selectedCampusObj.manager?.fullName) {
        const mgrTeacher = teachers.find((t: any) => t.teacherName === selectedCampusObj.manager?.fullName || t.user?.fullName === selectedCampusObj.manager?.fullName);
        if (mgrTeacher?.email) {
          gdcsEmail = mgrTeacher.email;
        }
      }
      
      // If still not resolved, look for a teacher in the same campus with role containing GDCS or department name containing "GIÁM ĐỐC" or "GĐCS"
      if (!gdcsEmail) {
        const gdcsTeacher = teachers.find((t: any) => 
          t.campusId === selectedCampusObj.id && 
          (t.user?.role === "GDCS" || t.user?.role === "GD_CS" || 
           t.departmentRel?.name?.toUpperCase().includes("GIÁM ĐỐC") ||
           t.departmentRel?.name?.toUpperCase().includes("GĐCS"))
        );
        if (gdcsTeacher?.email) {
          gdcsEmail = gdcsTeacher.email;
        }
      }
    }

    // If still not resolved, try the gdcsUsers list from prop
    if (!gdcsEmail && gdcsUsers && gdcsUsers.length > 0) {
      const foundGdcs = gdcsUsers.find((u: any) => u.fullName === selectedCampusObj.manager?.fullName);
      if (foundGdcs) {
        if (foundGdcs.email && foundGdcs.email.includes("@")) {
          gdcsEmail = foundGdcs.email;
        } else {
          // Look up in teachers array
          const tGdcs = teachers.find((t: any) => t.userId === foundGdcs.id);
          if (tGdcs?.email) {
            gdcsEmail = tGdcs.email;
          }
        }
      }
    }

    // Ultimate fallback to default email format
    if (!gdcsEmail) {
      gdcsEmail = `gdcs.${suffix}@skylineschool.edu.vn`;
    }

    // 2. Giáo vụ Email (Prioritize explicit teacher.email "Email Nhận thông báo")
    let giaovuEmail = `giaovu.${suffix}@skylineschool.edu.vn`;
    if (teachers && teachers.length > 0) {
      const foundGiaovu = teachers.find((t: any) => 
        t.campusId === selectedCampusObj.id && 
        (t.departmentRel?.name?.toUpperCase().includes("GIÁO VỤ") || 
         t.user?.role?.includes("GIAO_VU") || 
         t.user?.role?.includes("GD_CS"))
      );
      if (foundGiaovu?.email) {
        giaovuEmail = foundGiaovu.email;
      } else if (foundGiaovu?.user?.email) {
        giaovuEmail = foundGiaovu.user.email;
      }
    }

    // 3. Tư vấn (Tuyển sinh) Email (Prioritize explicit teacher.email "Email Nhận thông báo")
    let tuyensinhEmail = `tuyensinh.${suffix}@skylineschool.edu.vn`;
    if (teachers && teachers.length > 0) {
      const foundTuvan = teachers.find((t: any) => 
        t.campusId === selectedCampusObj.id && 
        (t.departmentRel?.name?.toUpperCase().includes("TƯ VẤN") || 
         t.departmentRel?.name?.toUpperCase().includes("TUYỂN SINH"))
      );
      if (foundTuvan?.email) {
        tuyensinhEmail = foundTuvan.email;
      } else if (foundTuvan?.user?.email) {
        tuyensinhEmail = foundTuvan.user.email;
      }
    }

    let bghmnEmail = "bghmn." + suffix + "@skylineschool.edu.vn";
    if (teachers && teachers.length > 0) {
      const foundBgh = teachers.find((t: any) => 
        t.campusId === selectedCampusObj.id && 
        (t.user?.role === "BGH MN" || t.user?.role === "BGH_MN" || t.user?.role === "BGH" ||
         t.departmentRel?.name?.toUpperCase()?.includes("BAN GIÁM HIỆU") || 
         t.departmentRel?.name?.toUpperCase()?.includes("BGH"))
      );
      if (foundBgh?.email) {
        bghmnEmail = foundBgh.email;
      } else if (foundBgh?.user?.email) {
        bghmnEmail = foundBgh.user.email;
      }
    }

    return {
      tuyensinh: tuyensinhEmail,
      giaovu: giaovuEmail,
      gdcs: gdcsEmail,
      bghmn: bghmnEmail
    };
  }, [selectedCampusObj, gdcsUsers, teachers]);

  // PDF & HTML Generation Helpers for dynamic quick reports emailing
  const getHtml2Pdf = async () => {
    if (typeof window !== "undefined" && (window as any).html2pdf) {
      return (window as any).html2pdf;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        if ((window as any).html2pdf) resolve((window as any).html2pdf);
        else reject(new Error("html2pdf failed to load"));
      };
      script.onerror = () => reject(new Error("Failed to load html2pdf script"));
      document.head.appendChild(script);
    });
  };

  const generatePdfBase64 = async (html2pdf: any, docHtml: string, opt: any) => {
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const detachedElements: any[] = [];
    styleElements.forEach((el: any) => {
      const parent = el.parentNode;
      if (parent) {
        try {
          parent.removeChild(el);
          detachedElements.push({ element: el, parent });
        } catch (err) {
          console.error("Failed to detach style element:", err);
        }
      }
    });

    try {
      const pdfBase64 = await html2pdf().from(docHtml).set(opt).outputPdf('datauristring');
      return pdfBase64;
    } finally {
      detachedElements.forEach(({ element, parent }) => {
        if (parent) {
          try {
            parent.appendChild(element);
          } catch (e) {
            console.error("Failed to re-attach style element:", e);
          }
        }
      });
    }
  };

  const getStudentCampusConfigForEmail = (student: any) => {
    if (typeof window === "undefined" || !student) return null;
    const effCampus = student.admissionCampus;
    let targetCampus = campuses.find((c: any) => 
      c.id === effCampus || c.campusName === effCampus || c.campusCode === effCampus ||
      effCampus?.includes(c.campusCode) || effCampus?.includes(c.campusName)
    );
    if (!targetCampus && campuses.length > 0) targetCampus = campuses[0];

    if (targetCampus) {
      let studentGroup = "all";
      const gClean = String(student.grade || "").toLowerCase();
      if (gClean.includes("mầm non") || gClean.includes("nhóm") || selectedLevel === "preschool") {
        studentGroup = "preschool";
      } else if (gClean.includes("6") || gClean.includes("7") || gClean.includes("8") || gClean.includes("9")) {
        studentGroup = "khoi_6";
      } else if (gClean.includes("10") || gClean.includes("11") || gClean.includes("12")) {
        studentGroup = "khoi_10_noi_tinh";
      } else {
        studentGroup = "khoi_1";
      }

      const baseKey = 'thu_chuc_mung';
      const typeKey = selectedLevel === "preschool" ? baseKey + "_preschool" : baseKey + "_" + studentGroup;
      const fallbackTypeKey = selectedLevel === "preschool" ? baseKey + "_preschool" : baseKey + "_all";

      let savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + typeKey);
      let savedGlobal = localStorage.getItem('report_config_global_' + typeKey);

      if (!savedGlobal) {
        savedGlobal = localStorage.getItem('report_config_global_' + fallbackTypeKey);
      }
      if (!savedCampus) {
        savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + fallbackTypeKey);
      }

      let campusData: any = {};
      let globalData: any = {};
      if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch (e) {} }
      if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch (e) {} }

      const mergedTitle = globalData.title || campusData.title || "THƯ CHÚC MỪNG";
      const mLogo = localStorage.getItem('report_config_master_logo') || "";
      const mBg = localStorage.getItem('report_config_master_background') || "";
      const mFooter = localStorage.getItem('report_config_master_footer') || "";
      const mSig = localStorage.getItem('report_config_master_signature') || "";

      const mergedLogo = mLogo || globalData.logo || campusData.logo || "";
      const mergedBackground = mBg || globalData.background || campusData.background || "";
      
      const defaultText = selectedLevel === "preschool"
        ? defaultPreschoolCongratulations
        : defaultThuChucMung;

      const mergedContent = globalData.content || campusData.content || defaultText;
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";
      const campusSig = localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || mSig || "";
      const campusDir = localStorage.getItem('report_config_director_' + targetCampus.id) || campusData.directorName || targetCampus.manager?.fullName || getCampusDefaultManager(targetCampus.campusName || "");

      return {
        title: mergedTitle,
        logo: mergedLogo,
        background: mergedBackground,
        content: mergedContent,
        footer: mergedFooter,
        signature: campusSig,
        directorName: campusDir
      };
    }
    return null;
  };

  const getStudentDocListForEmail = (student: any) => {
    if (typeof window === "undefined" || !student) return [];
    
    let studentGroup = "khoi_1";
    const getNumericGrade = (g: any) => {
      if (!g) return null;
      const match = g.toString().match(/d+/);
      return match ? parseInt(match[0], 10) : null;
    };
    const sGradeNum = getNumericGrade(student.grade);
    
    const gradeMatchedGroups = docGroups.filter(g => {
      const mappedGrades = docGroupGrades[g.id] || [];
      const hasGradeMatch = mappedGrades.some(gradeStr => {
        if (!student.grade) return false;
        const sGrade = student.grade.toString().toLowerCase();
        const gStr = gradeStr.toLowerCase();
        return sGrade === gStr || sGrade.includes(gStr) || gStr.includes(sGrade);
      });
      if (hasGradeMatch) return true;
      
      if (sGradeNum !== null) {
        if (g.id === "khoi_1" && sGradeNum === 1) return true;
        if (g.id === "khoi_2_5" && sGradeNum >= 2 && sGradeNum <= 5) return true;
        if (g.id === "khoi_6" && sGradeNum === 6) return true;
        if (g.id === "khoi_10_noi_tinh" && sGradeNum === 10) return true;
        if (g.id === "khoi_10_ngoai_tinh" && sGradeNum === 10) return true;
      }
      return false;
    });

    if (student.targetType) {
      const studentTargets = student.targetType.split(',').map((x: any) => x.trim().toLowerCase()).filter(Boolean);
      
      const targetMatch = gradeMatchedGroups.find(g => {
        const mappedTs = docGroupTargets[g.id] || [];
        return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
      });
      
      if (targetMatch) {
        studentGroup = targetMatch.id;
      } else {
        const anyTargetMatch = docGroups.find(g => {
          const mappedTs = docGroupTargets[g.id] || [];
          return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
        });
        if (anyTargetMatch) {
          studentGroup = anyTargetMatch.id;
        } else {
          studentGroup = gradeMatchedGroups[0]?.id || "doi_tuong_tuyen_sinh";
        }
      }
    } else {
      studentGroup = gradeMatchedGroups[0]?.id || "khoi_1";
    }
    
    const saved = localStorage.getItem('admission_docs_' + studentGroup);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    
    if (studentGroup === "khoi_2_5") return defaultDocumentsGrade2_5;
    if (studentGroup === "khoi_6") return defaultDocumentsGrade6;
    if (studentGroup === "khoi_10_noi_tinh") return defaultDocumentsGrade10NoiTinh;
    if (studentGroup === "khoi_10_ngoai_tinh") return defaultDocumentsGrade10NgoaiTinh;
    return defaultDocumentsGrade1;
  };

  const buildLetterHtmlForEmail = (student: any, config: any) => {
    const rawGrade = student?.grade || "1";
    const gradeMatch = rawGrade.toString().match(/d+/);
    const numericGrade = gradeMatch ? gradeMatch[0] : rawGrade;
    const comSubs = Array.isArray(student?.committedSubjects) 
      ? student.committedSubjects.join(", ") 
      : (student?.committedSubjects || "");
      
    const renderedContent = (config.content || "")
      .replace(/{{fullName}}/g, student?.fullName || "")
      .replace(/{{grade}}/g, numericGrade)
      .replace(/{{hocKy}}/g, student?.hocKy || "1")
      .replace(/{{surveyFormType}}/g, student?.surveyFormType || "")
      .replace(/{{admissionCampus}}/g, student?.admissionCampus || "")
      .replace(/{{directorNote}}/g, student?.directorNote || "")
      .replace(/{{committedSubjects}}/g, comSubs)
      .replace(/{{signatureName}}/g, student?.signatureName || "");

    const paragraphs = renderedContent.split("\n").filter(Boolean);
    const isCommitmentReport = isCommitment || (config?.title?.toUpperCase().includes("CAM KẾT")) || (rcReportType === "cam_ket_hoc_tap");
    const bodyHtml = paragraphs.map((p: string) => {
      const pClean = p.trim();
      const isCentred = pClean.toLowerCase().includes("về việc") || pClean.toLowerCase().includes("kính gửi:");
      const isDateLine = pClean.toLowerCase().includes("ngày") && pClean.toLowerCase().includes("tháng") && pClean.toLowerCase().includes("năm") && (pClean.toLowerCase().includes("đà nẵng") || pClean.toLowerCase().includes("hà nội") || pClean.toLowerCase().includes("hồ chí minh"));
      
      if (isDateLine) return "";
      if (isCentred) {
        return '<p style="text-align: center; font-weight: bold; text-indent: 0; margin: 0 0 10px 0;">' + pClean + '</p>';
      }
      return '<p style="text-indent: 1cm; margin: 0 0 10px 0;">' + pClean + '</p>';
    }).filter(Boolean).join("");
    
    const greetingHtml = 'Thân gửi con <strong style="font-weight: 900; font-style: normal; color: #0f172a;">' + student.fullName + '</strong>,';
    const directorName = config.directorName || "Trần Thị Thanh";
    const getImgTag = (src: string, className: string, style: string = "", alt: string = "") => {
      if (!src) return "";
      const cors = src.startsWith("data:") ? "" : ' crossorigin="anonymous"';
      const styleAttr = style ? ' style="' + style + '"' : "";
      const altAttr = alt ? ' alt="' + alt + '"' : "";
      return '<img class="' + className + '"' + cors + ' src="' + src + '"' + styleAttr + altAttr + ' />';
    };

    const logoHtml = config.logo ? getImgTag(config.logo, "logo-img", "", "Logo") : "";
    const signatureHtml = config.signature ? getImgTag(config.signature, "signature-img", "", "Signature") : "";
    const footerHtml = config.footer ? getImgTag(config.footer, "footer-img", "", "Footer") : "";
    
    const effCampus = student.admissionCampus;
    const campusObj = campuses.find((c: any) => c.id === effCampus || c.campusName === effCampus || c.campusCode === effCampus);
    const campusCodeStr = (campusObj ? campusObj.campusCode || campusObj.campusName : effCampus || "").toUpperCase();
    let schoolName = selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE";
    if (campusCodeStr.includes("CS4") || campusCodeStr.includes("HILL") || campusCodeStr.includes("HILLTOP")) {
      schoolName = selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE HILL";
    }

    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const formattedLetterDate = `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;

    const campusTitleSuffix = (campusCodeStr.includes("CS1") || campusCodeStr.includes("RIVERSIDE")) ? "RIVERSIDE"
      : (campusCodeStr.includes("CS2") || campusCodeStr.includes("CENTRAL")) ? "CENTRAL"
      : (campusCodeStr.includes("CS3") || campusCodeStr.includes("GLOBAL")) ? "GLOBAL"
      : (campusCodeStr.includes("CS4") || campusCodeStr.includes("HILL")) ? "HILL"
      : (campusCodeStr.includes("CS5") || campusCodeStr.includes("BEACH")) ? "BEACH"
      : campusCodeStr || "GLOBAL";

    const titleText = "TM. HỘI ĐỒNG TUYỂN SINH";
    const subTitleText = `GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusTitleSuffix}`;
    const signName = directorName;

    const customFooterHtml = config.footer ? getImgTag(config.footer, "footer-img", "width: 100%; max-height: 100px; object-fit: contain;", "Footer") :
      '<div style="width: 100%; font-family: Arial, sans-serif; box-sizing: border-box; text-align: left;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; width: 100%;">' +
          '<span style="font-weight: bold; color: #00A6A9; white-space: nowrap; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>' +
          '<div style="flex-grow: 1; border-top: 1px solid rgba(0, 166, 169, 0.7); height: 0; margin-top: 2px;"></div>' +
          '<span style="font-weight: 600; color: #00A6A9; white-space: nowrap; text-transform: lowercase; font-size: 11px;">www.skylineschool.edu.vn</span>' +
        '</div>' +
      '</div>';

    let page2Html = "";
    if (selectedLevel !== "preschool") {
      const docList = getStudentDocListForEmail(student);
      if (docList && docList.length > 0) {
        const rowsHtml = docList.map((item: any, idx: number) => {
          return '<tr style="border-bottom: 1px solid #000000;">' +
            '<td style="padding: 10px; border-right: 1px solid #000000; text-align: center; color: #000000;">' + (idx + 1) + '</td>' +
            '<td style="padding: 10px 15px; border-right: 1px solid #000000; font-weight: bold; color: #000000;">' + item.name + '</td>' +
            '<td style="padding: 10px; text-align: center; font-weight: bold; color: #000000;">' + item.qty + '</td>' +
          '</tr>';
        }).join("");

        page2Html = '<div class="print-page">' +
            getImgTag(config.background || DEFAULT_WATERMARK_SVG, "print-watermark", "display: block; position: absolute; top: 22%; left: 10%; transform: none; width: 80%; height: auto; opacity: 0.08; z-index: 0; pointer-events: none;", "Watermark") +
            '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 10;">' +
              '<div style="display: flex; align-items: center; justify-content: space-between;">' +
                logoHtml +
              '</div>' +
              '<div style="text-align: left; margin-top: 4px;">' +
                '<h4 style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 0;">' + schoolName + '</h4>' +
              '</div>' +
            '</div>' +
            '<div class="letter-title">' +
              '<h2>DANH MỤC HỒ SƠ NHẬP HỌC</h2>' +
            '</div>' +
            '<div style="margin-top: 30px; border: 1px solid #000000; overflow: hidden; position: relative; z-index: 10;">' +
              '<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; color: #000000; font-family: \'Times New Roman\', Times, serif;">' +
                '<thead>' +
                  '<tr style="background-color: #ffffff; border-bottom: 1px solid #000000;">' +
                    '<th style="padding: 10px; border-right: 1px solid #000000; text-align: center; font-weight: bold; width: 60px; text-transform: uppercase; color: #000000;">STT</th>' +
                    '<th style="padding: 10px 15px; border-right: 1px solid #000000; text-align: center; font-weight: bold; text-transform: uppercase; color: #000000;">Tên hồ sơ</th>' +
                    '<th style="padding: 10px; text-align: center; font-weight: bold; width: 120px; text-transform: uppercase; color: #000000;">Số lượng</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  rowsHtml +
                '</tbody>' +
              '</table>' +
            '</div>' +
            '<p style="margin-top: 35px; font-size: 14px; font-weight: bold; color: #000000; line-height: 1.6; text-align: left; position: relative; z-index: 10;">' +
              'Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.' +
            '</p>' +
            '<div class="footer-container">' +
              customFooterHtml +
            '</div>' +
          '</div>';
      }
    }

    return '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<meta charset="utf-8">' +
        '<title>' + (config.title || "Tài liệu") + '</title>' +
        '<style>' +
          '@page {' +
            'size: A4;' +
            'margin: 0;' +
          '}' +
          'body {' +
            'margin: 0;' +
            'padding: 0;' +
            'background-color: #ffffff;' +
            '-webkit-print-color-adjust: exact !important;' +
            'print-color-adjust: exact !important;' +
          '}' +
          '.print-page {' +
            'font-family: "Open Sans", sans-serif;' +
            'width: 210mm;' +
            (isCommitmentReport ? 'height: auto; min-height: 296.8mm; overflow: visible;' : 'height: 296.8mm; overflow: hidden;') +
            'padding: 12.7mm 15mm 48mm 15mm;' +
            'box-sizing: border-box;' +
            'position: relative;' +
            'background-color: #ffffff;' +
          '}' +
          '.print-page + .print-page {' +
            'page-break-before: always !important;' +
            'break-before: page !important;' +
          '}' +
          '.print-watermark {' +
            'display: block;' +
            'position: absolute;' +
            'top: 22%;' +
            'left: 10%;' +
            'transform: none;' +
            'width: 80%;' +
            'height: auto;' +
            'opacity: 0.08;' +
            'z-index: 0;' +
            'pointer-events: none;' +
          '}' +
          '.logo-img {' +
            'max-height: 48px;' +
            'object-fit: contain;' +
          '}' +
          '.letter-title {' +
            'text-align: center;' +
            'margin: 20px 0;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.letter-title h2 {' +
            'font-size: 22px;' +
            'font-weight: 900;' +
            'letter-spacing: 0.5px;' +
            'color: #1e1b4b;' +
            'text-transform: uppercase;' +
            'margin: 0;' +
          '}' +
          '.greeting {' +
            'font-size: 16px;' +
            'font-style: italic;' +
            'color: #1e293b;' +
            'margin-bottom: 12px;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.content-body {' +
            'font-size: 14pt;' +
            'line-height: 1.5;' +
            'text-align: justify;' +
            'color: #1e293b;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.signature-section {' +
            'margin-top: 30px;' +
            'display: flex;' +
            'justify-content: flex-end;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.signature-block {' +
            'text-align: center;' +
            'width: 200px;' +
          '}' +
          '.signature-title {' +
            'font-size: 14px;' +
            'font-weight: bold;' +
            'color: #1e293b;' +
            'margin-bottom: 4px;' +
          '}' +
          '.signature-desc {' +
            'font-size: 12px;' +
            'color: #475569;' +
            'font-style: italic;' +
            'margin-bottom: 10px;' +
          '}' +
          '.signature-img-container {' +
            'height: 64px;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
            'margin-bottom: 8px;' +
          '}' +
          '.signature-img {' +
            'max-height: 64px;' +
            'object-fit: contain;' +
          '}' +
          '.signature-name {' +
            'font-size: 15px;' +
            'font-weight: bold;' +
            'color: #1e293b;' +
          '}' +
          '.footer-container {' +
            'position: absolute;' +
            'bottom: 8mm;' +
            'left: 0;' +
            'right: 0;' +
            'width: 100%;' +
            'padding-left: 15mm;' +
            'padding-right: 15mm;' +
            'box-sizing: border-box;' +
            'z-index: 10;' +
          '}' +
          '.footer-img {' +
            'width: 100%;' +
            'max-height: 100px;' +
            'object-fit: contain;' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="print-page">' +
          getImgTag(config.background || DEFAULT_WATERMARK_SVG, "print-watermark", "display: block; position: absolute; top: 22%; left: 10%; transform: none; width: 80%; height: auto; opacity: 0.08; z-index: 0; pointer-events: none;", "Watermark") +
          '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 10;">' +
            '<div style="display: flex; align-items: center; justify-content: space-between;">' +
              logoHtml +
            '</div>' +
            '<div style="text-align: left; margin-top: 4px;">' +
              '<h4 style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 0;">' + schoolName + '</h4>' +
            '</div>' +
          '</div>' +
          '<div class="letter-title">' +
            '<h2>' + config.title + '</h2>' +
          '</div>' +
          (!isCommitmentReport ? 
          '<div class="greeting">' +
            greetingHtml +
          '</div>' : '') +
          '<div class="content-body">' +
            bodyHtml +
          '</div>' +
          '<div class="signature-section" style="margin-top: 30px; display: flex; justify-content: flex-end; position: relative; z-index: 10;">' +
            '<div class="signature-block" style="text-align: center; width: 240px;">' +
              (!isCommitmentReport ? '<div style="font-size: 13px; font-style: italic; color: #4b5563; margin-bottom: 4px;">' + formattedLetterDate + '</div>' : '') +
              '<div class="signature-title" style="font-size: 12px; font-weight: bold; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">' + titleText + '</div>' +
              '<div style="font-size: 10px; font-weight: bold; color: #312e81; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">' + subTitleText + '</div>' +
              '<div class="signature-img-container" style="height: 64px; display: flex; justify-content: center; align-items: center; margin-bottom: 8px;">' +
                (config.signature ? signatureHtml : '') +
              '</div>' +
              '<div class="signature-name" style="font-size: 14px; font-weight: bold; color: #1e293b;">' + signName + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="footer-container">' +
            customFooterHtml +
          '</div>' +
        '</div>' +
        page2Html +
      '</body>' +
      '</html>';
  };


  // SMTP Email Send Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [selectedEmailStudentIds, setSelectedEmailStudentIds] = useState<any[]>([]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState("");
  const [attachLetters, setAttachLetters] = useState(true);

  const handleOpenEmailModal = () => {
    const activePeriodName = activePeriod?.name || "Kỳ khảo sát";
    const activeBatchName = cBatchId !== "all" ? (activeBatches.find(b => b.id === cBatchId)?.name || "Đợt") : "Tất cả các đợt";
    
    setEmailSubject(`[Báo cáo nhanh] Kết quả Khảo sát đầu vào KSNL - Kỳ: ${activePeriodName} - Đợt: ${activeBatchName}`);
    
    // Automatically pre-populate To: Giáo vụ + GĐCS + BGH MN (nếu mầm non) + Tư vấn theo Cơ sở
    const defaultTo = [
      campusEmails.giaovu, 
      campusEmails.gdcs, 
      selectedLevel === "preschool" ? campusEmails.bghmn : null, 
      campusEmails.tuyensinh
    ].filter(Boolean).join(", ");
    setRecipientEmail(defaultTo);
    
    // CC: Khảo thí
    const defaultCc = "bankhaothi@skylineschool.edu.vn";
    setCcEmail(defaultCc);

    setAttachLetters(true);
    setSelectedEmailStudentIds(filteredStudents.map(s => s.id));
    setIsEmailModalOpen(true);
  };

  const handleSendEmailsSubmit = async () => {
    const targetStudents = filteredStudents.filter(s => selectedEmailStudentIds.includes(s.id));
    if (targetStudents.length === 0) return alert("Vui lòng chọn ít nhất 1 học sinh để gửi báo cáo!");
    if (!recipientEmail) return alert("Vui lòng nhập Email người nhận");
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo gửi mail...");

    try {
      const activePeriodName = activePeriod?.name || "Kỳ khảo sát";
      const activeBatchName = cBatchId !== "all" ? (activeBatches.find(b => b.id === cBatchId)?.name || "Đợt") : "Tất cả các đợt";

      const pdfAttachmentsList: any[] = [];
      if (attachLetters) {
        const html2pdf = await getHtml2Pdf();
        
        const eligibleStudents = targetStudents.filter(s => {
          const r = s.admissionResult || s.devAssessmentResult || "";
          const isPassed = (r.includes("Đạt") && !r.includes("Không")) || r.includes("DAT") || r.includes("MIỄN") || s.probationaryResult === "DAT";
          return isPassed;
        });
        
        let currentPdfCount = 0;
        let totalPdfs = eligibleStudents.length;

        for (const s of targetStudents) {
          const r = s.admissionResult || s.devAssessmentResult || "";
          const isPassed = (r.includes("Đạt") && !r.includes("Không")) || r.includes("DAT") || r.includes("MIỄN") || s.probationaryResult === "DAT";
          if (isPassed) {
            const config = getStudentCampusConfigForEmail(s);
            if (config) {
              currentPdfCount++;
              setEmailSendingStatus(`Đang tạo PDF (${currentPdfCount}/${totalPdfs}): Thư chúc mừng - ${s.fullName}`);
              const docHtml = buildLetterHtmlForEmail(s, config);
              const filename = `Thu_Chuc_Mung_${s.fullName.replace(/\s+/g, '_')}.pdf`;
              const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 1.8, useCORS: true, logging: false, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css'] }
              };

              try {
                const pdfBase64 = await generatePdfBase64(html2pdf, docHtml, opt);
                const base64Data = pdfBase64.split(',')[1];
                
                pdfAttachmentsList.push({
                  filename: filename,
                  base64: base64Data
                });
              } catch (pdfErr) {
                console.error("Client PDF generation failed, falling back to server:", pdfErr);
                pdfAttachmentsList.push({
                  filename: filename,
                  html: docHtml
                });
              }
            }
          }
        }
      }

      setEmailSendingStatus("Đang truyền tải & gửi Email...");

      const apiRoute = selectedLevel === "preschool"
        ? "/api/admin/preschool-send-quick-email"
        : "/api/admin/send-quick-email";

      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          cc: ccEmail,
          subject: emailSubject,
          periodName: activePeriodName,
          batchName: activeBatchName,
          students: targetStudents,
          attachLetters: attachLetters,
          pdfAttachments: pdfAttachmentsList
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Đã gửi email báo cáo thành công!");
        setIsEmailModalOpen(false);
      } else {
        alert("Gửi email thất bại: " + (data.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setEmailSending(false);
      setEmailSendingStatus("");
    }
  };

  // PDF Download Helper
  const handlePrintPDF = async () => {
    if (typeof window === "undefined") return;
    
    const printArea = document.getElementById('print-area-reports');
    if (!printArea) {
      window.print();
      return;
    }

    // Create a temporary hidden iframe for clean printing isolation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Copy all CSS stylesheet links and inline styles from parent document to iframe (excluding parent media print styles)
    const styles = Array.from(document.querySelectorAll('style:not([data-next-print-styles="true"]), link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    // Write content into iframe, styling A4 pages to prevent any overflow or blank pages
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Thư Skyline</title>
          ${styles}
          <style>
            @media print {
              html, body {
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
              }
              #print-area-iframe-root {
                display: block !important;
                width: 210mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
              }
              #print-area-iframe-root,
              #print-area-iframe-root * {
                visibility: visible !important;
              }
              #print-area-iframe-root > div {
                width: 210mm !important;
                height: 296mm !important; /* Extremely safe height to avoid rounding error splits */
                min-height: 296mm !important;
                max-height: 296mm !important;
                margin: 0 auto !important;
                padding: 18mm 20mm 22mm 20mm !important;
                box-sizing: border-box !important;
                position: relative !important;
                background-color: white !important;
                border: none !important; /* Zero borders so height calculation is exact */
                box-shadow: none !important;
                page-break-after: always !important;
                break-after: page !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #print-area-iframe-root > div:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .footer-container {
                position: absolute !important;
                bottom: 12mm !important;
                left: 20mm !important;
                right: 20mm !important;
                width: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                z-index: 10 !important;
              }
              @page {
                size: A4 portrait;
                margin: 0mm !important;
              }
            }
          </style>
        </head>
        <body style="background-color: white;">
          <div id="print-area-iframe-root">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Ensure all images are fully loaded before triggering print dialog
    const images = iframe.contentWindow?.document.querySelectorAll('img') || [];
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    await Promise.all(imagePromises);

    // Focus and print from the clean isolated iframe
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print triggered error:", err);
        window.print();
      } finally {
        // Clean up same-origin dynamic print iframe
        setTimeout(() => {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  };

  const formattedLetterDate = useMemo(() => {
    const d = new Date();
    return `Đà Nẵng, ngày ${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
  }, []);

  const campusTitleSuffix = useMemo(() => {
    if (!selectedReportStudent) return "GLOBAL";
    const eff = (selectedReportStudent.admissionCampus || "").toUpperCase();
    if (eff.includes("CS1") || eff.includes("RIVERSIDE")) return "RIVERSIDE";
    if (eff.includes("CS2") || eff.includes("CENTRAL")) return "CENTRAL";
    if (eff.includes("CS3") || eff.includes("GLOBAL")) return "GLOBAL";
    if (eff.includes("CS4") || eff.includes("HILL")) return "HILL";
    if (eff.includes("CS5") || eff.includes("BEACH")) return "BEACH";
    return "GLOBAL";
  }, [selectedReportStudent]);

  const renderPrintPages = () => {
    const fullContent = renderTemplate(
      studentCampusConfig?.content || "",
      {
        ...selectedReportStudent,
        signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
      }
    );
    // Split the paragraph if "Kính mong Phụ huynh..." is in the middle of a paragraph
    let paragraphs: string[] = [];
    fullContent.replace(/\u00a0/g, ' ').split('\n').filter(Boolean).forEach(p => {
      const pNorm = p.normalize('NFC');
      const regex = /kính\s+mong\s+phụ\s+huynh\s+đồng\s+hành/i;
      const match = pNorm.match(regex);
      if (match && match.index !== undefined && match.index > 0) {
        paragraphs.push(p.substring(0, match.index).trim());
        paragraphs.push(p.substring(match.index).trim());
      } else {
        paragraphs.push(p.trim());
      }
    });

    const isCommitmentReport = isCommitment || (studentCampusConfig?.title?.toUpperCase().includes("CAM KẾT"));
    const splitIndex = isCommitmentReport ? paragraphs.findIndex(p => {
      return /kính\s+mong\s+phụ\s+huynh\s+đồng\s+hành/i.test(p.normalize('NFC'));
    }) : -1;
    const isSplit = isCommitmentReport && splitIndex !== -1;

    let page1Paragraphs = isSplit ? paragraphs.slice(0, splitIndex) : paragraphs;
    let page2Paragraphs = isSplit ? paragraphs.slice(splitIndex) : [];

    const buildParagraphElement = (paras: string[]) => {
      return paras.map((para, idx) => {
        const pClean = para.trim();
        const isList = /^\s*[\d•\-*]+/.test(pClean);
        const isCentred = pClean.toLowerCase().includes("về việc") || pClean.toLowerCase().includes("kính gửi:");
        const isDateLine = pClean.toLowerCase().includes("ngày") && pClean.toLowerCase().includes("tháng") && pClean.toLowerCase().includes("năm") && (pClean.toLowerCase().includes("đà nẵng") || pClean.toLowerCase().includes("hà nội") || pClean.toLowerCase().includes("hồ chí minh"));
        
        if (isDateLine) return null;
        if (isCentred) {
          return (
            <p key={idx} style={{ textAlign: "center", fontWeight: "bold", margin: "0 0 8px 0", fontSize: "13pt", textIndent: 0 }}>
              {pClean}
            </p>
          );
        }
        
        return (
          <p key={idx} style={isList ? { paddingLeft: "24px", fontWeight: "bold", color: "#374151", margin: "4px 0", fontSize: "13pt" } : { textIndent: "10mm", margin: "0 0 4px 0", textAlign: "justify", lineBreak: "auto", lineHeight: "1.3", fontSize: "13pt" }}>
            {pClean}
          </p>
        );
      }).filter(Boolean);
    };

    if (isSplit) {
      return (
        <>
          {/* PAGE 1: CONGRATULATIONS & COMMITMENTS LIST */}
          <div className="bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] p-[18mm_20mm_22mm_20mm] box-border relative flex flex-col justify-start overflow-hidden select-none font-sans text-slate-800 leading-normal" style={{ fontFamily: '"Open Sans", sans-serif' }}>
            {studentCampusConfig?.background && (
              <img crossOrigin={(studentCampusConfig?.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig?.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
            )}
            <div className="relative z-10 flex flex-col justify-start h-full">
              <div>
                <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {studentCampusConfig?.logo ? (
                      <img src={studentCampusConfig?.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                    )}
                  </div>
                  <div style={{ textAlign: "left", marginTop: "4px" }}>
                    <h4 style={{ fontFamily: '"Open Sans", sans-serif', fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                      {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                    </h4>
                  </div>
                </div>
                <h2 style={{ textAlign: "center", fontSize: "22pt", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "2px", margin: "12px 0 16px 0" }}>
                  {studentCampusConfig?.title}
                </h2>
                <div style={{ flexGrow: 1, fontFamily: '"Open Sans", sans-serif' }}>
                  {buildParagraphElement(page1Paragraphs)}
                </div>
              </div>
            </div>
            <div className="footer-container" style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
              {studentCampusConfig?.footer ? (
                <img src={studentCampusConfig?.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "100%", fontFamily: '"Open Sans", sans-serif', boxSizing: "border-box", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", width: "100%" }}>
                    <span style={{ fontWeight: "bold", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "uppercase", fontSize: "9.5pt", letterSpacing: "0.5px" }}>HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                    <div style={{ flexGrow: 1, borderTop: "1px solid rgba(0, 166, 169, 0.7)", height: 0, marginTop: "2px" }}></div>
                    <span style={{ fontWeight: "600", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "lowercase", fontSize: "9pt" }}>www.skylineschool.edu.vn</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PAGE 2: EXPECTATIONS & SIGNATURES */}
          <div className="bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] p-[18mm_20mm_22mm_20mm] box-border relative flex flex-col justify-start overflow-hidden select-none font-sans text-slate-800 leading-normal" style={{ fontFamily: '"Open Sans", sans-serif' }}>
            {studentCampusConfig?.background && (
              <img crossOrigin={(studentCampusConfig?.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig?.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
            )}
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {studentCampusConfig?.logo ? (
                      <img src={studentCampusConfig?.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                    )}
                  </div>
                  <div style={{ textAlign: "left", marginTop: "4px" }}>
                    <h4 style={{ fontFamily: '"Open Sans", sans-serif', fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                      {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                    </h4>
                  </div>
                </div>

                <div style={{ flexGrow: 1, fontFamily: '"Open Sans", sans-serif' }}>
                  {buildParagraphElement(page2Paragraphs)}
                </div>
              </div>
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "2px", pageBreakInside: "avoid", breakInside: "avoid" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "45%" }}>
                  <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#475569" }}>ĐẠI DIỆN GIA ĐÌNH</p>
                  <p style={{ fontSize: "9pt", fontStyle: "italic", color: "#64748b", marginTop: "1px", textIndent: 0 }}>(Ký và ghi rõ họ tên)</p>
                  <div style={{ height: "45px", display: "flex", alignItems: "flex-end", justifyContent: "center", margin: "2px 0" }}>
                    <span style={{ fontSize: "10pt", color: "#cbd5e1", fontStyle: "italic" }}>Ký tên</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "45%" }}>
                  <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#0f172a" }}>TM. HỘI ĐỒNG TUYỂN SINH</p>
                  <p style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", color: "#475569", margin: "1px 0 0 0", textAlign: "center", textIndent: 0 }}>GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                  <div style={{ height: "45px", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px 0" }}>
                    {studentCampusConfig?.signature ? (
                      <img src={studentCampusConfig?.signature} alt="Signature" style={{ maxHeight: "45px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "45px" }} viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </div>
                  <p style={{ fontSize: "12pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
                </div>
              </div>
            </div>
            <div className="footer-container" style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
              {studentCampusConfig?.footer ? (
                <img src={studentCampusConfig?.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "100%", fontFamily: '"Open Sans", sans-serif', boxSizing: "border-box", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", width: "100%" }}>
                    <span style={{ fontWeight: "bold", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "uppercase", fontSize: "9.5pt", letterSpacing: "0.5px" }}>HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                    <div style={{ flexGrow: 1, borderTop: "1px solid rgba(0, 166, 169, 0.7)", height: 0, marginTop: "2px" }}></div>
                    <span style={{ fontWeight: "600", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "lowercase", fontSize: "9pt" }}>www.skylineschool.edu.vn</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {/* PAGE 1: THE LETTER */}
        <div className={`bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] p-[18mm_20mm_22mm_20mm] box-border relative flex flex-col justify-start select-none font-sans text-slate-800 leading-normal ${isCommitment || studentCampusConfig?.title?.toUpperCase().includes("CAM KẾT") ? 'h-auto min-h-[297mm] overflow-visible' : 'h-[297mm] min-h-[297mm] overflow-hidden'}`} style={{ fontFamily: '"Open Sans", sans-serif' }}>
          {studentCampusConfig?.background && (
            <img crossOrigin={(studentCampusConfig?.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig?.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
          )}

          <div className={`relative z-10 flex flex-col justify-start ${isCommitment || studentCampusConfig?.title?.toUpperCase().includes("CAM KẾT") ? 'h-auto' : 'h-full'}`}>
            <div>
              <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {studentCampusConfig?.logo ? (
                    <img src={studentCampusConfig?.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                  ) : (
                    <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                  )}
                </div>
                <div style={{ textAlign: "left", marginTop: "4px" }}>
                  <h4 style={{ fontFamily: '"Open Sans", sans-serif', fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                    {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                  </h4>
                </div>
              </div>

              <h2 style={{ textAlign: "center", fontSize: "22pt", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "2px", margin: "12px 0 16px 0" }}>
                {studentCampusConfig?.title}
              </h2>

              {!(isCommitment || studentCampusConfig?.title?.toUpperCase().includes("CAM KẾT")) && (
                <p style={{ fontSize: "13pt", fontStyle: "italic", marginBottom: "8px", color: "#1e293b", textIndent: 0 }}>
                  {isInvitation ? (
                    <>Kính gửi Quý Phụ huynh và em <strong style={{ fontWeight: "bold", color: "#0f172a" }}>{selectedReportStudent?.fullName}</strong>,</>
                  ) : (
                    <>Thân gửi con <strong style={{ fontWeight: "bold", color: "#0f172a" }}>{selectedReportStudent?.fullName}</strong>,</>
                  )}
                </p>
              )}

              <div style={{ flexGrow: 1, fontFamily: '"Open Sans", sans-serif' }}>
                {buildParagraphElement(paragraphs)}
              </div>
            </div>

            <div style={{ flex: "1 1 auto", minHeight: "5px", maxHeight: "30px" }} />
            {isCommitment ? (
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "2px", pageBreakInside: "avoid", breakInside: "avoid" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "45%" }}>
                  <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#475569" }}>ĐẠI DIỆN GIA ĐÌNH</p>
                  <p style={{ fontSize: "9pt", fontStyle: "italic", color: "#64748b", marginTop: "1px", textIndent: 0 }}>(Ký và ghi rõ họ tên)</p>
                  <div style={{ height: "45px", display: "flex", alignItems: "flex-end", justifyContent: "center", margin: "2px 0" }}>
                    <span style={{ fontSize: "10pt", color: "#cbd5e1", fontStyle: "italic" }}>Ký tên</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "45%" }}>
                  <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#0f172a" }}>TM. HỘI ĐỒNG TUYỂN SINH</p>
                  <p style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", color: "#475569", margin: "1px 0 0 0", textAlign: "center", textIndent: 0 }}>GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                  <div style={{ height: "45px", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px 0" }}>
                    {studentCampusConfig?.signature ? (
                      <img src={studentCampusConfig?.signature} alt="Signature" style={{ maxHeight: "45px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "45px" }} viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </div>
                  <p style={{ fontSize: "12pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
                </div>
              </div>
            ) : (
              <div style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: "70mm", marginTop: "8px", paddingTop: "2px", pageBreakInside: "avoid", breakInside: "avoid" }}>
                <p style={{ fontSize: "11pt", fontStyle: "italic", color: "#555555", marginBottom: "1px", textAlign: "center", textIndent: 0 }}>{formattedLetterDate}</p>
                <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#0f172a" }}>TM. HỘI ĐỒNG TUYỂN SINH</p>
                <p style={{ fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", color: "#475569", margin: "1px 0 0 0", textAlign: "center", textIndent: 0 }}>GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                <div style={{ height: "45px", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px 0" }}>
                  {studentCampusConfig?.signature ? (
                    <img src={studentCampusConfig?.signature} alt="Signature" style={{ maxHeight: "45px", objectFit: "contain" }} />
                  ) : (
                    <svg style={{ height: "45px" }} viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
                  )}
                </div>
                <p style={{ fontSize: "13pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
              </div>
            )}
          </div>

          <div className="footer-container" style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
            {studentCampusConfig?.footer ? (
              <img src={studentCampusConfig?.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
            ) : (
              <div style={{ width: "100%", fontFamily: '"Open Sans", sans-serif', boxSizing: "border-box", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", width: "100%" }}>
                  <span style={{ fontWeight: "bold", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "uppercase", fontSize: "9.5pt", letterSpacing: "0.5px" }}>HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                  <div style={{ flexGrow: 1, borderTop: "1px solid rgba(0, 166, 169, 0.7)", height: 0, marginTop: "2px" }}></div>
                  <span style={{ fontWeight: "600", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "lowercase", fontSize: "9pt" }}>www.skylineschool.edu.vn</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PAGE 2: ADMISSION CHECKLIST */}
        {modalDocList && modalDocList.length > 0 && !isInvitation && !isCommitment && selectedLevel !== "preschool" && (
          <div className="bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] p-[18mm_20mm_22mm_20mm] box-border relative flex flex-col justify-start overflow-hidden select-none font-sans text-slate-800 leading-normal" style={{ fontFamily: '"Open Sans", sans-serif' }}>
            {studentCampusConfig?.background && (
              <img crossOrigin={(studentCampusConfig?.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig?.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
            )}

            <div className="relative z-10 flex flex-col h-full justify-start">
              <div>
                <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {studentCampusConfig?.logo ? (
                      <img src={studentCampusConfig?.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                    )}
                  </div>
                  <div style={{ textAlign: "left", marginTop: "4px" }}>
                    <h4 style={{ fontFamily: '"Open Sans", sans-serif', fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                      {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                    </h4>
                  </div>
                </div>

                <h2 style={{ textAlign: "center", fontSize: "20pt", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "1px", margin: "12px 0" }}>
                  DANH MỤC HỒ SƠ NHẬP HỌC
                </h2>

                <div style={{ marginTop: "10px", overflow: "hidden", border: "1.5px solid #0f172a", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px", color: "#0f172a" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #0f172a" }}>
                        <th style={{ padding: "10px 15px", fontWeight: "bold", borderRight: "1.5px solid #0f172a", textAlign: "center", width: "60px", textTransform: "uppercase" }}>STT</th>
                        <th style={{ padding: "10px 15px", fontWeight: "bold", borderRight: "1.5px solid #0f172a", textTransform: "uppercase" }}>Tên hồ sơ / Giấy tờ</th>
                        <th style={{ padding: "10px 15px", fontWeight: "bold", textAlign: "center", width: "120px", textTransform: "uppercase" }}>Số lượng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalDocList.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: "1px solid #0f172a" }}>
                          <td style={{ padding: "10px 15px", borderRight: "1.5px solid #0f172a", textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 15px", borderRight: "1.5px solid #0f172a", fontWeight: "500" }}>{item.name}</td>
                          <td style={{ padding: "10px 15px", textAlign: "center", fontWeight: "bold" }}>{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p style={{ marginTop: "10px", fontSize: "13px", fontWeight: "bold", color: "#1e293b", textAlign: "justify" }}>
                  * Quý phụ huynh vui lòng hoàn thiện và nộp đầy đủ các giấy tờ nêu trên trong vòng 10 ngày kể từ ngày nhận được thông báo trúng tuyển.
                </p>
              </div>
            </div>

            <div className="footer-container" style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
              {studentCampusConfig?.footer ? (
                <img src={studentCampusConfig?.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "100%", fontFamily: '"Open Sans", sans-serif', boxSizing: "border-box", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", width: "100%" }}>
                    <span style={{ fontWeight: "bold", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "uppercase", fontSize: "9.5pt", letterSpacing: "0.5px" }}>HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                    <div style={{ flexGrow: 1, borderTop: "1px solid rgba(0, 166, 169, 0.7)", height: 0, marginTop: "2px" }}></div>
                    <span style={{ fontWeight: "600", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "lowercase", fontSize: "9pt" }}>www.skylineschool.edu.vn</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };



  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-bold uppercase tracking-widest text-xs">
        Đang tải trang...
      </div>
    );
  }
  return (
    <div id="reports-client-root" className="space-y-4 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* Main Header / Top Selectors */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <ClipboardList className="w-6 h-6"/>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Trung tâm Xuất Báo cáo KSNL</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Xuất mẫu in, Thư chúc mừng và Cam kết học tập</p>
          </div>
        </div>

        {/* Level toggle switch */}
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex gap-1.5 shadow-inner">
          <button
            onClick={() => setSelectedLevel("high")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${selectedLevel === "high" ? "bg-white text-indigo-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Khảo thí Phổ thông
          </button>
          <button
            onClick={() => setSelectedLevel("preschool")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${selectedLevel === "preschool" ? "bg-white text-violet-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Baby className="w-4 h-4 text-violet-500" />
            Khảo thí Mầm non
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5">
        <div className="flex flex-wrap gap-1">
          {[
            { id: "report_config", label: "Cấu hình báo cáo", icon: Settings },
            ...(selectedLevel === "high" ? [{ id: "admission_documents", label: "Hồ sơ", icon: Tag }] : []),
            { id: "letters", label: "Xuất thư chúc mừng", icon: GraduationCap },
            { id: "results", label: "Trả kết quả", icon: BarChart3 }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${tab === t.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <t.icon className={`w-4 h-4 ${tab === t.id ? "text-white" : "text-slate-400"}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. REPORT CONFIG */}
      {tab === "report_config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Left panel settings */}
          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4 mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5"/>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Cấu hình Thiết kế Mẫu in</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Thiết lập bố cục logo, chữ ký cho {selectedLevel === "preschool" ? "Mầm non" : "Phổ thông"}</p>
              </div>
            </div>

            <Field label="Chọn cơ sở áp dụng" required>
              <select value={rcCampusId} onChange={e => setRcCampusId(e.target.value)} className={inp}>
                <option value="">-- Chọn Cơ sở --</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{getCampusFullName(c.campusName || "")}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Loại báo cáo" required>
                <select value={rcReportType} onChange={e => setRcReportType(e.target.value)} className={inp}>

                  <option value="thu_chuc_mung">Thư chúc mừng</option>
                  {selectedLevel !== "preschool" && <option value="cam_ket_hoc_tap">Cam kết học tập</option>}
                </select>
              </Field>

              {selectedLevel === "high" && (
                <Field label="Nhóm/Khối áp dụng" required>
                  <select value={rcTargetGroup} onChange={e => setRcTargetGroup(e.target.value)} className={inp}>
                    {reportDocGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field label="Tiêu đề Báo cáo" required>
              <input value={rcTitle} onChange={e => setRcTitle(e.target.value)} placeholder="Nhập tiêu đề..." className={inp} />
            </Field>

            <Field label="Nội dung mẫu văn bản" required>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold">Soạn thảo nội dung mẫu</span>
                <button
                  onClick={() => {
                    const defaultText = selectedLevel === "preschool"
                      ? (rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations)
                      : (rcReportType === "thu_moi" ? defaultThuMoi : rcReportType === "cam_ket_hoc_tap" ? defaultCamKet : defaultThuChucMung);
                    setRcContent(defaultText);
                  }}
                  className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                >
                  Khôi phục mặc định
                </button>
              </div>
              <textarea
                value={rcContent}
                onChange={e => setRcContent(e.target.value)}
                rows={8}
                placeholder="Nhập nội dung mẫu..."
                className={`${inp} py-3 font-normal resize-none text-xs leading-relaxed font-sans`}
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-normal">
                Từ khóa tự điền: <span className="text-indigo-600 font-bold">{"{{fullName}}"}</span>, <span className="text-indigo-600 font-bold">{"{{grade}}"}</span>, <span className="text-indigo-600 font-bold">{"{{surveyFormType}}"}</span>, <span className="text-indigo-600 font-bold">{"{{academicYear}}"}</span>, <span className="text-indigo-600 font-bold">{"{{admissionCampus}}"}</span>, <span className="text-indigo-600 font-bold">{"{{committedSubjects}}"}</span>
              </p>
            </Field>

            <Field label="Họ tên Giám đốc Điều hành" required>
              <input value={rcDirectorName} onChange={e => setRcDirectorName(e.target.value)} placeholder="Nhập họ tên GĐCS..." className={inp} />
            </Field>

            {/* Upload fields */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Logo Trường</label>
                  <div className="flex items-center gap-2">
                    {rcLogo ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcLogo} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcLogo("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Chữ ký GĐCS</label>
                  <div className="flex items-center gap-2">
                    {rcSignature ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcSignature} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcSignature("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Background */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Watermark nền</label>
                  <div className="flex items-center gap-2">
                    {rcBackground ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcBackground} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcBackground("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Footer Văn bản</label>
                  <div className="flex items-center gap-2">
                    {rcFooter ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcFooter} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcFooter("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFooterUpload} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={saveReportConfig} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Check className="w-4 h-4" /> Lưu cấu hình mẫu in
            </button>
          </div>

          {/* Right panel live preview */}
          {(() => {
            const tempFullText = renderTemplate(
              rcContent || "",
              { 
                fullName: "Nguyễn Minh An", 
                grade: "1", 
                surveyFormType: "Chất lượng cao", 
                academicYear: "2025-2026", 
                hocKy: "1",
                admissionCampus: campuses.find((c: any) => c.id === rcCampusId)?.campusName || "Sky-Line Hill",
                committedSubjects: ["Tiếng Anh"]
              }
            );
            
            let tempParagraphs: string[] = [];
            tempFullText.replace(/\u00a0/g, ' ').split('\n').filter(Boolean).forEach(p => {
              const pNorm = p.normalize('NFC');
              const regex = /kính\s+mong\s+phụ\s+huynh\s+đồng\s+hành/i;
              const match = pNorm.match(regex);
              if (match && match.index !== undefined && match.index > 0) {
                tempParagraphs.push(p.substring(0, match.index).trim());
                tempParagraphs.push(p.substring(match.index).trim());
              } else {
                tempParagraphs.push(p.trim());
              }
            });

            const isTempCommitment = rcReportType === "cam_ket_hoc_tap";
            const splitIndexTemp = isTempCommitment ? tempParagraphs.findIndex(p => {
              return /kính\s+mong\s+phụ\s+huynh\s+đồng\s+hành/i.test(p.normalize('NFC'));
            }) : -1;
            const isSplitTemp = isTempCommitment && splitIndexTemp !== -1;

            let page1ParagraphsTemp = isSplitTemp ? tempParagraphs.slice(0, splitIndexTemp) : tempParagraphs;
            let page2ParagraphsTemp = isSplitTemp ? tempParagraphs.slice(splitIndexTemp) : [];

            return (
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl p-8 flex flex-col justify-between min-h-[500px]">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Khung Xem trước thiết kế A4 thực tế</span>
                  {((selectedLevel === "high" && rcReportType === "thu_chuc_mung") || (rcReportType === "cam_ket_hoc_tap" && isSplitTemp)) && (
                    <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-[10px]">
                      <button 
                        onClick={() => setPreviewPage(1)} 
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${previewPage === 1 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Trang 1 (Thư)
                      </button>
                      <button 
                        onClick={() => setPreviewPage(2)} 
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${previewPage === 2 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        {rcReportType === "cam_ket_hoc_tap" ? "Trang 2 (Cam kết)" : "Trang 2 (Hồ sơ)"}
                      </button>
                    </div>
                  )}
                </div>
                <div className={`bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full relative ${rcReportType === 'cam_ket_hoc_tap' && !isSplitTemp ? 'aspect-auto overflow-visible h-auto' : 'aspect-[210/297] overflow-hidden'}`}>
                  {/* Background Watermark for Preview */}
                  <div 
                    className="absolute pointer-events-none"
                    style={{
                      backgroundImage: `url('${rcBackground || DEFAULT_WATERMARK_SVG}')`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundSize: 'contain',
                      opacity: rcBackground ? 0.45 : 0.05,
                      top: '50%',
                      left: '50%',
                      width: '80%',
                      height: '80%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />

                  {/* Top info */}
                  <div className={`relative z-10 space-y-4 flex flex-col ${rcReportType === 'cam_ket_hoc_tap' && previewPage === 2 ? 'justify-start' : 'justify-between'} ${rcReportType === 'cam_ket_hoc_tap' && !isSplitTemp ? 'h-auto' : 'h-full'}`}>
                    {(previewPage === 2 && selectedLevel === "high" && rcReportType === "thu_chuc_mung") || (previewPage === 2 && rcReportType === "cam_ket_hoc_tap" && isSplitTemp) ? (
                      rcReportType === "thu_chuc_mung" ? (
                        /* PAGE 2: CHECKLIST PREVIEW */
                        <div>
                          <div className="border-b border-slate-200 pb-2 mb-3">
                            {rcLogo ? (
                              <img src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                            ) : (
                              <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                            )}
                            <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                              TRƯỜNG TH, THCS, THPT SKY-LINE
                            </h4>
                          </div>

                          <div className="text-center mb-3">
                            <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                              DANH MỤC HỒ SƠ NHẬP HỌC
                            </h2>
                          </div>

                          {/* Table of documents */}
                          <div className="mt-4 overflow-hidden border border-slate-950">
                            <table className="w-full border-collapse text-left text-[9px] text-slate-900" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                              <thead>
                                <tr className="bg-white border-b border-slate-950 font-bold text-slate-950">
                                  <th className="px-2 py-1.5 border-r border-slate-950 text-center uppercase w-10" style={{ borderRightWidth: '1px', borderColor: '#000' }}>STT</th>
                                  <th className="px-3 py-1.5 border-r border-slate-950 text-center uppercase" style={{ borderRightWidth: '1px', borderColor: '#000' }}>Tên hồ sơ</th>
                                  <th className="px-3 py-1.5 text-center uppercase w-16">Số lượng</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewDocList.map((item, idx) => (
                                  <tr key={item.id || idx} className="border-b border-slate-950 last:border-b-0">
                                    <td className="px-2 py-1.5 border-r border-slate-950 text-center text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{idx + 1}</td>
                                    <td className="px-3 py-1.5 border-r border-slate-950 font-medium text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{item.name}</td>
                                    <td className="px-3 py-1.5 text-center text-slate-950 font-bold">{item.qty || "—"}</td>
                                  </tr>
                                ))}
                                {previewDocList.length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="text-center py-4 text-slate-400 italic">Chưa cấu hình hồ sơ nào cho đối tượng này</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <p className="mt-4 text-[9px] text-slate-950 font-bold text-left leading-relaxed" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                            * Quý phụ huynh vui lòng hoàn thiện và nộp đầy đủ các giấy tờ nêu trên trong vòng 10 ngày kể từ ngày nhận được thông báo trúng tuyển.
                          </p>
                        </div>
                      ) : (
                        /* PAGE 2: COMMITMENT EXPECTATIONS & SIGNATURES PREVIEW */
                        <>
                          <div>
                            <div className="border-b border-slate-200 pb-2 mb-3">
                              {rcLogo ? (
                                <img src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                              ) : (
                                <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                              )}
                              <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                                {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TH, THCS, THPT SKY-LINE"}
                              </h4>
                            </div>

                            <div className="space-y-3 py-2 text-[10px] leading-relaxed text-slate-600 text-justify font-sans pr-1">
                              {page2ParagraphsTemp.map((para, idx) => {
                                const pClean = para.trim();
                                const isList = /^\s*[\d•\-*]+/.test(pClean);
                                
                                return (
                                  <p key={idx} className={isList ? "pl-4 font-semibold" : "indent-4"} style={isList ? {} : { textIndent: "1cm" }}>
                                    {pClean}
                                  </p>
                                );
                              }).filter(Boolean)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-center mt-6">
                            <div className="space-y-1">
                              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">ĐẠI DIỆN GIA ĐÌNH</p>
                              <div className="h-10 flex items-end justify-center">
                                <span className="text-[7px] text-slate-300 italic">Ký tên</span>
                              </div>
                            </div>
                            <div className="space-y-1 min-w-[70px]">
                              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                              <div className="h-10 flex items-center justify-center">
                                {rcSignature ? (
                                  <img src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                                ) : (
                                  <div className="text-[7px] text-slate-300 italic">Chưa upload</div>
                                )}
                              </div>
                              <p className="text-[9px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                            </div>
                          </div>
                        </>
                      )
                    ) : (
                      /* PAGE 1: LETTER PREVIEW */
                      <>
                        <div>
                          <div className="border-b border-slate-200 pb-2 mb-3">
                            {rcLogo ? (
                              <img src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                            ) : (
                              <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                            )}
                            <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800">
                              {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TH, THCS, THPT SKY-LINE"}
                            </h4>
                          </div>

                          <div className="text-center mb-3">
                            <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                              {rcTitle}
                            </h2>
                          </div>

                          {/* Greeting */}
                          {rcReportType !== 'cam_ket_hoc_tap' && (
                            <p className="text-[10px] italic mb-2 text-slate-700 font-bold">
                              {rcReportType === 'thu_moi' ? (
                                <>Kính gửi Quý Phụ huynh và bé <strong className="font-bold not-italic">Nguyễn Minh An</strong>,</>
                              ) : (
                                <>Thân gửi con <strong className="font-bold not-italic">Nguyễn Minh An</strong>,</>
                              )}
                            </p>
                          )}

                          {/* Template text */}
                          <div className={`space-y-3 py-2 text-[10px] leading-relaxed text-slate-600 text-justify font-sans pr-1 ${rcReportType === 'cam_ket_hoc_tap' && !isSplitTemp ? '' : 'max-h-[300px] overflow-y-auto'}`}>
                            {page1ParagraphsTemp.map((para, idx) => {
                              const pClean = para.trim();
                              const isList = /^\s*[\d•\-*]+/.test(pClean);
                              const isCentred = pClean.toLowerCase().includes("về việc") || pClean.toLowerCase().includes("kính gửi:");
                              const isDateLine = pClean.toLowerCase().includes("ngày") && pClean.toLowerCase().includes("tháng") && pClean.toLowerCase().includes("năm") && (pClean.toLowerCase().includes("đà nẵng") || pClean.toLowerCase().includes("hà nội") || pClean.toLowerCase().includes("hồ chí minh"));
                              
                              if (isDateLine) return null;
                              if (isCentred) {
                                return (
                                  <p key={idx} className="text-center font-bold mb-1" style={{ textIndent: 0, fontSize: "10px" }}>
                                    {pClean}
                                  </p>
                                );
                              }
                              
                              return (
                                <p key={idx} className={isList ? "pl-4 font-semibold" : "indent-4"} style={isList ? {} : { textIndent: "1cm" }}>
                                  {pClean}
                                </p>
                              );
                            }).filter(Boolean)}
                          </div>
                        </div>

                        {/* Signatures */}
                        {rcReportType === "cam_ket_hoc_tap" ? (
                          !isSplitTemp && (
                            <div className="grid grid-cols-2 gap-4 text-center mt-auto">
                              <div className="space-y-1">
                                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">ĐẠI DIỆN GIA ĐÌNH</p>
                                <div className="h-10 flex items-end justify-center">
                                  <span className="text-[7px] text-slate-300 italic">Ký tên</span>
                                </div>
                              </div>
                              <div className="space-y-1 min-w-[70px]">
                                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                                <div className="h-10 flex items-center justify-center">
                                  {rcSignature ? (
                                    <img src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                                  ) : (
                                    <div className="text-[7px] text-slate-300 italic">Chưa upload</div>
                                  )}
                                </div>
                                <p className="text-[9px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex justify-end mt-auto">
                            <div className="text-center space-y-1 min-w-[140px]">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                              <div className="h-10 flex items-center justify-center">
                                {rcSignature ? (
                                  <img src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                                ) : (
                                  <div className="text-[8px] text-slate-300 italic">Chưa upload chữ ký</div>
                                )}
                              </div>
                              <p className="text-[11px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer Banner */}
                  {rcFooter ? (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <img src={rcFooter} alt="Footer" className="w-full h-auto" />
                    </div>
                  ) : (
                    <div className="border-t border-teal-500/30 pt-2 text-[5px] text-slate-400 text-center">
                      <p className="font-bold">www.skylineschool.edu.vn • Hotline: (+84.236) 378 7777</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {/* 2. LETTERS EXPORT TABLE */}
      {tab === "letters" && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col group">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-500" /> Kỳ Khảo sát
                </span>
                <div className="relative">
                  <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId("all"); }} className="bg-white border border-slate-200 pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[220px] focus:border-indigo-400 focus:ring-4 focus:ring-indigo-150/15 appearance-none cursor-pointer transition-all shadow-sm">
                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    {activePeriods.length === 0 && <option value="">Không có kỳ nào</option>}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col group">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3 text-indigo-500" /> Đợt Khảo sát
                </span>
                <div className="relative">
                  <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="bg-white border border-slate-200 pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[170px] focus:border-indigo-400 focus:ring-4 focus:ring-indigo-150/15 appearance-none cursor-pointer transition-all shadow-sm">
                    <option value="all">Tất cả các đợt</option>
                    {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="flex flex-col w-full md:w-72">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1.5 ml-1">Tìm học sinh</span>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên hoặc mã học sinh..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-150/15 font-bold text-slate-700 shadow-sm transition-all"
                />
                <Search className="w-4 h-4 text-slate-350 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Đang tải danh sách học sinh...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20 text-slate-400 bg-white">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-500 animate-bounce duration-1000" />
                <p className="text-sm font-black text-slate-500">Không tìm thấy học sinh nào trong đợt này</p>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Vui lòng điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-450 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4 text-center w-14">STT</th>
                      <th className="px-6 py-4">Mã HS</th>
                      <th className="px-6 py-4 pl-4">Họ và Tên</th>
                      <th className="px-6 py-4 text-center">Khối</th>
                      <th className="px-6 py-4 text-center">Phái</th>
                      <th className="px-6 py-4">Hệ Đăng ký</th>
                      <th className="px-6 py-4">Kết quả Phê duyệt</th>
                      <th className="px-6 py-4 text-center w-[230px]">In / Xuất mẫu thư</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs bg-white">
                    {filteredStudents.map((s, idx) => {
                      const gender = s.gender === "M" || s.gender === "MALE" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "FEMALE" || s.gender === "Nữ" ? "Nữ" : "—";
                      
                      // Approval results badges
                      const result = s.admissionResult || s.devAssessmentResult || "Chưa duyệt";
                      const isPassed = (result.includes("Đạt") && !result.includes("Không")) || result.includes("Đại") || result.includes("MIỄN") || result.includes("DAT");

                      return (
                        <tr key={s.id} className="hover:bg-indigo-50/15 transition-all duration-150 font-bold text-slate-650 group/row">
                          <td className="px-6 py-4 text-center text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50/60 px-2 py-1 rounded-lg border border-indigo-100/50">
                              {s.studentCode || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 pl-4 font-black text-slate-800 text-sm group-hover/row:text-indigo-600 transition-colors">
                            {s.fullName}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                              K{s.grade || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500">{gender}</td>
                          <td className="px-6 py-4 text-slate-500 font-semibold">{s.surveyFormType || "—"}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider flex items-center gap-1.5 w-max shadow-sm ${
                              isPassed 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100/60 shadow-emerald-50/50" 
                                : "bg-slate-50 text-slate-450 border-slate-200/60"
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${isPassed ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                              {result}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-2 justify-center">
                              {isPassed ? (
                                <>
                                  <button
                                    onClick={() => { setIsInvitation(false); setIsCommitment(false); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                                    className="px-3.5 py-2 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100/80 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 group/btn"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:text-white transition-colors" /> 
                                    Chúc mừng
                                  </button>
                                  {selectedLevel !== "preschool" && (result.includes("cam kết") || result.includes("Đạt cam kết")) && (
                                    <button
                                      onClick={() => { setIsInvitation(false); setIsCommitment(true); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                                      className="px-3.5 py-2 text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-100/80 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 group/btn"
                                    >
                                      <PenLine className="w-3.5 h-3.5 text-amber-600 group-hover/btn:text-white transition-colors" /> 
                                      Cam kết
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. EMAIL REPORT RESULTS */}
      {tab === "results" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Filters Bar for Results Tab */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 ml-1">Kỳ Khảo sát</span>
                <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId("all"); }} className="bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[200px]">
                  {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {activePeriods.length === 0 && <option value="">Không có kỳ nào</option>}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 ml-1">Đợt Khảo sát</span>
                <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[150px]">
                  <option value="all">Tất cả các đợt</option>
                  {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistics summary */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
            <h3 className="text-base font-extrabold text-slate-800 border-b pb-3 mb-2 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500"/> Thống kê tổng quan</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Tổng học sinh</span>
                <span className="text-2xl font-black text-slate-800 block">{filteredStudents.length}</span>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Số em đạt</span>
                <span className="text-2xl font-black text-slate-800 block">
                  {filteredStudents.filter(s => {
                    const r = s.admissionResult || s.devAssessmentResult || "";
                    return (r.includes("Đạt") && !r.includes("Không")) || r.includes("DAT") || r.includes("MIỄN");
                  }).length}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Chi tiết theo Trạng thái duyệt</span>
              <div className="space-y-2">
                {Array.from(new Set(students.map(s => s.admissionResult || s.devAssessmentResult || "Chưa duyệt"))).map(st => {
                  const count = students.filter(s => (s.admissionResult || s.devAssessmentResult || "Chưa duyệt") === st).length;
                  return (
                    <div key={st} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
                      <span>{st}</span>
                      <span className="bg-white border px-2 py-0.5 rounded-lg text-slate-800 font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Email triggers */}
          <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3 mb-2">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-500"/> Trả kết quả / Gửi mail nhanh</h3>
              <button
                onClick={handleOpenEmailModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5"/>
                Gửi Email báo cáo nhanh
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3 text-xs leading-relaxed text-slate-600">
              <p className="font-bold text-slate-700 text-sm">💡 Chức năng Trả kết quả & Email nhanh:</p>
              <p>1. Gửi email tổng hợp nhanh danh sách kết quả xét tuyển cho Ban giám hiệu, các bộ phận tuyển sinh và tư vấn của cơ sở.</p>
              <p>2. Hệ thống tự động tạo, tối ưu hóa kích thước và đính kèm các tệp **PDF Thư chúc mừng / Bản cam kết** trực tiếp cho từng bé đạt yêu cầu khi gửi mail.</p>
              <p>3. Đảm bảo bảo mật tối đa, đồng bộ hóa 100% thời gian thực kết quả duyệt.</p>
            </div>
          </div>


        </div>
      </div>
      )}

            {/* ===== TAB: ADMISSION DOCUMENTS (HỒ SƠ NHẬP HỌC) ===== */}
      {tab === "admission_documents" && selectedLevel === "high" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Danh mục Hồ sơ nhập học</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cấu hình danh sách giấy tờ cần nộp theo từng đối tượng tuyển sinh</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setConfirm({
                    msg: "Bạn có chắc chắn muốn khôi phục danh sách hồ sơ mẫu cho đối tượng này không?",
                    fn: () => {
                      const defaultDocs = selectedDocGroup === "khoi_2_5" ? defaultDocumentsGrade2_5 : selectedDocGroup === "khoi_6" ? defaultDocumentsGrade6 : selectedDocGroup === "khoi_10_noi_tinh" ? defaultDocumentsGrade10NoiTinh : selectedDocGroup === "khoi_10_ngoai_tinh" ? defaultDocumentsGrade10NgoaiTinh : defaultDocumentsGrade1;
                      setDocList(defaultDocs);
                      localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(defaultDocs));
                    }
                  });
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Khôi phục mẫu
              </button>
              <button 
                onClick={() => {
                  setEditingDoc(null);
                  setDocFormName("");
                  setDocFormQty("");
                  setDocFormNote("");
                  setDocFormSelectedTargets(docGroupTargets[selectedDocGroup] || []);
                  setDocFormSelectedGrades(docGroupGrades[selectedDocGroup] || []);
                  setIsDocModalOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm hồ sơ mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left side configurations */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="group space-y-2">
                <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 ml-1">Chọn Đối tượng Hồ sơ</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-full">
                    <select 
                      value={selectedDocGroup} 
                      onChange={(e) => setSelectedDocGroup(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 pr-10 text-sm font-black text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/50 focus:border-indigo-500 focus:bg-white transition-all duration-300"
                    >
                      {docGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-slate-600 transition-colors" />
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    <button 
                      onClick={() => {
                        const newName = prompt("Nhập tên Đối tượng Hồ sơ mới:");
                        if (newName && newName.trim()) {
                          const newId = "custom_" + Date.now();
                          const updated = [...customDocGroups, { id: newId, label: newName.trim() }];
                          setCustomDocGroups(updated);
                          localStorage.setItem('admission_doc_groups', JSON.stringify(updated));
                          setSelectedDocGroup(newId);
                        }
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center gap-2 text-xs font-black transition-all border border-indigo-100 shadow-sm"
                      title="Thêm đối tượng mới"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm đối tượng
                    </button>

                    {selectedDocGroup && (
                      <>
                        <button 
                          onClick={() => {
                            const current = customDocGroups.find(g => g.id === selectedDocGroup);
                            const newName = prompt("Sửa tên Đối tượng Hồ sơ:", current?.label);
                            if (newName && newName.trim()) {
                              const updated = customDocGroups.map(g => g.id === selectedDocGroup ? { ...g, label: newName.trim() } : g);
                              setCustomDocGroups(updated);
                              localStorage.setItem('admission_doc_groups', JSON.stringify(updated));
                            }
                          }}
                          className="w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all border border-amber-100 shadow-sm"
                          title="Sửa tên đối tượng"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            const current = customDocGroups.find(g => g.id === selectedDocGroup);
                            setConfirm({
                              msg: `Bạn có chắc chắn muốn xóa Đối tượng "${current?.label}" và toàn bộ hồ sơ đi kèm?`,
                              fn: () => {
                                const updated = customDocGroups.filter(g => g.id !== selectedDocGroup);
                                setCustomDocGroups(updated);
                                localStorage.setItem('admission_doc_groups', JSON.stringify(updated));
                                localStorage.removeItem(getDocStorageKey(selectedDocGroup));
                                setSelectedDocGroup("khoi_1");
                              }
                            });
                          }}
                          className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all border border-rose-100 shadow-sm"
                          title="Xóa đối tượng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Association checkboxes */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 ml-1">
                    Áp dụng cho Đối tượng Tuyển sinh:
                  </span>
                  <button
                    onClick={() => {
                      localStorage.setItem('admission_doc_targets', JSON.stringify(docGroupTargets));
                      notify("Đã lưu cấu hình áp dụng đối tượng tuyển sinh thành công!");
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-md shadow-emerald-100 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Lưu
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                    const isChecked = (docGroupTargets[selectedDocGroup] || []).includes(c.name);
                    return (
                      <label key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200/60 shadow-sm cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-200 transition-all select-none">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            const currentTargets = docGroupTargets[selectedDocGroup] || [];
                            let updated;
                            if (e.target.checked) {
                              updated = [...currentTargets, c.name];
                            } else {
                              updated = currentTargets.filter(name => name !== c.name);
                            }
                            const updatedMappings = { ...docGroupTargets, [selectedDocGroup]: updated };
                            setDocGroupTargets(updatedMappings);
                            localStorage.setItem('admission_doc_targets', JSON.stringify(updatedMappings));
                          }}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-slate-600">{c.name}</span>
                      </label>
                    );
                  })}
                  {configs.filter(c => c.categoryType === "DOI_TUONG_TS").length === 0 && (
                    <span className="text-xs text-slate-400 italic ml-1">Chưa có Đối tượng Tuyển sinh nào trong Danh mục</span>
                  )}
                </div>
              </div>

              {/* Grade association checkboxes */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 ml-1">
                    Áp dụng cho Khối lớp học:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const updated = ["Khối 2", "Khối 3", "Khối 4", "Khối 5"];
                        const updatedMappings = { ...docGroupGrades, [selectedDocGroup]: updated };
                        setDocGroupGrades(updatedMappings);
                        localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(updatedMappings));
                      }}
                      type="button"
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[9px] font-black transition-all border border-indigo-100"
                    >
                      Chọn nhanh 2,3,4,5
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(docGroupGrades));
                        notify("Đã lưu cấu hình áp dụng khối lớp thành công!");
                      }}
                      type="button"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-md shadow-emerald-100"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Lưu
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => {
                    const isChecked = (docGroupGrades[selectedDocGroup] || []).includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200/60 shadow-sm cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-200 transition-all select-none font-medium">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            const currentGrades = docGroupGrades[selectedDocGroup] || [];
                            let updated;
                            if (e.target.checked) {
                              updated = [...currentGrades, g];
                            } else {
                              updated = currentGrades.filter(name => name !== g);
                            }
                            const updatedMappings = { ...docGroupGrades, [selectedDocGroup]: updated };
                            setDocGroupGrades(updatedMappings);
                            localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(updatedMappings));
                          }}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-slate-600">{g}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {filteredDocList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                  <Tag className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-bold text-xs text-slate-400">Chưa cấu hình hồ sơ nào cho đối tượng này</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
                  <table className="w-full border-collapse text-left text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 font-black text-slate-900 text-center w-12">TT</th>
                        <th className="px-4 py-3 font-black text-slate-900">Hồ sơ</th>
                        <th className="px-4 py-3 font-black text-slate-900 text-center w-20">SL</th>
                        <th className="px-4 py-3 font-black text-slate-900 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredDocList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-800 text-[11px] truncate max-w-[120px] sm:max-w-none" title={item.name}>{item.name}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-600">{item.qty || "—"}</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingDoc(item);
                                  setDocFormName(item.name);
                                  setDocFormQty(item.qty);
                                  setDocFormNote(item.note);
                                  setDocFormSelectedTargets(item.targets || []);
                                  setDocFormSelectedGrades(item.grades || []);
                                  setIsDocModalOpen(true);
                                }}
                                className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
                                title="Sửa hồ sơ"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => {
                                  setConfirm({
                                    msg: "Bạn có chắc chắn muốn xóa hồ sơ này không?",
                                    fn: () => {
                                      const updated = docList.filter(d => d.id !== item.id);
                                      setDocList(updated);
                                      localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(updated));
                                    }
                                  });
                                }}
                                className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                                title="Xóa hồ sơ"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side live A4 design preview stack */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl p-8 flex flex-col justify-between min-h-[500px]">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-5">Khung Xem trước thiết kế A4 thực tế</span>
              <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden select-none font-serif text-slate-800 leading-normal" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                {/* Background Watermark for Preview */}
                <div 
                  className="absolute pointer-events-none"
                  style={{
                    backgroundImage: `url('${rcBackground || DEFAULT_WATERMARK_SVG}')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: 'contain',
                    opacity: rcBackground ? 0.45 : 0.05,
                    top: '50%',
                    left: '50%',
                    width: '80%',
                    height: '80%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />

                {/* Top info */}
                <div className="relative z-10 space-y-4 flex flex-col h-full justify-between">
                  <div>
                    <div className="border-b border-slate-200 pb-2 mb-3">
                      {rcLogo ? (
                        <img src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                      ) : (
                        <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                      )}
                      <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                        TRƯỜNG TH, THCS, THPT SKY-LINE
                      </h4>
                    </div>

                    <div className="text-center mb-3">
                      <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                        DANH MỤC HỒ SƠ NHẬP HỌC
                      </h2>
                    </div>

                    {/* Table stack */}
                    <div className="mt-4 overflow-hidden border border-slate-950">
                      <table className="w-full border-collapse text-left text-[9px] text-slate-900" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                        <thead>
                          <tr className="bg-white border-b border-slate-950 font-bold text-slate-950">
                            <th className="px-2 py-1.5 border-r border-slate-950 text-center uppercase w-10" style={{ borderRightWidth: '1px', borderColor: '#000' }}>STT</th>
                            <th className="px-3 py-1.5 border-r border-slate-950 text-center uppercase" style={{ borderRightWidth: '1px', borderColor: '#000' }}>Tên hồ sơ</th>
                            <th className="px-3 py-1.5 text-center uppercase w-16">Số lượng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocList.map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-slate-950 last:border-b-0">
                              <td className="px-2 py-1.5 border-r border-slate-950 text-center text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{idx + 1}</td>
                              <td className="px-3 py-1.5 border-r border-slate-950 font-medium text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{item.name}</td>
                              <td className="px-3 py-1.5 text-center text-slate-950 font-bold">{item.qty || "—"}</td>
                            </tr>
                          ))}
                          {filteredDocList.length === 0 && (
                            <tr>
                              <td colSpan={3} className="text-center py-4 text-slate-400 italic">Chưa cấu hình hồ sơ nào cho đối tượng này</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-4 text-[9px] text-slate-950 font-bold text-left leading-relaxed" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                      * Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.
                    </p>
                  </div>

                  {/* Signature/Footer Anchor */}
                  {rcFooter ? (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <img src={rcFooter} alt="Footer" className="w-full h-auto" />
                    </div>
                  ) : (
                    <div className="border-t border-[#00A6A9]/50 pt-2 text-[5px] text-slate-400 text-center">
                      <p className="font-bold">www.skylineschool.edu.vn • Hotline: (+84.236) 378 7777</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <Modal open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title={isInvitation ? "Mẫu Thư mời khảo sát" : isCommitment ? "Bản Cam kết học tập" : "Mẫu Thư Chúc mừng"} size="xl" footer={<><button onClick={() => setIsPrintModalOpen(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Đóng</button><button onClick={handlePrintPDF} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"><Printer className="w-4 h-4" /> In / Tải PDF</button></>}>
        <div className="bg-slate-50 p-4 border border-slate-100 rounded-3xl overflow-y-auto max-h-[60vh] flex flex-col items-center justify-start gap-8 w-full animate-none">
          <div className="flex flex-col items-center gap-8 w-full">
            {renderPrintPages()}
          </div>
        </div>
      </Modal>

      {/* Hidden print container for high-fidelity A4 output */}
      {isPrintModalOpen && (
        <div id="print-area-reports" className="flex flex-col items-center gap-8 w-full" style={{ display: "none" }}>
          {renderPrintPages()}
        </div>
      )}

            {/* DOCUMENT ADD/EDIT MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">{editingDoc ? "Cập nhật Hồ sơ" : "Thêm Hồ sơ Mới"}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đối tượng: {selectedDocGroup === "khoi_1" ? "Khối 1" : selectedDocGroup === "khoi_2_5" ? "Khối 2 đến 5" : selectedDocGroup === "khoi_6" ? "Khối 6" : selectedDocGroup === "khoi_7_9" ? "Khối 7 đến 9" : selectedDocGroup === "khoi_10" ? "Khối 10" : selectedDocGroup === "khoi_11_12" ? "Khối 11 đến 12" : "Đối tượng Tuyển sinh"}</p>
                </div>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-200/50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Tên Hồ sơ yêu cầu <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={docFormName} 
                  onChange={(e) => setDocFormName(e.target.value)} 
                  placeholder="Ví dụ: Đơn đăng ký nhập học" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Số lượng</label>
                  <input 
                    type="text" 
                    value={docFormQty} 
                    onChange={(e) => setDocFormQty(e.target.value)} 
                    placeholder="Ví dụ: 01 bản" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Ghi chú</label>
                  <input 
                    type="text" 
                    value={docFormNote} 
                    onChange={(e) => setDocFormNote(e.target.value)} 
                    placeholder="Ví dụ: Bản sao y" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Áp dụng cho Khối lớp học</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => {
                    const isChecked = docFormSelectedGrades.includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50/50 rounded-lg border border-slate-200 cursor-pointer select-none transition-colors">
                        <input type="checkbox" checked={isChecked} onChange={(e) => { if(e.target.checked) setDocFormSelectedGrades(p=>[...p,g]); else setDocFormSelectedGrades(p=>p.filter(x=>x!==g)); }} className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                        <span className="text-[11px] font-bold text-slate-600">{g}</span>
                      </label>
                    );
                  })}
                </div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Áp dụng cho Đối tượng Tuyển sinh</label>
                <div className="flex flex-wrap gap-2">
                  {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                    const isChecked = docFormSelectedTargets.includes(c.name);
                    return (
                      <label key={c.id} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 cursor-pointer select-none transition-colors">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocFormSelectedTargets(p => [...p, c.name]);
                            } else {
                              setDocFormSelectedTargets(p => p.filter(x => x !== c.name));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-600">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsDocModalOpen(false)} 
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-black transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  if (!docFormName.trim()) {
                    notify("Vui lòng nhập tên hồ sơ!", "err");
                    return;
                  }
                  
                  let updated = [];
                  if (editingDoc) {
                    updated = docList.map(d => d.id === editingDoc.id ? { ...d, name: docFormName, qty: docFormQty, note: docFormNote, targets: docFormSelectedTargets, grades: docFormSelectedGrades } : d);
                  } else {
                    const newId = docList.length > 0 ? Math.max(...docList.map(d => d.id)) + 1 : 1;
                    updated = [...docList, { id: newId, name: docFormName, qty: docFormQty, note: docFormNote, targets: docFormSelectedTargets, grades: docFormSelectedGrades }];
                  }
                  
                  setDocList(updated);
                  localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(updated));
                  setIsDocModalOpen(false);
                }} 
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors shadow-lg shadow-indigo-100"
              >
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}


      {/* EMAIL QUICK MODAL */}
      <Modal open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Gửi email Báo cáo Nhanh" size="xl" footer={<><button onClick={() => setIsEmailModalOpen(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button><button onClick={handleSendEmailsSubmit} disabled={emailSending} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer">{emailSending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}{emailSending ? emailSendingStatus : "Gửi ngay"}</button></>}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Left inputs column */}
          <div className="lg:col-span-7 space-y-4 text-left">
            {/* TO field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Địa chỉ Email người nhận (To) <span className="text-rose-500">*</span></label>
              <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Nhập email người nhận..." className={inp} />
              
              {/* Presets for To */}
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 mt-1">Gợi ý To:</span>
                {[
                  { label: `Giáo vụ (${campusLabel})`, email: campusEmails.giaovu },
                  { label: `GĐCS (${campusLabel})`, email: campusEmails.gdcs },
                  ...(selectedLevel === "preschool" ? [{ label: `BGH MN (${campusLabel})`, email: campusEmails.bghmn }] : []),
                  { label: `Tư vấn (${campusLabel})`, email: campusEmails.tuyensinh },
                  { label: "Khảo thí", email: "bankhaothi@skylineschool.edu.vn" },
                ].map(p => {
                  const isActive = recipientEmail.includes(p.email);
                  return (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setRecipientEmail(recipientEmail.split(',').map(x => x.trim()).filter(x => x !== p.email).join(', '));
                        } else {
                          const current = recipientEmail.trim();
                          setRecipientEmail(current ? `${current}, ${p.email}` : p.email);
                        }
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                      + {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CC field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Đồng kính gửi (CC)</label>
              <input value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="Nhập email CC (phân cách bằng dấu phẩy)..." className={inp} />
              
              {/* Presets for CC */}
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 mt-1">Gợi ý CC:</span>
                {[
                  { label: "Khảo thí", email: "bankhaothi@skylineschool.edu.vn" },
                  { label: `Giáo vụ (${campusLabel})`, email: campusEmails.giaovu },
                  { label: `GĐCS (${campusLabel})`, email: campusEmails.gdcs },
                  ...(selectedLevel === "preschool" ? [{ label: `BGH MN (${campusLabel})`, email: campusEmails.bghmn }] : []),
                  { label: `Tư vấn (${campusLabel})`, email: campusEmails.tuyensinh },
                ].map(p => {
                  const isActive = ccEmail.includes(p.email);
                  return (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setCcEmail(ccEmail.split(',').map(x => x.trim()).filter(x => x !== p.email).join(', '));
                        } else {
                          const current = ccEmail.trim();
                          setCcEmail(current ? `${current}, ${p.email}` : p.email);
                        }
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    >
                      + {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tiêu đề Email <span className="text-rose-500">*</span></label>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Nhập tiêu đề email..." className={inp} />
            </div>

            {/* Attachment checkbox */}
            <div className="flex items-start gap-3 p-4 bg-indigo-50/40 border border-indigo-100 rounded-3xl transition-all hover:bg-indigo-50/60">
              <input type="checkbox" id="attach_checkbox" checked={attachLetters} onChange={e => setAttachLetters(e.target.checked)} className="w-5 h-5 text-indigo-600 border-slate-300 rounded mt-0.5 cursor-pointer focus:ring-indigo-500" />
              <div>
                <label htmlFor="attach_checkbox" className="text-xs font-black text-indigo-900 cursor-pointer select-none">Tự động đính kèm tệp mẫu Thư PDF cho từng học sinh</label>
                <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-normal">
                  Hệ thống tự động biên dịch và tạo tệp PDF Thư chúc mừng đính kèm trực tiếp vào mail gửi cho các đối tượng đạt khảo thí.
                </p>
              </div>
            </div>
          </div>

          {/* Right students selection list column */}
          <div className="lg:col-span-5 flex flex-col justify-start space-y-3 h-full text-left">
            <div className="flex justify-between items-center px-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Học sinh gửi báo cáo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmailStudentIds(filteredStudents.map(s => s.id))}
                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Chọn hết
                </button>
                <span className="text-slate-300 text-[10px]">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedEmailStudentIds([])}
                  className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Bỏ hết
                </button>
              </div>
            </div>

            {/* Students list container */}
            <div className="border border-slate-200 rounded-3xl bg-slate-50 p-4 space-y-2 overflow-y-auto max-h-[350px] shadow-inner w-full">
              {filteredStudents.map(s => {
                const isSelected = selectedEmailStudentIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${isSelected ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedEmailStudentIds(selectedEmailStudentIds.filter(id => id !== s.id));
                          } else {
                            setSelectedEmailStudentIds([...selectedEmailStudentIds, s.id]);
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 leading-none mb-1">${s.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-semibold leading-none">Mã HS: ${s.studentCode || "—"} • Khối: ${s.grade}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider ${(s.admissionResult?.includes("Đạt") && !s.admissionResult?.includes("Không")) || s.probationaryResult === "DAT" || (s.admissionResult || "").toUpperCase().includes("MIỄN") ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                        ${s.probationaryResult === "DAT" ? "Đạt" : s.admissionResult || "—"}
                      </span>
                    </div>
                  </label>
                );
              })}
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-xs font-medium">
                  Không tìm thấy học sinh nào phù hợp
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Native Print Media Styles */}
      <style data-next-print-styles="true">{`
        @media screen {
          #print-area-reports {
            display: none !important;
          }
        }
        @media print {
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all sibling elements of the print area to prevent ghost/blank pages */
          #reports-client-root > *:not(#print-area-reports) {
            display: none !important;
          }
          aside, nav, header, footer, .sidebar, .navbar, .no-print, [role="navigation"] {
            display: none !important;
          }
          /* Flatten all intermediate layout wrappers in the DOM to prevent shifts or crops */
          div:not(#print-area-reports):not(#print-area-reports *),
          main:not(#print-area-reports):not(#print-area-reports *),
          section:not(#print-area-reports):not(#print-area-reports *),
          aside:not(#print-area-reports):not(#print-area-reports *),
          header:not(#print-area-reports):not(#print-area-reports *),
          footer:not(#print-area-reports):not(#print-area-reports *) {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            display: block !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-area-reports, #print-area-reports * {
            visibility: visible !important;
          }
          #print-area-reports {
            display: block !important;
            position: relative !important;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background-color: transparent !important;
            z-index: 999999 !important;
          }
          #print-area-reports > div {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 18mm 20mm 22mm 20mm !important; /* Extremely safe spacing padding */
            box-sizing: border-box !important;
            position: relative !important;
            background-color: white !important;
            border: none !important; /* Zero borders so height calculation is exact */
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-area-reports > div:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
            margin: 0 auto !important;
          }
          .footer-container {
            position: absolute !important;
            bottom: 12mm !important;
            left: 20mm !important;
            right: 20mm !important;
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 10 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
        }
      `}</style>
    </div>
  );
}

// Dialog components helper
function ConfirmDialog({ open, onClose, onConfirm, message }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-rose-500" />
        </div>
        <p className="font-black text-slate-800 text-base mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all cursor-pointer">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all cursor-pointer">Xác nhận</button>
        </div>
      </div>
    </div>
  );
}
