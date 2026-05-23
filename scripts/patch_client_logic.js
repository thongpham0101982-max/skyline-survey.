const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

// Add selectedBatchId state
code = code.replace(
    "const [selectedPeriodId, setSelectedPeriodId] = useState<string>(\"\");\n    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(\"\");",
    "const [selectedPeriodId, setSelectedPeriodId] = useState<string>(\"\");\n    const [selectedBatchId, setSelectedBatchId] = useState<string>(\"all\");\n    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(\"\");"
);

// Add batches useMemo
code = code.replace(
    "const availableAssignments = useMemo(() => {",
    `const batches = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const bMap = new Map();
        assignments.forEach(a => {
            if (a.periodId === selectedPeriodId && a.batch) {
                bMap.set(a.batchId, a.batch);
            }
        });
        return Array.from(bMap.values());
    }, [assignments, selectedPeriodId]);

    const availableAssignments = useMemo(() => {`
);

// Update availableAssignments logic
code = code.replace(
    "return assignments.filter(a => a.periodId === selectedPeriodId);\n    }, [assignments, selectedPeriodId]);",
    "return assignments.filter(a => a.periodId === selectedPeriodId && (selectedBatchId === \"all\" || a.batchId === selectedBatchId));\n    }, [assignments, selectedPeriodId, selectedBatchId]);"
);

// Add effect to reset batch
code = code.replace(
    "// Handle cascading select\n    useEffect(() => {",
    "useEffect(() => {\n        setSelectedBatchId(\"all\");\n    }, [selectedPeriodId]);\n\n    // Handle cascading select\n    useEffect(() => {"
);

fs.writeFileSync(file, code);
console.log("State and Memo logic patched");
