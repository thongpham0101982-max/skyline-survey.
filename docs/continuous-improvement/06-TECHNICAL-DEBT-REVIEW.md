# 06. TECHNICAL DEBT GOVERNANCE & AGING CONTROL

---

## 1. QUẢN LÝ TUỔI THỌ NỢ KỸ THUẬT (TECH DEBT AGING)
- Mọi khoản nợ kỹ thuật được phân loại theo 7 nhóm: *Security debt, Data debt, Performance debt, Architecture debt, UI debt, Test debt, Dependency debt*.
- **Quy tắc tuổi thọ (Aging Rules):**
  - Nợ kỹ thuật mức **High Risk / Security / Data**: Bắt buộc giải quyết trong vòng tối đa **60 ngày** (không được tồn tại vô hạn).
  - Nợ kỹ thuật mức **Medium Risk / Performance**: Giải quyết trong vòng **90 ngày**.
  - Nợ kỹ thuật mức **Low Risk / Cleanup**: Xử lý theo ngân sách 25% capacity hàng tháng.
