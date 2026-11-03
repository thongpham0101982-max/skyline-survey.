const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({ url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/') });

async function main() {
  const currs = await client.execute("SELECT * FROM SpecialCurriculum WHERE subjectId = 'spec_sub_fin_edu';");
  console.log('Curriculums:', currs.rows);
  
  const vers = await client.execute("SELECT * FROM SpecialCurriculumVersion WHERE curriculumId IN (SELECT id FROM SpecialCurriculum WHERE subjectId = 'spec_sub_fin_edu');");
  console.log('Versions:', vers.rows);
  
  const configs = await client.execute("SELECT * FROM SpecialSubjectGradeConfig WHERE versionId IN (SELECT id FROM SpecialCurriculumVersion WHERE curriculumId IN (SELECT id FROM SpecialCurriculum WHERE subjectId = 'spec_sub_fin_edu'));");
  console.log('Configs:', configs.rows);
  
  const gradeCounts = await client.execute("SELECT grade, count(*) as lessonCount FROM SpecialLesson WHERE versionId IN (SELECT id FROM SpecialCurriculumVersion WHERE curriculumId IN (SELECT id FROM SpecialCurriculum WHERE subjectId = 'spec_sub_fin_edu')) GROUP BY grade ORDER BY grade;");
  console.log('Lessons by Grade:', gradeCounts.rows);
}

main().catch(console.error);
