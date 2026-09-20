# 03. HỢP ĐỒNG DỮ LIỆU DASHBOARD (DATA CONTRACTS)
## QUY CHUẨN CẤU TRÚC GIAO TIẾP VÀ XỬ LÝ DỮ LIỆU

---

### 1. Cấu trúc MetricCardData
```typescript
export interface MetricCardData {
  metricId: string
  label: string
  value: number | string | null
  displayValue: string
  unit?: string
  target?: number | null
  variance?: number | null
  varianceLabel?: string
  status: "NORMAL" | "WARNING" | "CRITICAL" | "SUCCESS"
  contextText: string
  sourceModuleName: string
  lastUpdated: string
  drilldownKey?: string
}
```

### 2. Quy tắc Xử lý Giá trị Rỗng (Null Handling)
- `0`: Điểm số hoặc số lượng thực tế bằng 0.
- `null` hoặc `—`: Chưa có dữ liệu / Chưa đến kỳ kiểm tra / Học sinh vắng thi.
- `N/A`: Không áp dụng cho đối tượng hoặc cấp học này.
- **Tuyệt đối không hiển thị `0` thay cho dữ liệu chưa cập nhật hoặc bị thiếu.**
