# 20. INCIDENT RESPONSE & ESCALATION RUNBOOK

---

## 1. PHÂN CẤP SỰ CỐ (INCIDENT SEVERITY LEVELS)

| Cấp độ | Mô tả định lượng | Kênh thông báo | Đội ngũ ứng phó | SLA Phản hồi | SLA Khắc phục |
|:---:|:---|:---:|:---|:---:|:---:|
| **P1** | Toàn bộ hệ thống sập, CSDL ngắt kết nối, mất dữ liệu, hoặc rò rỉ quyền giữa các trường | Điện thoại khẩn / SMS / Slack Urgent | Incident Commander + Lead Architect + DevOps | < 15 phút | < 2 giờ |
| **P2** | Một module nghiệp vụ chính bị tê liệt (vd: không thể nộp bài khảo thí hoặc nhập mục tiêu) | Slack Operations / Email P2 | Lead Developer phụ trách module + DBA | < 30 phút | < 4 giờ |
| **P3** | Lỗi hiển thị, tính toán báo cáo chậm, hoặc tính năng phụ gặp trục trặc không ảnh hưởng cốt lõi | Jira / Slack Standard | Bugfix Team | < 2 giờ | < 24 giờ |
| **P4** | Góp ý giao diện nhỏ, lỗi chính tả, yêu cầu hỗ trợ hướng dẫn người dùng | Helpdesk Portal | Support Desk | < 8 giờ | Trong bản vá kế |

---

## 2. QUY TRÌNH 4 BƯỚC XỬ LÝ SỰ CỐ KHẨN CẤP (P1/P2)
```text
[BƯỚC 1: TIẾP NHẬN & XÁC NHẬN] (Phút 0 - 15)
  └─ Kích hoạt kênh họp khẩn cấp, chỉ định Incident Commander (Chỉ huy trưởng sự cố).

[BƯỚC 2: CÔ LẬP NGUY CƠ & GIẢM THIỂU] (Phút 15 - 45)
  └─ Nếu lỗi do release mới: Kích hoạt INSTANT ROLLBACK ngay lập tức.
  └─ Nếu lỗi do database: Chuyển hướng sang Read-Only Mode hoặc kích hoạt Failover Cluster.

[BƯỚC 3: KHẮC PHỤC TRIỆT ĐỂ & XÁC MINH] (Phút 45 - 90)
  └─ Triển khai bản vá (Hotfix), xác nhận qua /api/ready, đối soát tính toàn vẹn dữ liệu.

[BƯỚC 4: BÁO CÁO HẬU SỰ CỐ (POST-MORTEM)] (Trong vòng 24 giờ)
  └─ Lập biên bản phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA) và giải pháp phòng ngừa.
```
