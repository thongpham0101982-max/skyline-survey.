const fs = require("fs");
const path = "src/app/admin/surveys/[id]/results/client.tsx";
let content = fs.readFileSync(path, "utf8");

const replacement = `{q.chartData && q.chartData.length > 0 && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                     <div className="h-48 w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={q.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" tick={{fontSize: 10, fill: "#64748b"}} axisLine={false} tickLine={false} />
                           <YAxis allowDecimals={false} tick={{fontSize: 10, fill: "#64748b"}} axisLine={false} tickLine={false} />
                           <Tooltip cursor={{fill: "#f1f5f9"}} contentStyle={{borderRadius: "12px", border: "none", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"}} />
                           <Bar dataKey="value" name="Số lượng" radius={[4, 4, 0, 0]}>
                             {q.chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="bg-white rounded-xl border border-slate-100 p-2 overflow-y-auto max-h-48 custom-scrollbar">
                        <table className="w-full text-[10px] text-left">
                           <thead>
                              <tr className="border-b border-slate-50">
                                 <th className="pb-1 font-black text-slate-400 uppercase tracking-wider">Mức/Lựa chọn</th>
                                 <th className="pb-1 font-black text-slate-400 uppercase tracking-wider text-right">SL</th>
                                 <th className="pb-1 font-black text-slate-400 uppercase tracking-wider text-right">%</th>
                              </tr>
                           </thead>
                           <tbody>
                              {q.chartData.map((item) => (
                                 <tr key={item.name} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50">
                                    <td className="py-1 font-bold text-slate-600">{item.name}</td>
                                    <td className="py-1 font-black text-slate-900 text-right">{item.value}</td>
                                    <td className="py-1 font-bold text-indigo-500 text-right">{q.count > 0 ? ((item.value / q.count) * 100).toFixed(1) : 0}%</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                   </div>
                 )}`;

const target = "{q.chartData && q.chartData.length > 0 && (\\s+<div className=\"h-48 w-full mt-auto\">[\\s\\S]*?<\\/div>\\s+)}";
const regex = new RegExp(target);
content = content.replace(regex, replacement);

fs.writeFileSync(path, content, "utf8");
