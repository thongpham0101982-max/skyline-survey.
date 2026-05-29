import { prisma } from "./src/lib/db";

const data = {
  "24 đến 36 tháng": {
    "PHÁT TRIỂN NHẬN THỨC": [
      "Đặt câu hỏi về sự thay đổi của các sự vật, hiện tượng gần gũi/ quen thuộc",
      "Sử dụng các phương tiện khác nhau tác động đồ vật, sự vật để khám phá chúng",
      "Nhận biết được được sự vật, đồ vật gần gũi khi sờ nắn, nghe, ngửi, nếm ...mà không nhìn chúng.",
      "Nhận biết được tên, đặc điểm bên ngoài của các đồ vật, con vật, cây cối quen thuộc",
      "Nhận xét về 1 số điểm giống nhau hoặc khác nhau của các đồ vật, các con vật, cây cối quen thuộc"
    ],
    "PHÁT TRIỂN NGÔN NGỮ": [
      "Nghe hiểu lời nói và thực hiện được nhiệm vụ. Hiểu nội dung câu hỏi và sử dụng ngôn ngữ để trả lời được các câu hỏi: Ai? Cái gì? Làm gì?",
      "Đọc được bài thơ, ca dao với sự giúp đỡ của cô giáo.",
      "Sử dụng lời nói (câu đơn 5-7 tiếng) với các mục đích khác nhau: Chào hỏi, trò chuyện, bày tỏ nhu cầu, hỏi về các vấn đề quan tâm..."
    ],
    "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI": [
      "Nói được tên mình",
      "Thể hiện điều mình thích và không thích",
      "Nhận biết được trạng thái cảm xúc : vui, buồn, sợ hãi.",
      "Thực hiện được một số yêu cầu của cô.",
      "Chơi thân thiện cạnh trẻ khác."
    ]
  },
  "Mẫu giáo bé": {
    "PHÁT TRIỂN NHẬN THỨC": [
      "Chú ý quan sát các sự vật, hiện tượng xung quanh.",
      "Thích tìm hiểu sự thay đổi của các sự vật, hiện tượng xung quanh",
      "Giải quyết vấn đề theo nhiều cách khác nhau dựa trên kiến thức và kinh nghiệm",
      "Thể hiện hiểu biết/phát hiện về sự vật, hiện tượng xung quanh bằng các cách khác nhau",
      "Tìm ra điểm khác nhau và giống nhau của các sự vật, hiện tượng gần gũi xung quanh"
    ],
    "PHÁT TRIỂN NGÔN NGỮ": [
      "Nghe hiểu lời nói và thực hiện được nhiệm vụ.",
      "Biết lắng nghe và trả lời các câu hỏi của người đối thoại.",
      "Nói to, rõ ràng.",
      "Sử dụng được các câu đơn, câu ghép.",
      "Kể lại được những sự việc, câu chuyện đơn giản đã diễn ra, đã thấy, đã nghe.",
      "Đọc thuộc bài thơ, ca dao, đồng dao đơn giản.",
      "Thích vẽ, 'viết' nguệch ngoạc."
    ],
    "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI": [
      "Thực hiện được các quy định của lớp",
      "Chú ý nghe khi cô, bạn nói",
      "Biết chào hỏi và nói cảm ơn, xin lỗi khi có nhắc nhở",
      "Cùng chơi với các bạn trong các trò chơi theo nhóm nhỏ"
    ]
  },
  "Mẫu giáo nhỡ": {
    "PHÁT TRIỂN NHẬN THỨC": [
      "Giải quyết vấn đề theo nhiều cách khác nhau dựa trên kiến thức và kinh nghiệm",
      "Áp dụng được kiến thức và kinh nghiệm vào trong các tình huống phù hợp của cuộc sống.",
      "Thể hiện hiểu biết/phát hiện về sự vật, hiện tượng xung quanh bằng các cách khác nhau",
      "Giải thích mối quan hệ đơn giản của sự vật, hiện tượng xung quanh",
      "Tìm ra điểm khác nhau và giống nhau của các sự vật, hiện tượng gần gũi xung quanh"
    ],
    "PHÁT TRIỂN NGÔN NGỮ": [
      "Nghe hiểu và thực hiện được 2,3 yêu cầu liên tiếp.",
      "Lắng nghe và trao đổi lại với người đối thoại.",
      "Nói to, rõ ràng, phù hợp với hoàn cảnh; phát âm chuẩn.",
      "Sử dụng được nhiều loại câu khác nhau trong giao tiếp (câu đơn, câu ghép, câu khẳng định, câu phủ định).",
      "Kể lại được những sự việc, câu chuyện theo trình tự, có mở đầu- kết thúc.",
      "Đọc thuộc bài thơ, ca dao, đồng dao.",
      "Cầm sách đúng chiều và giở từng trang để xem tranh ảnh."
    ],
    "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI": [
      "Biết nói cảm ơn, xin lỗi, chào hỏi lễ phép",
      "Chú ý khi cô, bạn nói",
      "Biết chờ đến lượt khi được nhắc nhở",
      "Thực hiện được một số quy định của lớp.",
      "Hoàn thành công việc được giao (trực nhật, dọn đồ chơi)"
    ]
  },
  "Mẫu giáo lớn": {
    "PHÁT TRIỂN NHẬN THỨC": [
      "Biết quan sát và “ghi lại” các biểu hiện khi tìm hiểu sự vật, hiện tượng xung quanh.",
      "Mô tả được các quá trình biến đổi/thay đổi của sự vật, hiện tượng xung quanh.",
      "Giải thích mối quan hệ đơn giản của sự vật, hiện tượng xung quanh",
      "Đưa ra các dự đoán, suy luận dựa trên kết quả khám phá.",
      "Sử dụng an toàn và có trách nhiệm với một số thiết bị công nghệ đơn giản trong cuộc sống hằng ngày"
    ],
    "PHÁT TRIỂN NGÔN NGỮ": [
      "Nghe hiểu lời nói và thực hiện được các yêu cầu trong hoạt động tập thể.",
      "Lắng nghe và trao đổi lại với người đối thoại.",
      "Kể lại được những sự việc, câu chuyện theo trình tự để người nghe có thể hiểu được.",
      "Sử dụng được nhiều loại câu khác nhau trong giao tiếp (câu đơn, câu ghép, câu khẳng định, câu phủ định, câu mệnh lệnh).",
      "Đọc biểu cảm bài thơ, ca dao, đồng dao.",
      "Điều chỉnh giọng nói phù hợp với ngữ cảnh.",
      "Biết cách 'đọc sách' từ trái sang phải, từ trên xuống dưới, từ đầu sách đến cuối sách.",
      "Nhận dạng các chữ cái trong bảng chữ cái tiếng Việt.",
      "Tô, đồ các nét chữ, số."
    ],
    "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI": [
      "Biết vâng lời, giúp đỡ cô những việc vừa sức",
      "Cố gắng hoàn thành công việc được giao",
      "Thực hiện được một số quy định của lớp.",
      "Biết nói cảm ơn, xin lỗi, chào hỏi lễ phép",
      "Chú ý khi nghe cô, bạn nói, không ngắt lời người khác.",
      "Biết chờ đến lượt"
    ]
  }
};

