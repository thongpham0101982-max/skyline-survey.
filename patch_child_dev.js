const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

// Deduplicate assignments and modify name for Child Dev Grade 1
const availableAssignmentsOld = `    const availableAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        return assignments.filter(a => a.periodId === selectedPeriodId && (selectedBatchId === "all" || a.batchId === selectedBatchId));
    }, [assignments, selectedPeriodId, selectedBatchId]);`;

const availableAssignmentsNew = `    const availableAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const filtered = assignments.filter(a => a.periodId === selectedPeriodId && (selectedBatchId === "all" || a.batchId === selectedBatchId));
        
        // Deduplicate and modify label for Child Dev Grade 1
        const unique = new Map();
        filtered.forEach(a => {
            const subNameNormalized = (a.subject?.name || "").toLowerCase().normalize("NFC");
            const subCode = (a.subject?.code || "").toLowerCase();
            const gradeVal = String(a.grade || "").replace("Khối ", "").trim();
            const isChildDev = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";
            
            if (isChildDev) {
                // Use a unique key based on subject and grade to deduplicate across systems
                const key = \`\${a.subjectId}-\${gradeVal}\`;
                if (!unique.has(key)) {
                    // Create a clone to safely modify the display property without mutating state
                    unique.set(key, { ...a, overrideSystemLabel: "Tất cả các hệ", overrideSystemCode: "" });
                }
            } else {
                unique.set(a.id, a);
            }
        });
        
        return Array.from(unique.values());
    }, [assignments, selectedPeriodId, selectedBatchId]);`;

code = code.replace(availableAssignmentsOld, availableAssignmentsNew);

// Update dropdown rendering to use overrideSystemLabel
const dropdownOld = `{a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.educationSystem || "Tất cả"})`;
const dropdownNew = `{a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.overrideSystemLabel || a.educationSystem || "Tất cả"})`;

code = code.replace(dropdownOld, dropdownNew);

// Update fetch to use overrideSystemCode
const fetchOld = `const systemCode = assignment.educationSystem || "";`;
const fetchNew = `const systemCode = assignment.overrideSystemCode !== undefined ? assignment.overrideSystemCode : (assignment.educationSystem || "");`;

code = code.replace(fetchOld, fetchNew);

fs.writeFileSync(file, code);
console.log("Patched client.tsx successfully");
