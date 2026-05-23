const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

const oldCode = `{st.scoreVals?.length >= 1 ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Đã lưu điểm</span>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}`;

const newCode = `{st.scoreVals?.length >= 1 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">Đã lưu điểm</span>
                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Đạt: {st.scoreVals.filter((v: string) => v === "3").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">K.Đạt: {st.scoreVals.filter((v: string) => v === "2").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-slate-500">K.Làm: {st.scoreVals.filter((v: string) => v === "1").length}</span>
                          </div>
                          {st.commentVals && st.commentVals[0] && (
                              <div className="text-[11px] text-slate-500 line-clamp-2 italic px-2 bg-slate-50 rounded p-1 border border-slate-100">"{st.commentVals[0]}"</div>
                          )}
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);
console.log("Patched client.tsx successfully");
