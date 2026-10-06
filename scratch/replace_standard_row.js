const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio', 'client.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const newStandardRow = `                  return (
                    <tr 
                      key={slot.id} 
                      id={\`slot-row-\${slot.id}\`}
                      className={\`hover:bg-teal-50/20 transition-all duration-200 border-b border-slate-100 \${
                        isSelected ? "bg-teal-50/60" : ""
                      } \${
                        highlightedSlotId === slot.id ? "bg-amber-100/90 ring-4 ring-amber-400 ring-offset-2 rounded-xl shadow-lg scale-[1.01]" : ""
                      }\`}
                    >
                      {(canDeleteAnySlot || (viewMode === "ADMIN" && canManageSlot(slot))) && (
                        <td className="py-3.5 px-3 text-center align-top" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSlot(slot.id)}
                            className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer mt-1"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400 text-xs align-top pt-4">
                        {index + 1}
                      </td>
                      
                      {/* Cột 1: GIÁO VIÊN & ĐƠN VỊ */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1 min-w-[170px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                              {slot.teacher?.teacherName || slot.teacherName}
                            </span>
                            {(slot.teacher?.teacherCode || slot.teacherCode) && (
                              <span className="text-[10px] font-mono text-teal-800 bg-teal-50/90 px-1 py-0.5 rounded border border-teal-200/60 font-bold">
                                {slot.teacher?.teacherCode || slot.teacherCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70 text-[10px] font-bold">
                              {slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "Sky-Line"}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70 text-[10px] font-semibold truncate max-w-[130px]" title={slot.teacher?.departmentRel?.name || ""}>
                              {slot.teacher?.departmentRel?.name || (departments.find((d: any) => d.id === slot.teacher?.departmentId)?.name) || "Chưa xếp tổ"}
                            </span>
                          </div>
                          {slot.createdAt && (() => {
                            const createdDate = new Date(slot.createdAt);
                            if (!isNaN(createdDate.getTime())) {
                              return (
                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span>ĐK: {createdDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} {createdDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Cột 2: TIẾT DẠY & MÔN HỌC */}
                      <td className="py-3.5 px-4 align-top">
                        {slot.level === "Mầm non" ? (() => {
                          const parts = (slot.subjectName || "").split(" | ");
                          const chuDe = parts[0] || "";
                          const hoatDong = parts[1] || "";
                          const deTai = slot.topic || "";
                          return (
                            <div className="flex flex-col gap-1 min-w-[180px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-100 text-amber-900 border border-amber-200">Mầm non</span>
                                {slot.requestOrigin === "ASSIGNED" && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded shrink-0">
                                    Chỉ định
                                  </span>
                                )}
                                <span className="text-[11px] font-bold text-amber-950 truncate max-w-[150px]" title={\`Chủ đề: \${chuDe}\`}>
                                  Chủ đề: {chuDe}
                                </span>
                              </div>
                              <p 
                                className="font-extrabold text-slate-900 text-xs leading-snug cursor-pointer hover:text-teal-700 hover:underline transition-colors"
                                onClick={() => setDrawerSlot(slot)}
                                title="Bấm để xem chi tiết tiết dạy"
                              >
                                {deTai}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Hoạt động: <span className="text-amber-800 font-semibold">{hoatDong}</span> • Lớp: <span className="font-bold text-slate-700">{slot.className || "Chưa xếp"}</span>
                              </p>
                            </div>
                          );
                        })() : (
                          <div className="flex flex-col gap-1 min-w-[180px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p 
                                className="font-extrabold text-[#003B3A] text-xs leading-snug cursor-pointer hover:text-[#00A19A] hover:underline transition-colors" 
                                onClick={() => setDrawerSlot(slot)} 
                                title="Bấm để xem chi tiết tiết dạy"
                              >
                                {slot.topic}
                              </p>
                              {isSurpriseSlot(slot) && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded shrink-0 flex items-center gap-0.5">
                                  <span>⚡</span> Đột xuất
                                </span>
                              )}
                              {slot.requestOrigin === "ASSIGNED" && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded shrink-0">
                                  Chỉ định
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-500 font-medium text-[11px]">
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60 font-bold text-[10px]">
                                {slot.subjectName}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700">Lớp {slot.className || "Chưa xếp"}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột 3: LỊCH DẠY & PHÒNG */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1 min-w-[130px]">
                          <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                            <span>{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-700">{slot.startTime || \`Tiết \${slot.period || 1}\`}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate max-w-[120px] font-medium text-slate-500" title={slot.room || "Phòng học"}>
                              {slot.room ? \`Phòng \${slot.room}\` : "Phòng học"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: NGƯỜI DỰ & CHỖ TRỐNG */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1.5 min-w-[150px] max-w-[210px]">
                          {/* Tình trạng chỗ trống */}
                          <div className="flex items-center gap-1.5">
                            <span className={\`px-2 py-0.5 text-[10px] font-black rounded-lg border shadow-2xs \${
                              observerCount >= (slot.maxSeats || 4)
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : observerCount > 0
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }\`}>
                              {observerCount >= (slot.maxSeats || 4) ? "Đã đủ chỗ" : \`Còn \${(slot.maxSeats || 4) - observerCount} chỗ\`} ({observerCount}/{slot.maxSeats || 4})
                            </span>
                          </div>

                          {/* Danh sách GV đã đăng ký */}
                          {slot.registrations && slot.registrations.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {slot.registrations.map((reg: any) => {
                                const regTeacherName = reg.teacher?.teacherName || reg.teacherName || "GV";
                                return (
                                  <div key={reg.id} className="flex items-center justify-between gap-1.5 text-[11px] bg-slate-50/90 px-2 py-0.5 rounded-md border border-slate-200/60">
                                    <span className="font-semibold text-slate-800 truncate" title={regTeacherName}>
                                      {regTeacherName}
                                    </span>
                                    {reg.isApproved ? (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 shrink-0">
                                        Đã duyệt
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">
                                        Chờ duyệt
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa có người dự</span>
                          )}
                        </div>
                      </td>

                      {/* Cột 5: TRẠNG THÁI */}
                      <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                            Hết hạn
                          </span>
                        ) : observerCount >= (slot.maxSeats || 4) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Đã đủ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                            Mở ĐK
                          </span>
                        )}
                      </td>

                      {/* Cột 6: THAO TÁC */}
                      <td className="py-3.5 px-4 align-top text-right">
                        {canDeleteAnySlot || viewMode === "ADMIN" ? (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Nút Xem Chi tiết (Chính) */}
                            <button
                              type="button"
                              onClick={() => setDrawerSlot(slot)}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#00A19A] border border-teal-200/80 transition-all cursor-pointer shadow-2xs text-xs font-bold flex items-center gap-1 hover:scale-105"
                              title="Xem chi tiết tiết dạy (Detail Drawer)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </button>

                            {/* In phiếu */}
                            <button
                              type="button"
                              onClick={() => {
                                const reg = slot.registrations?.[0] || null;
                                setPrintModalSlot({ slot, registration: reg });
                              }}
                              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs hover:scale-105"
                              title="Xem chi tiết & In phiếu đánh giá"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {/* Sửa tiết dạy */}
                            {(canDeleteAnySlot || canManageSlot(slot)) && (
                              <button
                                type="button"
                                onClick={() => openEditModal(slot)}
                                className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                title="Chỉnh sửa thông tin tiết dạy"
                              >
                                <Edit className="w-3.5 h-3.5 text-indigo-600" />
                              </button>
                            )}

                            {/* Gửi email nhắc nhở */}
                            {(canDeleteAnySlot || canManageSlot(slot)) && slot.registrations && slot.registrations.length > 0 && slot.registrations.some((r: any) => !r.evaluation) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  startTransition(async () => {
                                    const res = await triggerSlotReminder(slot.id);
                                    if (res.success) {
                                      showToast("Đã gửi email nhắc nhở giáo viên tham gia dự giờ / nộp phiếu!", "success");
                                    } else {
                                      showToast(res.error || "Gửi email nhắc nhở thất bại", "error");
                                    }
                                  });
                                }}
                                className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                title="Gửi email nhắc nhở nộp phiếu đánh giá"
                              >
                                <Mail className="w-3.5 h-3.5 text-amber-600" />
                              </button>
                            )}

                            {/* Xóa tiết dạy */}
                            {(canDeleteAnySlot || canManageSlot(slot)) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                title={slot.registrations && slot.registrations.length > 0 ? \`Xóa tiết dạy (\${slot.registrations.length} GV đã đăng ký)\` : "Xóa tiết dạy này"}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Xem chi tiết DetailDrawer */}
                            <button
                              type="button"
                              onClick={() => setDrawerSlot(slot)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs text-xs font-bold flex items-center gap-1"
                              title="Xem chi tiết tiết dạy (Detail Drawer)"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Chi tiết</span>
                            </button>
                            {isHost ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-50 text-amber-800 border border-amber-200 inline-block shadow-2xs">
                                  Tôi dạy
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                                  title="Xóa tiết dạy của tôi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isExpired ? (
                              <button disabled className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                Hết hạn
                              </button>
                            ) : isRegistered ? (
                              myReg?.isApproved ? (
                                <span className="px-2.5 py-1.5 text-xs font-black rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block shadow-2xs">
                                  Đã duyệt
                                </span>
                              ) : (
                                <button onClick={() => handleCancelRegistration(myReg.id)}
                                  className="px-3 py-1.5 text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer shadow-2xs">
                                  Hủy dự
                                </button>
                              )
                            ) : observerCount >= (slot.maxSeats || 4) ? (
                              <button disabled className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                Đã đủ
                              </button>
                            ) : (
                              <button 
                                onClick={() => setRegisterDetailSlot(slot)}
                                className="px-3.5 py-1.5 text-xs font-black rounded-xl transition-all shadow-md shadow-teal-800/15 bg-gradient-to-r from-[#00A19A] to-[#008B85] hover:from-[#008B85] hover:to-[#005854] text-white cursor-pointer hover:scale-105 active:scale-95"
                              >
                                Đăng ký
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );`;

const before = lines.slice(0, 5435);
const after = lines.slice(5756); // from 5756 (inclusive) to end

const finalContent = before.join('\n') + '\n' + newStandardRow + '\n' + after.join('\n');
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Successfully replaced standard row!');
