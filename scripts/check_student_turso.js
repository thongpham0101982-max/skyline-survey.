const { createClient } = require('@libsql/client');
const client = createClient({
  url: "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw",
});

async function run() {
  try {
    const student = await client.execute("SELECT * FROM Student WHERE studentName LIKE '%Khánh%'");
    console.log('Student:', JSON.stringify(student.rows, null, 2));
    if (student.rows.length > 0) {
      const forms = await client.execute(`SELECT * FROM SurveyForm WHERE studentId = '${student.rows[0].id}'`);
      console.log('Forms:', JSON.stringify(forms.rows, null, 2));
      if (forms.rows.length > 0) {
        const qs = await client.execute(`SELECT * FROM SurveyQuestion WHERE surveyPeriodId = '${forms.rows[0].surveyPeriodId}'`);
        console.log('Questions:', JSON.stringify(qs.rows.map(q => ({ 
          text: q.questionText.substring(0,50), 
          type: q.questionType,
          options: q.options 
        })), null, 2));
      }
    }
  } catch (e) {
    console.error(e);
  }
}

run();
