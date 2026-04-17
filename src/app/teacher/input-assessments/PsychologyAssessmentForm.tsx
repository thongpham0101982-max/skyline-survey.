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
        <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-900 border-x">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Profile Section */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:bg-indigo-100 transition-colors duration-700"></div>
                    <div className="relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-2xl ring-4 ring-white">
                            <User size={56} className="opacity-90" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                            <BrainCircuit size={20} />
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left relative">
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-3">
                            <span className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-xs font-bold tracking-widest border border-indigo-100 uppercase">
                                Grade {rawGrade || "N/A"}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 leading-tight">
                            {student?.fullName}
                        </h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-500 text-sm">
                            <span className="flex items-center gap-1.5 font-medium"><ClipboardCheck size={16} className="text-indigo-400"/> ID: {student?.studentCode}</span>
                            <span className="flex items-center gap-1.5 font-medium"><Sparkles size={16} className="text-amber-400"/> Đánh giá Năng lực Tâm lý</span>
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-3 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8">
                        <div className="text-center md:text-right">
                            <div className="text-4xl font-black text-indigo-600 mb-1">{totalScore}</div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Tổng điểm tích lũy</div>
                        </div>
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Tiến độ: {progress}%</div>
                    </div>
                </div>

                {/* Section Navigation */}
                <div className="flex flex-wrap gap-2 pb-2">
                    {sections.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSection(idx)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border ${
                                activeSection === idx
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-105"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                            }`}
                        >
                            {section.questions.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${activeSection === idx ? "bg-white" : "bg-indigo-400"}`}></span>
                                    {section.title}
                                </div>
                            ) : section.title}
                        </button>
                    ))}
                </div>

                {/* Question List */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[400px]">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm flex items-center gap-2">
                            <ChevronRight size={18} className="text-indigo-500" />
                            {sections[activeSection].title}
                        </h2>
                        <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-[10px] font-black text-indigo-600">
                            SCORE: {calculateSectionScore(activeSection)}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {currentQuestions.map((q, qIdx) => {
                            const actualIdx = currentOffset + qIdx
                            return (
                                <div key={qIdx} className="p-6 md:p-8 hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-4">
                                                <span className="text-slate-200 font-black text-4xl group-hover:text-indigo-100 transition-colors leading-none">
                                                    {(actualIdx + 1).toString().padStart(2, '0')}
                                                </span>
                                                <p className="text-slate-700 font-semibold text-lg pt-1 leading-relaxed">
                                                    {q.text}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 shrink-0 md:justify-end">
                                            {q.options.map((opt, oIdx) => (
                                                <button
                                                    key={oIdx}
                                                    disabled={isLocked}
                                                    onClick={() => {
                                                        const newScores = [...scores]
                                                        newScores[actualIdx] = oIdx + 1
                                                        setScores(newScores)
                                                    }}
                                                    className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 border-2 ${
                                                        scores[actualIdx] === oIdx + 1
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                                            : "bg-white text-slate-400 border-slate-100 hover:border-indigo-100 hover:text-indigo-600"
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Conclusion and Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 group">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-100 transition-colors duration-500 shadow-sm border border-amber-100">
                                <MessageSquare size={24} />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Kết luận chuyên môn</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={conclusion}
                            onChange={(e) => setConclusion(e.target.value)}
                            className="w-full min-h-[160px] p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all duration-300 text-slate-700 font-medium placeholder:text-slate-300 placeholder:italic"
                            placeholder="Nhập nhận định tổng quát về trạng thái tâm lý, cảm xúc của học sinh..."
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 group">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-100 transition-colors duration-500 shadow-sm border border-emerald-100">
                                <Info size={24} />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Kiến nghị hỗ trợ</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            className="w-full min-h-[160px] p-5 rounded-2xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 outline-none transition-all duration-300 text-slate-700 font-medium placeholder:text-slate-300 placeholder:italic"
                            placeholder="Gợi ý hướng can thiệp, hỗ trợ cho phụ huynh và giáo viên..."
                        ></textarea>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 py-6 border-t border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
                            <AlertCircle size={14} className="text-amber-500" />
                            Đánh giá dựa trên quan sát thực tế
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLocked}
                        className="group flex items-center justify-center gap-3 px-12 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:from-indigo-700 hover:to-indigo-800 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={20} className="group-hover:scale-110 transition-transform" />
                        )}
                        {isLocked ? "Form đã khóa" : "Lưu kết quả khảo sát"}
                        <ChevronRight size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                    </button>
                    {isLocked && (
                        <div className="flex items-center gap-3 text-red-600 bg-red-50 px-6 py-3 rounded-2xl border border-red-100 font-bold text-sm shadow-sm animate-pulse">
                            <AlertCircle size={20} />
                            Hồ sơ đã được khóa từ quản trị viên
                        </div>
                    )}
                </div>

                {/* Status Indicator Bar */}
                {progress === 100 && !isLocked && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-500 mt-4">
                        <CheckCircle2 className="text-emerald-500" size={24} />
                        <span className="text-emerald-700 font-bold text-sm tracking-wide">
                            Tất cả 20 tiêu chí đã được đánh giá hoàn tất! Sẵn sàng để lưu.
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
