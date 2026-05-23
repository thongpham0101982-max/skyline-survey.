const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

// 1. Update the header
const oldHeader = `{isPsychSubject && (
            <>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>
            </>
        )}`;
const newHeader = `{isChildDevSubject && (
            <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>
        )}
        {isPsychSubject && (
            <>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>
                <th className="px-4 py-4 font-bold text-amber-800 bg-amber-50/50 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>
            </>
        )}`;

code = code.replace(oldHeader, newHeader);

// 2. Remove the comment from the Form column and add it to the new column
const oldFormColumnContent = `                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Đạt: {st.scoreVals.filter((v: string) => v === "3").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">K.Đạt: {st.scoreVals.filter((v: string) => v === "2").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-slate-500">K.Làm: {st.scoreVals.filter((v: string) => v === "1").length}</span>
                          </div>
                          {st.commentVals && st.commentVals[0] && (
                              <div className="text-[11px] text-slate-500 line-clamp-2 italic px-2 bg-slate-50 rounded p-1 border border-slate-100">"{st.commentVals[0]}"</div>
                          )}`;

const newFormColumnContent = `                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Đạt: {st.scoreVals.filter((v: string) => v === "3").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">K.Đạt: {st.scoreVals.filter((v: string) => v === "2").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-slate-500">K.Làm: {st.scoreVals.filter((v: string) => v === "1").length}</span>
                          </div>`;

code = code.replace(oldFormColumnContent, newFormColumnContent);

// 3. Add the new td for the comment
const oldTableRow = `              </div>
            ) : isPsychSubject ? (`;

const newTableRow = `              </div>
            ) : isPsychSubject ? (`;

// Wait, we need to append a td right AFTER the Form Khảo Sát td, but conditionally.
// The Form Khảo sát td ends with: `</td>` then we should add `{isChildDevSubject && (<td ...>...</td>)}`
// Let's find exactly where to insert.
