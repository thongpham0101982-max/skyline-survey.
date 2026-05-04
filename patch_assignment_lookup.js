const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
    "const assignment = assignments.find(a => a.id === selectedAssignmentId);",
    "const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);"
);

// Also need to add availableAssignments to the dependency array of the useEffect
code = code.replace(
    "}, [selectedAssignmentId, assignments]);",
    "}, [selectedAssignmentId, assignments, availableAssignments]);"
);

fs.writeFileSync(file, code);
console.log("Patched assignment lookup successfully!");
