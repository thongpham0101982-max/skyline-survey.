"use client";
import React, { useState, useEffect } from "react";
import { 
  Compass, 
  UserCheck, 
  Search, 
  Filter, 
  Save, 
  Sparkles, 
  Calendar, 
  GraduationCap, 
  BookOpen, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Clock, 
  Target, 
  Briefcase, 
  User, 
  FileText,
  ChevronRight,
  RefreshCcw,
  Check
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface CareerProfileData {
  student: {
    id: string;
    studentCode: string;
    studentName: string;
    gender: string | null;
    dob: string | null;
    class: {
      id: string;
      className: string;
      grade: string;
      campus?: { campusName: string };
    };
    campus?: { id: string; campusName: string };
  };
  careerOrientations: any[];
  commitments: any[];
  projectExperiences: any[];
  gdhnGrades: any[];
  hollandAssessment?: any;
}

export default function CareerDevelopmentProfilePage() {
  const [loading, setLoading] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [profileData, setProfileData] = useState<CareerProfileData | null>(null);
  const [saving, setSaving] = useState(false);

  // Form edit state for current year career orientation
  const [surveyResult, setSurveyResult] = useState("");
  const [initialOrientation, setInitialOrientation] = useState("");
  const [counselingResult, setCounselingResult] = useState("");
  const [result, setResult] = useState("");
  const [gvcnRemark, setGvcnRemark] = useState("");
  const [gvbmRemark, setGvbmRemark] = useState("");
  const [status, setStatus] = useState("DA_TU_VAN");
  const [notes, setNotes] = useState("");

  // 1. Fetch Students List
  const fetchStudentList = async () => {
    try {
      setLoading(true);
      const url = `/api/special-subjects/career-profile?campusId=${selectedCampus}&grade=${selectedGrade}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setStudentList(json.students || []);
        if (json.students?.length > 0 && !selectedStudentId) {
          setSelectedStudentId(json.students[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentList();
  }, [selectedCampus, selectedGrade]);

  // 2. Fetch Detailed Profile when selectedStudentId changes
  const fetchStudentProfile = async () => {
    if (!selectedStudentId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/special-subjects/career-profile?studentId=${selectedStudentId}`);
      const json = await res.json();
      if (res.ok) {
        setProfileData(json);
        const latestCO = json.careerOrientations?.[0] || {};
        setSurveyResult(latestCO.surveyResult || "");
        setInitialOrientation(latestCO.initialOrientation || "");
        setCounselingResult(latestCO.counselingResult || "");
        setResult(latestCO.result || "");
        setGvcnRemark(latestCO.gvcnRemark || "");
        setGvbmRemark(latestCO.gvbmRemark || "");
        setStatus(latestCO.status || "DA_TU_VAN");
        setNotes(latestCO.notes || "");
      } else {
        toast.error(json.error || "Không thể tải hồ sơ học sinh");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi nạp hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentProfile();
    }
  }, [selectedStudentId]);

  // Save Career Advisory info
  const handleSaveProfile = async () => {
    if (!selectedStudentId) return;
    try {
      setSaving(true);
      const payload = {
        studentId: selectedStudentId,
        surveyResult,
        initialOrientation,
        counselingResult,
        result,
        gvcnRemark,
        gvbmRemark,
        status,
        notes
      };

      const res = await fetch("/api/special-subjects/career-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Đã cập nhật hồ sơ định hướng nghề nghiệp thành công!");
        fetchStudentProfile();
      } else {
        toast.error(json.error || "Lỗi lưu hồ sơ");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi lưu hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = studentList.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return s.studentName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Header */}
      <header className="bg-[#003B3A] text-white border-b border-teal-800 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Link 
              href="/teacher/special-subjects/eval"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-teal-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30">
              <Compass className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Hồ sơ Phát triển Hướng nghiệp Sky-Line</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                  Khối 6–12
                </span>
              </h1>
              <p className="text-xs text-teal-200/80">
                Theo dõi phát triển năng lực tự nhận thức, trắc nghiệm Holland & lộ trình đại học xuyên suốt
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving || !selectedStudentId}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : "Lưu hồ sơ hướng nghiệp"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout: Left Sidebar Student Picker, Right Profile Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Student Selector */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3.5 max-h-[780px] flex flex-col">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Khối lớp THCS - THPT
            </label>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả khối 6–12</option>
              {["6", "7", "8", "9", "10", "11", "12"].map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã HS..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <p className="text-[11px] font-semibold text-slate-400">
            Danh sách học sinh ({filteredStudents.length}):
          </p>

          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 divide-y divide-slate-100">
            {filteredStudents.map(st => {
              const isSelected = st.id === selectedStudentId;
              const hasOrientation = Boolean(st.careerOrientations?.[0]?.result);
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between ${
                    isSelected 
                      ? "bg-teal-50 border border-teal-200 text-teal-900 font-bold shadow-xs" 
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div>
                    <p className="font-bold">{st.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {st.studentCode} • Lớp {st.class?.className}
                    </p>
                  </div>
                  {hasOrientation ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đã có định hướng" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Chưa hoàn thiện định hướng" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Career Profile */}
        <div className="lg:col-span-3 space-y-5">
          {!profileData ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <RefreshCcw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Đang tải hồ sơ phát triển hướng nghiệp...</p>
            </div>
          ) : (
            <>
              {/* Student Overview Header Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white font-bold text-lg flex items-center justify-center shadow-md">
                    {profileData.student.studentName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-slate-900">{profileData.student.studentName}</h2>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700">
                        {profileData.student.studentCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lớp {profileData.student.class?.className} (Khối {profileData.student.class?.grade}) • {profileData.student.campus?.campusName || "Sky-Line"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái tư vấn</span>
                    <p className="text-xs font-extrabold text-emerald-700">
                      {status === "DA_TU_VAN" ? "ĐÃ TƯ VẤN" : status === "DANG_TU_VAN" ? "ĐANG TƯ VẤN" : "CHƯA TƯ VẤN"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Self-Awareness & Holland RIASEC */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-[#003B3A]" />
                    <h3 className="font-bold text-sm text-slate-800">1. Tự nhận thức, Sở thích & Trắc nghiệm Holland (RIASEC)</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#003B3A] border border-teal-200 text-[10px] font-bold">
                    Minh chứng tham khảo — Không tự động quy đổi thành điểm đánh giá GDHN
                  </span>
                </div>

                {profileData.hollandAssessment && (
                  <div className="p-4 rounded-2xl bg-[#FAF8FC] border border-teal-200/80 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#003B3A] text-amber-300 font-mono font-extrabold text-xs">
                          Mã Holland: {profileData.hollandAssessment.hollandCode}
                        </span>
                        <span className="text-[11px] font-bold text-[#003B3A]">
                          ({profileData.hollandAssessment.version} • 108 câu Có/Không)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Hoàn thành:{" "}
                        {profileData.hollandAssessment.submittedAt
                          ? new Date(profileData.hollandAssessment.submittedAt).toLocaleDateString("vi-VN")
                          : "Đã xác thực"}
                      </span>
                    </div>

                    {profileData.hollandAssessment.reportSummary?.combinedInterpretation && (
                      <p className="text-slate-700 leading-relaxed">
                        {profileData.hollandAssessment.reportSummary.combinedInterpretation}
                      </p>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                      {(["R", "I", "A", "S", "E", "C"] as const).map(code => (
                        <div
                          key={code}
                          className="p-2 rounded-xl bg-white border border-teal-200 text-center"
                        >
                          <div className="text-[10px] font-bold text-slate-500">Nhóm {code}</div>
                          <div className="text-xs font-extrabold text-[#003B3A]">
                            {profileData.hollandAssessment.scores?.[code] ?? 0}/18
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Kết quả trắc nghiệm sở thích / Mật mã Holland:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: R - I - A (Kỹ thuật - Nghiên cứu - Nghệ thuật)"
                      value={surveyResult}
                      onChange={e => setSurveyResult(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nguyện vọng / Định hướng ban đầu của học sinh:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyện vọng theo học ngành Khoa học Máy tính / Thiết kế Robot"
                      value={initialOrientation}
                      onChange={e => setInitialOrientation(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Target Pathway & University / Career Cluster */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-sm text-slate-800">2. Lộ trình phát triển & Nhóm ngành mục tiêu</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nhóm ngành / Lĩnh vực nghề nghiệp mục tiêu:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Công nghệ thông tin / Kỹ thuật / Tài chính"
                      value={counselingResult}
                      onChange={e => setCounselingResult(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Kết luận định hướng tóm tắt (Hiển thị Hồ sơ 360 / Học bạ):
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Công nghệ thông tin - Kế hoạch tuyển sinh ĐH Bách Khoa"
                      value={result}
                      onChange={e => setResult(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-teal-800"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Longitudinal GDHN Lesson Evaluation Results (Grades 6–12) */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-teal-800" />
                    <h3 className="font-bold text-sm text-slate-800">
                      3. Kết quả các bài học Hướng nghiệp chính khóa (Khối 6–12)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {profileData.gdhnGrades?.length || 0} bài học đã được đánh giá
                  </span>
                </div>

                {(profileData.gdhnGrades || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    Chưa có bài học Giáo dục hướng nghiệp nào được nhập điểm cho học sinh này.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                          <th className="py-2 px-3">Khối</th>
                          <th className="py-2 px-3">Bài học</th>
                          <th className="py-2 px-3">Chủ đề</th>
                          <th className="py-2 px-3 text-center">Kết quả</th>
                          <th className="py-2 px-3">Nhận xét của giáo viên</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {profileData.gdhnGrades.map((g, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-bold text-slate-700">Khối {g.lesson?.grade}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              Bài {g.lesson?.periodIndex}: {g.lesson?.lessonName}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{g.lesson?.topic?.name}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                g.evalResult === "TOT" 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : g.evalResult === "HOAN_THANH" 
                                  ? "bg-blue-100 text-blue-800" 
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {g.evalResult === "TOT" ? "Tốt" : g.evalResult === "HOAN_THANH" ? "Hoàn thành" : "Cần cố gắng"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 italic">
                              {g.teacherFeedback || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. Advisory Remarks & Counseling Notes */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-sm text-slate-800">4. Nhận xét của Cố vấn học tập & Giáo viên chủ nhiệm</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ý kiến của Giáo viên chủ nhiệm (GVCN):
                    </label>
                    <textarea
                      rows={3}
                      value={gvcnRemark}
                      onChange={e => setGvcnRemark(e.target.value)}
                      placeholder="Nhận xét của GVCN về thái độ, năng lực và sự phù hợp nghề nghiệp..."
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ý kiến của Cố vấn chuyên trách / KT&ĐBCL:
                    </label>
                    <textarea
                      rows={3}
                      value={gvbmRemark}
                      onChange={e => setGvbmRemark(e.target.value)}
                      placeholder="Lời khuyên lộ trình, chứng chỉ cần thiết (IELTS, SAT), tổ hợp môn phù hợp..."
                      className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
