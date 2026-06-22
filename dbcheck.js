const { createClient } = require('@libsql/client');
const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const tursoAuthToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const client = createClient({ url: tursoUrl, authToken: tursoAuthToken });
async function main() {
  try {
    const studentId = 'cmqlq0pmg0001w56342mvg69n';
    // Emulate what prisma does:
    // select * from PreschoolDevScore where studentId = ...
    // then include criteria (select * from PreschoolDevCriteria where id in ...)
    const scores = await client.execute("SELECT * FROM PreschoolDevScore WHERE studentId = '" + studentId + "'");
    console.log("Scores count:", scores.rows.length);
    if (scores.rows.length > 0) {
      const firstScore = scores.rows[0];
      const crit = await client.execute("SELECT * FROM PreschoolDevCriteria WHERE id = '" + firstScore.criteriaId + "'");
      console.log("First Score:", JSON.stringify(firstScore, null, 2));
      console.log("Associated Criteria:", JSON.stringify(crit.rows[0], null, 2));
    }
  } catch (e) { console.error(e); } finally { client.close(); }
}
main();
