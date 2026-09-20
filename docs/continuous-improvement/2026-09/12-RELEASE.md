# 12. RELEASE DEPLOYMENT RUNBOOK — BATCH #01
## BIÊN BẢN VẬN HÀNH PHÁT HÀNH BẢN VÁ SEMVER v1.0.1

**Mã phiên bản:** `v1.0.1`  
**Loại phát hành:** Patch Release (Cải tiến nhỏ & sửa đổi UX/Nợ kỹ thuật)  
**Thời gian triển khai:** 20/09/2026 — 21:00 (Khung giờ bảo trì an toàn ngoài giờ học)  
**Người thực hiện:** Technical Lead & DevOps Engineer  
**Người phê duyệt:** Trưởng Ban Quản trị Hệ thống SSM  

---

### 1. QUY TRÌNH PHÁT HÀNH (DEPLOYMENT STEPS)

```text
1. Pre-deployment Verification:
   - Git branch: patch/2026-09-batch01
   - Kiểm tra SHA commit sạch, không có uncommitted changes.
   - Database Snapshot tự động được thực hiện trước 15 phút.

2. Release Execution:
   - Merge patch branch vào main.
   - Tạo Git Tag chính thức: git tag v1.0.1 -m "Release SSM v1.0.1 (Monthly Batch #01)"
   - CI/CD pipeline kích hoạt tự động: Build -> Containerize -> Zero-downtime Rolling Update.

3. Post-deployment Smoke Test:
   - Kiểm tra Health endpoint: /api/health -> 200 OK.
   - Thử nghiệm nhập điểm tại 1 lớp mẫu: phím Enter/Arrow chuyển ô bình thường.
   - Mở 1 trang hoạt động trải nghiệm: ảnh tải lười đúng chuẩn.
   - Kiểm tra Dashboard tổng hợp: dữ liệu khớp 100%.
```

---

### 2. KẾ HOẠCH DỰ PHÒNG & THU HỒI (ROLLBACK PLAN)

- **Điều kiện kích hoạt Rollback:** Phát hiện lỗi nghiêm trọng (Blocker) trong quá trình nhập điểm hoặc lỗi render màn hình giáo viên.
- **Thời gian Rollback tối đa (MTTR):** **< 2 phút**.
- **Thao tác Rollback:**
  ```bash
  # Chuyển traffic về phiên bản container v1.0.0
  docker service update --image skyline-ssm:v1.0.0 ssm_web
  # Hoặc revert commit trên main
  git revert HEAD --no-edit && git push origin main
  ```
