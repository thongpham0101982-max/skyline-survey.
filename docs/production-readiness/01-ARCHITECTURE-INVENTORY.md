# 01. ARCHITECTURE INVENTORY & SYSTEM TOPOLOGY

**Hệ thống:** SSM — Sky-Line Educational Quality Management System  
**Baseline:** v1.0  

---

## 1. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ (SYSTEM TOPOLOGY)

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  - Web Application (Next.js 14 App Router, PWA, Tailwind CSS, SSM Tokens)         |
|  - Desktop / Electron Container (Multi-campus internal workstations)              |
+-----------------------------------------------------------------------------------+
                                         │
                                   HTTPS / WSS
                                         ▼
+-----------------------------------------------------------------------------------+
|                                EDGE / INGRESS GATEWAY                             |
|  - Vercel Edge Network / Reverse Proxy                                            |
|  - TLS 1.3 Termination, WAF, DDoS Mitigation, Rate Limiting (100 req/min/IP)      |
|  - Compression (Brotli / Gzip), Cache Invalidation Engine                        |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                             APPLICATION RUNTIME LAYER                             |
|  - Node.js 18+ LTS / Next.js Server Components & Server Actions                   |
|  - Route Handlers (/api/health, /api/ready, /api/auth, /api/...)                  |
|  - In-Memory Request Context, RBAC Enforcement Middleware                         |
|  - Audit Log Interceptor, Correlation ID Tracking                                 |
+-----------------------------------------------------------------------------------+
                                         │
                                  LibSQL Over TLS
                                         ▼
+-----------------------------------------------------------------------------------+
|                                PERSISTENCE LAYER                                  |
|  - Turso LibSQL Distributed Edge Cloud Database                                  |
|  - Primary Write Node + Multi-Region Read Replicas                                |
|  - Prisma ORM (@prisma/adapter-libsql)                                            |
|  - WAL (Write-Ahead Logging) Mode + Point-in-Time Recovery (PITR)                 |
+-----------------------------------------------------------------------------------+
```

---

## 2. INVENTORY NGUỒN TÀI NGUYÊN & SERVICE DEPENDENCIES

| Tầng kiến trúc | Công nghệ sử dụng | Phiên bản | Vai trò & Trách nhiệm |
|:---|:---|:---|:---|
| **Framework** | Next.js App Router | 14.x | SSR/RSC rendering, API Route handlers, Streaming UI |
| **UI Engine** | React + Tailwind CSS | React 18+ | Component rendering, token-based design system |
| **Iconography** | Lucide React | Latest | Bộ icon thống nhất toàn hệ thống |
| **ORM / Query** | Prisma Client | 5.x | Data modeling, typesafe queries, relation mapping |
| **Database** | Turso (LibSQL Engine) | Web client | CSDL quan hệ phân tán, tương thích SQLite |
| **Health Check** | Custom Next.js Routes | v1.0 | `/api/health` (liveness), `/api/ready` (readiness) |
| **Logging** | Structured JSON Logging | Native | Chuẩn hóa audit trail, requestId correlation |
| **Build System** | Next.js Compiler (SWC) | Rust-based | Tối ưu hóa bundle, minification, tree-shaking |
