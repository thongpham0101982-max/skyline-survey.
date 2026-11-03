"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  Briefcase,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Lock,
  Globe,
  Award,
  Sparkles,
  Phone,
  Mail,
  UserCheck
} from "lucide-react";

function PortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alumniData, setAlumniData] = useState<any>(null);

  // Identity Verification Challenge
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verificationInput, setVerificationInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Form State
  const [personalEmail, setPersonalEmail] = useState("");
  const [personalPhone, setPersonalPhone] = useState("");
  const [currentResidenceCountry, setCurrentResidenceCountry] = useState("Việt Nam");
  const [currentResidenceCity, setCurrentResidenceCity] = useState("");
  const [currentAcademicStatus, setCurrentAcademicStatus] = useState("STUDYING");
  const [currentCareerStatus, setCurrentCareerStatus] = useState("WORKING");
  const [currentEmployer, setCurrentEmployer] = useState("");
  const [currentJobTitle, setCurrentJobTitle] = useState("");

  // Multiple Educations
  const [educations, setEducations] = useState<any[]>([
    {
      degreeLevel: "Cử nhân / Kỹ sư",
      institutionName: "",
      majorName: "",
      specialization: "",
      country: "Việt Nam",
      city: "",
      startYear: new Date().getFullYear(),
      endYear: null,
      isCurrent: true,
      scholarshipInfo: ""
    }
  ]);

  // Multiple Careers
  const [careers, setCareers] = useState<any[]>([
    {
      jobTitle: "",
      industry: "Công nghệ thông tin & Viễn thông",
      organization: "",
      workCountry: "Việt Nam",
      workCity: "",
      isCurrent: true
    }
  ]);

  // Consents
  const [dataConsentAccepted, setDataConsentAccepted] = useState(true);
  const [allowContact, setAllowContact] = useState(true);
  const [joinAlumniNetwork, setJoinAlumniNetwork] = useState(true);
  const [allowMediaSharing, setAllowMediaSharing] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Không tìm thấy mã truy cập (Token). Vui lòng quét lại mã QR trên thẻ cựu học sinh.");
      setLoading(false);
      return;
    }

    fetch(`/api/alumni/portal?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setAlumniData(json.data);
          // Prepopulate if previously verified
          if (json.data.currentResidenceCountry) setCurrentResidenceCountry(json.data.currentResidenceCountry);
          if (json.data.currentResidenceCity) setCurrentResidenceCity(json.data.currentResidenceCity);
          if (json.data.currentAcademicStatus) setCurrentAcademicStatus(json.data.currentAcademicStatus);
          if (json.data.currentCareerStatus) setCurrentCareerStatus(json.data.currentCareerStatus);
          if (json.data.currentEmployer) setCurrentEmployer(json.data.currentEmployer);
          if (json.data.currentJobTitle) setCurrentJobTitle(json.data.currentJobTitle);
          if (json.data.educations && json.data.educations.length > 0) setEducations(json.data.educations);
          if (json.data.careers && json.data.careers.length > 0) setCareers(json.data.careers);
        } else {
          setError(json.error || "Mã QR không hợp lệ hoặc đã hết hạn.");
        }
      })
      .catch((e) => {
        setError("Không thể kết nối đến máy chủ Sky-Line.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleUnlockIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifying(true);

    const val = verificationInput.trim().toLowerCase();
    const stCode = (alumniData.studentCode || "").toLowerCase();

    // Match either Student Code OR Year of Birth
    if (val === stCode || (alumniData.graduationYear && val === String(alumniData.graduationYear))) {
      setIsUnlocked(true);
      setVerifying(false);
    } else {
      setVerifyError("Thông tin xác thực không đúng. Vui lòng nhập đúng Mã học sinh.");
      setVerifying(false);
    }
  };

  const handleAddEducation = () => {
    setEducations([
      ...educations,
      {
        degreeLevel: "Cử nhân / Kỹ sư",
        institutionName: "",
        majorName: "",
        specialization: "",
        country: "Việt Nam",
        city: "",
        startYear: new Date().getFullYear(),
        endYear: null,
        isCurrent: true,
        scholarshipInfo: ""
      }
    ]);
  };

  const handleRemoveEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleAddCareer = () => {
    setCareers([
      ...careers,
      {
        jobTitle: "",
        industry: "Kinh tế, Quản trị & Tài chính",
        organization: "",
        workCountry: "Việt Nam",
        workCity: "",
        isCurrent: true
      }
    ]);
  };

  const handleRemoveCareer = (index: number) => {
    setCareers(careers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataConsentAccepted) {
      alert("Bạn cần đồng ý với điều khoản xử lý dữ liệu trước khi gửi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/alumni/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          verificationKey: verificationInput,
          payload: {
            personalEmail,
            personalPhone,
            currentResidenceCountry,
            currentResidenceCity,
            currentAcademicStatus,
            currentCareerStatus,
            currentEmployer,
            currentJobTitle,
            educations,
            careers,
            allowContact,
            joinAlumniNetwork,
            allowMediaSharing,
            dataConsentAccepted
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        setSubmitSuccess(true);
      } else {
        alert(json.error || "Lỗi nộp thông tin");
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#005856] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-600">Đang nạp thông tin cựu học sinh...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Không thể truy cập</h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{error}</p>
          <div className="pt-2 text-xs text-gray-400">
            Hệ thống Quản lý Cựu học sinh – Trường Quốc tế Sky-Line
          </div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Cảm ơn bạn đã cập nhật!</h2>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Thông tin của bạn đã được ghi nhận thành công và gửi về Ban quản lý Mạng lưới Cựu học sinh Sky-Line.
            Dữ liệu sẽ được đối soát và xác minh trong thời gian sớm nhất.
          </p>
          <div className="pt-4 border-t border-gray-100 text-xs text-teal-800 font-semibold">
            Chúc bạn luôn thành công trên hành trình học tập và sự nghiệp!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-16 font-sans">
      {/* Brand Header */}
      <header className="bg-gradient-to-r from-[#005856] via-[#006f6c] to-[#00A19A] text-white py-6 px-4 sm:px-6 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Sky-Line Alumni Network</h1>
            <p className="text-xs text-teal-100 mt-0.5">
              Cổng cập nhật thông tin học tập và nghề nghiệp cựu học sinh
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Section A: Inherited Personal Information (Read-only) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Hồ sơ cựu học sinh
              </span>
              <h2 className="text-xl font-bold text-gray-900">{alumniData.studentName}</h2>
              {alumniData.englishName && (
                <div className="text-xs text-gray-500">{alumniData.englishName}</div>
              )}
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#005856] border border-teal-200/60">
              Niên khóa {alumniData.graduationYear}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-1">
            <div>
              <span className="text-gray-400 block text-[11px]">Mã học sinh</span>
              <span className="font-mono font-bold text-gray-800">{alumniData.studentCode}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Cơ sở tốt nghiệp</span>
              <span className="font-medium text-gray-800">{alumniData.campusId}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Lớp tốt nghiệp</span>
              <span className="font-medium text-gray-800">{alumniData.lastClassName || `Khối ${alumniData.graduationGrade}`}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Hệ học Sky-Line</span>
              <span className="font-medium text-gray-800">{alumniData.educationSystem || "Tiêu chuẩn"}</span>
            </div>
          </div>
        </div>

        {/* Identity Unlock Banner */}
        {!isUnlocked && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-amber-200/80 shadow-xs space-y-3 bg-gradient-to-br from-amber-50/50 to-white">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <Lock className="w-4 h-4 text-amber-600" />
              Xác thực danh tính để cập nhật thông tin
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Để bảo vệ quyền riêng tư, vui lòng nhập <strong className="text-gray-900">Mã học sinh</strong> của bạn
              (hoặc Năm tốt nghiệp) để mở khóa cổng cập nhật:
            </p>

            <form onSubmit={handleUnlockIdentity} className="space-y-3 pt-1">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nhập Mã học sinh (ví dụ: 0602040...)"
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#005856] bg-white font-mono"
                />
                {verifyError && <p className="text-xs text-rose-600 mt-1 font-medium">{verifyError}</p>}
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-2.5 rounded-xl bg-[#005856] text-white text-xs sm:text-sm font-semibold hover:bg-teal-900 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                {verifying ? "Đang kiểm tra..." : "Xác thực & Mở khóa"}
              </button>
            </form>
          </div>
        )}

        {/* Unlocked Form */}
        {isUnlocked && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section B: Học tập & Đào tạo */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#005856]" />
                  Hành trình Học tập Đại học / Sau ĐH
                </h3>
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#005856] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm trường học
                </button>
              </div>

              {educations.map((edu, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-3 relative">
                  {educations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Bậc học:</label>
                      <select
                        value={edu.degreeLevel}
                        onChange={(e) => {
                          const copy = [...educations];
                          copy[idx].degreeLevel = e.target.value;
                          setEducations(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      >
                        <option value="Cử nhân / Kỹ sư">Cử nhân / Kỹ sư</option>
                        <option value="Thạc sĩ">Thạc sĩ</option>
                        <option value="Tiến sĩ">Tiến sĩ</option>
                        <option value="Cao đẳng">Cao đẳng</option>
                        <option value="Chứng chỉ nghề / Trao đổi">Chứng chỉ nghề / Trao đổi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Trường ĐH / Cơ sở đào tạo:</label>
                      <input
                        type="text"
                        required
                        placeholder="Tên trường đại học..."
                        value={edu.institutionName}
                        onChange={(e) => {
                          const copy = [...educations];
                          copy[idx].institutionName = e.target.value;
                          setEducations(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Ngành học:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Khoa học máy tính, Kinh doanh..."
                        value={edu.majorName}
                        onChange={(e) => {
                          const copy = [...educations];
                          copy[idx].majorName = e.target.value;
                          setEducations(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Quốc gia du học / học tập:</label>
                      <input
                        type="text"
                        value={edu.country}
                        onChange={(e) => {
                          const copy = [...educations];
                          copy[idx].country = e.target.value;
                          setEducations(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Năm bắt đầu:</label>
                      <input
                        type="number"
                        value={edu.startYear}
                        onChange={(e) => {
                          const copy = [...educations];
                          copy[idx].startYear = parseInt(e.target.value, 10);
                          setEducations(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Học bổng / Thành tích (Tùy chọn):</label>
                      <input
                        type="text"
                        placeholder="Học bổng 50%, Thủ khoa..."
                        value={edu.scholarshipInfo || ""}
                        onChange={(e) => {
                          const copy = [...educations];
                          copy[idx].scholarshipInfo = e.target.value;
                          setEducations(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Section C: Nơi sinh sống hiện tại & Liên hệ */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
                <MapPin className="w-4 h-4 text-[#005856]" />
                Nơi sinh sống & Thông tin liên hệ
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Quốc gia hiện tại:</label>
                  <input
                    type="text"
                    value={currentResidenceCountry}
                    onChange={(e) => setCurrentResidenceCountry(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Thành phố hiện tại:</label>
                  <input
                    type="text"
                    placeholder="Đà Nẵng, Hà Nội, Melbourne..."
                    value={currentResidenceCity}
                    onChange={(e) => setCurrentResidenceCity(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Email cá nhân:</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Số điện thoại liên lạc:</label>
                  <input
                    type="tel"
                    placeholder="0905..."
                    value={personalPhone}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Section D: Nghề nghiệp & Công việc */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#005856]" />
                  Quá trình Nghề nghiệp & Công tác
                </h3>
                <button
                  type="button"
                  onClick={handleAddCareer}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#005856] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm công việc
                </button>
              </div>

              {careers.map((car, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 space-y-3 relative">
                  {careers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCareer(idx)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Chức danh / Vị trí:</label>
                      <input
                        type="text"
                        placeholder="Kỹ sư phần mềm, Chuyên viên phân tích..."
                        value={car.jobTitle}
                        onChange={(e) => {
                          const copy = [...careers];
                          copy[idx].jobTitle = e.target.value;
                          setCareers(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Đơn vị / Doanh nghiệp:</label>
                      <input
                        type="text"
                        placeholder="Tên công ty / Tập đoàn..."
                        value={car.organization || ""}
                        onChange={(e) => {
                          const copy = [...careers];
                          copy[idx].organization = e.target.value;
                          setCareers(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Lĩnh vực nghề nghiệp:</label>
                      <input
                        type="text"
                        value={car.industry}
                        onChange={(e) => {
                          const copy = [...careers];
                          copy[idx].industry = e.target.value;
                          setCareers(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Quốc gia làm việc:</label>
                      <input
                        type="text"
                        value={car.workCountry}
                        onChange={(e) => {
                          const copy = [...careers];
                          copy[idx].workCountry = e.target.value;
                          setCareers(copy);
                        }}
                        className="w-full p-2.5 rounded-lg border border-gray-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Section E: Quyền riêng tư & Cam kết */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Quyền riêng tư & Tùy chọn chia sẻ
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dataConsentAccepted}
                    onChange={(e) => setDataConsentAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-[#005856] focus:ring-[#005856]"
                  />
                  <span className="text-gray-700">
                    <strong className="text-gray-900">Đồng ý xử lý dữ liệu:</strong> Tôi đồng ý cho Hệ thống Giáo dục Sky-Line lưu trữ và xử lý các thông tin trên phục vụ công tác kết nối cựu học sinh.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowContact}
                    onChange={(e) => setAllowContact(e.target.checked)}
                    className="mt-0.5 rounded text-[#005856] focus:ring-[#005856]"
                  />
                  <span className="text-gray-700">
                    Đồng ý nhận thư mời tham dự các sự kiện thường niên của trường và mạng lưới cựu học sinh.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMediaSharing}
                    onChange={(e) => setAllowMediaSharing(e.target.checked)}
                    className="mt-0.5 rounded text-[#005856] focus:ring-[#005856]"
                  />
                  <span className="text-gray-700">
                    Đồng ý cho nhà trường chia sẻ thông tin thành tích (học bổng, vị trí việc làm) trên các kênh truyền thông chính thức của Sky-Line.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#005856] to-[#00A19A] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Đang gửi hồ sơ..." : "Gửi thông tin cập nhật cho nhà trường"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function AlumniPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center">Đang tải cổng cựu học sinh...</div>
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  );
}
