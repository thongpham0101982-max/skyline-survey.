const { getPreparedCkdvData, computeCampusSummary } = require('./calculate_ckdv_progress_table.js');

const ckdvByCampus = getPreparedCkdvData();
for (const [cmp, students] of Object.entries(ckdvByCampus)) {
  const sum = computeCampusSummary(students);
  console.log(`=== Campus: ${cmp} (${students.length} HS, ${sum.totalSubjectRows} môn) ===`);
  console.log('Môn CKĐV:', sum.subCounts);
  console.log(`Tiến bộ: ${sum.totalProgress}/${sum.totalEvaluated} (${sum.progressRate})`);
  console.log(`Đạt chuẩn: ${sum.totalBenchmark}/${sum.totalEvaluated} (${sum.benchmarkRate}), TB: ${sum.totalAverage}, Dưới TB: ${sum.totalBelowAvg}`);
}
