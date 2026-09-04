export const ACADEMIC_MONTHS = [
  "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"
];

export const MONTH_WEEKS_CONFIG: Record<string, string[]> = {
  "Tháng 8": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"],
  "Tháng 9": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  "Tháng 10": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"],
  "Tháng 11": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  "Tháng 12": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  "Tháng 1": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  "Tháng 2": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  "Tháng 3": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5"],
  "Tháng 4": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"],
  "Tháng 5": ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"]
};

export const getDefaultAcademicMonth = (): string => {
  const currentMonth = new Date().getMonth() + 1;
  const match = `Tháng ${currentMonth}`;
  if (ACADEMIC_MONTHS.includes(match)) {
    return match;
  }
  return "Tháng 9";
};
