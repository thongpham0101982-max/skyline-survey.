export interface Question {
    text: string
    options: string[]
}

export interface Section {
    title: string
    questions: Question[]
}

export interface QuestionsData {
    [key: string]: Section[]
}

export const scaleOptions = ["0", "1", "2", "3", "4"]

export const grades2to5Questions: Section[] = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi bị điểm kém hoặc bị giáo viên nhắc nhở, con thường phản ứng như thế nào?", options: scaleOptions },
            { text: "2. Khi con và bạn có chuyện không vui (tranh giành đồ chơi, xích mích), con thường xử lý như thế nào?", options: scaleOptions },
            { text: "3. Khi bị từ chối hoặc không được chọn trong trò chơi, con cảm thấy thế nào?", options: scaleOptions },
            { text: "4. Trước giờ kiểm tra hoặc khi gặp một việc khó khăn, cảm xúc của con thường thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi & tự kiểm soát (3 mục)",
        questions: [
            { text: "5. Khi cô dặn phải ngồi yên hoặc chờ đến lượt, con làm thế nào?", options: scaleOptions },
            { text: "6. Trong lớp, khi nhiều điều khiển con chú ý, con thường phản ứng thế nào?", options: scaleOptions },
            { text: "7. Khi con cảm thấy bực hoặc tức giận, con thường làm gì để bình tĩnh lại?", options: scaleOptions }
        ]
    },
    {
        title: "III. Giao tiếp & tương tác xã hội (3 mục)",
        questions: [
            { text: "8. Khi gặp bạn mới, con làm gì để làm quen?", options: scaleOptions },
            { text: "9. Khi chơi cùng bạn, con thường chia sẻ hoặc hợp tác như thế nào?", options: scaleOptions },
            { text: "10. Khi con bị bạn trêu chọc hoặc bị hiểu lầm, con sẽ làm gì?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Chú ý & kỹ năng học tập nền (4 mục)",
        questions: [
            { text: "11. Khi cô hướng dẫn nhiều bước, con thường ghi nhớ và làm như thế nào?", options: scaleOptions },
            { text: "12. Khi nghe cô kể chuyện hoặc giảng bài, con nhớ lại điều gì sau đó?", options: scaleOptions },
            { text: "13. Khi làm bài tập, con bắt đầu và hoàn thành như thế nào?", options: scaleOptions },
            { text: "14. Khi trong lớp có tiếng ồn hoặc người khác làm việc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "V. Ngôn ngữ - tư duy - giải quyết vấn đề (3 mục)",
        questions: [
            { text: "15. Khi nhìn thấy các đồ vật học tập, con nghĩ mỗi món dùng để làm gì?", options: scaleOptions },
            { text: "16. Khi gặp tình huống thực tế (ví dụ: làm rơi đồ, bị bạn hiểu lầm), con thường làm gì?", options: scaleOptions },
            { text: "17. Khi xảy ra việc bất ngờ, con nghĩ ra cách giải quyết như thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực học tập & thái độ trường học (3 mục)",
        questions: [
            { text: "18. Khi đến trường, điều gì khiến con cảm thấy vui nhất?", options: scaleOptions },
            { text: "19. Khi cô giao bài, con thường bắt đầu như thế nào?", options: scaleOptions },
            { text: "20. Khi con gặp bài khó, con làm gì để vượt qua?", options: scaleOptions }
        ]
    }
]

export const grade1Questions: Section[] = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi thua trong trò chơi, con phản ứng thế nào?", options: scaleOptions },
            { text: "2. Khi rời cha mẹ vào lớp, con có dễ thích nghi không?", options: scaleOptions },
            { text: "3. Khi bị cô nhắc nhở, con phản ứng thế nào?", options: scaleOptions },
            { text: "4. Khi bạn trêu chọc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi & tự kiểm soát (3 mục)",
        questions: [
            { text: "5. Khi thầy/cô nói 'Ngồi yên nào', con có làm theo không?", options: scaleOptions },
            { text: "6. Con có hay chen ngang hoặc nói leo khi thầy/cô đang nói không?", options: scaleOptions },
            { text: "7. Con có thể ngồi tập trung làm một việc trong bao lâu?", options: scaleOptions }
        ]
    },
    {
        title: "III. Giao tiếp & tương tác xã hội (3 mục)",
        questions: [
            { text: "8. Khi gặp bạn mới, con có dễ bắt chuyện không?", options: scaleOptions },
            { text: "9. Con có biết chia sẻ đồ chơi, hợp tác trong trò chơi không?", options: scaleOptions },
            { text: "10. Khi bị bạn làm sai hoặc trêu chọc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Chú ý & kỹ năng học tập nền (4 mục)",
        questions: [
            { text: "11. Khi nghe hướng dẫn gồm 2 việc ('Lấy bút và ngồi xuống'), con làm được không?", options: scaleOptions },
            { text: "12. Khi nghe kể chuyện ngắn, con nhớ lại chi tiết được không?", options: scaleOptions },
            { text: "13. Khi làm bài, con có làm vội, chưa nghe xong đã làm không?", options: scaleOptions },
            { text: "14. Khi làm việc, con có bị sao nhãng bởi tiếng động hoặc bạn khác không?", options: scaleOptions }
        ]
    },
    {
        title: "V. Ngôn ngữ & tư duy (3 mục)",
        questions: [
            { text: "15. Khi được hỏi 'Cái nào dùng để viết: kéo hay bút?', con trả lời...", options: scaleOptions },
            { text: "16. Khi hỏi 'Con mèo khác con chó ở điểm nào?', con trả lời...", options: scaleOptions },
            { text: "17. Giáo viên đặt tình huống giả định, con có xử lý được không? (Ví dụ: Khi đi ra ngoài mà trời mưa/ nắng thì mình cần làm gì để khỏi bị nắng nóng/bị ướt? Khi bị bạn giật đồ chơi hoặc xô ngã thì con làm gì?).", options: scaleOptions }
        ]
    },
    {
        title: "VI. Thái độ & động lực học tập (3 mục)",
        questions: [
            { text: "18. Con có thích đến trường không?", options: scaleOptions },
            { text: "19. Khi thầy/cô giao bài, con phản ứng thế nào?", options: scaleOptions },
            { text: "20. Khi gặp bài khó, con xử lý thế nào?", options: scaleOptions }
        ]
    }
]

export const grades6to9Questions: Section[] = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi gặp áp lực học tập (thi, kiểm tra), em cảm thấy thế nào?", options: scaleOptions },
            { text: "2. Khi bị cô/thầy phê bình trước lớp, em phản ứng ra sao?", options: scaleOptions },
            { text: "3. Gần đây, có khi nào em cảm thấy buồn chán hoặc không muốn làm gì mà không rõ lý do không? Hãy kể cô/thầy nghe.", options: scaleOptions },
            { text: "4. Khi em tức giận hoặc thất vọng, em thường làm gì để bình tĩnh lại?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi – kiểm soát bản thân (3 mục)",
        questions: [
            { text: "5. Khi không có cô/thầy trong lớp, em thường cư xử như thế nào với các bạn?", options: scaleOptions },
            { text: "6. Khi có xung đột hay bất đồng với người khác, em thường làm gì đầu tiên?", options: scaleOptions },
            { text: "7. Khi có bài tập hoặc việc được giao mà em không thích, em thường phản ứng như thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "III. Quan hệ xã hội & tương tác nhóm (3 mục)",
        questions: [
            { text: "8. Trong lớp, em cảm thấy các bạn đối xử với nhau như thế nào? Mọi người có thân thiện không?", options: scaleOptions },
            { text: "9. Khi em và bạn có hiểu lầm, em thường làm gì để giải quyết vấn đề đó?", options: scaleOptions },
            { text: "10. Gần đây em có cảm thấy căng thẳng, bực mình hoặc hay xung đột với bạn bè, thầy cô hay cha mẹ không? Em thường phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Học tập & chú ý (4 mục)",
        questions: [
            { text: "11. Khi học bài hoặc nghe giảng, em có dễ tập trung không? Điều gì khiến em dễ mất tập trung?", options: scaleOptions },
            { text: "12. Khi gặp một bài tập khó, em thường làm gì? Em mặc kệ hay tự tìm hiểu, nhờ sự giúp đỡ của người khác?", options: scaleOptions },
            { text: "13. Em có thường xuyên hoàn thành bài tập đúng thời hạn không? Nguyên nhân nào khiến em không nộp bài đúng thời hạn?", options: scaleOptions },
            { text: "14. Trong giờ học, có khi nào em thấy mình hay mơ màng hoặc làm việc riêng không? Khi đó, em nghĩ gì?", options: scaleOptions }
        ]
    },
    {
        title: "V. Tự nhận thức & hình ảnh bản thân (3 mục)",
        questions: [
            { text: "15. Em cảm thấy thế nào về bản thân mình trong học tập cũng như trong cuộc sống hằng ngày?", options: scaleOptions },
            { text: "16. Khi nhìn thấy bạn học giỏi hơn, đẹp hơn hoặc chơi thể thao giỏi hơn, em thường nghĩ gì về bản thân?", options: scaleOptions },
            { text: "17. Khi mắc lỗi, em có dám nhận và sửa lỗi, hay thường che giấu hoặc né tránh?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực & định hướng học tập (3 mục)",
        questions: [
            { text: "18. Em có đặt ra mục tiêu cho việc học hoặc tương lai của mình không? Mục tiêu đó là gì?", options: scaleOptions },
            { text: "19. Khi gặp khó khăn trong học tập, em thường làm gì? Có cố gắng tiếp tục hay dễ bỏ cuộc?", options: scaleOptions },
            { text: "20. Mỗi sáng đến trường, em cảm thấy thế nào? Có điều gì khiến em vui hay không thích đến lớp?", options: scaleOptions }
        ]
    }
]

export const grades10to12Questions: Section[] = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi đối diện với kỳ thi hoặc áp lực học tập, em cảm thấy thế nào?", options: scaleOptions },
            { text: "2. Khi gặp thất bại (thi điểm thấp, không đạt kỳ vọng), em phản ứng thế nào?", options: scaleOptions },
            { text: "3. Có khi nào em cảm thấy buồn, trống rỗng hoặc không còn hứng thú với mọi thứ xung quanh không? Khi đó, em thường làm gì?", options: scaleOptions },
            { text: "4. Khi em tức giận hoặc căng thẳng, em thường làm gì để giúp mình bình tĩnh trở lại?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi – kiểm soát bản thân (3 mục)",
        questions: [
            { text: "5. Em thường duy trì thói quen học tập và sinh hoạt hằng ngày như thế nào? Có điều gì khiến em dễ bị xáo trộn không?", options: scaleOptions },
            { text: "6. Khi cảm thấy bực tức hoặc bị hiểu lầm, em thường phản ứng ra sao? Có khi nào em nổi nóng, cãi lại hoặc bỏ đi không?", options: scaleOptions },
            { text: "7. Khi em mắc lỗi, em thường làm gì? Em có dám nhận trách nhiệm và tìm cách sửa lỗi không?", options: scaleOptions }
        ]
    },
    {
        title: "III. Quan hệ xã hội & tương tác nhóm (3 mục)",
        questions: [
            { text: "8. Trong lớp và ở nhà, em cảm thấy mọi người – bạn bè, thầy cô, cha mẹ – có lắng nghe và tôn trọng ý kiến của em không?", options: scaleOptions },
            { text: "9. Khi có mâu thuẫn hoặc bất đồng, em thường chọn cách nào để giải quyết? (Nói chuyện, im lặng, tránh né, hay phản ứng mạnh?)", options: scaleOptions },
            { text: "10. Có khi nào em cảm thấy bị hiểu lầm, bị cô lập hoặc không thuộc về nhóm nào ở trường không? Em làm gì trong những tình huống đó?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Học tập & khả năng tự định hướng (4 mục)",
        questions: [
            { text: "11. Em có xác định được mục tiêu học tập hoặc hướng phát triển cho bản thân trong giai đoạn này không? Mục tiêu và hướng phát triển đó là gì?", options: scaleOptions },
            { text: "12. Khi cảm thấy mệt mỏi hoặc chán học, em thường làm gì để lấy lại động lực?", options: scaleOptions },
            { text: "13. Khi gặp bài khó hoặc vấn đề trong học tập, em thường giải quyết bằng cách nào? (Tự tìm hiểu, hỏi người khác hay bỏ qua?)", options: scaleOptions },
            { text: "14. Một ngày của em thường được sắp xếp ra sao giữa học, nghỉ ngơi và giải trí? Em có cảm thấy cân bằng không?", options: scaleOptions }
        ]
    },
    {
        title: "V. Tự nhận thức & hình ảnh bản thân (3 mục)",
        questions: [
            { text: "15. Em cảm thấy thế nào về bản thân mình – về năng lực, tính cách, và ngoại hình?", options: scaleOptions },
            { text: "16. Khi nhìn thấy người khác giỏi hơn, thành công hơn, em thường nghĩ gì về bản thân mình?", options: scaleOptions },
            { text: "17. Em có hiểu rõ điểm mạnh và điểm yếu của mình không? Em thường làm gì để cải thiện hoặc phát huy chúng?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực & định hướng tương lai (3 mục)",
        questions: [
            { text: "18. Em có định hướng rõ ràng cho bản thân sau khi tốt nghiệp THPT không? Em muốn làm gì hoặc học ngành gì?", options: scaleOptions },
            { text: "19. Theo em, việc học hiện tại có ý nghĩa như thế nào đối với mục tiêu tương lai của em?", options: scaleOptions },
            { text: "20. Khi gặp khó khăn trong cuộc sống hoặc học tập, điều gì giúp em có động lực để tiếp tục cố gắng?", options: scaleOptions }
        ]
    }
]

export const questionsData: QuestionsData = {
    "1": grade1Questions,
    "10": grades10to12Questions,
    "11": grades10to12Questions,
    "12": grades10to12Questions,
    "6": grades6to9Questions,
    "7": grades6to9Questions,
    "8": grades6to9Questions,
    "9": grades6to9Questions,
    "2": grades2to5Questions,
    "3": grades2to5Questions,
    "4": grades2to5Questions,
    "5": grades2to5Questions
}

export const defaultQuestions: Section[] = [
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
