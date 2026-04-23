const fs = require("fs"); const path = "src/app/hocsinh/hs-khaosat/lam/[formId]/client.tsx"; let content = fs.readFileSync(path, "utf8"); 

// NPS/LIKERT
content = content.replace(/\{\(\[\"RATING\", \"NPS\", \"LIKERT\"\]\.includes\(q\.questionType\?\.toUpperCase\(\)\)\) && \([\s\S]*?  \)\}/, `{[\"RATING\", \"NPS\", \"LIKERT\", \"SATISFACTION\"].includes(q.questionType?.toUpperCase()) && (
                    <div className=\"space-y-4\">
                      <div className=\"flex gap-2.5 flex-wrap justify-center sm:justify-start\">
                        {Array.from({ length: (q.ratingMax || 10) - (q.ratingMin || 0) + 1 }, (_, k) => k + (q.ratingMin || 0)).map(v => (
                          <button key={v} onClick={() => ans(q.id, v)}
                            className=\"w-12 h-12 rounded-2xl font-black text-base border-2 transition-all hover:scale-110 active:scale-90 flex items-center justify-center shadow-sm\"
                            style={{
                              background: answers[q.id] === v ? \"#BE1E2E\" : \"#f8fafc\",
                              color: answers[q.id] === v ? \"white\" : \"#475569\",
                              borderColor: answers[q.id] === v ? \"#BE1E2E\" : \"#e2e8f0\",
                              boxShadow: answers[q.id] === v ? \"0 8px 20px rgba(190,30,46,0.3)\" : \"\"
                            }}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className=\"flex justify-between px-2\">
                        <span className=\"text-[10px] text-slate-400 font-black uppercase tracking-widest\">Th?p nh?t</span>
                        <span className=\"text-[10px] text-slate-400 font-black uppercase tracking-widest\">Cao nh?t</span>
                      </div>
                    </div>
                  )}`);

// CHOICE
content = content.replace(/\{\(\[\"CHOICE\", \"MULTIPLE_CHOICE\", \"DROPDOWN\"\]\.includes\(q\.questionType\?\.toUpperCase\(\)\)\) && q\.options && \(\(\) => \{[\s\S]*?                \}\)\(\)\}/, `{[\"CHOICE\", \"MULTIPLE_CHOICE\", \"DROPDOWN\", \"RADIO\", \"SINGLE_CHOICE\"].includes(q.questionType?.toUpperCase()) && (() => {
                    let opts = []
                    try {
                      if (!q.options) { opts = [] }
                      else {
                        const parsed = JSON.parse(q.options)
                        if (Array.isArray(parsed)) opts = parsed
                        else if (parsed && typeof parsed === \"object\") opts = parsed.choices || []
                        else opts = String(q.options).split(\",\").map(s => s.trim())
                      }
                    } catch { 
                      opts = q.options ? String(q.options).split(\",\").map(s => s.trim()) : [] 
                    }
                    return (
                      <div className=\"grid grid-cols-1 gap-3\">
                        {opts.map((opt) => (
                          <button key={opt} onClick={() => ans(q.id, opt)}
                            className=\"w-full px-6 py-4.5 rounded-2xl border-2 text-left text-sm font-black transition-all flex items-center justify-between group\"
                            style={{
                              background: answers[q.id] === opt ? \"rgba(190,30,46,0.03)\" : \"#f8fafc\",
                              borderColor: answers[q.id] === opt ? \"#BE1E2E\" : \"#f1f5f9\",
                              color: answers[q.id] === opt ? \"#BE1E2E\" : \"#475569\"
                            }}>
                            {opt}
                            <div className={\`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center \${answers[q.id] === opt ? \"border-[#BE1E2E] bg-[#BE1E2E]\" : \"border-slate-200 bg-white group-hover:border-red-200\"}\`}>
                              {answers[q.id] === opt && <div className=\"w-2 h-2 bg-white rounded-full\" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })()}`);

// GRID
content = content.replace(/\{\(\[\"MC_GRID\", \"CB_GRID\"\]\.includes\(q\.questionType\?\.toUpperCase\(\)\)\) && q\.options && \(\(\) => \{[\s\S]*?                \}\)\(\)\}/, `{[\"MC_GRID\", \"CB_GRID\", \"GRID\"].includes(q.questionType?.toUpperCase()) && (() => {
                    let gridOpts = { rows: [], columns: [] }
                    try {
                      const parsed = JSON.parse(q.options || \"{}\")
                      if (parsed && typeof parsed === \"object\") {
                        gridOpts.rows = parsed.rows || []
                        gridOpts.columns = parsed.columns || []
                      }
                    } catch {}
                    const isCheckGrid = q.questionType?.toUpperCase() === \"CB_GRID\"
                    const currentGrid = answers[q.id] || {}
                    return (
                      <div className=\"overflow-x-auto -mx-4 px-4\">
                        <table className=\"w-full border-collapse\">
                          <thead>
                            <tr>
                              <th className=\"p-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6\">Tiêu chí</th>
                              {gridOpts.columns.map((col, ci) => (
                                <th key={ci} className=\"p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6 min-w-[70px]\">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className=\"divide-y divide-slate-50\">
                            {gridOpts.rows.map((row, ri) => (
                              <tr key={ri} className=\"group/row hover:bg-slate-50/50 transition-colors\">
                                <td className=\"p-4 py-6 text-sm font-bold text-slate-700 leading-tight pr-4\">{row}</td>
                                {gridOpts.columns.map((_, ci) => {
                                  const rowVal = currentGrid[ri]
                                  const isSelected = isCheckGrid ? (Array.isArray(rowVal) && rowVal.includes(ci)) : rowVal === ci
                                  return (
                                    <td key={ci} className=\"p-4 text-center\">
                                      <button
                                        onClick={() => {
                                          const nextGrid = { ...currentGrid }
                                          if (isCheckGrid) {
                                            const prev = Array.isArray(nextGrid[ri]) ? nextGrid[ri] : []
                                            nextGrid[ri] = prev.includes(ci) ? prev.filter(x => x !== ci) : [...prev, ci]
                                          } else {
                                            nextGrid[ri] = ci
                                          }
                                          ans(q.id, nextGrid)
                                        }}
                                        className={\`w-8 h-8 mx-auto flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-90 \${isSelected ? \"border-[#BE1E2E] bg-[#BE1E2E] shadow-lg shadow-red-100\" : \"border-slate-200 bg-white group-row:border-red-200\"} \${isCheckGrid ? \"rounded-xl\" : \"rounded-full\"}\`}
                                      >
                                        {isSelected && <div className={\`bg-white \${isCheckGrid ? \"w-2.5 h-2.5 rounded-[3px]\" : \"w-2.5 h-2.5 rounded-full\"}\`} />}
                                      </button>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}`);

fs.writeFileSync(path, content);
