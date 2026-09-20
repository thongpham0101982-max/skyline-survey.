# 09. SMALL IMPROVEMENT BATCH & SAFE IMPLEMENTATION

---

## 1. NGUYÊN TẮC THIẾT KẾ GÓI CẢI TIẾN NHỎ (SMALL BATCH)
- **Tập trung vào giải pháp tinh gọn (Minimal Surface-Area Change):**
  - Tái sử dụng tối đa Design System Tokens và Shared Components có sẵn (`src/components/ui/`).
  - Không tùy tiện refactor những đoạn mã không liên quan.
  - Mỗi cải tiến phải có tiêu chí nghiệm thu (Acceptance Criteria) và phạm vi kiểm thử hồi quy (Regression Scope) rõ ràng trước khi viết dòng code đầu tiên.
