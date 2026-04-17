const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

c = c.replace(
  /fetch\("\/api\/teacher-assessments\?action=getAssignments"\)\s*\.then\(res => res\.json\(\)\)\s*\.then\(data => \{[^}]*setAssignments\(data\);/s,
  `fetch("/api/teacher-assessments?action=getAssignments")
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) {
                    setAssignments(data);`
);

c = c.replace(
  /if \(data\.length > 0\) \{\s*const firstPeriod = data\[0\]\.periodId;\s*setSelectedPeriodId\(firstPeriod\);\s*const firstAssign = data\.find\(\(a: any\) => a\.periodId === firstPeriod\);\s*if \(firstAssign\) setSelectedAssignmentId\(firstAssign\.id\);\s*\}\s*setLoading\(false\);\s*\}\);/,
  `if (data.length > 0) {
                        const firstPeriod = data[0].periodId;
                        setSelectedPeriodId(firstPeriod);
                        
                        const firstAssign = data.find((a: any) => a.periodId === firstPeriod);
                        if (firstAssign) setSelectedAssignmentId(firstAssign.id);
                    }
                } else {
                    console.error('API Error:', data);
                    setAssignments([]);
                }
                setLoading(false);
            });`
);

// Fix periods useMemo
c = c.replace(
  /const periods = useMemo\(\(\) => \{\s*const pMap = new Map\(\);\s*assignments\.forEach\(a => pMap\.set\(a\.periodId, a\.period\)\);\s*return Array\.from\(pMap\.values\(\)\);\s*\}, \[assignments\]\);/,
  `const periods = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const pMap = new Map();
        assignments.forEach(a => { if (a && a.period) pMap.set(a.periodId, a.period) });
        return Array.from(pMap.values());
    }, [assignments]);`
);

// Fix availableAssignments useMemo
c = c.replace(
  /const availableAssignments = useMemo\(\(\) => \{\s*return assignments\.filter\(a => a\.periodId === selectedPeriodId\);\s*\}, \[assignments, selectedPeriodId\]\);/,
  `const availableAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        return assignments.filter(a => a.periodId === selectedPeriodId);
    }, [assignments, selectedPeriodId]);`
);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed client error');
