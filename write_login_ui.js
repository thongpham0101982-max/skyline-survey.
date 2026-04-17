const fs = require('fs');

const loginClient = `"use client"
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

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
       setError("Sai t\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c m\u1eadt kh\u1ea9u! Vui l\u00f2ng th\u1eed l\u1ea1i.")
    } else {
       window.location.assign("/");
    }
  }

  return (
    <div className="login-page">
      {/* Animated background shapes */}
      <div className="bg-shape bg-shape-1" />
      <div className="bg-shape bg-shape-2" />
      <div className="bg-shape bg-shape-3" />

      <div className="login-container">
        {/* Logo / Brand */}
        <div className="brand-section">
          <div className="logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <h1 className="brand-title">SQMS</h1>
          <p className="brand-subtitle">H\u1ec7 th\u1ed1ng Qu\u1ea3n tr\u1ecb Ch\u1ea5t l\u01b0\u1ee3ng Tr\u01b0\u1eddng h\u1ecdc</p>
          <p className="brand-tagline">School Quality Management System</p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="card-header">
            <h2>\u0110\u0103ng nh\u1eadp</h2>
            <p>S\u1eed d\u1ee5ng m\u00e3 nh\u00e2n vi\u00ean ho\u1eb7c Email \u0111\u01b0\u1ee3c c\u1ea5p</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-banner">
                <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="login-email">T\u00e0i kho\u1ea3n</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <input
                  id="login-email"
                  type="text"
                  required
                  placeholder="M\u00e3 NV ho\u1eb7c Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password">M\u1eadt kh\u1ea9u</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <span className="loading-content">
                  <svg className="spinner" viewBox="0 0 24 24"><circle className="spinner-track" cx="12" cy="12" r="10" /><circle className="spinner-fill" cx="12" cy="12" r="10" /></svg>
                  \u0110ang x\u00e1c th\u1ef1c...
                </span>
              ) : (
                <span className="btn-content">
                  \u0110\u0103ng nh\u1eadp
                  <svg viewBox="0 0 20 20" fill="currentColor" className="btn-arrow"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="login-footer">\u00a9 2026 SQMS \u2022 Skyline Education</p>
      </div>

      <style jsx>{\`
        .login-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(145deg, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #f59e0b 75%, #d97706 100%);
          position: relative;
          overflow: hidden;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .bg-shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.15;
          pointer-events: none;
        }
        .bg-shape-1 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #92400e, transparent);
          top: -80px; right: -60px;
          animation: float1 8s ease-in-out infinite;
        }
        .bg-shape-2 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, #78350f, transparent);
          bottom: -40px; left: -40px;
          animation: float2 10s ease-in-out infinite;
        }
        .bg-shape-3 {
          width: 150px; height: 150px;
          background: radial-gradient(circle, #b45309, transparent);
          top: 40%; left: 10%;
          animation: float3 12s ease-in-out infinite;
        }

        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.1); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.15); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px,-25px); } }

        .login-container {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .brand-section {
          text-align: center;
          margin-bottom: 28px;
        }

        .logo-icon {
          width: 64px; height: 64px;
          margin: 0 auto 16px;
          filter: drop-shadow(0 4px 12px rgba(120, 53, 15, 0.3));
          animation: logoIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }
        .logo-icon svg { width: 100%; height: 100%; }

        @keyframes logoIn {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .brand-title {
          font-size: 36px;
          font-weight: 900;
          color: #78350f;
          letter-spacing: 6px;
          margin: 0;
          text-shadow: 0 2px 4px rgba(120, 53, 15, 0.15);
        }

        .brand-subtitle {
          font-size: 14px;
          font-weight: 600;
          color: #92400e;
          margin: 6px 0 2px;
          letter-spacing: 0.5px;
        }

        .brand-tagline {
          font-size: 11px;
          color: #a16207;
          margin: 0;
          font-style: italic;
          opacity: 0.8;
        }

        .login-card {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 24px;
          padding: 32px 28px;
          box-shadow:
            0 20px 60px rgba(120, 53, 15, 0.15),
            0 4px 16px rgba(0,0,0,0.06),
            inset 0 1px 0 rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.6);
        }

        .card-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .card-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: #451a03;
          margin: 0 0 6px;
        }
        .card-header p {
          font-size: 13px;
          color: #92400e;
          margin: 0;
          opacity: 0.7;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          animation: shake 0.4s ease;
        }
        .error-icon { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.8; }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        .input-group {
          margin-bottom: 18px;
        }
        .input-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #78350f;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          width: 18px; height: 18px;
          color: #b45309;
          opacity: 0.5;
          pointer-events: none;
          transition: opacity 0.2s;
        }
        .input-wrapper:focus-within .input-icon {
          opacity: 0.9;
          color: #92400e;
        }
        .input-wrapper input {
          width: 100%;
          padding: 14px 14px 14px 44px;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          font-size: 15px;
          color: #1f2937;
          background: #fafaf9;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          -webkit-appearance: none;
        }
        .input-wrapper input::placeholder {
          color: #9ca3af;
        }
        .input-wrapper input:focus {
          border-color: #d97706;
          background: #fffbeb;
          box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.12);
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
          color: #9ca3af;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }
        .toggle-password:hover { color: #78350f; }
        .toggle-password svg { width: 18px; height: 18px; }

        .submit-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #b45309 0%, #92400e 50%, #78350f 100%);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 6px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(146, 64, 14, 0.35);
          -webkit-tap-highlight-color: transparent;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .submit-btn:hover::before { opacity: 1; }
        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(146, 64, 14, 0.4);
        }
        .submit-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(146, 64, 14, 0.3);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-arrow {
          width: 18px; height: 18px;
          transition: transform 0.2s;
        }
        .submit-btn:hover .btn-arrow { transform: translateX(3px); }

        .loading-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .spinner {
          width: 20px; height: 20px;
          animation: spin 1s linear infinite;
        }
        .spinner-track {
          fill: none;
          stroke: rgba(255,255,255,0.3);
          stroke-width: 3;
        }
        .spinner-fill {
          fill: none;
          stroke: #fff;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-dasharray: 60;
          stroke-dashoffset: 45;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 11px;
          color: #92400e;
          opacity: 0.6;
          letter-spacing: 0.5px;
        }

        /* Mobile optimizations */
        @media (max-width: 480px) {
          .login-page { padding: 16px; align-items: flex-start; padding-top: 60px; }
          .login-card { padding: 24px 20px; border-radius: 20px; }
          .brand-title { font-size: 30px; letter-spacing: 4px; }
          .brand-subtitle { font-size: 13px; }
          .logo-icon { width: 56px; height: 56px; }
        }

        @media (max-height: 700px) {
          .login-page { padding: 12px; }
          .brand-section { margin-bottom: 16px; }
          .logo-icon { width: 48px; height: 48px; margin-bottom: 10px; }
          .brand-title { font-size: 28px; }
          .login-card { padding: 20px; }
          .input-group { margin-bottom: 12px; }
        }

        /* Safe area for notched phones */
        @supports (padding: env(safe-area-inset-bottom)) {
          .login-page {
            padding-bottom: calc(20px + env(safe-area-inset-bottom));
          }
        }
      \`}</style>
    </div>
  )
}
`;

fs.writeFileSync('src/app/login/client.tsx', loginClient);
console.log('OK: Login client.tsx rewritten with SQMS earthy gold design');
