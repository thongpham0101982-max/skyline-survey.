const fs = require("fs");

const fixes = [
    ["?i?m", "ði?m"],
    ["T?n", "Tên"],
    ["c?t", "c?t"],
    ["S?", "S?"],
    ["NH?N X?T", "NH?N XÉT"],
    ["? x?y ra l?i", "Ð? x?y ra l?i"],
    ["L?u c?u h?nh", "Lýu c?u h?nh"],
    ["B?n c ch?c mu?n", "B?n có ch?c mu?n"],
    ["KHA I?M", "Khóa ði?m"],
    ["M KHA", "M? khóa"],
    ["ang t?ng h?p d? li?u", "Ðang t?ng h?p d? li?u"],
    ["? h?c", "H? h?c"],
    ["K? Kh?o st", "K? Kh?o sát"],
    ["Mn Kh?o st", "Môn Kh?o sát"]
];

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, "utf8");
    
    // Efficient non-looping replace
    fixes.forEach(([from, to]) => {
        const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(escaped, 'g');
        content = content.replace(re, to);
    });

    // Premium UI Overrides
    content = content.replace(/className="bg-white p-4 rounded-xl shadow-sm border/g, 'className="glass-card p-6 rounded-2xl hover-lift border-slate-200"');
    content = content.replace(/className="bg-white rounded-xl shadow-sm border overflow-hidden"/g, 'className="glass-card rounded-2xl overflow-hidden shadow-xl border-slate-200"');
    content = content.replace(/className="px-5 py-4 border-b bg-slate-50\/50"/g, 'className="px-6 py-5 border-b bg-indigo-50/40 backdrop-blur-md"');
    
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Success: " + filePath);
}

["src/app/admin/input-assessments/client.tsx", "src/app/teacher/input-assessments/client.tsx"].forEach(fixFile);
