const fs = require("fs");
const path = "src/app/admin/surveys/[id]/questions/client.tsx";
let content = fs.readFileSync(path, "utf8");

// Fix IDs
content = content.replace(/id:\s*[\r\n\s]*ew_,/g, "id: `new_${Date.now()}`,");
content = content.replace(/code: Q-,/g, "code: `Q-${Date.now()}`,");

// Fix common corrupted template literals in this specific file
const patterns = [
  { from: /Tuy chon {newQs\[qIndex\].options.length \+ 1}/g, to: "Tuy chon ${newQs[qIndex].options.length + 1}" },
  { from: /Tùy ch?n {optIndex \+ 1}/g, to: "Tùy ch?n ${optIndex + 1}" },
  { from: /Tiêu chí {q\.options\.rows\.length \+ 1}/g, to: "Tiêu chí ${q.options.rows.length + 1}" },
  { from: /C?t {q\.options\.columns\.length \+ 1}/g, to: "C?t ${q.options.columns.length + 1}" },
  { from: /activeTab === "preview" \? "hidden md:flex" : "flex"}/g, to: "${activeTab === \"preview\" ? \"hidden md:flex\" : \"flex\"}" },
  { from: /rIndex\+1/g, to: "${rIndex+1}" },
  { from: /CwS1Uv BIWbu9Qf \*/g, to: "B?T BU?C *" },
  { from: /CwS1UvIEWbu9Qf \*/g, to: "B?T BU?C *" },
  { from: /CwS1UvI/g, to: "B?T BU?C" },
  { from: /CwconfirmS/g, to: "" },
  { from: /Tuy chon \${/g, to: "Tùy ch?n ${" },
  { from: /Tuy chon {/g, to: "Tùy ch?n ${" },
  { from: /idx\+1/g, to: "${idx+1}" },
  { from: /questions\.length/g, to: "${questions.length}" },
  { from: /catLmlkf/g, to: "categories" },
  { from: /catLmlk/g, to: "categories" },
  { from: /" \+ surveyPeriodId \+ "/g, to: "${surveyPeriodId}" },
  { from: /\/admin\/surveys\//g, to: "/admin/surveys/" },
  { from: /" \+ surveyPeriodId \+ "\/publish/g, to: "`${surveyPeriodId}/publish`" },
  { from: /rIndex\+1/g, to: "${rIndex+1}" },
  { from: /String\.fromCharCode\(65\+cIndex\)/g, to: "${String.fromCharCode(65+cIndex)}" },
  { from: /opt \|\| Tùy ch?n /g, to: "opt || `Tùy ch?n ${i + 1}`" },
  { from: /idx===questions.length-1\?"HOÀN T?T":"TI?P THEO ?"/g, to: "${idx===questions.length-1?\"HOÀN T?T\":\"TI?P THEO ?\"}" },
  { from: /i===idx\?"w-4 h-2 bg-indigo-600 shadow-\[0_0_8px_rgba\(79,70,229,0.4\)\]":"w-2 h-2 bg-slate-200"/g, to: "${i===idx?\"w-4 h-2 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]\":\"w-2 h-2 bg-slate-200\"}" },
  { from: /rounded-full transition-all }/g, to: "rounded-full transition-all ${i===idx?\"w-4 h-2 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]\":\"w-2 h-2 bg-slate-200\"}" },
  { from: /aspect-square rounded-lg flex items-center justify-center text-\[10px\] font-black border-2 shadow-sm/g, to: "aspect-square rounded-lg flex items-center justify-center text-[10px] font-black border-2 shadow-sm ${n <= 3 ? \"border-red-200 bg-red-50 text-red-600\" : n <= 6 ? \"border-amber-200 bg-amber-50 text-amber-600\" : n <= 8 ? \"border-lime-200 bg-lime-50 text-lime-600\" : \"border-emerald-200 bg-emerald-50 text-emerald-600\"}" }
];

patterns.forEach(p => {
  content = content.replace(p.from, p.to);
});

fs.writeFileSync(path, content, "utf8");
console.log("Fixed file");
