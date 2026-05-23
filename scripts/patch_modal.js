const fs = require("fs");
const file_path = "src/app/teacher/input-assessments/client.tsx";
let lines = fs.readFileSync(file_path, "utf-8").split("\n");

const modalCode = `      {isThinkingSkillsSubject && activeThinkingSkillsStudent && isThinkingSkillsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <ThinkingSkillsForm 
            student={activeThinkingSkillsStudent}
            onSave={(st, scores, comments) => {
              saveStudentScore(st, scores, comments);
              setIsThinkingSkillsModalOpen(false);
            }}
            onClose={() => setIsThinkingSkillsModalOpen(false)}
          />
        </div>
      )}`;

// Insert right before the last closing </div>\n    );
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i] && lines[i].includes("</div>") && lines[i+1] && lines[i+1].includes(");")) {
        lines.splice(i, 0, modalCode);
        break;
    }
}

fs.writeFileSync(file_path, lines.join("\n"));
console.log("Added modal to client.tsx");
