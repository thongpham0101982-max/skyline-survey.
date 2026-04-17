const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

c = c.replace(/const \[selectedAssignmentId, setSelectedAssignmentId\] = useState<string>\(""\);/, `const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");\n    const [isUnlockRequestOpen, setIsUnlockRequestOpen] = useState(false);\n    const [unlockReason, setUnlockReason] = useState("");`);

const dupRegex = /\s*const handleUnlockRequestSubmit = async \(\) => \{[\s\S]*?else alert\("Lỗi: " \+ \(await r\.json\(\)\)\.error\);\n  \};\s*/;
c = c.replace(dupRegex, '\n    '); // Replaces the first occurrence only

// We also need fetchAssignments. It seems missing! 
// Let's add it to handleUnlockRequestSubmit inside the second occurrence.
const fetchFix = `
    const fetchAssignments = () => {
        fetch("/api/teacher-assessments?action=getAssignments")
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setAssignments(data);
                else setAssignments([]);
            });
    };
    const handleUnlockRequestSubmit`;
c = c.replace(/const handleUnlockRequestSubmit/, fetchFix);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed syntax duplication and context');
