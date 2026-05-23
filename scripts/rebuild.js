const fs = require('fs');

const clientPath = 'src/app/admin/input-assessments/client.tsx';
const currentClient = fs.readFileSync(clientPath, 'utf8');
const lines = currentClient.split(/\r?\n/);
let headerLines = [];

for(let i=0; i<lines.length; i++) {
   headerLines.push(lines[i]);
   if(lines[i].includes('fetchConfigs();')) {
       // Wait, deleteConfig=async...
   }
}

// Just take first 307 lines roughly. 
// Let's actually find the line that contains: "const deleteConfig=async(id:string)=>{if(!confirm("Xóa?"))return;await fetch("
let splitIdx = -1;
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('const deleteConfig=async(id:string)=>')) {
        splitIdx = i;
        break;
    }
}

if (splitIdx === -1) {
    console.log("Could not find split point in client.tsx!");
    process.exit(1);
}

const finalHeader = lines.slice(0, splitIdx + 1).join('\n');

const p1 = fs.readFileSync('C:/Users/Windows 11/.gemini/antigravity/brain/f911a4a2-e742-4a89-ae68-dd4df8f53613/scratch/part1.txt', 'utf8');
const p2 = fs.readFileSync('C:/Users/Windows 11/.gemini/antigravity/brain/f911a4a2-e742-4a89-ae68-dd4df8f53613/scratch/part2.txt', 'utf8');
const p3 = fs.readFileSync('C:/Users/Windows 11/.gemini/antigravity/brain/f911a4a2-e742-4a89-ae68-dd4df8f53613/scratch/part3.txt', 'utf8');

const stripNum = (text) => text.split(/\r?\n/).map(l => l.replace(/^\d+:\s?/, '')).join('\n');

const newContent = finalHeader + '\n' + stripNum(p1) + '\n' + stripNum(p2) + '\n' + stripNum(p3);

fs.writeFileSync(clientPath, newContent, 'utf8');
console.log("Successfully rebuilt client.tsx!");
