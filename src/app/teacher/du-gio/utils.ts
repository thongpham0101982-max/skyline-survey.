/**
 * Các hàm tiện ích dùng chung cho phân hệ Dự giờ Sky-Line
 */

/**
 * Lấy ID giáo viên chỉ định tiết dạy (nếu là tiết ASSIGNED)
 * Được lưu trong description dạng `[ASSIGNED:creatorId=...]`
 */
export function getAssignedCreatorTeacherId(slot: any): string | null {
  if (!slot) return null;
  if (slot.requestOrigin !== "ASSIGNED") return null;
  const desc = typeof slot.description === "string" ? slot.description : "";
  const match = desc.match(/\[ASSIGNED:creatorId=([^\]\s:]+)\]/);
  return match ? match[1] : null;
}

/**
 * Kiểm tra xem giáo viên có phải là người chỉ định tiết dạy này hay không
 */
export function isAssignedSlotCreator(slot: any, teacherId?: string | null): boolean {
  if (!teacherId || !slot) return false;
  return getAssignedCreatorTeacherId(slot) === teacherId;
}

/**
 * Tạo tag định danh người chỉ định để lưu vào description
 */
export function buildAssignedCreatorTag(teacherId: string): string {
  return `[ASSIGNED:creatorId=${teacherId}]`;
}
