// scripts/build-orientation-criteria.js
const fs = require('fs');
const path = require('path');

const gradesData = [
  {
    grade: 1,
    key: "KHOI_1",
    label: "Khối 1",
    focus: "Sẵn sàng vào lớp 1, tự phục vụ, giao tiếp, thích nghi",
    subLabel: "Sẵn sàng vào lớp 1, tự phục vụ, giao tiếp, thích nghi",
    gradeList: ["1", "Khối 1", "Lớp 1", "K1"],
    criteria: [
      {
        order: 1,
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        name: "Sở thích vui chơi, năng khiếu và hoạt động yêu thích",
        focus: "Tìm hiểu hứng thú cá nhân, năng khiếu nổi bật (vẽ tranh, ca hát, xếp hình lego, vận động thể chất) và điều làm học sinh vui vẻ, hào hứng nhất.",
        guideline: "Quan sát sự hào hứng khi chia sẻ, mức độ tự nhiên và niềm say mê với hoạt động thế mạnh.",
        questions: [
          "Ở nhà hoặc trường mầm non, con thích chơi trò gì hoặc làm việc gì nhất?",
          "Con có sở thích đặc biệt nào như vẽ tranh, múa hát, lắp ráp đồ chơi hay vận động không?",
          "Khi được làm điều mình thích, con cảm thấy như thế nào?"
        ]
      },
      {
        order: 2,
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        name: "Tâm thế làm quen với việc học và sự tò mò khám phá",
        focus: "Tìm hiểu thái độ hào hứng với sách tranh, chữ cái, con số và tâm thế sẵn sàng bước vào lớp 1.",
        guideline: "Quan sát ánh mắt chú ý, mức độ tò mò khi nhìn sách vở, tranh ảnh minh họa.",
        questions: [
          "Con có thích xem sách tranh, tô màu và làm quen với các chữ cái, con số không?",
          "Con có hào hứng khi nghe người lớn kể chuyện hoặc hỏi vì sao mọi vật lại như vậy không?",
          "Con cảm thấy thế nào khi sắp được trở thành học sinh lớp 1 của trường Sky-Line?"
        ]
      },
      {
        order: 3,
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        name: "Phản xạ trước thử thách nhỏ và xử lý tình huống đơn giản",
        focus: "Đánh giá cách trẻ ứng phó khi gặp đồ vật bị hỏng, làm rơi đồ chơi hoặc gặp khó khăn khi làm bài.",
        guideline: "Quan sát phản xạ: bình tĩnh thử lại, tìm kiếm sự trợ giúp hay cáu gắt, từ bỏ.",
        questions: [
          "Khi con đang ghép đồ chơi mà bị thiếu mảnh hoặc rơi rớt, con sẽ làm gì?",
          "Nếu con muốn với lấy một món đồ trên cao mà không tới, con sẽ nhờ ai giúp đỡ?",
          "Khi gặp một hình vẽ khó tô, con sẽ cố gắng tô tiếp hay nhờ người lớn vẽ hộ?"
        ]
      },
      {
        order: 4,
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        name: "Kỹ năng tự phục vụ cơ bản và chủ động trong sinh hoạt",
        focus: "Tìm hiểu khả năng tự mang giày dép, dọn đồ chơi, cất ba lô, tự xúc cơm và đi vệ sinh.",
        guideline: "Đánh giá mức độ tự lập trong nề nếp sinh hoạt phù hợp với học sinh chuẩn bị vào lớp 1.",
        questions: [
          "Ở nhà, con có tự đi giày dép, mặc quần áo và cất gọn đồ chơi vào giỏ sau khi chơi xong không?",
          "Khi ăn cơm, con tự xúc ăn hay cần bố mẹ nhắc nhở và xúc cho?",
          "Khi đến giờ đi ngủ hoặc thức dậy, con có tự giác làm vệ sinh cá nhân không?"
        ]
      },
      {
        order: 5,
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        name: "Khả năng hòa nhập môi trường mới và làm quen bạn bè",
        focus: "Đánh giá phản ứng khi đến môi trường lạ, sự sẵn sàng chơi cùng bạn và tách khỏi phụ huynh.",
        guideline: "Quan sát độ tự tin, khả năng hòa nhập, cử chỉ thân thiện và cách ứng xử với các bạn cùng trang lứa.",
        questions: [
          "Hôm nay đến trường Sky-Line gặp nhiều bạn mới, con có thấy vui và muốn kết bạn không?",
          "Nếu bạn khác muốn cùng chơi đồ chơi với con, con có sẵn sàng chia sẻ không?",
          "Khi tạm xa bố mẹ để vào lớp học với cô giáo, con cảm thấy như thế nào?"
        ]
      },
      {
        order: 6,
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        name: "Hiểu biết về bản thân, sở thích và điều làm mình khó chịu",
        focus: "Trẻ có thể gọi tên thông tin cá nhân cơ bản (tên, tuổi, sở thích, điều sợ hãi hoặc không thích).",
        guideline: "Lắng nghe cách trẻ tự mô tả về mình, nhận thức về cảm xúc cá nhân.",
        questions: [
          "Con có thể kể cho cô nghe con tên là gì, năm nay mấy tuổi và điều con thích nhất không?",
          "Điều gì thường làm cho con cảm thấy buồn hoặc lo lắng nhất?",
          "Khi con cảm thấy không vui, con thường làm gì để cảm thấy vui trở lại?"
        ]
      },
      {
        order: 7,
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        name: "Mong muốn và hình dung của học sinh về trường Sky-Line",
        focus: "Trẻ mong muốn làm gì, học gì và chơi gì khi chính thức trở thành học sinh Sky-Line.",
        guideline: "Đánh giá sự hào hứng và tâm lý tích cực hướng về trường lớp mới.",
        questions: [
          "Con thích nhất góc nào ở trường Sky-Line hôm nay (sân bóng, khu vui chơi, phòng thư viện, hồ bơi)?",
          "Vào lớp 1 tại Sky-Line, con muốn học thêm điều gì mới lạ nhất?",
          "Con muốn được làm quen với bao nhiêu bạn mới trong lớp mình?"
        ]
      },
      {
        order: 8,
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        name: "Tự cảm nhận về khả năng làm quen chữ cái, đếm số và khéo tay",
        focus: "Cách trẻ tự cảm nhận việc mình cầm bút, tô vẽ hình, đếm đồ vật hay ghi nhớ tên đồ vật.",
        guideline: "Quan sát trẻ tự hào về thành quả của mình hay cảm thấy việc cầm bút là khó khăn.",
        questions: [
          "Con thấy việc cầm bút vẽ tranh hay tập viết nét thẳng nét cong có dễ dàng với con không?",
          "Con đã biết đếm từ 1 đến bao nhiêu và nhận biết được những chữ cái nào rồi?",
          "Trong các trò chơi khéo tay, con tự tin nhất với trò chơi nào?"
        ]
      },
      {
        order: 9,
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        name: "Khả năng diễn đạt bằng lời nói, lắng nghe và biểu đạt nhu cầu",
        focus: "Quan sát khả năng phát âm rõ ràng, dùng câu hoàn chỉnh để diễn đạt mong muốn với cô giáo.",
        guideline: "Đánh giá vốn từ, khả năng nghe hiểu hiệu lệnh ngắn và sự lễ phép trong chào hỏi.",
        questions: [
          "Khi con cần đi vệ sinh hoặc muốn uống nước trong lớp, con sẽ nói với cô giáo như thế nào?",
          "Khi gặp thầy cô giáo hoặc người lớn tuổi, con thường chào hỏi ra sao?",
          "Con có thể kể lại cho cô nghe một câu chuyện ngắn hoặc một kỷ niệm vui gần đây không?"
        ]
      },
      {
        order: 10,
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        name: "Đặc điểm sức khỏe, thói quen ăn uống, ngủ trưa và lưu ý đặc biệt",
        focus: "Ghi nhận các đặc điểm cá biệt về dinh dưỡng, dị ứng, giấc ngủ hoặc nhạy cảm giác quan.",
        guideline: "Ghi chú ngắn gọn, chính xác các thói quen cần giáo viên chủ nhiệm hỗ trợ ban đầu.",
        questions: [
          "Ở trường mầm non, con có ngủ trưa ngoan không và có món ăn nào con không ăn được không?",
          "Con có cần cô giáo nhắc nhở hay ôm động viên khi chuẩn bị ngủ trưa không?",
          "Có điều gì đặc biệt về con mà con muốn cô giáo biết trước khi con vào lớp 1 không?"
        ]
      }
    ],
    parentGroups: [
      {
        order: 1,
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, tâm lý và thế mạnh nổi bật của học sinh",
        focus: "Nắm bắt tính cách cốt lõi (hướng nội/hướng ngoại, nhạy cảm hay tự tin), sở trường và đam mê của trẻ từ gia đình.",
        questions: [
          "Xin phụ huynh chia sẻ đôi nét về tính cách nổi bật nhất của con ở nhà?",
          "Con có điểm mạnh hay năng khiếu đặc biệt nào mà gia đình nhận thấy con bộc lộ sớm?",
          "Những tình huống nào ở nhà thường khiến con dễ xúc động hoặc bướng bỉnh nhất?"
        ],
        placeholder: "Ví dụ: Con tính tình vui vẻ, tình cảm, rất thích quan sát tranh ảnh và lắp lego; khi không vừa ý đôi khi hay dỗi nhưng dỗ ngọt là nghe lời..."
      },
      {
        order: 2,
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Quá trình làm quen chữ cái, con số và phản xạ học tập tại mầm non",
        focus: "Đánh giá mức độ làm quen học liệu, khả năng chú ý và tiền năng học tập của trẻ.",
        questions: [
          "Tại trường mầm non và ở nhà, con đã tiếp cận với chữ cái, con số và tiếng Anh như thế nào?",
          "Khả năng tập trung lắng nghe truyện kể hoặc làm một hoạt động liên tục của con kéo dài khoảng bao lâu?",
          "Con có biểu hiện hứng thú đặc biệt với việc học hỏi điều mới hay e dè trước kiến thức mới?"
        ],
        placeholder: "Ví dụ: Con đã nhận biết bảng chữ cái tiếng Việt cơ bản, đếm số đến 20, thích nghe nhạc tiếng Anh thiếu nhi, khả năng tập trung tô màu tốt khoảng 20-30 phút..."
      },
      {
        order: 3,
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Nề nếp sinh hoạt, tự phục vụ và thói quen xem thiết bị điện tử",
        focus: "Tìm hiểu nề nếp sinh hoạt thường nhật, thời gian dùng màn hình điện tử và tính tự giác sinh hoạt.",
        questions: [
          "Ở nhà con có thói quen xem tivi, iPad hay điện thoại không? Thời lượng mỗi ngày khoảng bao nhiêu?",
          "Con đã tự giác thực hiện những việc tự phục vụ nào (đánh răng, dọn đồ chơi, cất ba lô)?",
          "Nề nếp giờ giấc ăn uống, đi ngủ buổi tối và thức dậy buổi sáng của con như thế nào?"
        ],
        placeholder: "Ví dụ: Con chỉ xem tivi vào cuối tuần 30-45 phút; đã tự đánh răng và cất giày dép đúng nơi quy định; ngủ lúc 21h30 và thức dậy 6h30 sáng..."
      },
      {
        order: 4,
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Thời gian dành cho con và phương pháp giáo dục của gia đình",
        focus: "Khả năng đồng hành hàng ngày của cha mẹ, sự thống nhất trong quan điểm nuôi dạy con.",
        questions: [
          "Bố mẹ thường dành thời gian chơi cùng con hoặc đọc sách với con vào những khoảng thời gian nào trong ngày?",
          "Khi con mắc lỗi hoặc không vâng lời, phương pháp gia đình thường áp dụng để hướng dẫn con là gì?",
          "Gia đình có kế hoạch phối hợp như thế nào cùng giáo viên chủ nhiệm trong học kỳ đầu tiên?"
        ],
        placeholder: "Ví dụ: Bố mẹ dành 30 phút mỗi tối đọc truyện và trò chuyện cùng con; phương pháp giáo dục là nhẹ nhàng giải thích, kiên nhẫn lắng nghe con..."
      },
      {
        order: 5,
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Lý do lựa chọn Sky-Line và kỳ vọng phát triển toàn diện của con",
        focus: "Xác định mục tiêu giáo dục dài hạn của phụ huynh và kỳ vọng cụ thể vào môi trường Sky-Line.",
        questions: [
          "Điều gì khiến gia đình tin tưởng lựa chọn Hệ thống Giáo dục Sky-Line cho con bắt đầu bước vào lớp 1?",
          "Kỳ vọng lớn nhất của gia đình đối với sự trưởng thành của con sau năm học lớp 1 là gì (tự tin, tự lập, ngôn ngữ, tư duy)?",
          "Gia đình có mong muốn hay lưu ý đặc biệt nào gửi gắm đến Ban Giám hiệu và đội ngũ giáo viên?"
        ],
        placeholder: "Ví dụ: Gia đình tin tưởng triết lý giáo dục nhân văn và chương trình song ngữ của Sky-Line; kỳ vọng con tự tin, hạnh phúc khi đến trường, hòa đồng và rèn luyện nề nếp tốt..."
      }
    ]
  },
  {
    grade: 2,
    key: "KHOI_2",
    label: "Khối 2",
    focus: "Đọc, viết, toán, nề nếp và tự giác",
    subLabel: "Đọc, viết, toán, nề nếp và tự giác trong học tập",
    gradeList: ["2", "Khối 2", "Lớp 2", "K2"],
    criteria: [
      {
        order: 1,
        category: "SO_THICH_THE_MANH",
        categoryLabel: "1. Sở thích và thế mạnh",
        name: "Môn học yêu thích, năng khiếu và hoạt động ngoài giờ",
        focus: "Tìm hiểu môn học con thấy thích thú nhất (Toán, Tiếng Việt, Tiếng Anh, Mỹ thuật, Thể thao) và tài lẻ nổi bật.",
        guideline: "Quan sát năng lượng tích cực khi học sinh nhắc đến môn học sở trường và các trò chơi yêu thích.",
        questions: [
          "Ở trường, con cảm thấy hào hứng nhất khi được học môn nào và tham gia hoạt động gì?",
          "Con có năng khiếu hay sở trường nào mà thầy cô và bạn bè hay khen ngợi không?",
          "Sau giờ học, con thích dành thời gian để làm những hoạt động gì nhất?"
        ]
      },
      {
        order: 2,
        category: "THAI_DO_DONG_LUC",
        categoryLabel: "2. Thái độ và động lực học tập",
        name: "Thái độ làm bài tập, tính kiên nhẫn khi gặp bài khó",
        focus: "Đánh giá động lực học tập nội tại: tự giác mở sách vở hay phải đợi phụ huynh/giáo viên thúc giục.",
        guideline: "Nhận biết mức độ kiên trì và phản ứng tâm lý khi bài làm có điểm chưa đúng.",
        questions: [
          "Mỗi buổi tối, con tự giác ngồi vào bàn học hay cần bố mẹ nhắc nhở?",
          "Khi gặp một bài toán có lời văn khó hoặc một từ tiếng Anh chưa hiểu, con sẽ làm gì?",
          "Khi được cô giáo khen hoặc nhận điểm tốt, con cảm thấy như thế nào?"
        ]
      },
      {
        order: 3,
        category: "GIAI_QUYET_VAN_DE",
        categoryLabel: "3. Khả năng giải quyết vấn đề",
        name: "Kỹ năng suy luận đơn giản và xử lý khúc mắc với bạn bè",
        focus: "Khả năng tư duy logic qua bài toán thực tế và cách giải quyết mâu thuẫn nhỏ trên lớp.",
        guideline: "Đánh giá cách xử lý tình huống: tự hòa giải, mách cô giáo hay thu mình lại.",
        questions: [
          "Nếu trong giờ ra chơi con và một bạn cùng muốn chơi một món đồ chơi, con sẽ giải quyết ra sao?",
          "Nếu con lỡ quên đem theo hộp bút chì màu đến lớp, con sẽ làm thế nào để hoàn thành bài vẽ?",
          "Khi một bài làm bị sai, con có muốn tìm ra nguyên nhân vì sao sai không?"
        ]
      },
      {
        order: 4,
        category: "TINH_CHU_DONG",
        categoryLabel: "4. Tính chủ động",
        name: "Tự sắp xếp góc học tập, đồ dùng học tập và chuẩn bị sách vở",
        focus: "Mức độ tự chuẩn bị sách vở theo thời khóa biểu ngày hôm sau và giữ gìn tập vở cẩn thận.",
        guideline: "Quan sát thói quen ngăn nắp và tính độc lập trong nhiệm vụ học tập hàng ngày.",
        questions: [
          "Con có tự mình soạn sách vở theo thời khóa biểu trước khi đi ngủ không?",
          "Góc học tập ở nhà của con có được sắp xếp ngăn nắp và do chính con dọn dẹp không?",
          "Khi giáo viên dặn dò nhiệm vụ về nhà, con ghi nhớ hoặc ghi vào sổ như thế nào?"
        ]
      },
      {
        order: 5,
        category: "KY_NANG_XA_HOI_THICH_NGHI",
        categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
        name: "Kỹ năng làm việc nhóm, chia sẻ và thích ứng nề nếp mới",
        focus: "Đánh giá khả năng hợp tác đôi bạn cùng tiến, lắng nghe bạn phát biểu và tôn trọng quy định lớp.",
        guideline: "Xem xét khả năng hòa nhập, cử chỉ tôn trọng nội quy và tinh thần đồng đội.",
        questions: [
          "Khi cô giáo yêu cầu thảo luận nhóm đôi hoặc nhóm 4, con thường đóng góp ý kiến như thế nào?",
          "Con có dễ dàng kết thân với những bạn mới vào lớp không?",
          "Nếu lớp có một bạn đang buồn hoặc chưa có bạn chơi cùng, con sẽ làm gì?"
        ]
      },
      {
        order: 6,
        category: "NHAN_THUC_BAN_THAN",
        categoryLabel: "6. Nhận thức bản thân",
        name: "Nhận biết điểm tiến bộ và điểm cần cố gắng hơn của bản thân",
        focus: "Học sinh lớp 2 bắt đầu có ý thức tự nhận xét: mình viết chữ đẹp chưa, tính toán nhanh chưa.",
        guideline: "Lắng nghe sự thành thật và khách quan khi học sinh tự đánh giá bản thân.",
        questions: [
          "So với năm học lớp 1, con thấy năm nay mình đã tiến bộ nhất ở điểm nào?",
          "Con thấy việc đọc diễn cảm, viết chữ sạch đẹp hay tính toán cộng trừ là điều con cần rèn thêm?",
          "Khi có bạn làm tốt hơn mình, con có muốn học hỏi cách làm của bạn không?"
        ]
      },
      {
        order: 7,
        category: "KY_VONG_SKYLINE",
        categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
        name: "Mục tiêu học tập và hoạt động ngoại khóa mong muốn tại Sky-Line",
        focus: "Kỳ vọng về câu lạc bộ (bóng đá, bơi lội, STEM, âm nhạc) và những người bạn mới.",
        guideline: "Đánh giá niềm tin và sự hào hứng của học sinh đối với môi trường giáo dục Sky-Line.",
        questions: [
          "Tại trường Sky-Line, con muốn tham gia câu lạc bộ nào nhất sau giờ học chính khóa?",
          "Con mong muốn thầy cô Sky-Line sẽ giúp con điều gì trong năm học này?",
          "Con có mục tiêu gì cho năm học lớp 2 này (đạt danh hiệu, nói tiếng Anh tốt hơn, bơi lội giỏi)?"
        ]
      },
      {
        order: 8,
        category: "NANG_LUC_TU_NHAN_DINH",
        categoryLabel: "8. Năng lực học tập tự nhận định",
        name: "Tự đánh giá kỹ năng Đọc hiểu - Viết chính tả - Tính toán",
        focus: "Khả năng tự tin khi đọc một đoạn văn bản, tốc độ chép bài và tính toán cộng trừ có nhớ trong phạm vi 100.",
        guideline: "Nhận định mức độ tự tin với năng lực đọc, viết, tính toán nền tảng của lớp 2.",
        questions: [
          "Con thấy mình đọc truyện tranh hay sách có trôi chảy không? Có từ nào con hay đọc vấp không?",
          "Khi viết chính tả hoặc làm bài toán cộng trừ, con thường mất khoảng bao lâu để hoàn thành?",
          "Con tự chấm bài làm của mình ở mức độ nào (rất tốt, khá, hay cần rèn thêm)?"
        ]
      },
      {
        order: 9,
        category: "KY_NANG_GIAO_TIEP",
        categoryLabel: "9. Kỹ năng giao tiếp",
        name: "Kỹ năng phát biểu trước lớp, đối thoại tự tin và lễ phép",
        focus: "Khả năng nói trọn câu, diễn đạt mạch lạc suy nghĩ của mình trước giáo viên và bạn bè.",
        guideline: "Quan sát cử chỉ, âm lượng giọng nói và sự tự tin trong giao tiếp trực tiếp.",
        questions: [
          "Khi cô giáo đặt câu hỏi trên lớp, con có hay giơ tay phát biểu không?",
          "Khi con có ý kiến khác với các bạn trong nhóm, con sẽ nói thế nào để các bạn hiểu?",
          "Khi gặp khó khăn trong việc hiểu bài, con có mạnh dạn hỏi lại thầy cô ngay không?"
        ]
      },
      {
        order: 10,
        category: "THONG_TIN_BO_SUNG",
        categoryLabel: "10. Thông tin bổ sung",
        name: "Lưu ý về thể chất, tâm lý và nhu cầu hỗ trợ cá nhân hóa",
        focus: "Tình trạng thị lực (cận thị), thói quen ăn uống, sức khỏe vận động và nhu cầu chăm sóc riêng.",
        guideline: "Ghi nhận thông tin thực tế giúp giáo viên chăm sóc chu đáo trong sinh hoạt bán trú.",
        questions: [
          "Mắt của con nhìn lên bảng có rõ không? Con có cần ngồi bàn đầu không?",
          "Con có bị dị ứng thức ăn hoặc có thói quen sinh hoạt nào đặc biệt không?",
          "Có điều gì con muốn thầy cô hỗ trợ riêng để con cảm thấy thoải mái nhất mỗi ngày đến trường không?"
        ]
      }
    ],
    parentGroups: [
      {
        order: 1,
        category: "HIEU_HS_GOC_NHIN_PH",
        categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
        title: "Đặc điểm tính cách, chuyển biến tâm lý và năng khiếu của học sinh lớp 2",
        focus: "Đánh giá sự thay đổi tâm lý từ lớp 1 sang lớp 2, sự tự tin và các năng khiếu bộc lộ rõ nét.",
        questions: [
          "So với giai đoạn lớp 1, gia đình thấy con có những thay đổi đáng chú ý nào về tính cách và giao tiếp?",
          "Những thế mạnh hoặc đam mê nổi bật nhất của con hiện nay là gì?",
          "Trong sinh hoạt hàng ngày, điều gì con làm khiến bố mẹ yên tâm nhất?"
        ],
        placeholder: "Ví dụ: Con hoạt bát hơn, tự tin giao tiếp, rất thích đọc truyện tranh khoa học và chơi thể thao; tính cách có phần độc lập hơn..."
      },
      {
        order: 2,
        category: "QUA_TRINH_NANG_LUC_HT",
        categoryLabel: "2. Quá trình và năng lực học tập",
        title: "Đánh giá quá trình học tập lớp 1: Kỹ năng đọc, viết, toán và tiếng Anh",
        focus: "Kết quả đánh giá học kỳ lớp 1, các mặt thuận lợi và khó khăn khi tiếp cận kiến thức mới.",
        questions: [
          "Gia đình nhận xét như thế nào về kỹ năng đọc hiểu, viết chữ và làm toán của con trong năm lớp 1?",
          "Khả năng tiếp thu ngoại ngữ và phản xạ tiếng Anh của con ở mức độ nào?",
          "Môn học hoặc nội dung nào con cần có thêm sự kèm cặp và củng cố thêm từ giáo viên?"
        ],
        placeholder: "Ví dụ: Con đọc trôi chảy, tính toán nhanh, môn Toán tiếp thu tốt; phần viết chính tả đôi khi còn ẩu, cần rèn thêm nếp giữ vở sạch chữ đẹp..."
      },
      {
        order: 3,
        category: "THOI_QUEN_HT_TAI_NHA",
        categoryLabel: "3. Thói quen học tập tại nhà",
        title: "Nề nếp tự giác học tập, thời gian tự học và quản lý thiết bị công nghệ",
        focus: "Thời gian biểu học tại nhà, mức độ tự giác mở sách vở và kiểm soát thời gian màn hình.",
        questions: [
          "Con có duy trì được thói quen học bài đúng giờ mỗi tối không? Con tự làm hay cần bố mẹ ngồi cạnh?",
          "Gia đình quản lý việc sử dụng tivi, điện thoại, máy tính của con như thế nào?",
          "Con có thói quen đọc sách hàng ngày trước khi ngủ không?"
        ],
        placeholder: "Ví dụ: Con có góc học tập riêng, tự giác làm bài từ 19h30 đến 20h30; bố mẹ chỉ hỗ trợ khi có bài khó; gia đình quy định nghiêm ngặt chỉ xem iPad 30 phút cuối tuần..."
      },
      {
        order: 4,
        category: "DONG_HANH_CUA_PH",
        categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
        title: "Phương thức hỗ trợ học tập và phối hợp cùng nhà trường",
        focus: "Sự phân công trong gia đình để kèm cặp con, kênh tương tác với giáo viên chủ nhiệm.",
        questions: [
          "Gia đình thường kiểm tra sổ báo bài hoặc ứng dụng liên lạc của nhà trường với tần suất như thế nào?",
          "Khi con có biểu hiện lơ đễnh hoặc điểm số chưa như ý, bố mẹ thường trò chuyện và định hướng cho con ra sao?",
          "Gia đình mong muốn phối hợp với giáo viên chủ nhiệm như thế nào để rèn luyện nề nếp cho con?"
        ],
        placeholder: "Ví dụ: Bố mẹ kiểm tra sổ liên lạc hàng ngày, phối hợp chặt chẽ với cô giáo khi con có biểu hiện thiếu tập trung; luôn động viên tích cực..."
      },
      {
        order: 5,
        category: "DONG_LUC_KY_VONG_GD",
        categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
        title: "Kỳ vọng phát triển toàn diện và mục tiêu trọng tâm trong năm học lớp 2",
        focus: "Kỳ vọng về sự tự lập, khả năng ngôn ngữ song ngữ và sự tự tin của học sinh tại Sky-Line.",
        questions: [
          "Gia đình đặt ra mục tiêu trọng tâm nào cho con trong năm học lớp 2 tại Sky-Line?",
          "Gia đình kỳ vọng môi trường Sky-Line sẽ mang lại giá trị khác biệt gì cho sự phát triển của con?",
          "Những mong muốn đặc biệt của gia đình gửi gắm đến Ban Giám hiệu cơ sở?"
        ],
        placeholder: "Ví dụ: Kỳ vọng con rèn luyện được tính tự lập, tự giác học tập, nâng cao phản xạ tiếng Anh tự nhiên và tham gia các hoạt động thể thao ngoại khóa năng động..."
      }
    ]
  }
];

