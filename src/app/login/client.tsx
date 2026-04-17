"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function LoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("Attempting login for:", email)
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      
      console.log("Login result:", result)

      setLoading(false)

      if (result?.error) {
         setError("Sai tên đăng nhập hoặc mật khẩu! Vui lòng thử lại.")
      } else {
         window.location.assign("/");
      }
    } catch (err) {
      console.error("Login exception:", err)
      setError("Đã có lỗi xảy ra. Vui lòng kiểm tra console F12.")
      setLoading(false)
    }
  }

  return (
    <div className="login-page relative min-h-screen min-h-dvh flex items-center justify-center p-5 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-600 overflow-hidden font-sans">
      {/* Animated background shapes */}
      <div className="bg-shape absolute w-[300px] h-[300px] bg-[radial-gradient(circle,#92400e,transparent)] top-[-80px] right-[-60px] opacity-15 pointer-events-none animate-float1 rounded-full" />
      <div className="bg-shape absolute w-[200px] h-[200px] bg-[radial-gradient(circle,#78350f,transparent)] bottom-[-40px] left-[-40px] opacity-15 pointer-events-none animate-float2 rounded-full" />
      <div className="bg-shape absolute w-[150px] h-[150px] bg-[radial-gradient(circle,#b45309,transparent)] top-[40%] left-[10%] opacity-15 pointer-events-none animate-float3 rounded-full" />

      <div className="login-container relative z-10 w-full max-w-[420px] animate-slideUp">
        {/* Logo / Brand */}
        <div className="brand-section text-center mb-8">
          <div className="logo-icon w-20 h-20 mx-auto mb-4 drop-shadow-2xl animate-logoIn">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect width="40" height="40" rx="12" fill="url(#grad)" />
              <path d="M12 28V14l8-4 8 4v14l-8 4-8-4z" stroke="#fff" strokeWidth="2" fill="none" />
              <path d="M16 22l4 2 4-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M20 18v6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="15" r="2" fill="#fff" opacity="0.8" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="brand-title text-5xl font-black text-amber-900 tracking-[10px] mb-1 drop-shadow-md">SQMS</h1>
          <p className="brand-subtitle text-base font-bold text-amber-800 tracking-wide">Hệ thống Quản trị Chất lượng Trường học</p>
          <p className="brand-tagline text-xs italic text-amber-700 opacity-80 mt-1">School Quality Management System</p>
        </div>

        {/* Login Card */}
        <div className="login-card bg-white/90 backdrop-blur-2xl border border-white/40 rounded-[32px] p-10 shadow-2xl shadow-amber-900/20">
          <div className="card-header text-center mb-8">
            <h2 className="text-2xl font-extrabold text-amber-950 mb-2">Đăng nhập</h2>
            <p className="text-sm font-medium text-amber-800 opacity-70">Sử dụng mã nhân viên hoặc Email được cấp</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="error-banner flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-semibold animate-shake">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="login-email" className="block text-sm font-bold text-amber-900 mb-2 ml-1">Tài khoản</label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 opacity-60 group-focus-within:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  id="login-email"
                  type="text"
                  required
                  placeholder="Mã NV hoặc Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 bg-amber-50/10 border-2 border-amber-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password" className="block text-sm font-bold text-amber-900 mb-2 ml-1">Mật khẩu</label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 opacity-60 group-focus-within:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-4 bg-amber-50/10 border-2 border-amber-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                />
                <button 
                  type="button" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-amber-700 transition-colors" 
                  onClick={() => setShowPassword(!showPassword)} 
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-gradient-to-r from-amber-700 to-amber-900 text-white font-black text-lg rounded-2xl shadow-xl shadow-amber-900/40 hover:translate-y-[-2px] hover:shadow-amber-900/50 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang xác thực...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Đăng nhập
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-10 text-sm font-semibold text-amber-900 opacity-60 tracking-wider">© 2026 SQMS • Skyline Education</p>
      </div>

      <style jsx global>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.1); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.15); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px,-25px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes logoIn { from { opacity: 0; transform: scale(0.5) rotate(-10deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        
        .animate-float1 { animation: float1 8s ease-in-out infinite; }
        .animate-float2 { animation: float2 10s ease-in-out infinite; }
        .animate-float3 { animation: float3 12s ease-in-out infinite; }
        .animate-slideUp { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-logoIn { animation: logoIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  )
}
