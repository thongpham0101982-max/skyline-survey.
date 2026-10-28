import { prisma } from "../src/lib/db";
import { ORIENTATION_GRADE_GROUPS, GradeGroupKey } from "../src/lib/orientation/criteria-config";

async function main() {
  const pAny = prisma as any;
  console.log("=== SYNCING ORIENTATION CRITERIA FOR 5 GRADE GROUPS ===");

  for (const [groupKey, groupConfig] of Object.entries(ORIENTATION_GRADE_GROUPS)) {
    console.log(`Processing group ${groupKey}: ${groupConfig.label} (${groupConfig.criteria.length} criteria)`);

    for (const crit of groupConfig.criteria) {
      const existing = await pAny.orientationQuestionCatalog.findFirst({
        where: {
          OR: [
            { id: crit.id },
            { gradeGroup: groupKey, category: crit.category },
            { id: `crit_${groupKey.toLowerCase()}_${crit.sortOrder}` }
          ]
        }
      });

      const questionText = crit.name;
      const suggestedGuideline = crit.guideline;
      const sampleAnswers = JSON.stringify({
        suggestedQuestions: crit.suggestedQuestions,
        mandatoryCommentRatings: crit.mandatoryCommentRatings,
        criterionId: crit.id,
        version: "2026.2"
      });

      if (existing) {
        await pAny.orientationQuestionCatalog.update({
          where: { id: existing.id },
          data: {
            gradeGroup: groupKey,
            grade: groupConfig.label,
            category: crit.category,
            categoryLabel: crit.categoryLabel,
            questionText,
            suggestedGuideline,
            sampleAnswers,
            sortOrder: crit.sortOrder,
            status: "ACTIVE"
          }
        });
        console.log(`  Updated criterion: ${crit.name} (${crit.category})`);
      } else {
        await pAny.orientationQuestionCatalog.create({
          data: {
            id: `crit_${groupKey.toLowerCase()}_${crit.sortOrder}_${Date.now()}`,
            gradeGroup: groupKey,
            grade: groupConfig.label,
            category: crit.category,
            categoryLabel: crit.categoryLabel,
            questionText,
            suggestedGuideline,
            sampleAnswers,
            sortOrder: crit.sortOrder,
            status: "ACTIVE"
          }
        });
        console.log(`  Created criterion: ${crit.name} (${crit.category})`);
      }
    }
  }

  const allActive = await pAny.orientationQuestionCatalog.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, gradeGroup: true, category: true, questionText: true }
  });
  console.log(`Done! Total active criteria in catalog: ${allActive.length}`);
}

main()
  .catch((e) => {
    console.error("Sync error:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