// Tạo cấu hình mẫu cho các khối từ 3 đến 12 với đúng trọng tâm yêu cầu:
const gradeFocusMap = {
  3: {
    focus: "Tự học, khám phá, hợp tác",
    subLabel: "Tự học, khám phá, hợp tác nhóm và tư duy sáng tạo",
    c3_q: "Kỹ năng làm việc nhóm, phân công nhiệm vụ và chia sẻ ý tưởng khám phá khoa học.",
    p3_q: "Năng lực tự tìm tòi, đọc sách khám phá và tinh thần hợp tác của học sinh."
  },
  4: {
    focus: "Trách nhiệm, quản lý thời gian, tư duy độc lập",
    subLabel: "Trách nhiệm, quản lý thời gian, tư duy độc lập và giải quyết vấn đề",
    c3_q: "Kỹ năng tự lên kế hoạch tuần, hoàn thành đúng hạn và bảo vệ quan điểm cá nhân.",
    p3_q: "Ý thức trách nhiệm với việc học, khả năng sắp xếp thời gian và hạn chế ỷ lại."
  },
  5: {
    focus: "Nền tảng học tập, chuẩn bị chuyển cấp THCS",
    subLabel: "Nền tảng học tập vững chắc, chuẩn bị tâm thế chuyển cấp THCS",
    c3_q: "Mục tiêu chuyển cấp, phương pháp tự học nâng cao và tâm thế bước vào môi trường THCS.",
    p3_q: "Kỳ vọng học thuật, định hướng hệ học THCS và kế hoạch chuẩn bị chuyển cấp cùng nhà trường."
  },
  6: {
    focus: "Thích nghi THCS, nhiều môn học, nhiều giáo viên",
    subLabel: "Thích nghi THCS, phương pháp học đa môn, nhiều giáo viên bộ môn",
    c3_q: "Kỹ năng ghi chép bài theo bộ môn, tương tác nhiều giáo viên và thích nghi môi trường THCS.",
    p3_q: "Theo dõi tâm lý chuyển cấp, hỗ trợ con làm quen phương pháp học đa môn và tự chủ."
  },
  7: {
    focus: "Động lực, thói quen học tập, quản lý bản thân",
    subLabel: "Động lực học tập nội tại, thói quen tự giác, quản lý cảm xúc bản thân",
    c3_q: "Động lực vượt qua khó khăn, quản lý thói quen sinh hoạt và cân bằng cảm xúc lứa tuổi dậy thì.",
    p3_q: "Thấu hiểu thay đổi tâm sinh lý lứa tuổi, cách đồng hành không áp đặt và định hướng tích cực."
  },
  8: {
    focus: "Tư duy độc lập, quản lý cảm xúc, giải quyết vấn đề",
    subLabel: "Tư duy độc lập, phản biện, quản lý cảm xúc và giải quyết xung đột",
    c3_q: "Năng lực tư duy phản biện, kỹ năng giải quyết tình huống phức tạp và quản trị cảm xúc.",
    p3_q: "Đồng hành cùng cái tôi cá nhân của con, tôn trọng chính kiến và định hướng kỹ năng sống."
  },
  9: {
    focus: "Mục tiêu chuyển cấp THPT, phương pháp ôn tập",
    subLabel: "Xác định mục tiêu chuyển cấp THPT, phương pháp ôn tập thi cử hiệu quả",
    c3_q: "Mục tiêu nguyện vọng vào lớp 10, phương pháp tự học ôn thi và kiểm soát áp lực thi cử.",
    p3_q: "Chiến lược chọn trường THPT, định hướng hệ đào tạo và giải tỏa áp lực thi cử cho con."
  },
  10: {
    focus: "Thích nghi THPT, lựa chọn môn học, định hướng cá nhân",
    subLabel: "Thích nghi môi trường THPT, lựa chọn tổ hợp môn học, định hướng cá nhân",
    c3_q: "Lựa chọn tổ hợp môn khoa học tự nhiên / xã hội, thích ứng phương pháp học THPT chủ động.",
    p3_q: "Sự đồng thuận trong chọn tổ hợp môn, định hướng phát triển năng lực chuyên sâu của con."
  },
  11: {
    focus: "Hướng nghiệp, ngoại ngữ, kế hoạch đại học",
    subLabel: "Định hướng nghề nghiệp, phát triển ngoại ngữ học thuật, kế hoạch tuyển sinh đại học",
    c3_q: "Kế hoạch thi chứng chỉ quốc tế (IELTS/SAT), nghiên cứu ngành nghề yêu thích và hồ sơ cá nhân.",
    p3_q: "Kế hoạch tài chính, định hướng du học hoặc đại học trong nước, hỗ trợ con trải nghiệm nghề."
  },
  12: {
    focus: "Tốt nghiệp THPT, xét tuyển, du học, định hướng nghề nghiệp",
    subLabel: "Mục tiêu tốt nghiệp THPT, chiến lược xét tuyển đại học / du học, vững vàng nghề nghiệp",
    c3_q: "Chiến lược xét tuyển đại học, chọn ngành phù hợp thế mạnh, tâm lý vững vàng bước vào tương lai.",
    p3_q: "Đồng hành quyết định tương lai, cam kết hỗ trợ toàn diện lộ trình chuyển tiếp đại học/du học."
  }
};

