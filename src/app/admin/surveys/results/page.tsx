import { prisma } from "@/lib/db"
import { ResultsPageClient } from "./client"

export const metadata = { title: "Kết quả Khảo sát | Skyline Academy" }
export const dynamic = "force-dynamic";

export default async function SurveyResultsListPage() {
  const periods = await prisma.surveyPeriod.findMany({
    orderBy: { startDate: "desc" },
    include: {
      academicYear: { select: { id: true, name: true } }
    }
  });

  const years = await prisma.academicYear.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { startDate: "desc" }
  });

  // Resolve N+1 queries by batching all forms and responses in single operations
  const [totalCounts, submittedCounts, npsResponsesGrouped, avgResponsesGrouped] = await Promise.all([
    prisma.surveyForm.groupBy({
      by: ['surveyPeriodId'],
      _count: { _all: true }
    }),
    prisma.surveyForm.groupBy({
      by: ['surveyPeriodId'],
      where: { status: { in: ["SUBMITTED", "submitted"] } },
      _count: { _all: true }
    }),
    prisma.surveyResponse.findMany({
      where: {
        form: { status: { in: ["SUBMITTED", "submitted"] } },
        question: { questionType: "NPS" }
      },
      select: {
        numericScore: true,
        form: { select: { surveyPeriodId: true } }
      }
    }),
    prisma.surveyResponse.findMany({
      where: {
        form: { status: { in: ["SUBMITTED", "submitted"] } },
        numericScore: { not: null },
        question: { questionType: { not: "NPS" } }
      },
      select: {
        numericScore: true,
        form: { select: { surveyPeriodId: true } }
      }
    })
  ]);

  const totalMap = Object.fromEntries(totalCounts.map(x => [x.surveyPeriodId, x._count._all]));
  const submittedMap = Object.fromEntries(submittedCounts.map(x => [x.surveyPeriodId, x._count._all]));

  const npsScoresMap = {};
  for (const resp of npsResponsesGrouped) {
    const pid = resp.form.surveyPeriodId;
    if (!npsScoresMap[pid]) npsScoresMap[pid] = [];
    if (resp.numericScore !== null) {
      npsScoresMap[pid].push(resp.numericScore);
    }
  }

  const avgScoresMap = {};
  for (const resp of avgResponsesGrouped) {
    const pid = resp.form.surveyPeriodId;
    if (!avgScoresMap[pid]) avgScoresMap[pid] = { sum: 0, count: 0 };
    if (resp.numericScore !== null) {
      avgScoresMap[pid].sum += resp.numericScore;
      avgScoresMap[pid].count++;
    }
  }

  const surveyStats = periods.map((p) => {
    const total = totalMap[p.id] ?? 0;
    const submitted = submittedMap[p.id] ?? 0;

    const npsScores = npsScoresMap[p.id] ?? [];
    let promoters = 0;
    let detractors = 0;
    let totalNps = 0;
    for (const score of npsScores) {
      totalNps++;
      if (score >= 9) promoters++;
      else if (score < 7) detractors++;
    }
    const nps = totalNps > 0 ? Math.round(((promoters - detractors) / totalNps) * 100) : null;

    const avgStat = avgScoresMap[p.id] ?? { sum: 0, count: 0 };
    const avgScore = avgStat.count > 0 ? (avgStat.sum / avgStat.count).toFixed(2) : "0.00";

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      isActive: p.isActive,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      academicYear: p.academicYear,
      totalForms: total,
      submittedForms: submitted,
      npsScore: nps,
      avgScore: avgScore
    };
  });

  return (
    <div className="space-y-6 pb-20">
      <ResultsPageClient 
        surveyStats={JSON.parse(JSON.stringify(surveyStats))} 
        years={JSON.parse(JSON.stringify(years))} 
      />
    </div>
  );
}
