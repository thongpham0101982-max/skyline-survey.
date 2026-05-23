const fs = require('fs');
const content = `
import { prisma } from "@/lib/db";
export default async function Page() {
  const periods = await prisma.inputAssessmentPeriod.findMany({
      where: { academicYearId: 'AY-2026' },
      include: { batches: true }
  });
  return <div>Periods: {JSON.stringify(periods)}</div>;
}
`;
fs.writeFileSync('src/app/test-db-page/page.tsx', content);
fs.mkdirSync('src/app/test-db-page', {recursive: true});
fs.writeFileSync('src/app/test-db-page/page.tsx', content);