for (let g = 3; g <= 12; g++) {
  const gMeta = gradeFocusMap[g];
  const gKey = `KHOI_${g}`;
  const gLabel = `Khối ${g}`;
  const gradeList = [String(g), `Khối ${g}`, `Lớp ${g}`, `K${g}`];

  const criteria = [
    {
      order: 1,
      category: "SO_THICH_THE_MANH",
      categoryLabel: "1. Sở thích và thế mạnh",
      name: `Sở thích, đam mê và lĩnh vực thế mạnh nổi bật (${gLabel})`,
      focus: `Khám phá đam mê, lĩnh vực chuyên môn hoặc năng khiếu sở trường phù hợp trọng tâm: ${gMeta.focus}.`,
      guideline: "Đánh giá mức độ am hiểu, chiều sâu đam mê và thời gian học sinh đầu tư cho thế mạnh cá nhân.",
      questions: [
        `Trong các môn học và hoạt động hiện tại, con yêu thích và tự tin nhất ở lĩnh vực nào?`,
        `Con đã từng đạt giải thưởng, dự án cá nhân hoặc thành tích nào đáng tự hào trong thế mạnh này chưa?`,
        `Thế mạnh này giúp ích gì cho con trong việc học tập và kết nối bạn bè?`
      ]
    },
    {
      order: 2,
      category: "THAI_DO_DONG_LUC",
      categoryLabel: "2. Thái độ và động lực học tập",
      name: `Động lực học tập nội tại và thái độ với mục tiêu học đường (${gLabel})`,
      focus: `Đánh giá mức độ tự giác, mục tiêu học tập rõ ràng theo trọng tâm: ${gMeta.focus}.`,
      guideline: "Phân biệt học tập vì đam mê, sự tò mò hay vì nghĩa vụ, áp lực từ gia đình.",
      questions: [
        `Điều gì là động lực lớn nhất thúc đẩy con nỗ lực học tập mỗi ngày?`,
        `Khi gặp phải một chuyên đề hoặc bài tập rất khó, con duy trì quyết tâm như thế nào?`,
        `Con có thói quen tự tìm kiếm thêm tài liệu, sách báo hoặc khóa học trực tuyến để mở rộng kiến thức không?`
      ]
    },
    {
      order: 3,
      category: "GIAI_QUYET_VAN_DE",
      categoryLabel: "3. Khả năng giải quyết vấn đề",
      name: `Tư duy logic, giải quyết khúc mắc và vượt khó (${gLabel})`,
      focus: `Khả năng phân tích nguyên nhân, đề xuất phương án và xử lý tình huống thực tế.`,
      guideline: "Quan sát phản xạ tư duy phản biện, cách lập luận và tinh thần không lùi bước trước khó khăn.",
      questions: [
        `Khi đối diện với một vấn đề phức tạp hoặc xung đột ý kiến với bạn bè, con giải quyết ra sao?`,
        `Hãy kể về một tình huống con tự mình tìm ra cách giải quyết khó khăn mà không cần người lớn can thiệp?`,
        `Con học được bài học kinh nghiệm gì từ những thất bại hoặc kết quả chưa đạt mong muốn trước đây?`
      ]
    },
    {
      order: 4,
      category: "TINH_CHU_DONG",
      categoryLabel: "4. Tính chủ động",
      name: `Kỹ năng tự chủ, quản lý thời gian và trách nhiệm cá nhân (${gLabel})`,
      focus: `Mức độ chủ động xây dựng kế hoạch, sắp xếp thứ tự ưu tiên và tự chịu trách nhiệm.`,
      guideline: "Đánh giá tính độc lập, khả năng tổ chức công việc và việc giữ đúng cam kết.",
      questions: [
        `Con tự quản lý thời gian học tập, giải trí và sinh hoạt cá nhân như thế nào trong ngày?`,
        `Khi được giao một nhiệm vụ hoặc dự án nhóm, con chủ động nhận phần việc nào?`,
        `Nếu bị chậm tiến độ hoặc quên nhiệm vụ, con nhận trách nhiệm và khắc phục như thế nào?`
      ]
    },
    {
      order: 5,
      category: "KY_NANG_XA_HOI_THICH_NGHI",
      categoryLabel: "5. Kỹ năng xã hội và khả năng thích nghi",
      name: `Kỹ năng hợp tác, lãnh đạo nhóm và thích ứng môi trường mới (${gLabel})`,
      focus: `Khả năng tương tác xã hội, tinh thần đồng đội và mức độ linh hoạt trước thay đổi.`,
      guideline: "Quan sát sự cởi mở, lắng nghe tích cực và vai trò thể hiện trong tập thể.",
      questions: [
        `Con thích nghi như thế nào khi bước vào một môi trường mới với nhiều giáo viên và bạn học mới?`,
        `Trong hoạt động nhóm, con thường đóng vai trò người kết nối, lãnh đạo hay hỗ trợ thực thi?`,
        `Làm thế nào để con duy trì mối quan hệ bạn bè lành mạnh và tích cực tại trường học?`
      ]
    },
    {
      order: 6,
      category: "NHAN_THUC_BAN_THAN",
      categoryLabel: "6. Nhận thức bản thân",
      name: `Tự nhận thức giá trị cá nhân, điểm mạnh và điểm cần cải thiện (${gLabel})`,
      focus: `Mức độ hiểu rõ bản thân: tính cách, giá trị cốt lõi, thói quen tốt và thói quen chưa tốt.`,
      guideline: "Lắng nghe sự khiêm tốn, tính chân thật và khao khát hoàn thiện nhân cách bản thân.",
      questions: [
        `Nếu dùng 3 từ để miêu tả chính xác nhất về bản thân con, con sẽ chọn những từ nào?`,
        `Điểm yếu hoặc hạn chế lớn nhất mà con đang nỗ lực rèn luyện để vượt qua là gì?`,
        `Những điều gì hoặc môi trường nào giúp con phát huy tối đa năng lực tốt nhất của mình?`
      ]
    },
    {
      order: 7,
      category: "KY_VONG_SKYLINE",
      categoryLabel: "7. Kỳ vọng cá nhân tại Sky-Line",
      name: `Mục tiêu, nguyện vọng và kế hoạch đóng góp tại Sky-Line (${gLabel})`,
      focus: `Hình dung của học sinh về cơ hội học tập, câu lạc bộ, dự án cộng đồng tại Sky-Line.`,
      guideline: "Đánh giá mức độ đồng điệu giữa giá trị của học sinh với triết lý giáo dục Sky-Line.",
      questions: [
        `Con kỳ vọng điều gì nhất từ thầy cô và môi trường học tập tại Sky-Line?`,
        `Con mong muốn tham gia những dự án học tập, câu lạc bộ hay hoạt động cộng đồng nào tại trường?`,
        `Con dự định sẽ để lại dấu ấn hoặc đóng góp gì cho tập thể lớp và trường Sky-Line?`
      ]
    },
    {
      order: 8,
      category: "NANG_LUC_TU_NHAN_DINH",
      categoryLabel: "8. Năng lực học tập tự nhận định",
      name: `Tự đánh giá năng lực học thuật, ngoại ngữ và tư duy nghiên cứu (${gLabel})`,
      focus: `Khả năng tự định vị trình độ các môn văn hóa, năng lực ngoại ngữ (IELTS/giao tiếp) và tự học.`,
      guideline: "Đánh giá sự tự tin nhưng thực tế, có dẫn chứng cụ thể về điểm số hoặc sản phẩm học tập.",
      questions: [
        `Con tự đánh giá năng lực của mình ở các môn khoa học và xã hội hiện tại đang ở mức độ nào?`,
        `Khả năng sử dụng ngoại ngữ (tiếng Anh) trong học thuật và giao tiếp của con đáp ứng ra sao?`,
        `Con có phương pháp tự học đặc biệt nào giúp con ghi nhớ và hiểu sâu kiến thức không?`
      ]
    },
    {
      order: 9,
      category: "KY_NANG_GIAO_TIEP",
      categoryLabel: "9. Kỹ năng giao tiếp",
      name: `Kỹ năng thuyết trình, phản biện văn minh và truyền cảm hứng (${gLabel})`,
      focus: `Khả năng diễn giải ý tưởng thuyết phục, phong thái tự tin và kỹ năng lắng nghe thấu cảm.`,
      guideline: "Quan sát ngôn ngữ cơ thể, ánh mắt, cách dùng từ ngữ và khả năng đối đáp thông minh.",
      questions: [
        `Con có cảm thấy tự tin khi thuyết trình một đề tài trước cả lớp hoặc hội trường không?`,
        `Khi người khác có quan điểm trái ngược với con, con phản hồi và trao đổi lại như thế nào?`,
        `Con làm thế nào để truyền tải thông điệp một cách rõ ràng và thu hút người nghe?`
      ]
    },
    {
      order: 10,
      category: "THONG_TIN_BO_SUNG",
      categoryLabel: "10. Thông tin bổ sung",
      name: `Định hướng cá nhân hóa, nhu cầu cố vấn chuyên sâu và lưu ý đặc thù (${gLabel})`,
      focus: `Nguyện vọng về cố vấn học tập, định hướng nghề nghiệp, thi chứng chỉ hoặc nhu cầu hỗ trợ tâm lý.`,
      guideline: "Ghi nhận nhu cầu chuyên sâu để nhà trường phân bổ giáo viên cố vấn phù hợp.",
      questions: [
        `Con có kế hoạch thi các chứng chỉ quốc tế, tham gia kỳ thi học sinh giỏi hay nghiên cứu khoa học không?`,
        `Con có cần nhà trường hoặc cố vấn học tập hỗ trợ riêng về lộ trình định hướng nào không?`,
        `Có bất kỳ chia sẻ hoặc mong muốn nào khác mà con muốn gửi gắm tới thầy cô không?`
      ]
    }
  ];

  const parentGroups = [
    {
      order: 1,
      category: "HIEU_HS_GOC_NHIN_PH",
      categoryLabel: "1. Hiểu học sinh qua góc nhìn phụ huynh",
      title: `Đặc điểm tính cách, tâm lý lứa tuổi và thế mạnh của học sinh (${gLabel})`,
      focus: `Đánh giá sự trưởng thành tâm lý, thế mạnh cốt lõi và nét tính cách nổi bật theo lứa tuổi.`,
      questions: [
        `Xin gia đình chia sẻ về những nét tính cách nổi trội và sự thay đổi tâm lý của con thời gian gần đây?`,
        `Con thể hiện niềm say mê và năng khiếu vượt trội nhất trong lĩnh vực nào?`,
        `Khi con gặp áp lực học tập hoặc khúc mắc tâm lý, biểu hiện ở nhà của con như thế nào?`
      ],
      placeholder: `Ví dụ: Con có tư duy độc lập, giàu cảm xúc, có năng khiếu tự học tốt; đôi lúc có áp lực về điểm số nhưng biết lắng nghe lời khuyên của gia đình...`
    },
    {
      order: 2,
      category: "QUA_TRINH_NANG_LUC_HT",
      categoryLabel: "2. Quá trình và năng lực học tập",
      title: `Đánh giá học lực, năng khiếu ngoại ngữ và phong cách học tập (${gLabel})`,
      focus: `Lịch sử học tập, thế mạnh môn học, kết quả các kỳ thi và phong cách tiếp thu tri thức.`,
      questions: [
        `Gia đình nhận định thế nào về năng lực học thuật và nền tảng kiến thức hiện tại của con?`,
        `Khả năng ngoại ngữ (tiếng Anh) và năng lực tự học nghiên cứu của con được phát huy ra sao?`,
        `Môn học hoặc kỹ năng nào con cần được nhà trường bồi dưỡng và hỗ trợ nâng cao thêm?`
      ],
      placeholder: `Ví dụ: Học lực các năm trước đạt loại Giỏi/Tốt, tư duy Toán và tiếng Anh khá tốt; mong muốn trường rèn luyện thêm kỹ năng làm việc nhóm và thuyết trình...`
    },
    {
      order: 3,
      category: "THOI_QUEN_HT_TAI_NHA",
      categoryLabel: "3. Thói quen học tập tại nhà",
      title: `Mức độ tự giác, phương pháp tự học và sử dụng công nghệ (${gLabel})`,
      focus: `Nề nếp tự học tại nhà, khả năng tự tra cứu tài liệu và quản lý thời gian sử dụng internet/mạng xã hội.`,
      questions: [
        `Con có kế hoạch tự học rõ ràng mỗi ngày không? Mức độ tự giác đạt bao nhiêu %?`,
        `Gia đình định hướng và kiểm soát việc sử dụng điện thoại thông minh, máy tính và mạng xã hội của con như thế nào?`,
        `Con có thói quen đọc sách chuyên môn, báo chí hoặc tra cứu tài liệu học thuật trực tuyến không?`
      ],
      placeholder: `Ví dụ: Con tự giác ngồi vào bàn học đúng giờ, tự lập thời gian biểu; gia đình quy định sử dụng điện thoại có kiểm soát mục đích phục vụ học tập...`
    },
    {
      order: 4,
      category: "DONG_HANH_CUA_PH",
      categoryLabel: "4. Cách phụ huynh đồng hành với việc học",
      title: `Phương pháp đồng hành, tôn trọng chính kiến và phối hợp với nhà trường (${gLabel})`,
      focus: `Cách cha mẹ làm bạn cùng con ở lứa tuổi phát triển, tôn trọng quyết định và hỗ trợ hướng nghiệp.`,
      questions: [
        `Bố mẹ thường trò chuyện và thấu hiểu nguyện vọng của con thông qua những dịp nào?`,
        `Khi có sự bất đồng ý kiến về chọn môn học hoặc định hướng, gia đình giải quyết như thế nào?`,
        `Gia đình sẵn sàng phối hợp cùng Ban Cố vấn và Giáo viên chủ nhiệm theo cơ chế như thế nào?`
      ],
      placeholder: `Ví dụ: Gia đình luôn tôn trọng ý kiến cá nhân của con, đóng vai trò người đồng hành định hướng; cam kết phối hợp thường xuyên với nhà trường...`
    },
    {
      order: 5,
      category: "DONG_LUC_KY_VONG_GD",
      categoryLabel: "5. Động lực, kỳ vọng và mục tiêu giáo dục",
      title: `Kỳ vọng đầu ra, định hướng nghề nghiệp và mục tiêu giáo dục dài hạn (${gLabel})`,
      focus: `Mục tiêu chuyển tiếp (cấp học tiếp theo, đại học, du học) và kỳ vọng giá trị nhân cách tại Sky-Line.`,
      questions: [
        `Gia đình kỳ vọng con sẽ phát triển những phẩm chất và năng lực cốt lõi nào khi học tại Sky-Line?`,
        `Định hướng tương lai dài hạn (chọn ngành nghề, đại học trong nước hay du học quốc tế) của gia đình dành cho con là gì?`,
        `Gia đình mong muốn nhà trường xây dựng lộ trình đồng hành cụ thể nào để hiện thực hóa mục tiêu trên?`
      ],
      placeholder: `Ví dụ: Kỳ vọng con phát triển toàn diện tư duy phản biện, ngoại ngữ xuất sắc, tự tin hội nhập quốc tế và đạt mục tiêu tuyển sinh đại học hàng đầu...`
    }
  ];

  gradesData.push({
    grade: g,
    key: gKey,
    label: gLabel,
    focus: gMeta.focus,
    subLabel: gMeta.subLabel,
    gradeList,
    criteria,
    parentGroups
  });
}

