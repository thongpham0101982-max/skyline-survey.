export interface GoalPresetItem {
  id?: string
  gradeGroup: string
  category: string
  goalText: string
  actionPreset: string
  sortOrder: number
  status?: string
}

export const DEFAULT_PRESETS: GoalPresetItem[] = [
  // Khối 1 (Học tập 50%, Sức khỏe 20%, Sở thích 15%, Phẩm chất 15%)
  { gradeGroup: "K1", category: "HOC_TAP", goalText: "Em tập trung lắng nghe Thầy Cô giảng bài và hoàn thành bài tập trên lớp", actionPreset: "Giơ tay phát biểu ý kiến, tự giác chuẩn bị sách vở", sortOrder: 1 },
  { gradeGroup: "K1", category: "HOC_TAP", goalText: "Em đọc to, rõ ràng, lưu loát và tự tin từng câu chữ Tiếng Việt", actionPreset: "Luyện đọc sách cùng ba mẹ mỗi tối 15 phút", sortOrder: 2 },
  { gradeGroup: "K1", category: "HOC_TAP", goalText: "Em rèn chữ viết đúng ô ly, ngay ngắn và giữ gìn tập vở sạch đẹp", actionPreset: "Nắn nót từng nét chữ, ngồi học đúng tư thế", sortOrder: 3 },
  { gradeGroup: "K1", category: "SUC_KHOE", goalText: "Em tự xếp hàng ngay ngắn, giữ gìn vệ sinh cá nhân, ăn ngủ đúng giờ và vận động", actionPreset: "Rửa tay trước khi ăn, cất đồ dùng học tập ngăn nắp", sortOrder: 4 },
  { gradeGroup: "K1", category: "SUC_KHOE", goalText: "Em ngủ sớm trước 21h30 và thức dậy vui vẻ, tự giác đến trường đúng giờ", actionPreset: "Chuẩn bị đồng phục và cặp sách từ tối hôm trước", sortOrder: 5 },
  { gradeGroup: "K1", category: "SO_THICH", goalText: "Em yêu thích tham gia vẽ tranh, kể chuyện, ca hát và các trò chơi vận động", actionPreset: "Tích cực tham gia các hoạt động ngoại khóa, câu lạc bộ sở thích", sortOrder: 6 },
  { gradeGroup: "K1", category: "SO_THICH", goalText: "Em mạnh dạn làm quen và hòa đồng, chia sẻ cùng các bạn trong lớp", actionPreset: "Chủ động chào hỏi và chia sẻ đồ chơi, sách truyện cùng bạn", sortOrder: 7 },
  { gradeGroup: "K1", category: "PHAM_CHAT", goalText: "Em lễ phép chào hỏi Thầy Cô, người lớn, trung thực và biết giúp đỡ bạn bè", actionPreset: "Nói lời cảm ơn, xin lỗi và chia sẻ cùng bạn bè trong lớp", sortOrder: 8 },
  { gradeGroup: "K1", category: "PHAM_CHAT", goalText: "Em trung thực trong học tập, nhặt được của rơi biết trả lại bạn", actionPreset: "Luôn nói thật, biết nhận lỗi và sửa sai khi mắc khuyết điểm", sortOrder: 9 },

  // Khối 2 (Học tập 50%, Kỹ năng 20%, Sức khỏe 10%, Sở thích 10%, Phẩm chất 10%)
  { gradeGroup: "K2", category: "HOC_TAP", goalText: "Em rèn luyện chữ viết đẹp và hoàn thành tốt các bài toán hàng ngày", actionPreset: "Viết nắn nót từng câu chữ, kiểm tra bài trước khi nộp", sortOrder: 1 },
  { gradeGroup: "K2", category: "HOC_TAP", goalText: "Em đọc hiểu lưu loát văn bản và nắm vững bảng cộng trừ có nhớ", actionPreset: "Mỗi ngày đọc 1 mẩu chuyện ngắn và rèn luyện tính nhẩm", sortOrder: 2 },
  { gradeGroup: "K2", category: "KY_NANG", goalText: "Em rèn luyện sự tự tin khi đứng trước lớp trình bày ý kiến và tự phục vụ cá nhân", actionPreset: "Tích cực phát biểu, tự sắp xếp đồ dùng cá nhân gọn gàng", sortOrder: 3 },
  { gradeGroup: "K2", category: "KY_NANG", goalText: "Em biết lắng nghe ý kiến của bạn và hợp tác tốt trong giờ thảo luận nhóm", actionPreset: "Không chen ngang lời bạn, hoàn thành phần việc nhóm giao", sortOrder: 4 },
  { gradeGroup: "K2", category: "SUC_KHOE", goalText: "Em ngủ trước 21h30 và thức dậy đúng giờ, ăn đủ bữa và tập thể dục", actionPreset: "Đặt báo thức cá nhân, hạn chế xem TV và đồ điện tử", sortOrder: 5 },
  { gradeGroup: "K2", category: "SO_THICH", goalText: "Em phát huy sở trường đọc sách, vẽ tranh và rèn luyện môn thể thao yêu thích", actionPreset: "Dành 20 phút mỗi ngày cho hoạt động năng khiếu", sortOrder: 6 },
  { gradeGroup: "K2", category: "PHAM_CHAT", goalText: "Em biết kiềm chế cảm xúc giận dỗi, vâng lời Thầy Cô và giúp đỡ bạn học", actionPreset: "Hít thở sâu khi tức giận, lắng nghe lời Thầy Cô khuyên bảo", sortOrder: 7 },

  // Khối 3 (Học tập 50%, Kỹ năng 20%, Sức khỏe 10%, Sở thích 10%, Phẩm chất 10%)
  { gradeGroup: "K3", category: "HOC_TAP", goalText: "Em đạt kết quả tốt các môn Toán, Tiếng Việt và Tiếng Anh", actionPreset: "Học thuộc từ vựng Tiếng Anh mỗi ngày, làm thêm bài tập tư duy", sortOrder: 1 },
  { gradeGroup: "K3", category: "HOC_TAP", goalText: "Em tự giác hoàn thành bài tập về nhà đúng thời hạn mà không cần nhắc nhở", actionPreset: "Lập thời gian biểu học tập buổi tối từ 19h30 đến 20h30", sortOrder: 2 },
  { gradeGroup: "K3", category: "KY_NANG", goalText: "Em chủ động kết bạn, giao tiếp tự tin và tham gia làm việc nhóm hiệu quả", actionPreset: "Tôn trọng ý kiến bạn bè, phân công công việc rõ ràng", sortOrder: 3 },
  { gradeGroup: "K3", category: "KY_NANG", goalText: "Em học cách giải quyết vấn đề nhỏ và chủ động tìm kiếm sự giúp đỡ khi cần", actionPreset: "Bình tĩnh tìm cách tháo gỡ hoặc nhờ Thầy Cô cố vấn", sortOrder: 4 },
  { gradeGroup: "K3", category: "SUC_KHOE", goalText: "Em rèn luyện thể lực mỗi ngày, giữ gìn vệ sinh thân thể và ăn uống lành mạnh", actionPreset: "Uống đủ nước, tập thể dục buổi sáng và ngủ đúng giờ", sortOrder: 5 },
  { gradeGroup: "K3", category: "SO_THICH", goalText: "Em nuôi dưỡng đam mê khám phá thế giới qua sách báo và khoa học", actionPreset: "Mỗi tuần đọc 1 cuốn sách khám phá khoa học hoặc kỹ năng", sortOrder: 6 },
  { gradeGroup: "K3", category: "PHAM_CHAT", goalText: "Em trung thực trong học tập, đoàn kết và có trách nhiệm với tập thể", actionPreset: "Tự giác làm bài, tích cực tham gia các phong trào của lớp", sortOrder: 7 },

  // Khối 4 - 5 (Học tập 50%, Sức khỏe 20%, Sở thích 15%, Phẩm chất 15%)
  { gradeGroup: "K4_K5", category: "HOC_TAP", goalText: "Nâng cao năng lực tự học, đạt danh hiệu Học sinh Xuất sắc và hoàn thành tốt các kỳ thi", actionPreset: "Lập sổ tay ghi chép kiến thức trọng tâm, giải đề ôn tập tuần", sortOrder: 1 },
  { gradeGroup: "K4_K5", category: "HOC_TAP", goalText: "Nâng cao năng lực Tiếng Anh đạt chuẩn Cambridge Movers/Flyers", actionPreset: "Luyện nghe nói Tiếng Anh 20 phút mỗi ngày qua ứng dụng", sortOrder: 2 },
  { gradeGroup: "K4_K5", category: "SUC_KHOE", goalText: "Rèn luyện thể lực, tập thể thao đều đặn và cân bằng thời gian nghỉ ngơi", actionPreset: "Tham gia CLB thể thao nhà trường, chạy bộ hoặc bơi lội", sortOrder: 3 },
  { gradeGroup: "K4_K5", category: "SUC_KHOE", goalText: "Duy trì thói quen ăn uống khoa học, ngủ đủ giấc để chuẩn bị chuyển cấp", actionPreset: "Uống đủ 1.5L nước mỗi ngày, ngủ trước 22h00", sortOrder: 4 },
  { gradeGroup: "K4_K5", category: "SO_THICH", goalText: "Phát triển sở trường năng khiếu và kỹ năng sáng tạo khoa học STEM", actionPreset: "Tham gia dự án nghệ thuật, CLB Robotics hoặc ngoại khóa", sortOrder: 5 },
  { gradeGroup: "K4_K5", category: "PHAM_CHAT", goalText: "Rèn luyện lòng biết ơn, tinh thần trách nhiệm và sẵn sàng chuẩn bị chuyển cấp", actionPreset: "Giúp đỡ gia đình, chủ động chia sẻ và hỗ trợ bạn bè", sortOrder: 6 },

  // Khối 6 - 8 (Học tập 50%, Thói quen 15%, Kỹ năng cảm xúc 15%, Định hướng 20%)
  { gradeGroup: "K6_K8", category: "HOC_TAP", goalText: "Đạt Điểm Trung Bình Môn từ 8.5 trở lên, nâng cao trình độ Tiếng Anh học thuật", actionPreset: "Ôn tập theo phương pháp sơ đồ tư duy Mindmap, luyện đề định kỳ", sortOrder: 1 },
  { gradeGroup: "K6_K8", category: "HOC_TAP", goalText: "Chủ động phương pháp tự học và hoàn thành xuất sắc các dự án nghiên cứu liên môn", actionPreset: "Lập kế hoạch tuần, phân bổ thời gian đều đặn cho các bộ môn", sortOrder: 2 },
  { gradeGroup: "K6_K8", category: "THOI_QUEN", goalText: "Cân bằng giữa học tập, sinh hoạt cá nhân và sử dụng mạng xã hội thông minh", actionPreset: "Giới hạn thời gian dùng điện thoại dưới 1 giờ/ngày, đọc sách 30 phút", sortOrder: 3 },
  { gradeGroup: "K6_K8", category: "THOI_QUEN", goalText: "Rèn luyện tính kỷ luật tự giác, quản lý thời gian theo phương pháp Pomodoro", actionPreset: "Học tập tập trung từng đợt 25 phút, không để việc tồn đọng", sortOrder: 4 },
  { gradeGroup: "K6_K8", category: "KY_NANG_CAM_XUC", goalText: "Rèn luyện tư duy phản biện, kỹ năng thuyết trình và quản trị cảm xúc tích cực", actionPreset: "Tích cực tranh luận học thuật, hỗ trợ các thành viên trong nhóm", sortOrder: 5 },
  { gradeGroup: "K6_K8", category: "DINH_HUONG", goalText: "Khám phá thế mạnh bản thân, định hướng ngành nghề và chuẩn bị chọn tổ hợp môn", actionPreset: "Tham gia các buổi tham vấn hướng nghiệp và trải nghiệm thực tế", sortOrder: 6 },

  // Khối 9 - 12 (Học tập 50%, Thói quen 15%, Kỹ năng cảm xúc 15%, Định hướng 20%)
  { gradeGroup: "K9_K12", category: "HOC_TAP", goalText: "Thi đậu nguyện vọng 1 Trường THPT Chuyên / Đại học Top đầu với điểm số tối ưu", actionPreset: "Lập lộ trình ôn luyện chuyên sâu, làm bài thi thử theo tuần", sortOrder: 1 },
  { gradeGroup: "K9_K12", category: "HOC_TAP", goalText: "Chinh phục chứng chỉ ngoại ngữ quốc tế uy tín (IELTS 7.0+, SAT, AP)", actionPreset: "Luyện đề thi chuẩn hóa mỗi tuần và mở rộng bài đọc học thuật", sortOrder: 2 },
  { gradeGroup: "K9_K12", category: "THOI_QUEN", goalText: "Duy trì năng lượng tích cực, quản lý áp lực thi cử khoa học và nhịp sinh học", actionPreset: "Tập thể thao 30 phút, đảm bảo giấc ngủ phục hồi trí não", sortOrder: 3 },
  { gradeGroup: "K9_K12", category: "KY_NANG_CAM_XUC", goalText: "Xây dựng tư duy lãnh đạo, tinh thần trách nhiệm và bản lĩnh cá nhân vững vàng", actionPreset: "Đảm nhận vị trí Trưởng ban/Chủ nhiệm CLB dự án học đường", sortOrder: 4 },
  { gradeGroup: "K9_K12", category: "DINH_HUONG", goalText: "Hoàn thiện hồ sơ du học / xét tuyển Đại học và chuẩn bị hành trang tương lai", actionPreset: "Viết bài luận cá nhân, thi chứng chỉ IELTS/SAT và hoàn thiện hồ sơ ngoại khóa", sortOrder: 5 }
]

export function getPresetsForGradeGroup(gradeGroup: string): GoalPresetItem[] {
  const norm = String(gradeGroup || "").toUpperCase()
  let targetGroup = "K6_K8"
  if (norm === "K1" || norm === "1") targetGroup = "K1"
  else if (norm === "K2" || norm === "2") targetGroup = "K2"
  else if (norm === "K3" || norm === "3") targetGroup = "K3"
  else if (norm === "K4" || norm === "K5" || norm === "K4_K5" || norm === "4" || norm === "5") targetGroup = "K4_K5"
  else if (norm === "K6" || norm === "K7" || norm === "K8" || norm === "K6_K8" || norm === "6" || norm === "7" || norm === "8") targetGroup = "K6_K8"
  else if (norm === "K9" || norm === "K10" || norm === "K11" || norm === "K12" || norm === "K9_K12" || norm === "9" || norm === "10" || norm === "11" || norm === "12") targetGroup = "K9_K12"

  return DEFAULT_PRESETS.filter(p => p.gradeGroup === targetGroup)
}
