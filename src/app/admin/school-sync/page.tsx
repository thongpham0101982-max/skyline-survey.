"use client"
import { useState, useRef, useEffect } from "react"
import { 
  RefreshCcw, 
  Loader2, 
  Terminal, 
  Settings, 
  Link2, 
  UserCheck, 
  CalendarRange, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Globe
} from "lucide-react"
import { 
  testConnectionAction, 
  syncAcademicYearAction, 
  syncServicesAction, 
  syncTeacherClassListAction 
} from "./actions"

export default function SchoolSyncPage() {
  const [logs, setLogs] = useState<string[]>([
    "🎨 Khởi tạo trung tâm đồng bộ hóa API Skyline School...",
    "🔑 Đã nạp thông số kết nối hệ thống mặc định."
  ])
  const [connectionStatus, setConnectionStatus] = useState<"IDLE" | "TESTING" | "SUCCESS" | "FAILED">("IDLE")
  const [testResult, setTestResult] = useState<string | null>(null)
  
  // Custom Credentials State
  const [username, setUsername] = useState("ktdbcl")
  const [password, setPassword] = useState("Songhanhphuc@@2025")
  
  // Loader States for Sync Buttons
  const [syncingYear, setSyncingYear] = useState(false)
  const [syncingServices, setSyncingServices] = useState(false)
  const [syncingTeacher, setSyncingTeacher] = useState(false)
  const [teacherInput, setTeacherInput] = useState("")

  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString("vi-VN")
    setLogs(prev => [...prev, `[${time}] ${msg}`])
  }

  // Handle connection test
  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnectionStatus("TESTING")
    addLog(`Testing connection to api.skylineschool.edu.vn with username "${username}"...`)
    
    const result = await testConnectionAction({ userName: username, password })
    if (result.success) {
      setConnectionStatus("SUCCESS")
      setTestResult(result.message || "Kết nối thành công")
      addLog(`[SUCCESS] ${result.message}`)
      addLog(`Vai trò tài khoản: Role ${result.user?.role} (${result.user?.name})`)
    } else {
      setConnectionStatus("FAILED")
      setTestResult(result.error || "Lỗi kiểm tra kết nối")
      addLog(`[ERROR] ${result.error}`)
    }
  }

  // Handle Sync Year
  const handleSyncYear = async () => {
    setSyncingYear(true)
    addLog("Bắt đầu đồng bộ hóa Năm học hoạt động từ API...")
    try {
      const result = await syncAcademicYearAction()
      if (result.success) {
        addLog(`[SUCCESS] ${result.message}`)
        if (result.data) {
          addLog(`Năm học hiện tại: ID ${result.data.id} - ${result.data.name} [${new Date(result.data.startDate).toLocaleDateString("vi-VN")} đến ${new Date(result.data.endDate).toLocaleDateString("vi-VN")}]`)
        }
      } else {
        addLog(`[ERROR] ${result.error}`)
      }
    } catch (e: any) {
      addLog(`[FATAL] ${e.message}`)
    } finally {
      setSyncingYear(false)
    }
  }

  // Handle Sync Services
  const handleSyncServices = async () => {
    setSyncingServices(true)
    addLog("Bắt đầu đồng bộ hóa danh mục Dịch vụ trường học từ API...")
    try {
      const result = await syncServicesAction()
      if (result.success) {
        addLog(`[SUCCESS] ${result.message}`)
      } else {
        addLog(`[ERROR] ${result.error}`)
      }
    } catch (e: any) {
      addLog(`[FATAL] ${e.message}`)
    } finally {
      setSyncingServices(false)
    }
  }

  // Handle Sync Teacher Class
  const handleSyncTeacherClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherInput.trim()) {
      addLog("[WARNING] Vui lòng nhập mã tài khoản giáo viên chủ nhiệm.")
      return
    }
    setSyncingTeacher(true)
    addLog(`Bắt đầu đồng bộ hóa Lớp và Học sinh bán trú/nội trú của giáo viên: ${teacherInput}...`)
    try {
      const result = await syncTeacherClassListAction(teacherInput)
      if (result.success) {
        addLog(`[SUCCESS] ${result.message}`)
        if (result.logs) {
          result.logs.forEach(log => addLog(`   → ${log}`))
        }
      } else {
        addLog(`[ERROR] ${result.error}`)
        if (result.logs) {
          result.logs.forEach(log => addLog(`   → ${log}`))
        }
      }
    } catch (e: any) {
      addLog(`[FATAL] ${e.message}`)
    } finally {
      setSyncingTeacher(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
            <RefreshCcw className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trung tâm Đồng bộ API</h1>
            <p className="text-slate-500 font-medium">Tích hợp và đồng bộ hóa trực tiếp dữ liệu học sinh, năm học từ Skyline School Central Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl">
          <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Skyline API v1.0</span>
        </div>
      </div>

      {/* Connection & Configuration Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Connection Health Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Trạng thái API</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                connectionStatus === "SUCCESS" ? "bg-emerald-100 text-emerald-700" :
                connectionStatus === "FAILED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === "SUCCESS" ? "bg-emerald-500 animate-pulse" :
                  connectionStatus === "FAILED" ? "bg-rose-500" : "bg-amber-500 animate-ping"
                }`} />
                {connectionStatus === "SUCCESS" ? "Sẵn sàng" : connectionStatus === "FAILED" ? "Lỗi kết nối" : "Chờ kiểm tra"}
              </span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">api.skylineschool.edu.vn</h3>
              <p className="text-slate-400 text-xs font-medium flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                Cơ sở dữ liệu đám mây trường học hoạt động
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-400">Giao thức bảo mật:</span>
              <span className="text-slate-700 font-bold">HTTPS (SSL Secured)</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-400">Định dạng nạp:</span>
              <span className="text-slate-700 font-bold">OpenAPI v3.0 JSON</span>
            </div>
          </div>
        </div>

        {/* Credentials Form Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Cấu hình & Thử nghiệm xác thực kết nối
          </h3>
          
          <form onSubmit={handleTestConnection} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Tên đăng nhập (UserName)</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Mật khẩu (Password)</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
            
            <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-400 font-medium">
                * Mặc định hệ thống sử dụng tài khoản Ban Khảo thí đã được xác thực thành công.
              </p>
              <button 
                type="submit"
                disabled={connectionStatus === "TESTING"}
                className="flex items-center gap-2 bg-slate-900 text-white hover:bg-indigo-600 disabled:bg-slate-300 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-md text-sm cursor-pointer"
              >
                {connectionStatus === "TESTING" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Kiểm tra Kết nối
              </button>
            </div>
          </form>

          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 ${
              connectionStatus === "SUCCESS" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              {connectionStatus === "SUCCESS" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />}
              <div>{testResult}</div>
            </div>
          )}
        </div>
      </div>

      {/* Synchronization Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sync Year Block */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600 w-fit">
              <CalendarRange className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-slate-800">Đồng bộ Năm học</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Truy xuất năm học hoạt động hiện hành của hệ thống Skyline School và cập nhật cấu hình thời gian năm học cho các biểu mẫu.
            </p>
          </div>
          <button
            onClick={handleSyncYear}
            disabled={syncingYear}
            className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-2xl font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            {syncingYear ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Đồng bộ Năm học
          </button>
        </div>

        {/* Sync Services Block */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="bg-sky-50 p-2.5 rounded-2xl text-sky-600 w-fit">
              <Settings className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-slate-800">Đồng bộ Dịch vụ</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Đồng bộ hóa các danh mục dịch vụ phục vụ học đường (Ăn uống, Xe đưa đón, Bán trú, Nội trú, Câu lạc bộ ngày Thứ 7) về hệ thống cục bộ.
            </p>
          </div>
          <button
            onClick={handleSyncServices}
            disabled={syncingServices}
            className="flex items-center justify-center gap-2 w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white rounded-2xl font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            {syncingServices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Đồng bộ Dịch vụ
          </button>
        </div>

        {/* Sync Teacher Classroom Block */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600 w-fit">
              <UserCheck className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-slate-800">Đồng bộ Danh sách Lớp</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Đồng bộ hóa danh sách học sinh theo lớp bán trú/nội trú cụ thể từ tài khoản giáo viên chủ nhiệm.
            </p>
          </div>

          <form onSubmit={handleSyncTeacherClass} className="space-y-3">
            <input 
              type="text" 
              value={teacherInput}
              onChange={e => setTeacherInput(e.target.value)}
              placeholder="Nhập tài khoản Giáo viên (ví dụ: gv01)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs"
              required
            />
            <button
              type="submit"
              disabled={syncingTeacher}
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl font-bold text-sm transition-all shadow-md cursor-pointer"
            >
              {syncingTeacher ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Đồng bộ Học sinh Lớp
            </button>
          </form>
        </div>
      </div>

      {/* Live Transaction Log Console */}
      <div className="bg-slate-950 rounded-[2rem] border border-slate-900 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2.5 text-slate-200 font-bold text-sm">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Màn hình Log giao dịch API thời gian thực</span>
          </div>
          <button 
            onClick={() => setLogs(["[INIT] Khởi động lại nhật ký Console..."])}
            className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors cursor-pointer"
          >
            Xóa màn hình
          </button>
        </div>

        <div className="h-64 overflow-y-auto font-mono text-xs text-emerald-400 bg-slate-950/80 p-4 rounded-2xl space-y-1.5 custom-scrollbar scroll-smooth">
          {logs.map((log, index) => {
            let color = "text-emerald-400"
            if (log.includes("[SUCCESS]")) color = "text-emerald-300 font-bold"
            else if (log.includes("[ERROR]") || log.includes("[FATAL]")) color = "text-rose-400 font-bold"
            else if (log.includes("[WARNING]")) color = "text-amber-400 font-semibold"
            
            return (
              <div key={index} className={`${color} leading-relaxed break-all`}>
                {log}
              </div>
            )
          })}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  )
}
