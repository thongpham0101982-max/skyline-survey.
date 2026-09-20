# 15. DEPLOYMENT PIPELINE & ZERO-DOWNTIME RELEASE

---

## 1. QUY TRÌNH TRIỂN KHAI BẤT BIẾN (IMMUTABLE DEPLOYMENT PIPELINE)

```text
[GIT MAIN BRANCH]
       │
       ▼
[CI/CD PIPELINE]
  ├─ 1. Lint & Format Check (ESLint + Prettier)
  ├─ 2. TypeCheck (tsc --noEmit)
  ├─ 3. Unit & Integration Tests Run
  ├─ 4. Production Build Compilation (Next.js SWC)
  └─ 5. Security & Secret Leak Scanning
       │
       ▼ (Pass 100%)
[STAGING DEPLOYMENT]
  ├─ Automated Smoke Tests
  └─ Readiness Probe Verification (/api/ready)
       │
       ▼ (Sign-off)
[ATOMIC PRODUCTION SWAP]
  ├─ Instant Edge Traffic Switch (Zero-downtime)
  └─ Monitor Error Rate trong 15 phút
```

---

## 2. NGUYÊN TẮC ZERO-DOWNTIME
- Không có bất kỳ khoảng thời gian "Maintenance Window" gây gián đoạn người dùng.
- Bản build mới được biên dịch và làm nóng hoàn chỉnh (pre-warmed) trước khi điều hướng lưu lượng truy cập (Instant Edge Switching).
- Các request đang chạy trên bản cũ được hoàn tất bình thường (Graceful Draining).
