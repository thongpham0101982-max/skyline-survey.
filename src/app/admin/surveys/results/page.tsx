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

  const surveyStats = await Promise.all(
    periods.map(async (p) => {
      // 1. Completion stats
      const total = await prisma.surveyForm.count({
        where: { surveyPeriodId: p.id }
      });
      const submitted = await prisma.surveyForm.count({
        where: { surveyPeriodId: p.id, status: { in: ["SUBMITTED", "submitted"] } }
      });

      // 2. NPS stats
      const npsResponses = await prisma.surveyResponse.findMany({
        where: {
          form: {
            surveyPeriodId: p.id,
            status: { in: ["SUBMITTED", "submitted"] }
          },
          question: {
            questionType: "NPS"
          }
        },
        select: { numericScore: true }
      });

      let promoters = 0;
      let detractors = 0;
      let totalNps = 0;
      for (const resp of npsResponses) {
        if (resp.numericScore !== null) {
          totalNps++;
          if (resp.numericScore >= 9) promoters++;
          else if (resp.numericScore < 7) detractors++;
        }
      }
      const nps = totalNps > 0 ? Math.round(((promoters - detractors) / totalNps) * 100) : null;

      // 3. Average rating
      const avgResponses = await prisma.surveyResponse.findMany({
        where: {
          form: {
            surveyPeriodId: p.id,
            status: { in: ["SUBMITTED", "submitted"] }
          },
          numericScore: { not: null },
          question: {
            questionType: { not: "NPS" }
          }
        },
        select: { numericScore: true }
      });

      let sum = 0;
      let count = 0;
      for (const resp of avgResponses) {
        if (resp.numericScore !== null) {
          sum += resp.numericScore;
          count++;
        }
      }
      const avgScore = count > 0 ? (sum / count).toFixed(2) : "0.00";

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
    })
  );

  return (
    <div className="space-y-6 pb-20">
      <ResultsPageClient 
        surveyStats={JSON.parse(JSON.stringify(surveyStats))} 
        years={JSON.parse(JSON.stringify(years))} 
      />
    </div>
  );
}
