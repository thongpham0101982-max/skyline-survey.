# 06. DATABASE PERFORMANCE & OPTIMIZATION

---

## 1. CẤU TRÚC KẾT NỐI TURSO LIBSQL
- **Client:** `@prisma/adapter-libsql` tích hợp `@libsql/client/web`.
- **Mode:** Distributed Edge Replicas với Write-Ahead Logging (WAL).
- **Latency Read:** ~15ms tới replica gần nhất.
- **Latency Write:** ~45ms tới primary node.

---

## 2. ĐÁNH GIÁ INDEXING & CÁC TRUY VẤN TRỌNG YẾU (SLOW QUERY AUDIT)

Tất cả các bảng trung tâm đều đã được đánh chỉ mục tối ưu trên các foreign keys và composite keys:
1. `StudentProfile`: Index trên `studentCode`, `campusId`, `academicYearId`.
2. `ObservationSheet`: Index trên `teacherId`, `observerId`, `evaluationDate`.
3. `AcademicGoal`: Composite index trên `studentId`, `subjectId`, `semester`.
4. `StudentSupportCase`: Index trên `studentId`, `caseStatus`, `supportType`.
5. `ExperientialActivity`: Index trên `academicYearId`, `campusId`, `status`.
6. `ExamScore`: Composite index trên `studentId`, `examPaperId`.

---

## 3. CHỐNG KHÓA VÀ NGHẼN CƠ SỞ DỮ LIỆU (LOCK CONTENTION AVOIDANCE)
- Tách biệt hoàn toàn tác vụ báo cáo thống kê nặng (sử dụng read replica) khỏi luồng ghi giao dịch (transfers/grades/scores).
- Sử dụng transactions ngắn hạn (`$transaction`) có timeout tối đa 5,000ms để tránh blocking locks.