// Bổ sung các alias cũ để tương thích ngược 100%:
// KHOI_2_5 -> map KHOI_2
// KHOI_7_9 -> map KHOI_8
// KHOI_10_12 -> map KHOI_11

console.log("Tổng số khối chuẩn bị sinh:", gradesData.length);

// Xây dựng code file criteria-config.ts
let code = `/**
 * CẤU HÌNH TIÊU CHÍ PHỎNG VẤN ĐỊNH HƯỚNG ĐẦU VÀO - SSM SKY-LINE
 * Phiên bản: 2026.3 - Chuẩn hóa Biểu mẫu Phân hóa theo từng Khối lớp (Khối 1 đến 12)
 * 
 * Cấu trúc 02 Biểu mẫu chuẩn hóa:
 * A. PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH (10 Nhóm nội dung):
 *    1. Sở thích và thế mạnh
 *    2. Thái độ và động lực học tập
 *    3. Khả năng giải quyết vấn đề
 *    4. Tính chủ động
 *    5. Kỹ năng xã hội và khả năng thích nghi
 *    6. Nhận thức bản thân
 *    7. Kỳ vọng cá nhân tại Sky-Line
 *    8. Năng lực học tập tự nhận định
 *    9. Kỹ năng giao tiếp
 *    10. Thông tin bổ sung
 * 
 * B. TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH (05 Nhóm nội dung):
 *    1. Hiểu học sinh qua góc nhìn phụ huynh
 *    2. Quá trình và năng lực học tập
 *    3. Thói quen học tập tại nhà
 *    4. Cách phụ huynh đồng hành với việc học
 *    5. Động lực, kỳ vọng và mục tiêu giáo dục
 * 
 * Chuẩn hóa 04 mức mô tả quan sát định tính (không chấm điểm số):
 * - Thể hiện rõ (CONFIDENT / THE_HIEN_RO)
 * - Đang hình thành (NORMAL / DANG_HINH_THANH)
 * - Cần tìm hiểu thêm (NEED_SUPPORT / CAN_TIM_HIEU_THEM)
 * - Chưa đủ thông tin (SPECIAL_ATTENTION / CHUA_DU_THONG_TIN)
 * 
 * Phân định nguồn minh chứng:
 * - Học sinh tự chia sẻ (STUDENT_SHARED)
 * - Phụ huynh cung cấp (PARENT_PROVIDED - tham khảo, chưa kiểm chứng)
 * - Giáo viên trực tiếp quan sát (TEACHER_OBSERVED)
 * - Giáo viên nhận định hoặc đề xuất (TEACHER_ASSESSED)
 */

export const ORIENTATION_CRITERIA_VERSION = "2026.3";

export type GradeGroupKey =
  | "KHOI_1"
  | "KHOI_2"
  | "KHOI_3"
  | "KHOI_4"
  | "KHOI_5"
  | "KHOI_6"
  | "KHOI_7"
  | "KHOI_8"
  | "KHOI_9"
  | "KHOI_10"
  | "KHOI_11"
  | "KHOI_12"
  // Tương thích ngược với các phiên bản cũ:
  | "KHOI_2_5"
  | "KHOI_7_9"
  | "KHOI_10_12";

export type RatingCode = "CONFIDENT" | "NORMAL" | "NEED_SUPPORT" | "SPECIAL_ATTENTION";

export type EvidenceSource = "STUDENT_SHARED" | "PARENT_PROVIDED" | "TEACHER_OBSERVED" | "TEACHER_ASSESSED";

export interface OrientationCriterion {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  focus: string;
  guideline: string;
  suggestedQuestions: string[];
  mandatoryCommentRatings: RatingCode[];
  sortOrder: number;
}

export interface ParentOrientationGroup {
  id: string;
  code: string;
  category: string;
  categoryLabel: string;
  title: string;
  focus: string;
  suggestedQuestions: string[];
  placeholder: string;
  sortOrder: number;
}

export interface OrientationGradeGroupConfig {
  key: GradeGroupKey;
  gradeNumber: number;
  label: string;
  subLabel: string;
  focus: string;
  gradeList: string[];
  criteria: OrientationCriterion[];
  parentGroups: ParentOrientationGroup[];
  parentPrompts: {
    groupLabel: string;
    group1_expectations: { title: string; hints: string[]; placeholder: string };
    group2_personality: { title: string; hints: string[]; placeholder: string };
    group3_support: { title: string; hints: string[]; placeholder: string };
    group4_cooperation: { title: string; hints: string[]; placeholder: string };
  };
}

export interface OrientationSummaryStructure {
  strongPoints: string;          // 1. Điểm mạnh nổi bật của học sinh
  interestsMotivation: string;   // 2. Sở thích và động lực học tập
  adaptabilityAutonomy: string;  // 3. Khả năng thích nghi và tự lập
  difficultiesNeeds: string;     // 4. Khó khăn, nhu cầu cần quan tâm
  studentExpectations: string;   // 5. Kỳ vọng của học sinh
  parentExpectations: string;    // 6. Kỳ vọng của phụ huynh
  alignmentDifferences: string;  // 7. Những điểm tương đồng hoặc khác biệt giữa hai nguồn thông tin
  initialRecommendations: string;// 8. Đề xuất hỗ trợ và định hướng giáo dục ban đầu
  verificationItems: string;     // 9. Nội dung cần xác minh hoặc trao đổi chuyên môn
}

export const ORIENTATION_EVIDENCE_SOURCES: Record<EvidenceSource, { code: EvidenceSource; label: string; subText: string; isVerified: boolean }> = {
  STUDENT_SHARED: {
    code: "STUDENT_SHARED",
    label: "Học sinh tự chia sẻ",
    subText: "Lời nói, cảm nghĩ và chia sẻ trực tiếp của học sinh trong buổi phỏng vấn",
    isVerified: true
  },
  PARENT_PROVIDED: {
    code: "PARENT_PROVIDED",
    label: "Phụ huynh cung cấp",
    subText: "Thông tin gia đình cung cấp (nguồn tham khảo, chưa tự động xem là đã kiểm chứng)",
    isVerified: false
  },
  TEACHER_OBSERVED: {
    code: "TEACHER_OBSERVED",
    label: "Giáo viên trực tiếp quan sát",
    subText: "Hành vi, thái độ, phản xạ thực tế quan sát được trong suốt quá trình khảo sát",
    isVerified: true
  },
  TEACHER_ASSESSED: {
    code: "TEACHER_ASSESSED",
    label: "Giáo viên nhận định / Đề xuất",
    subText: "Đánh giá chuyên môn sư phạm và khuyến nghị giải pháp đồng hành ban đầu",
    isVerified: true
  }
};

export const ORIENTATION_GRADE_GROUPS: Record<GradeGroupKey, OrientationGradeGroupConfig> = {
`;

