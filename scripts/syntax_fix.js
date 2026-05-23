const fs = require("fs");

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, "utf8");
    
    // Fix the specific broken className pattern from previous replacement
    // Pattern: className="glass-card p-6 rounded-2xl hover-lift border-slate-200" flex items-center justify-between"
    // Note: The script might have introduced multiple variants.
    
    // Fix line 380 specifically and similar ones
    content = content.replace(/className="glass-card p-6 rounded-2xl hover-lift border-slate-200" flex items-center justify-between"/g, 'className="glass-card p-6 rounded-2xl hover-lift border-slate-200 flex items-center justify-between"');
    
    // General fix for className ending prematurely before space-separated classes
    content = content.replace(/className="([^"]+)"\s+([a-zA-Z0-9\-\s]+)"/g, 'className="$1 $2"');
    
    // Let's also check for other potential broken tags
    content = content.replace(/border-slate-200"\s+flex/g, 'border-slate-200 flex');

    fs.writeFileSync(filePath, content, "utf8");
    console.log("Fixed: " + filePath);
}

["src/app/admin/input-assessments/client.tsx", "src/app/teacher/input-assessments/client.tsx"].forEach(fixFile);
