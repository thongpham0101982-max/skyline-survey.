/**
 * Chuẩn hóa trích xuất Tháng/Năm (MM/YYYY) từ Ngày khảo sát (endDate || startDate || sessionDate || createdAt)
 * dùng thống nhất cho toàn bộ các phân hệ Khảo sát đầu vào Sky-Line.
 */
export function getCurrentMonthYearKey(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export function extractMonthYearKey(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    const iso = trimmed.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
    }
    const vnMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vnMatch) {
      return `${vnMatch[2].padStart(2, "0")}/${vnMatch[3]}`;
    }
  }
  const d = new Date(dateInput as any);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function getBatchMonthYearKey(batch?: any): string {
  if (!batch) return "";
  return (
    extractMonthYearKey(batch.endDate) ||
    extractMonthYearKey(batch.startDate) ||
    extractMonthYearKey(batch.sessionDate) ||
    extractMonthYearKey(batch.createdAt) ||
    ""
  );
}

export function getStudentSurveyMonthKey(student?: any, batchesPool?: any[]): string {
  if (!student) return "";
  const bObj =
    student.batch ||
    (student.batchId && Array.isArray(batchesPool)
      ? batchesPool.find((b: any) => b?.id === student.batchId)
      : null);
  return (
    getBatchMonthYearKey(bObj) ||
    extractMonthYearKey(student.createdAt) ||
    ""
  );
}

export function sortMonthYearKeysDesc(keys: string[]): string[] {
  return Array.from(new Set(keys.filter(Boolean))).sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return (yb || 0) * 12 + (mb || 0) - ((ya || 0) * 12 + (ma || 0));
  });
}
