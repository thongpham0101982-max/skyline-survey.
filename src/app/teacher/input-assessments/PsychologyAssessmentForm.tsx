"use client"

import React, { useState, useEffect } from "react"
import { ClipboardCheck, Sparkles, Save, Info, BrainCircuit, User, MessageSquare, AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react"

interface Question {
    text: string
    options: string[]
}

interface Section {
    title: string
    questions: Question[]
}

interface QuestionsData {
    [key: string]: Section[]
}

const questionsData: QuestionsData = {
    "1": [
        {
            title: "CẢM XÚC VÀ ĐIỀU HÒA CẢM XÚC",
            questions: [
                { text: "Khả năng nhận diện và gọi tên các cảm xúc cơ bản của bản thân.", options: ["Hiếm khi", "Đôi khi", "Thường xuyên"] },
                { text: "Thể hiện cảm xúc phù hợp với hoàn cảnh.", options: ["Cần nhắc nhở nhiều", "Cần nhắc nhở ít", "Tự giác thực hiện"] },
                { text: "Khả năng kiềm chế cơn giận hoặc sự thất vọng.", options: ["Dễ bùng nổ", "Đôi khi mất kiểm soát", "Kiểm soát tốt"] },
                { text: "Sự tự tin khi trình bày ý kiến trước lớp.", options: ["Rất rụt rè", "Cần động viên", "Tự tin"] }
            ]
        },
        {
            title: "HÀNH VI - KIỂM SOÁT BẢN THÂN",
            questions: [
                { text: "Tuân thủ các quy tắc trong lớp học.", options: ["Hay vi phạm", "Đôi khi nhắc nhở", "Chấp hành tốt"] },
                { text: "Khả năng chờ đợi đến lượt mình.", options: ["Rất thiếu kiên nhẫn", "Cần nhắc nhở", "Kiên nhẫn chờ"] },
                { text: "Thực hiện các nhiệm vụ cá nhân (chuẩn bị đồ dùng, dọn dẹp).", options: ["Cần hỗ trợ nhiều", "Đôi khi cần nhắc", "Chủ động thực hiện"] }
            ]
        },
        {
            title: "QUAN HỆ XÃ HỘI & TƯƠNG TÁC NHÓM",
            questions: [
                { text: "Khả năng kết bạn và làm quen với bạn mới.", options: ["Khép kín", "Cần thời gian", "Cởi mở, thân thiện"] },
                { text: "Chia sẻ đồ dùng, đồ chơi với bạn bè.", options: ["Ít chia sẻ", "Đôi khi chia sẻ", "Luôn sẵn lòng"] },
                { text: "Hợp tác trong các hoạt động nhóm.", options: ["Thường làm việc riêng", "Mức độ trung bình", "Hợp tác tích cực"] }
            ]
        },
        {
            title: "HỌC TẬP & KHẢ NĂNG TỰ ĐỊNH HƯỚNG/ CHÚ Ý",
            questions: [
                { text: "Mức độ tập trung trong giờ học (15-20 phút).", options: ["Hay xao nhãng", "Cần nhắc nhở", "Tập trung tốt"] },
                { text: "Lắng nghe và thực hiện theo hướng dẫn của giáo viên.", options: ["Hay quên lệnh", "Cần nhắc lại", "Thực hiện nhanh"] },
                { text: "Khả năng hoàn thành bài tập đúng hạn.", options: ["Thường xuyên trễ", "Xong nhưng cần nhắc", "Luôn đúng hạn"] },
                { text: "Sự tò mò, ham học hỏi kiến thức mới.", options: ["Thụ động", "Bình thường", "Rất ham học hỏi"] }
            ]
        },
        {
            title: "TỰ NHẬN THỨC & NGÔN NGỮ - GIẢI QUYẾT VẤN ĐỀ",
            questions: [
                { text: "Khả năng dùng ngôn ngữ để diễn đạt nhu cầu bản thân.", options: ["Hạn chế", "Đủ dùng", "Linh hoạt, rõ ràng"] },
                { text: "Sử dụng các từ ngữ lịch sự (cảm ơn, xin lỗi).", options: ["Cần nhắc nhở", "Đôi khi quên", "Đã thành thói quen"] },
                { text: "Biết tìm sự giúp đỡ từ người lớn khi gặp khó khăn.", options: ["Im lặng/Khóc", "Cần nhắc", "Chủ động hỏi"] }
            ]
        },
        {
            title: "ĐỘNG LỰC & ĐỊNH HƯỚNG TƯƠNG LAI",
            questions: [
                { text: "Hào hứng khi đến trường.", options: ["Sợ hãi/Khóc", "Bình thường", "Rất hào hứng"] },
                { text: "Thể hiện sở thích cá nhân rõ rệt.", options: ["Chưa rõ", "Bắt đầu bộc lộ", "Rất rõ ràng"] },
                { text: "Có ý thức giữ gìn sách vở, đồ dùng học tập.", options: ["Hay làm mất/hỏng", "Đôi khi nhắc nhở", "Gìn giữ cẩn thận"] }
            ]
        }
    ],
    "2": [
        {
            title: "CẢM XÚC VÀ ĐIỀU HÒA CẢM XÚC",
            questions: [
                { text: "Quan sát và nhận biết cảm xúc của người khác.", options: ["Ít quan tâm", "Nhận biết cơ bản", "Rất nhạy bén"] },
                { text: "Biết cách tự xoa dịu bản thân khi buồn bã.", options: ["Cần hỗ trợ nhiều", "Cần nhắc nhở", "Biết cách xử lý"] },
                { text: "Sự kiên trì khi đối mặt với bài tập khó.", options: ["Dễ bỏ cuộc", "Cần động viên", "Nỗ lực hoàn thành"] },
                { text: "Chấp nhận thất bại trong các trò chơi cạnh tranh.", options: ["Dễ tự ái/Giận dỗi", "Cần nhắc nhở", "Mạnh dạn chấp nhận"] }
            ]
        },
        {
            title: "HÀNH VI - KIỂM SOÁT BẢN THÂN",
            questions: [
                { text: "Tự giác thực hiện nội quy không cần nhắc nhở.", options: ["Luôn cần nhắc", "Đôi khi tự giác", "Rất tự giác"] },
                { text: "Quản lý thời gian trong giờ giải lao.", options: ["Hay vào lớp muộn", "Cần nhắc nhở", "Luôn đúng giờ"] },
                { text: "Ý thức bảo vệ môi trường (bỏ rác đúng nơi).", options: ["Hay quên", "Cần nhắc", "Tự giác"] }
            ]
        },
        {
            title: "QUAN HỆ XÃ HỘI & TƯƠNG TÁC NHÓM",
            questions: [
                { text: "Khả năng lắng nghe ý kiến của bạn bè.", options: ["Hay ngắt lời", "Lắng nghe một phần", "Lắng nghe tôn trọng"] },
                { text: "Giải quyết mâu thuẫn bằng lời nói thay vì hành động.", options: ["Dễ dùng tay chân", "Cần can thiệp", "Giải quyết tốt"] },
                { text: "Sẵn sàng giúp đỡ bạn bè trong học tập.", options: ["Ít khi", "Khi được yêu cầu", "Chủ động giúp đỡ"] }
            ]
        },
        {
            title: "HỌC TẬP & KHẢ NĂNG TỰ ĐỊNH HƯỚNG/ CHÚ Ý",
            questions: [
                { text: "Mức độ tập trung trong giờ học (20-25 phút).", options: ["Xao nhãng", "Ổn định", "Rất tập trung"] },
                { text: "Ghi chép bài đầy đủ và cẩn thận.", options: ["Thiếu/Sẩu đoảng", "Đủ nhưng chưa đẹp", "Rất cẩn thận"] },
                { text: "Khả năng làm việc độc lập theo hướng dẫn.", options: ["Luôn hỏi lại", "Cần hỗ trợ ít", "Làm tốt một mình"] },
                { text: "Biết cách sắp xếp góc học tập cá nhân.", options: ["Bừa bộn", "Trung bình", "Ngăn nắp"] }
            ]
        },
        {
            title: "TỰ NHẬN THỨC & NGÔN NGỮ - GIẢI QUYẾT VẤN ĐỀ",
            questions: [
                { text: "Khả năng kể lại một câu chuyện rõ ràng mạch lạc.", options: ["Ngập ngừng", "Đủ ý", "Rất lôi cuốn"] },
                { text: "Sử dụng vốn từ đa dạng trong giao tiếp.", options: ["Hạn chế", "Bình thường", "Phong phú"] },
                { text: "Biết tự đưa ra giải pháp cho các tình huống đơn giản.", options: ["Chờ đợi", "Gợi ý mới làm", "Chủ động giải quyết"] }
            ]
        },
        {
            title: "ĐỘNG LỰC & ĐỊNH HƯỚNG TƯƠNG LAI",
            questions: [
                { text: "Tham gia các hoạt động ngoại khóa tích cực.", options: ["Ít tham gia", "Tham gia đủ", "Dẫn dắt phong trào"] },
                { text: "Có mục tiêu học tập ngắn hạn rõ ràng.", options: ["Chưa có", "Sơ sài", "Rõ ràng"] },
                { text: "Thể hiện trách nhiệm với các công việc được giao.", options: ["Hay quên", "Hoàn thành đủ", "Rất trách nhiệm"] }
            ]
        }
    ],
    "3": [
         {
            title: "CẢM XÚC VÀ ĐIỀU HÒA CẢM XÚC",
            questions: [
                { text: "Khả năng thấu cảm với hoàn cảnh của người khác.", options: ["Vô tâm", "Có biểu hiện", "Rất giàu cảm xúc"] },
                { text: "Kiểm soát cảm xúc trong các tình huống áp lực.", options: ["Lo lắng thái quá", "Hồi hộp nhẹ", "Bình tĩnh"] },
                { text: "Sự trung thực trong thi cử và sinh hoạt.", options: ["Cần giám sát", "Đôi khi nhắc nhở", "Luôn trung thực"] },
                { text: "Sẵn sàng đón nhận các thử thách mới.", options: ["Ngại ngần", "Cần khích lệ", "Rất chủ động"] }
            ]
        },
        {
            title: "HÀNH VI - KIỂM SOÁT BẢN THÂN",
            questions: [
                { text: "Quản lý cảm xúc khi bị phê bình.", options: ["Phản ứng tiêu cực", "Im lặng", "Tiếp thu cầu tiến"] },
                { text: "Tuân thủ luật chơi và tinh thần đồng đội.", options: ["Cá nhân", "Đôi khi nhắc nhở", "Fair-play"] },
                { text: "Ý thức bảo vệ của công và tài sản chung.", options: ["Thiếu giữ gìn", "Bình thường", "Giữ gìn tốt"] }
            ]
        },
        {
            title: "QUAN HỆ XÃ HỘI & TƯƠNG TÁC NHÓM",
            questions: [
                { text: "Kỹ năng làm việc nhóm và phân công nhiệm vụ.", options: ["Lúng túng", "Hỗ trợ tốt", "Khả năng lãnh đạo"] },
                { text: "Thể hiện thái độ tôn trọng với người lớn tuổi.", options: ["Cần nhắc nhở", "Lễ phép", "Rất mực chuẩn mực"] },
                { text: "Khả năng khích lệ bạn bè cùng tiến bộ.", options: ["Chỉ lo mình", "Đôi khi", "Thường xuyên giúp đỡ"] }
            ]
        },
        {
            title: "HỌC TẬP & KHẢ NĂNG TỰ ĐỊNH HƯỚNG/ CHÚ Ý",
            questions: [
                { text: "Khả năng tự nghiên cứu bài học trước khi đến lớp.", options: ["Không thực hiện", "Đôi khi", "Thói quen tốt"] },
                { text: "Tập trung cao độ trong các giờ học lý thuyết.", options: ["Hay mơ mộng", "Ổn định", "Rất tập trung"] },
                { text: "Biết cách đặt câu hỏi phản biện mở rộng vấn đề.", options: ["Không bao giờ", "Đôi khi hỏi", "Hỏi rất hay"] },
                { text: "Tốc độ hoàn thành các nhiệm vụ phức tạp.", options: ["Rất chậm", "Bình thường", "Nhanh và chính xác"] }
            ]
        },
        {
            title: "TỰ NHẬN THỨC & NGÔN NGỮ - GIẢI QUYẾT VẤN ĐỀ",
            questions: [
                { text: "Trình bày luận điểm một cách logic.", options: ["Lộn xộn", "Đủ ý", "Sắc sảo"] },
                { text: "Khả năng thuyết trình trước đám đông.", options: ["Rụt rè", "Khá tốt", "Rất tự tin"] },
                { text: "Xử lý linh hoạt các tình huống bất ngờ.", options: ["Hoảng hốt", "Lúng túng nhẹ", "Xử lý thông minh"] }
            ]
        },
        {
            title: "ĐỘNG LỰC & ĐỊNH HƯỚNG TƯƠNG LAI",
            questions: [
                { text: "Tự lập trong việc xây dựng thời khóa biểu.", options: ["Bố mẹ làm hộ", "Gợi ý mới làm", "Tự thực hiện"] },
                { text: "Có biểu hiện về năng khiếu đặc biệt (Nhạc, Họa, Thể thao).", options: ["Chưa thấy", "Có tiềm năng", "Vượt trội"] },
                { text: "Mong muốn đóng góp cho cộng đồng lớp học.", options: ["Thụ động", "Nhiệt tình", "Gương mẫu"] }
            ]
        }
    ],
    "4": [
        {
            title: "CẢM XÚC VÀ ĐIỀU HÒA CẢM XÚC",
            questions: [
                { text: "Quản lý cảm xúc trước những thay đổi tâm sinh lý sớm.", options: ["Rất hoang mang", "Cần tư vấn", "Thích nghi tốt"] },
                { text: "Khả năng tự tạo động lực cho bản thân.", options: ["Cần ép buộc", "Cần nhắc nhở", "Tự giác cao"] },
                { text: "Thái độ tích cực với các môn học khó.", options: ["Chán nản", "Cố gắng", "Kiên trì chinh phục"] },
                { text: "Khả năng phục hồi sau những thất bại nhỏ.", options: ["Ủ rũ lâu", "Cần an ủi", "Mạnh mẽ vượt qua"] }
            ]
        },
        {
            title: "HÀNH VI - KIỂM SOÁT BẢN THÂN",
            questions: [
                { text: "Kiểm soát thời gian sử dụng thiết bị điện tử.", options: ["Nghiện nặng", "Cần giám sát", "Sử dụng thông minh"] },
                { text: "Sự cẩn trọng trong các quyết định cá nhân.", options: ["Hấp tấp", "Đôi khi sai sót", "Chắc chắn"] },
                { text: "Thực hiện kỷ luật tự giác cao.", options: ["Đối phó", "Bình thường", "Rất nghiêm túc"] }
            ]
        },
        {
            title: "QUAN HỆ XÃ HỘI & TƯƠNG TÁC NHÓM",
            questions: [
                { text: "Kỹ năng thương lượng và thỏa hiệp lành mạnh.", options: ["Cố chấp", "Biết lắng nghe", "Thuyết phục tốt"] },
                { text: "Xây dựng hình ảnh cá nhân uy tín với bạn bè.", options: ["Chưa tốt", "Được tin tưởng", "Rất có uy tín"] },
                { text: "Khả năng làm việc với nhiều nhóm đối tượng khác nhau.", options: ["Kén chọn", "Hòa đồng", "Thích nghi nhanh"] }
            ]
        },
        {
            title: "HỌC TẬP & KHẢ NĂNG TỰ ĐỊNH HƯỚNG/ CHÚ Ý",
            questions: [
                { text: "Khả năng ghi chú theo sơ đồ tư duy.", options: ["Chưa biết cách", "Đang tập làm", "Thành thạo"] },
                { text: "Mức độ chuyên tâm khi làm dự án kéo dài 1-2 tuần.", options: ["Bỏ dở", "Làm cho xong", "Hoàn thành xuất sắc"] },
                { text: "Biết tìm kiếm và chọn lọc thông tin trên Internet.", options: ["Dễ lạc lối", "Cần hướng dẫn", "Kỹ năng tốt"] },
                { text: "Tư duy giải quyết vấn đề đa chiều.", options: ["Phiến diện", "Có nỗ lực", "Rất sáng tạo"] }
            ]
        },
        {
            title: "TỰ NHẬN THỨC & NGÔN NGỮ - GIẢI QUYẾT VẤN ĐỀ",
            questions: [
                { text: "Khả năng tranh luận văn minh về một chủ đề xã hội.", options: ["Dễ nóng nảy", "Đủ ý", "Sắc bén, thuyết phục"] },
                { text: "Tự viết lách/sáng tạo nội dung có chiều sâu.", options: ["Hạn chế", "Khá tốt", "Rất ấn tượng"] },
                { text: "Chủ động đề xuất các hoạt động đổi mới cho lớp.", options: ["Im lặng", "Hưởng ứng", "Khởi xướng"] }
            ]
        },
        {
            title: "ĐỘNG LỰC & ĐỊNH HƯỚNG TƯƠNG LAI",
            questions: [
                { text: "Có ước mơ nghề nghiệp và ý thức tìm hiểu.", options: ["Mơ hồ", "Có suy nghĩ", "Tìm hiểu nghiêm túc"] },
                { text: "Khả năng tự quản lý tài chính cá nhân (tiền tiêu vặt).", options: ["Hoang phí", "Biết cân đối", "Tiết kiệm tốt"] },
                { text: "Lòng tự trọng và ý thức bảo vệ danh dự bản thân.", options: ["Thấp", "Bình thường", "Cao"] }
            ]
        }
    ],
    "5": [
        {
            title: "CẢM XÚC VÀ ĐIỀU HÒA CẢM XÚC",
            questions: [
                { text: "Sẵn sàng tâm thế cho việc chuyển cấp lên THCS.", options: ["Lo lắng, sợ hãi", "Hơi lo âu", "Tự tin, sẵn sàng"] },
                { text: "Khả năng điều tiết cảm xúc khi gặp áp lực thi cử.", options: ["Rất áp lực", "Căng thẳng nhẹ", "Tâm lý vững vàng"] },
                { text: "Nhận thức rõ điểm mạnh và điểm yếu của bản thân.", options: ["Chưa định hình", "Biết cơ bản", "Hiểu rất rõ"] },
                { text: "Xây dựng được các mối quan hệ bạn bè bền vững.", options: ["Hay mâu thuẫn", "Hòa đồng", "Gắn kết sâu sắc"] }
            ]
        },
        {
            title: "HÀNH VI - KIỂM SOÁT BẢN THÂN",
            questions: [
                { text: "Làm chủ hành vi trên môi trường mạng xã hội.", options: ["Chưa biết cách", "Cần nhắc nhở", "Rất văn minh"] },
                { text: "Sự điềm tĩnh khi đối mặt với các tin đồn.", options: ["Dễ bị kích động", "Hơi ảnh hưởng", "Bản lĩnh"] },
                { text: "Xây dựng và tuân thủ lối sống lành mạnh.", options: ["Thụ động", "Có cố gắng", "Rất khoa học"] }
            ]
        },
        {
            title: "QUAN HỆ XÃ HỘI & TƯƠNG TÁC NHÓM",
            questions: [
                { text: "Khả năng lãnh đạo và truyền cảm hứng cho bạn bè.", options: ["Thụ động", "Cán bộ lớp tốt", "Tầm ảnh hưởng lớn"] },
                { text: "Tư duy cộng đồng và lòng trắc ẩn.", options: ["Ít quan tâm", "Biết sẻ chia", "Trái tim nhân hậu"] },
                { text: "Kỹ năng thuyết phục và làm việc với cấp trên.", options: ["Lúng túng", "Khá tự tin", "Giao tiếp chuẩn mực"] }
            ]
        },
        {
            title: "HỌC TẬP & KHẢ NĂNG TỰ ĐỊNH HƯỚNG/ CHÚ Ý",
            questions: [
                { text: "Khả năng tự tổng hợp kiến thức từ nhiều nguồn.", options: ["Phụ thuộc SGK", "Biết tìm tòi", "Năng lực tự học cao"] },
                { text: "Kỹ năng quản lý thời gian và dự án cá nhân.", options: ["Nước đến chân", "Xong việc", "Rất chuyên nghiệp"] },
                { text: "Tư duy sáng tạo trong ứng dụng thực tiễn.", options: ["Máy móc", "Khá tốt", "Rất độc đáo"] },
                { text: "Mức độ kiên trì với các mục tiêu dài hạn.", options: ["Mau chán", "Trung bình", "Bền bỉ"] }
            ]
        },
        {
            title: "TỰ NHẬN THỨC & NGÔN NGỮ - GIẢI QUYẾT VẤN ĐỀ",
            questions: [
                { text: "Khả năng hùng biện và bảo vệ quan điểm cá nhân.", options: ["Thiếu tự tin", "Thuyết phục", "Rất xuất sắc"] },
                { text: "Ngôn ngữ cơ thể linh hoạt khi giao tiếp.", options: ["Cứng nhắc", "Khá ổn", "Rất lôi cuốn"] },
                { text: "Khả năng phân tích tình huống phức tạp.", options: ["Chậm", "Đủ ý", "Sâu sắc"] }
            ]
        },
        {
            title: "ĐỘNG LỰC & ĐỊNH HƯỚNG TƯƠNG LAI",
            questions: [
                { text: "Định hướng rõ ràng về trường THCS mong muốn.", options: ["Chưa biết", "Có vài hướng", "Rất quyết tâm"] },
                { text: "Ý thức về trách nhiệm của người anh/chị lớn trong trường.", options: ["Chưa có", "Cố gắng làm gương", "Tấm gương sáng"] },
                { text: "Sự chuẩn bị kỹ lưỡng cho hành trình mới.", options: ["Bỏ ngỏ", "Hơi sẵn sàng", "Rất chủ động"] }
            ]
        }
    ]
}

const defaultQuestions = [
    {
        title: "TỔNG QUAN TÂM LÝ & HÀNH VI (Dành cho mọi khối lớp)",
        questions: [
            { text: "Tinh thần thái độ khi bắt đầu khảo sát.", options: ["Rụt rè", "Bình thường", "Rất hào hứng"] },
            { text: "Mức độ tập trung trong suốt quá trình.", options: ["Dễ sao nhãng", "Tập trung trung bình", "Rất tập trung"] },
            { text: "Khả năng tương tác với giáo viên khảo sát.", options: ["Hạn chế", "Tạm được", "Linh hoạt, cởi mở"] },
            { text: "Sự tự lập khi thực hiện nhiệm vụ.", options: ["Cần nhắc nhở nhiều", "Cần nhắc nhở ít", "Hoàn toàn tự lập"] },
            { text: "Khả năng kiểm soát cảm xúc khi gặp thử thách.", options: ["Dễ nản chí", "Cần động viên", "Kiên trì nỗ lực"] }
        ]
    }
]

export default function PsychologyAssessmentForm({ student, onSave, isLocked }: any) {
    const rawGrade = student?.grade || ""
    const currentGrade = ["1", "2", "3", "4", "5"].includes(rawGrade) ? rawGrade : "default"
    const sections = questionsData[currentGrade] || defaultQuestions

    const [scores, setScores] = useState<number[]>(Array(20).fill(1))
    const [notes, setNotes] = useState<string[]>(Array(20).fill(""))
    const [conclusion, setConclusion] = useState("")
    const [recommendation, setRecommendation] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [activeSection, setActiveSection] = useState(0)

    useEffect(() => {
        const scoreData = student?.scores?.find((sc: any) => sc.subject?.code === 'TLY')
        if (scoreData) {
            try {
                const parsedScores = JSON.parse(scoreData.scores || "[]")
                // In the new system, we store 7 results (6 sections + total) at index 0-6
                // and 20 raw items at index 7-26
                if (parsedScores.length >= 27) {
                    setScores(parsedScores.slice(7, 27).map(Number))
                } else if (parsedScores.length === 20) {
                    // Legacy support
                    setScores(parsedScores.map(Number))
                }
                
                const parsedComments = JSON.parse(scoreData.comments || "[]")
                if (parsedComments.length >= 2) {
                    setConclusion(parsedComments[0] || "")
                    setRecommendation(parsedComments[1] || "")
                }
            } catch (e) {
                console.error("Error parsing psychology scores", e)
            }
        }
    }, [student])

    const calculateSectionScore = (sectionIdx: number) => {
        let questionOffset = 0
        for (let i = 0; i < sectionIdx; i++) {
            questionOffset += sections[i].questions.length
        }
        const sectionQuestions = sections[sectionIdx].questions
        const sectionTotal = scores.slice(questionOffset, questionOffset + sectionQuestions.length).reduce((a, b) => a + b, 0)
        return sectionTotal
    }

    const totalScore = scores.reduce((a, b) => a + b, 0)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Reorder for Admin Report: 
            // 0-5: Sections, 6: TOTAL, 7-26: Raw Questions
            const sectionScores = sections.map((_, i) => calculateSectionScore(i))
            const finalScores = [...sectionScores, totalScore, ...scores]
            
            // Map comments to the expected array structure: [Conclusion, Recommendation]
            const finalComments = [conclusion, recommendation]
            
            await onSave(student, finalScores, finalComments)
            alert("Lưu kết quả Tâm lý thành công!")
        } catch (e) {
            alert("Lỗi khi lưu kết quả.")
        } finally {
            setIsSaving(false)
        }
    }

    const currentQuestions = sections[activeSection].questions
    let currentOffset = 0
    for (let i = 0; i < activeSection; i++) {
        currentOffset += sections[i].questions.length
    }

    const progress = Math.round((scores.filter(s => s > 0).length / 20) * 100)

    return (
        <div className="bg-slate-50 min-h-screen p-3 md:p-6 font-sans text-slate-900 border-x">
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Header Profile Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-5 items-center relative overflow-hidden">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                        <User size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex justify-center md:justify-start gap-2 items-center mb-1">
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold border border-indigo-200">Khối {rawGrade || "N/A"}</span>
                            <span className="text-slate-500 text-xs font-medium">ID: {student?.studentCode}</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">{student?.fullName}</h1>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full"><Sparkles size={12} className="text-amber-500"/> Phiếu đánh giá Tâm lý</span>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-1 mt-2 md:mt-0">
                        <div className="text-3xl font-black text-indigo-600 flex items-baseline gap-1">
                            {totalScore} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Điểm</span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tiến độ: {progress}%</div>
                    </div>
                </div>

                {/* Section Navigation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 overflow-x-auto custom-scrollbar flex gap-2">
                    {sections.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSection(idx)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${
                                activeSection === idx
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSection === idx ? "bg-indigo-500" : "bg-slate-300"}`}></span>
                                {section.title}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Question List (Compact Layout) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <ChevronRight size={16} className="text-indigo-500" />
                            {sections[activeSection].title}
                        </h2>
                        <div className="bg-indigo-100 px-3 py-1 rounded-md text-[11px] font-bold text-indigo-700">
                            Điểm phần này: {calculateSectionScore(activeSection)}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {currentQuestions.map((q, qIdx) => {
                            const actualIdx = currentOffset + qIdx
                            return (
                                <div key={qIdx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-center p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                    <div className="lg:col-span-5 xl:col-span-6 flex items-start gap-3">
                                        <span className="text-slate-400 font-bold text-sm w-5 shrink-0 mt-0.5">{actualIdx + 1}.</span>
                                        <span className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">{q.text}</span>
                                    </div>
                                    <div className="lg:col-span-7 xl:col-span-6 flex gap-2 w-full ml-8 lg:ml-0">
                                        {q.options.map((opt, oIdx) => (
                                            <button
                                                key={oIdx}
                                                disabled={isLocked}
                                                onClick={() => {
                                                    const newScores = [...scores]
                                                    newScores[actualIdx] = oIdx + 1
                                                    setScores(newScores)
                                                }}
                                                className={`flex-1 py-2.5 px-2 text-[11px] md:text-xs font-bold rounded-lg border transition-all ${
                                                    scores[actualIdx] === oIdx + 1
                                                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30"
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Conclusion and Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-amber-500" />
                            <h3 className="font-bold text-slate-800 text-sm">Kết luận chuyên môn</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={conclusion}
                            onChange={(e) => setConclusion(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none transition-all text-sm text-slate-700 resize-y"
                            placeholder="Nhận định tổng quát..."
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={18} className="text-emerald-500" />
                            <h3 className="font-bold text-slate-800 text-sm">Kiến nghị hỗ trợ</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 outline-none transition-all text-sm text-slate-700 resize-y"
                            placeholder="Gợi ý can thiệp, hỗ trợ..."
                        ></textarea>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <AlertCircle size={14} className="text-indigo-500" />
                        Lưu ý kiểm tra kỹ trước khi Xác nhận
                    </div>
                    
                    {progress === 100 && !isLocked && (
                        <div className="hidden md:flex text-emerald-600 text-xs font-bold items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 size={14} /> Hoàn tất đánh giá
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLocked}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={16} />
                        )}
                        {isLocked ? "Form đã khóa" : "Lưu Kết Quả"}
                    </button>
                </div>
            </div>
        </div>
    )
}
