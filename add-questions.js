const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const section = await prisma.surveySection.findFirst()
  if (!section) return console.log("No section found.")

  // LIKERT
  await prisma.surveyQuestion.create({
    data: {
      code: "Q_LIKERT_1",
      questionText: "How strongly do you agree with the school's new curriculum direction?",
      questionType: "LIKERT",
      sectionId: section.id,
      options: JSON.stringify(["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]),
      sortOrder: 10
    }
  })

  // MULTIPLE_CHOICE
  await prisma.surveyQuestion.create({
    data: {
      code: "Q_MC_1",
      questionText: "Which communication channel do you prefer most?",
      questionType: "MULTIPLE_CHOICE",
      sectionId: section.id,
      options: JSON.stringify(["Email Newsletters", "Mobile App Notifications", "SMS Messages", "Parent-Teacher Meetings"]),
      sortOrder: 11
    }
  })

  // CHECKBOX
  await prisma.surveyQuestion.create({
    data: {
      code: "Q_CB_1",
      questionText: "Which extracurricular activities is your child interested in? (Select all that apply)",
      questionType: "CHECKBOX",
      sectionId: section.id,
      options: JSON.stringify(["Sports & Athletics", "Music & Arts", "Science/Robotics Club", "Debate & Drama"]),
      sortOrder: 12
    }
  })

  // DROPDOWN
  await prisma.surveyQuestion.create({
    data: {
      code: "Q_DD_1",
      questionText: "How frequently do you review your child's progress report?",
      questionType: "DROPDOWN",
      sectionId: section.id,
      options: JSON.stringify(["Weekly", "Bi-weekly", "Monthly", "Once per term", "Never"]),
      sortOrder: 13
    }
  })

  console.log("Added advanced questions!")
}
main()