// Render từng khối
gradesData.forEach((item, idx) => {
  const criteriaJson = item.criteria.map((c, i) => {
    return `      {
        id: "k${item.grade}_c${c.order}",
        code: "K${item.grade}-A0${c.order}",
        name: ${JSON.stringify(c.name)},
        category: ${JSON.stringify(c.category)},
        categoryLabel: ${JSON.stringify(c.categoryLabel)},
        focus: ${JSON.stringify(c.focus)},
        guideline: ${JSON.stringify(c.guideline)},
        suggestedQuestions: ${JSON.stringify(c.questions)},
        mandatoryCommentRatings: ["NEED_SUPPORT", "SPECIAL_ATTENTION"],
        sortOrder: ${c.order}
      }`;
  }).join(",\n");

  const parentGroupsJson = item.parentGroups.map((p, i) => {
    return `      {
        id: "k${item.grade}_p${p.order}",
        code: "K${item.grade}-B0${p.order}",
        category: ${JSON.stringify(p.category)},
        categoryLabel: ${JSON.stringify(p.categoryLabel)},
        title: ${JSON.stringify(p.title)},
        focus: ${JSON.stringify(p.focus)},
        suggestedQuestions: ${JSON.stringify(p.questions)},
        placeholder: ${JSON.stringify(p.placeholder)},
        sortOrder: ${p.order}
      }`;
  }).join(",\n");

  code += `  // ${item.grade}. ${item.label.toUpperCase()} - ${item.focus}
  ${item.key}: {
    key: "${item.key}",
    gradeNumber: ${item.grade},
    label: "${item.label}",
    subLabel: "${item.subLabel}",
    focus: "${item.focus}",
    gradeList: ${JSON.stringify(item.gradeList)},
    criteria: [
${criteriaJson}
    ],
    parentGroups: [
${parentGroupsJson}
    ],
    parentPrompts: {
      groupLabel: "${item.label} (${item.focus})",
      group1_expectations: {
        title: "1. Nguyện vọng & Kỳ vọng của PHHS đối với sự phát triển của học sinh",
        hints: ${JSON.stringify(item.parentGroups[4]?.questions || item.parentGroups[0]?.questions)},
        placeholder: ${JSON.stringify(item.parentGroups[4]?.placeholder || "")}
      },
      group2_personality: {
        title: "2. Đặc điểm cá nhân, tính cách và thói quen của học sinh",
        hints: ${JSON.stringify(item.parentGroups[0]?.questions || [])},
        placeholder: ${JSON.stringify(item.parentGroups[0]?.placeholder || "")}
      },
      group3_support: {
        title: "3. Nhu cầu hỗ trợ, bồi dưỡng và đề xuất từ PHHS",
        hints: ${JSON.stringify(item.parentGroups[1]?.questions || [])},
        placeholder: ${JSON.stringify(item.parentGroups[1]?.placeholder || "")}
      },
      group4_cooperation: {
        title: "4. Cơ chế phối hợp và đồng hành giữa gia đình và nhà trường",
        hints: ${JSON.stringify(item.parentGroups[3]?.questions || [])},
        placeholder: ${JSON.stringify(item.parentGroups[3]?.placeholder || "")}
      }
    }
  },\n`;
});