async function main() {
  const ageGroups = Object.keys(data);
  for (const ageGroup of ageGroups) {
    console.log(`Seeding Turso for group: ${ageGroup}`);

    // 1. Delete existing criteria for this age group in PROBATION areas
    await prisma.preschoolDevCriteria.deleteMany({
      where: {
        ageGroup,
        area: {
          type: "PROBATION"
        }
      }
    });

    // 2. Fetch or create the areas
    for (const [areaName, criteriaList] of Object.entries(data[ageGroup])) {
      let area = await prisma.preschoolDevArea.findFirst({
        where: { name: areaName, type: "PROBATION" }
      });
      
      if (!area) {
        area = await prisma.preschoolDevArea.create({
          data: {
            name: areaName,
            description: `Đánh giá sự ${areaName.toLowerCase()}`,
            type: "PROBATION"
          }
        });
      }

      // Prefix for codes
      let codePrefix = "";
      if (ageGroup === "24 đến 36 tháng") codePrefix = "PR_2436";
      if (ageGroup === "Mẫu giáo bé") codePrefix = "PR_MGB";
      if (ageGroup === "Mẫu giáo nhỡ") codePrefix = "PR_MGN";
      if (ageGroup === "Mẫu giáo lớn") codePrefix = "PR_MGL";
      
      let areaCode = "";
      if (areaName.includes("NHẬN THỨC")) areaCode = "NT";
      if (areaName.includes("NGÔN NGỮ")) areaCode = "NN";
      if (areaName.includes("TÌNH CẢM")) areaCode = "TC";

      // 3. Create criteria
      for (let i = 0; i < criteriaList.length; i++) {
        await prisma.preschoolDevCriteria.create({
          data: {
            code: `${codePrefix}_${areaCode}_${i + 1}`,
            name: criteriaList[i],
            ageGroup,
            areaId: area.id
          }
        });
      }
    }
    console.log(`Finished ${ageGroup}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
