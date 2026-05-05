const fs = require("fs");
const file_path = "src/app/admin/input-assessments/client.tsx";
let content = fs.readFileSync(file_path, "utf-8");

const target = 'const openAddBatch = (pid:string) => { setTargetPeriodId(pid); setEditB(null); setBForm({ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE" }); setBModal(true) }';

const replacement = `const openAddBatch = (pid:string) => { 
    setTargetPeriodId(pid); 
    setEditB(null); 
    const period = periods.find(p => p.id === pid);
    let nextBatchNum = 1;
    if (period && period.batches && period.batches.length > 0) {
        nextBatchNum = Math.max(...period.batches.map(b => b.batchNumber)) + 1;
    }
    setBForm({ batchNumber: String(nextBatchNum), name:"", startDate:"", endDate:"", status:"ACTIVE" }); 
    setBModal(true); 
  }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file_path, content, "utf-8");
    console.log("Successfully patched openAddBatch in client.tsx");
} else {
    console.log("Could not find openAddBatch in client.tsx");
}