// Alias cũ:
code += `  // Alias tương thích ngược
  get KHOI_2_5() { return this.KHOI_2; },
  get KHOI_7_9() { return this.KHOI_8; },
  get KHOI_10_12() { return this.KHOI_11; }
};

/**
 * Lấy cấu hình nhóm khối dựa trên khối lớp (grade) của học sinh
 * Hỗ trợ nhận diện chính xác từng khối từ 1 đến 12
 */
export function getGradeGroupKey(grade?: string | number | null): GradeGroupKey {
  if (!grade) return "KHOI_1";
  const str = String(grade).trim().toLowerCase();

  // Nhận diện từng khối chính xác
  if (str === "1" || str === "k1" || str === "lớp 1" || str === "khối 1" || str.includes("khối 1") || str.includes("lớp 1")) {
    if (!str.includes("10") && !str.includes("11") && !str.includes("12")) return "KHOI_1";
  }
  if (str === "2" || str === "k2" || str === "lớp 2" || str === "khối 2" || str.includes("khối 2") || str.includes("lớp 2")) return "KHOI_2";
  if (str === "3" || str === "k3" || str === "lớp 3" || str === "khối 3" || str.includes("khối 3") || str.includes("lớp 3")) return "KHOI_3";
  if (str === "4" || str === "k4" || str === "lớp 4" || str === "khối 4" || str.includes("khối 4") || str.includes("lớp 4")) return "KHOI_4";
  if (str === "5" || str === "k5" || str === "lớp 5" || str === "khối 5" || str.includes("khối 5") || str.includes("lớp 5")) return "KHOI_5";
  if (str === "6" || str === "k6" || str === "lớp 6" || str === "khối 6" || str.includes("khối 6") || str.includes("lớp 6")) return "KHOI_6";
  if (str === "7" || str === "k7" || str === "lớp 7" || str === "khối 7" || str.includes("khối 7") || str.includes("lớp 7")) return "KHOI_7";
  if (str === "8" || str === "k8" || str === "lớp 8" || str === "khối 8" || str.includes("khối 8") || str.includes("lớp 8")) return "KHOI_8";
  if (str === "9" || str === "k9" || str === "lớp 9" || str === "khối 9" || str.includes("khối 9") || str.includes("lớp 9")) return "KHOI_9";
  if (str === "10" || str === "k10" || str === "lớp 10" || str === "khối 10" || str.includes("khối 10") || str.includes("lớp 10")) return "KHOI_10";
  if (str === "11" || str === "k11" || str === "lớp 11" || str === "khối 11" || str.includes("khối 11") || str.includes("lớp 11")) return "KHOI_11";
  if (str === "12" || str === "k12" || str === "lớp 12" || str === "khối 12" || str.includes("khối 12") || str.includes("lớp 12")) return "KHOI_12";

  // Thử parse số nguyên
  const match = str.match(/\\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 12) {
      return ("KHOI_" + num) as GradeGroupKey;
    }
  }

  return "KHOI_1";
}

/**
 * Trả về toàn bộ cấu hình nhóm khối của học sinh
 */
export function getOrientationGradeGroupConfig(grade?: string | number | null): OrientationGradeGroupConfig {
  const key = getGradeGroupKey(grade);
  return ORIENTATION_GRADE_GROUPS[key] || ORIENTATION_GRADE_GROUPS.KHOI_1;
}

/**
 * Bảng 04 mức mô tả quan sát chuẩn hóa cho phiếu định hướng (không chấm điểm số)
 */
export const ORIENTATION_RATING_OPTIONS: Record<
  RatingCode,
  {
    code: RatingCode;
    label: string;
    subText: string;
    colorClass: string;
    badgeClass: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
  }
> = {
  CONFIDENT: {
    code: "CONFIDENT",
    label: "Thể hiện rõ",
    subText: "Thể hiện nổi bật, tự tin, chủ động và vững vàng",
    colorClass: "teal",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-300 font-semibold",
    bgClass: "bg-teal-50/70",
    borderClass: "border-teal-400",
    textClass: "text-teal-800"
  },
  NORMAL: {
    code: "NORMAL",
    label: "Đang hình thành",
    subText: "Đạt chuẩn phát triển lứa tuổi, đang dần hoàn thiện nề nếp",
    colorClass: "blue",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 font-semibold",
    bgClass: "bg-blue-50/70",
    borderClass: "border-blue-400",
    textClass: "text-blue-800"
  },
  NEED_SUPPORT: {
    code: "NEED_SUPPORT",
    label: "Cần tìm hiểu thêm",
    subText: "Cần GVCN/Bộ môn quan sát sâu & hỗ trợ đồng hành ban đầu",
    colorClass: "amber",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    bgClass: "bg-amber-50/70",
    borderClass: "border-amber-400",
    textClass: "text-amber-800"
  },
  SPECIAL_ATTENTION: {
    code: "SPECIAL_ATTENTION",
    label: "Chưa đủ thông tin",
    subText: "Cần thêm thời gian tương tác hoặc xác minh chuyên môn bổ sung",
    colorClass: "purple",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
    bgClass: "bg-purple-50/70",
    borderClass: "border-purple-400",
    textClass: "text-purple-800"
  }
};

/**
 * Kiểm tra xem mức đánh giá này có bắt buộc nhập nhận xét không
 */
export function isCommentMandatory(rating: RatingCode): boolean {
  return rating === "NEED_SUPPORT" || rating === "SPECIAL_ATTENTION";
}
`;

fs.writeFileSync(path.join(__dirname, '../src/lib/orientation/criteria-config.ts'), code, 'utf8');
console.log("Đã tạo thành công src/lib/orientation/criteria-config.ts!");
