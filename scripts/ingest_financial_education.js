const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const JSON_PATH = path.resolve(__dirname, "curriculum_75_periods.json");

async function seedDatabase(client, data) {
  const subjectId = "spec_sub_fin_edu";
  const currId = "spec_curr_fin_k12";
  const versionId = "spec_ver_fin_v1_0";
  const academicYearId = "AY-2026";

  // 1. Insert SpecialSubject: FIN_EDU
  await client.execute({
    sql: `INSERT INTO "SpecialSubject" (id, code, name, levels, campuses, description, icon, color, status, sortOrder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            levels = excluded.levels,
            campuses = excluded.campuses,
            description = excluded.description,
            icon = excluded.icon,
            color = excluded.color,
            status = excluded.status;`,
    args: [
      subjectId,
      "FIN_EDU",
      "Giáo dục tài chính cá nhân",
      "PRIMARY,MIDDLE,HIGH",
      "ALL",
      "Phân hệ Quản lý Môn học đặc thù Giáo dục tài chính cá nhân Sky-Line",
      "Coins",
      "#003B3A",
      "ACTIVE",
      1
    ]
  });

  // 2. Insert SpecialCurriculum for Primary
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            level = excluded.level,
            targetGrades = excluded.targetGrades,
            status = excluded.status;`,
    args: [
      currId,
      subjectId,
      "CURR_FIN_PRIMARY",
      "Khung chương trình Giáo dục tài chính Khối Tiểu học",
      "PRIMARY",
      "1,2,3,4,5",
      "ACTIVE"
    ]
  });

  // 3. Insert SpecialCurriculum placeholders for Middle and High school (NO fake lesson data)
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            level = excluded.level,
            targetGrades = excluded.targetGrades,
            status = excluded.status;`,
    args: [
      "spec_curr_fin_middle",
      subjectId,
      "CURR_FIN_MIDDLE",
      "Khung chương trình Giáo dục tài chính Khối THCS (Chờ phê duyệt)",
      "MIDDLE",
      "6,7,8,9",
      "DRAFT"
    ]
  });

  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            level = excluded.level,
            targetGrades = excluded.targetGrades,
            status = excluded.status;`,
    args: [
      "spec_curr_fin_high",
      subjectId,
      "CURR_FIN_HIGH",
      "Khung chương trình Giáo dục tài chính Khối THPT (Chờ phê duyệt)",
      "HIGH",
      "10,11,12",
      "DRAFT"
    ]
  });

  // 4. Insert SpecialCurriculumVersion v1.0
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculumVersion" (id, curriculumId, versionCode, academicYearId, status, description, sourceDocument, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(curriculumId, versionCode) DO UPDATE SET
            status = excluded.status,
            description = excluded.description,
            sourceDocument = excluded.sourceDocument;`,
    args: [
      versionId,
      currId,
      "v1.0",
      academicYearId,
      "PUBLISHED",
      "Phiên bản chuẩn hóa 75 tiết Khối 1-5 năm học 2026-2027",
      "KHUNG CHƯƠNG TRÌNH QUẢN LÍ TÀI CHÍNH KHỐI TIỂU HỌC.docx"
    ]
  });

  const gradeOverallGoals = {
    "1": "Chương trình Quản lí tài chính lớp 1 giúp học sinh bước đầu hình thành nhận thức về giá trị của đồng tiền, biết chi tiêu hợp lí, tiết kiệm và chia sẻ.",
    "2": "Giúp học sinh nhận diện các mệnh giá tiền Việt Nam và biết trân trọng sức lao động của cha mẹ. Rèn luyện kỹ năng phân biệt Cần và Muốn.",
    "3": "Giúp học sinh bước đầu hiểu vai trò của tiền trong cuộc sống; biết trân trọng giá trị lao động; hình thành thói quen chi tiêu hợp lí, tiết kiệm.",
    "4": "Hình thành nhận thức đúng về giá trị của tiền và tài chính cá nhân, rèn luyện tư duy tiêu dùng thông minh và sống có trách nhiệm.",
    "5": "Giúp học sinh hình thành năng lực ra quyết định tài chính thông minh, biết quản lí tiền cá nhân, an toàn số và thực hiện dự án tài chính."
  };

  let totalInserted = 0;

  for (const grade of ["1", "2", "3", "4", "5"]) {
    const configId = `spec_cfg_fin_g${grade}`;
    await client.execute({
      sql: `INSERT INTO "SpecialSubjectGradeConfig" (id, versionId, grade, totalPeriods, periodMinutes, overallGoal, evalCycle, evalScaleType, summaryFormula, isLocked, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(versionId, grade) DO UPDATE SET
              totalPeriods = excluded.totalPeriods,
              periodMinutes = excluded.periodMinutes,
              overallGoal = excluded.overallGoal,
              evalCycle = excluded.evalCycle,
              evalScaleType = excluded.evalScaleType,
              summaryFormula = excluded.summaryFormula;`,
      args: [
        configId,
        versionId,
        grade,
        15,
        35,
        gradeOverallGoals[grade],
        "PER_LESSON",
        "QUALITATIVE_3", // Tốt / Đạt / Cần cố gắng
        "MOST_FREQUENT",
        0
      ]
    });

    const lessons = data[grade] || [];
    const topicsMap = new Map();

    for (const item of lessons) {
      const topicName = item.topicName || `Chủ đề Khối ${grade}`;
      const topicCode = `TOPIC_G${grade}_${topicName.slice(0, 15).toUpperCase().replace(/\s+/g, "_")}`;
      if (!topicsMap.has(topicName)) {
        const topicId = `topic_g${grade}_${topicsMap.size + 1}`;
        await client.execute({
          sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(versionId, grade, code) DO UPDATE SET name = excluded.name;`,
          args: [topicId, versionId, grade, topicCode, topicName, topicsMap.size + 1]
        });
        topicsMap.set(topicName, topicId);
      }

      const assignedTopicId = topicsMap.get(topicName);
      const lessonId = `les_fin_g${grade}_p${String(item.periodIndex).padStart(2, "0")}`;

      await client.execute({
        sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, mainActivities, objectives, requirements, expectedProduct, isProject, projectMinPeriods, status, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT(versionId, grade, periodIndex) DO UPDATE SET
                topicId = excluded.topicId,
                lessonName = excluded.lessonName,
                mainActivities = excluded.mainActivities,
                objectives = excluded.objectives,
                requirements = excluded.requirements,
                expectedProduct = excluded.expectedProduct,
                isProject = excluded.isProject;`,
        args: [
          lessonId,
          versionId,
          assignedTopicId,
          grade,
          item.periodIndex,
          item.lessonName,
          item.mainActivities,
          item.objectives,
          item.requirements,
          item.expectedProduct,
          item.isProject ? 1 : 0,
          item.isProject ? 4 : 1,
          "ACTIVE"
        ]
      });
      totalInserted++;
    }
  }

  console.log(`Successfully seeded Special Subject, Curriculums, GradeConfigs, Topics, and ${totalInserted} Lessons!`);
}

async function main() {
  const jsonRaw = fs.readFileSync(JSON_PATH, "utf-8").replace(/^\uFEFF/, "");
  const data = JSON.parse(jsonRaw);

  console.log("--- Seeding LOCAL SQLite ---");
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await seedDatabase(localClient, data);

  console.log("--- Seeding TURSO Cloud ---");
  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await seedDatabase(cloudClient, data);
  } catch (err) {
    console.warn("Turso Cloud seeding warning:", err.message);
  }
}

main().catch(console.error);
