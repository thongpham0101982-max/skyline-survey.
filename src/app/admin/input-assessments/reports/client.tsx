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
  return content
    .replace(/\{\{fullName\}\}/g, student?.fullName || "")
    .replace(/\{\{grade\}\}/g, student?.grade || "")
    .replace(/\{\{admissionCampus\}\}/g, student?.admissionCampus || "")
    .replace(/\{\{academicYear\}\}/g, student?.academicYear || "2025-2026")
    .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "")
    .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
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

  const saveReportConfig = () => {
    if (!rcCampusId) return notify("Vui lòng chọn Cơ sở", "err");
    if (!rcReportType) return notify("Vui lòng chọn Loại báo cáo", "err");
    
    const typeKey = selectedLevel === "preschool" 
      ? rcReportType + "_preschool"
      : rcReportType + "_" + rcTargetGroup;

    const globalData = { title: rcTitle, logo: rcLogo, background: rcBackground, content: rcContent, footer: rcFooter };
    localStorage.setItem('report_config_global_' + typeKey, JSON.stringify(globalData));
    localStorage.setItem('report_config_master_logo', rcLogo || "");
    localStorage.setItem('report_config_master_background', rcBackground || "");
    localStorage.setItem('report_config_master_footer', rcFooter || "");
    localStorage.setItem('report_config_master_signature', rcSignature || "");
    localStorage.setItem('report_config_signature_' + rcCampusId, rcSignature || "");
    localStorage.setItem('report_config_director_' + rcCampusId, rcDirectorName || "");
    
    const campusData = { signature: rcSignature, directorName: rcDirectorName, title: rcTitle, logo: rcLogo, background: rcBackground, content: rcContent, footer: rcFooter };
    localStorage.setItem('report_config_' + rcCampusId + '_' + typeKey, JSON.stringify(campusData));
    
    notify("Lưu cấu hình báo cáo thành công!");
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
      // campus query
      const matchCampus = !cCampusId ? true : (
        s.admissionCampus === cCampusId ||
        s.admissionCampus?.includes(cCampusId)
      );
      return matchQuery && matchCampus;
    });
  }, [students, searchQuery, cCampusId]);

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

      const savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + typeKey);
      const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);

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

  // SMTP Email Send Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState("");
  const [attachLetters, setAttachLetters] = useState(true);

  const handleOpenEmailModal = () => {
    const activePeriodName = activePeriod?.name || "Kỳ khảo sát";
    const activeBatchName = cBatchId !== "all" ? (activeBatches.find(b => b.id === cBatchId)?.name || "Đợt") : "Tất cả các đợt";
    
    setEmailSubject(`[Báo cáo nhanh] Kết quả Khảo sát đầu vào KSNL - Kỳ: ${activePeriodName} - Đợt: ${activeBatchName}`);
    setRecipientEmail("bankhaothi@skylineschool.edu.vn, tuyensinh.cs3@skylineschool.edu.vn");
    setAttachLetters(true);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailsSubmit = async () => {
    if (!recipientEmail) return alert("Vui lòng nhập Email người nhận");
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo gửi mail...");

    try {
      const activePeriodName = activePeriod?.name || "Kỳ khảo sát";
      const activeBatchName = cBatchId !== "all" ? (activeBatches.find(b => b.id === cBatchId)?.name || "Đợt") : "Tất cả các đợt";

      const apiRoute = selectedLevel === "preschool"
        ? "/api/admin/preschool-send-quick-email"
        : "/api/admin/send-quick-email";

      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          periodName: activePeriodName,
          batchName: activeBatchName,
          students: filteredStudents,
          attachLetters: attachLetters
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
    window.print();
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
    return (
      <>
        {/* PAGE 1: THE LETTER */}
        <div className="bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] p-[18mm_20mm_22mm_20mm] box-border relative flex flex-col justify-start overflow-hidden select-none font-sans text-slate-800 leading-normal" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          {/* Watermark */}
          {studentCampusConfig?.background && (
            <img crossOrigin={(studentCampusConfig?.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig?.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
          )}

          {/* Content wrapped */}
          <div className="relative z-10 flex flex-col h-full justify-start">
            <div>
              {/* Header logo */}
              <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {studentCampusConfig?.logo ? (
                    <img src={studentCampusConfig?.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                  ) : (
                    <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                  )}
                </div>
                <div style={{ textAlign: "left", marginTop: "4px" }}>
                  <h4 style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                    {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                  </h4>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ textAlign: "center", fontSize: "22pt", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "2px", margin: "12px 0 16px 0" }}>
                {studentCampusConfig?.title}
              </h2>

              {/* Greeting */}
              <p style={{ fontSize: "13pt", fontStyle: "italic", marginBottom: "8px", color: "#1e293b", textIndent: 0 }}>
                {isInvitation ? (
                  <>Kính gửi Quý Phụ huynh và em <strong style={{ fontWeight: "bold", color: "#0f172a" }}>{selectedReportStudent?.fullName}</strong>,</>
                ) : (
                  <>Thân gửi con <strong style={{ fontWeight: "bold", color: "#0f172a" }}>{selectedReportStudent?.fullName}</strong>,</>
                )}
              </p>

              {/* Body template text */}
              <div style={{ flexGrow: 1, fontFamily: 'Arial, sans-serif' }}>
                {renderTemplate(
                  studentCampusConfig?.content || "",
                  selectedReportStudent
                ).split('\n').filter(Boolean).map((para, idx) => {
                  const isList = /^\s*[\d•\-*]+/.test(para);
                  return (
                    <p key={idx} style={isList ? { paddingLeft: "24px", fontWeight: "bold", color: "#374151", margin: "4px 0", fontSize: "13pt" } : { textIndent: "10mm", margin: "0 0 4px 0", textAlign: "justify", lineBreak: "auto", lineHeight: "1.3", fontSize: "13pt" }}>
                      {para}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Bottom Signatures dual-mode support with flexible spacer */}
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
                  <p style={{ fontSize: "11pt", fontStyle: "italic", color: "#555555", marginBottom: "1px", textAlign: "center", textIndent: 0 }}>{formattedLetterDate}</p>
                  <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#0f172a" }}>TM. HỘI ĐỒNG TUYỂN SINH</p>
                  <p style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", color: "#475569", margin: "1px 0 0 0", textAlign: "center", textIndent: 0 }}>GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                  <div style={{ height: "45px", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px 0" }}>
                    {studentCampusConfig?.signature ? (
                      <img src={studentCampusConfig?.signature} alt="Signature" style={{ maxHeight: "45px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "45px" }} viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </div>
                  <p style={{ fontSize: "12pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{selectedReportStudent?.signatureName || studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
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
                <p style={{ fontSize: "13pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{selectedReportStudent?.signatureName || studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
              </div>
            )}
          </div>

          {/* Footer Banner - Moved outside inner container to anchor to actual A4 bottom */}
          <div className="footer-container" style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
            {studentCampusConfig?.footer ? (
              <img src={studentCampusConfig?.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
            ) : (
              <div style={{ width: "100%", fontFamily: "Arial, sans-serif", boxSizing: "border-box", textAlign: "left" }}>
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
        {modalDocList && modalDocList.length > 0 && !isInvitation && !isCommitment && (
          <div className="bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] p-[18mm_20mm_22mm_20mm] box-border relative flex flex-col justify-start overflow-hidden select-none font-sans text-slate-800 leading-normal" style={{ fontFamily: 'Arial, sans-serif' }}>
            
            {/* Watermark */}
            {studentCampusConfig?.background && (
              <img crossOrigin={(studentCampusConfig?.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig?.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
            )}

            <div className="relative z-10 flex flex-col h-full justify-start">
              <div>
                {/* Header logo */}
                <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {studentCampusConfig?.logo ? (
                      <img src={studentCampusConfig?.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                    )}
                  </div>
                  <div style={{ textAlign: "left", marginTop: "4px" }}>
                    <h4 style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                      {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                    </h4>
                  </div>
                </div>

                {/* Title */}
                <h2 style={{ textAlign: "center", fontSize: "20pt", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "1px", margin: "12px 0" }}>
                  DANH MỤC HỒ SƠ NHẬP HỌC
                </h2>

                {/* Table of documents */}
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

            {/* Footer Banner - Moved outside inner container to anchor to actual A4 bottom */}
            <div className="footer-container" style={{ position: "absolute", bottom: "12mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
              {studentCampusConfig?.footer ? (
                <img src={studentCampusConfig?.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "100%", fontFamily: "Arial, sans-serif", boxSizing: "border-box", textAlign: "left" }}>
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
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Xuất mẫu in, Thư chúc mừng, Thư mời và Cam kết học tập</p>
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
                  <option value="thu_moi">Thư mời</option>
                  <option value="thu_chuc_mung">Thư chúc mừng</option>
                  <option value="cam_ket_hoc_tap">Cam kết học tập</option>
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
                Từ khóa tự điền: <span className="text-indigo-600 font-bold">{"{{fullName}}"}</span>, <span className="text-indigo-600 font-bold">{"{{grade}}"}</span>, <span className="text-indigo-600 font-bold">{"{{surveyFormType}}"}</span>, <span className="text-indigo-600 font-bold">{"{{academicYear}}"}</span>
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
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl p-8 flex flex-col justify-between min-h-[500px]">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Khung Xem trước thiết kế A4 thực tế</span>
              {selectedLevel === "high" && rcReportType === "thu_chuc_mung" && (
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
                    Trang 2 (Hồ sơ)
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden">
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
                {previewPage === 2 && selectedLevel === "high" && rcReportType === "thu_chuc_mung" ? (
                  /* PAGE 2: CHECKLIST PREVIEW */
                  <div>
                    <div className="border-b border-slate-200 pb-2 mb-3">
                      {rcLogo ? (
                        <img src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                      ) : (
                        <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                      )}
                      <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>
                        TRƯỜNG TH, THCS, THPT SKY-LINE
                      </h4>
                    </div>

                    <div className="text-center mb-3">
                      <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        DANH MỤC HỒ SƠ NHẬP HỌC
                      </h2>
                    </div>

                    {/* Table of documents */}
                    <div className="mt-4 overflow-hidden border border-slate-950">
                      <table className="w-full border-collapse text-left text-[9px] text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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

                    <p className="mt-4 text-[9px] text-slate-950 font-bold text-left leading-relaxed" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      * Quý phụ huynh vui lòng hoàn thiện và nộp đầy đủ các giấy tờ nêu trên trong vòng 10 ngày kể từ ngày nhận được thông báo trúng tuyển.
                    </p>
                  </div>
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
                    <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      {rcTitle}
                    </h2>
                  </div>

                  {/* Greeting */}
                  <p className="text-[10px] italic mb-2 text-slate-700 font-bold">
                    {rcReportType === 'thu_moi' ? (
                      <>Kính gửi Quý Phụ huynh và bé <strong className="font-bold not-italic">Nguyễn Minh An</strong>,</>
                    ) : (
                      <>Thân gửi con <strong className="font-bold not-italic">Nguyễn Minh An</strong>,</>
                    )}
                  </p>

                  {/* Template text */}
                  <div className="space-y-3 py-2 text-[10px] leading-relaxed text-slate-600 text-justify font-serif max-h-[300px] overflow-y-auto pr-1">
                    {renderTemplate(
                      rcContent || "",
                      { fullName: "Nguyễn Minh An", grade: "1", surveyFormType: "Chất lượng cao", academicYear: "2025-2026", hocKy: "1" }
                    ).split('\n').filter(Boolean).map((para, idx) => {
                      const isList = /^\s*[\d•\-*]+/.test(para);
                      return (
                        <p key={idx} className={isList ? "pl-4 font-semibold" : "indent-4"} style={isList ? {} : { textIndent: "1cm" }}>
                          {para}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures */}
                {rcReportType === "cam_ket_hoc_tap" ? (
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
          </div>
        </div>
      )}

      {/* 2. LETTERS EXPORT TABLE */}
      {tab === "letters" && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {/* Filters Bar */}
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

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 ml-1">Cơ sở đăng ký</span>
                <select value={cCampusId} onChange={e => setCCampusId(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[150px]">
                  <option value="">Tất cả Cơ sở</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{getCampusFullName(c.campusName || "")}</option>)}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh..."
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-400 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Students Grid */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải danh sách học sinh...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="text-sm font-bold">Không tìm thấy học sinh nào trong đợt này</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4 text-center w-12">STT</th>
                    <th className="px-6 py-4">Mã HS</th>
                    <th className="px-6 py-4">Họ và Tên</th>
                    <th className="px-6 py-4 text-center">Khối</th>
                    <th className="px-6 py-4 text-center">Phái</th>
                    <th className="px-6 py-4">Hệ Đăng ký</th>
                    <th className="px-6 py-4">Kết quả Phê duyệt</th>
                    <th className="px-6 py-4 w-[280px]">In / Xuất mẫu thư</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredStudents.map((s, idx) => {
                    const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
                    const gender = s.gender === "M" || s.gender === "MALE" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "FEMALE" || s.gender === "Nữ" ? "Nữ" : "—";
                    
                    // Approval results badges
                    const result = s.admissionResult || s.devAssessmentResult || "Chưa duyệt";
                    const isPassed = result.includes("Đạt") || result.includes("Đại") || result.includes("MIỄN") || result.includes("DAT");

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                        <td className="px-6 py-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 font-black">{s.studentCode || "—"}</td>
                        <td className="px-6 py-4 font-black text-slate-800 text-sm">{s.fullName}</td>
                        <td className="px-6 py-4 text-center">{s.grade || "—"}</td>
                        <td className="px-6 py-4 text-center text-slate-500">{gender}</td>
                        <td className="px-6 py-4 text-slate-500">{s.surveyFormType || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${isPassed ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
                            {result}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => { setIsInvitation(true); setIsCommitment(false); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                              className="px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Mail className="w-3 h-3"/> Thư mời
                            </button>
                            <button
                              onClick={() => { setIsInvitation(false); setIsCommitment(false); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                              className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3"/> Chúc mừng
                            </button>
                            {selectedLevel === "preschool" ? (
                              <button
                                onClick={() => { setIsInvitation(false); setIsCommitment(true); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                                className="px-2.5 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <PenLine className="w-3 h-3"/> Bản Cam kết
                              </button>
                            ) : (
                              (result.includes("cam kết") || result.includes("Đạt cam kết")) && (
                                <button
                                  onClick={() => { setIsInvitation(false); setIsCommitment(true); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                  <PenLine className="w-3 h-3"/> Bản Cam kết
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. EMAIL REPORT RESULTS */}
      {tab === "results" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                    return r.includes("Đạt") || r.includes("DAT") || r.includes("MIỄN");
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
              <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden select-none font-serif text-slate-800 leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
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
                      <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>
                        TRƯỜNG TH, THCS, THPT SKY-LINE
                      </h4>
                    </div>

                    <div className="text-center mb-3">
                      <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        DANH MỤC HỒ SƠ NHẬP HỌC
                      </h2>
                    </div>

                    {/* Table stack */}
                    <div className="mt-4 overflow-hidden border border-slate-950">
                      <table className="w-full border-collapse text-left text-[9px] text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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

                    <p className="mt-4 text-[9px] text-slate-950 font-bold text-left leading-relaxed" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
      <Modal open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Gửi email Báo cáo Nhanh" footer={<><button onClick={() => setIsEmailModalOpen(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button><button onClick={handleSendEmailsSubmit} disabled={emailSending} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer">{emailSending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}{emailSending ? emailSendingStatus : "Gửi ngay"}</button></>}>
        <div className="space-y-4">
          <Field label="Địa chỉ Email người nhận (CC nhiều người dùng dấu phẩy)" required>
            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Nhập email..." className={inp} />
          </Field>
          
          <Field label="Tiêu đề Email" required>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Nhập tiêu đề email..." className={inp} />
          </Field>

          <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
            <input type="checkbox" id="attach_checkbox" checked={attachLetters} onChange={e => setAttachLetters(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
            <label htmlFor="attach_checkbox" className="text-xs font-bold text-indigo-700 cursor-pointer">Tự động đính kèm tệp mẫu Thư PDF cho từng bé Đạt</label>
          </div>
        </div>
      </Modal>

      {/* Native Print Media Styles */}
      <style>{`
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
