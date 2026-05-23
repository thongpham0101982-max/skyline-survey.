const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

const oldCode = `        {isPsychSubject && (
            <>
                <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[0] || "-"}</div>
                </td>
                <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[1] || "-"}</div>
                </td>
            </>
        )}`;

const newCode = `        {isChildDevSubject && (
            <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium italic">
                    {st.commentVals?.[0] ? \`"\${st.commentVals[0]}"\` : "-"}
                </div>
            </td>
        )}
        {isPsychSubject && (
            <>
                <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[0] || "-"}</div>
                </td>
                <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[1] || "-"}</div>
                </td>
            </>
        )}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);
console.log("Patched td correctly");
