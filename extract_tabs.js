const fs = require('fs');
const content = fs.readFileSync('old_client.tsx', 'utf8');
const lines = content.split('\n');
let mappingTab = [];
let subjectTab = [];
let recordingMapping = false;
let recordingSubject = false;

for (let line of lines) {
  if (line.includes('tab==="mapping"')) {
    recordingMapping = true;
  }
  if (line.includes('tab==="subjects"')) {
    recordingSubject = true;
  }
  
  if (recordingMapping) {
    mappingTab.push(line);
    if (line.includes('</div>') && mappingTab.length > 50) { // rough guess
      // Not stopping just print all
    }
  }
  if (recordingSubject) {
    subjectTab.push(line);
  }
}

fs.writeFileSync('mapping_tab.txt', mappingTab.join('\n'));
fs.writeFileSync('subject_tab.txt', subjectTab.join('\n'));
console.log("Extracted");
