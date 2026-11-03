module.exports=[354931,a=>a.a(async(b,c)=>{try{var d=a.i(137936),e=a.i(422028),f=a.i(118558),g=a.i(109307),h=a.i(611934),i=a.i(182241),j=a.i(713095),k=b([e,g,i]);function l(a){let b=a?.teacher?.email||a?.email;return b&&((b=b.trim()).includes("@")||(b=`${b}@skylineschool.edu.vn`)),b}async function m(a){try{let b=await (0,i.getOperationalScope)(),c={status:"ACTIVE",OR:[{role:a},{teacher:{OR:[{departmentRel:{name:a}},{departmentRel:{code:a}},{mainSubjectRel:{subjectName:a}},{mainSubjectRel:{subjectCode:a}}]}}]};null!==b.scopedUserIds&&(c.id={in:b.scopedUserIds});let d=(await e.prisma.user.findMany({where:c,select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}},orderBy:{fullName:"asc"}})).map(a=>({id:a.id,fullName:a.fullName,email:l(a)}));return{success:!0,users:d}}catch(a){return{success:!1,users:[],error:a.message}}}async function n(a){try{let b=await (0,g.auth)();if(!b?.user)return{success:!1,error:"Chưa đăng nhập"};let c=b.user.id,d=b.user.fullName||b.user.name||b.user.email||"Ban Điều Hành",i=a.collaborators?"string"==typeof a.collaborators?a.collaborators:JSON.stringify(a.collaborators):null,j=[];j=Array.isArray(a.assignedToUserIds)&&a.assignedToUserIds.length>0?a.assignedToUserIds:a.assignedToUserId?[a.assignedToUserId]:[null];let k=null,m=0;for(let b of j){let f=await e.prisma.workTask.create({data:{category:a.category,title:a.title,description:a.description||"",assignedToRole:a.assignedToRole||"KT_DBCL",assignedToUserId:b,assignedById:c,startDate:new Date(a.startDate),endDate:new Date(a.endDate),progress:"PENDING",acceptanceStatus:"WAITING_CONFIRMATION",month:a.month?parseInt(a.month):null,academicYearId:a.academicYearId||null,isImportant:a.isImportant||!1,collaborators:i,taskGroupId:a.taskGroupId||null,department:a.department||("KT_DBCL"===a.assignedToRole?"KT&ĐBCL":a.assignedToRole)||"KT&ĐBCL",priority:a.priority||(a.isImportant?"HIGH":"MEDIUM")}});k||(k=f),m++;let g=process.env.NEXTAUTH_URL||"https://skyline-survey.vercel.app",j=new Date(f.startDate).toLocaleDateString("vi-VN"),n=new Date(f.endDate).toLocaleDateString("vi-VN"),o=[];if(b){let a=await e.prisma.user.findUnique({where:{id:b},select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}});a&&(o=[a])}else{let b=a.assignedToRole||"KT_DBCL";o=await e.prisma.user.findMany({where:{status:"ACTIVE",OR:[{role:b},{teacher:{OR:[{departmentRel:{name:b}},{departmentRel:{code:b}},{mainSubjectRel:{subjectName:b}},{mainSubjectRel:{subjectCode:b}}]}}]},select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}})}let p=[];for(let b of(Array.isArray(a.collaboratorUserIds)&&a.collaboratorUserIds.length>0&&(p=await e.prisma.user.findMany({where:{id:{in:a.collaboratorUserIds}},select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}})),o)){await e.prisma.notification.create({data:{userId:b.id,title:(f.isImportant?"[QUAN TRỌNG] ":"")+"[Yêu cầu xác nhận nhận việc] "+a.title,message:d+" đã giao công việc mới cho bạn. Vui lòng kiểm tra và xác nhận nhận việc trước ngày "+n,isRead:!1,link:"/admin/tasks?taskId="+f.id+"&action=confirm"}});let c=l(b);if(c)try{let a=`
              <!DOCTYPE html>
              <html lang="vi">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${f.isImportant?"[QUAN TRỌNG] ":""}Giao việc & Y\xeau cầu x\xe1c nhận</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                        <!-- Header -->
                        <tr>
                          <td bgcolor="${f.isImportant?"#881337":"#003B3A"}" style="background-color: ${f.isImportant?"#881337":"#003B3A"}; padding: 32px 28px; text-align: center;">
                            <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                              ${f.isImportant?"⚠️ QUAN TRỌNG / KHẨN CẤP":"🏫 HỆ THỐNG GIÁO DỤC SKY-LINE"}
                            </div>
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; line-height: 1.3;">
                              ${f.title}
                            </h1>
                            <p style="margin: 8px 0 0 0; color: ${f.isImportant?"#FECDD3":"#99F6E4"}; font-size: 13px; font-weight: 500;">
                              Hệ thống Điều h\xe0nh & Quản l\xfd C\xf4ng việc Sky-Line
                            </p>
                          </td>
                        </tr>

                        <!-- Body Greeting -->
                        <tr>
                          <td style="padding: 26px 30px 14px 30px;">
                            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin ch\xe0o Thầy/C\xf4 ${b.fullName},</p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                              Thầy/C\xf4 vừa nhận được một c\xf4ng việc mới được ph\xe2n c\xf4ng từ <strong>${d}</strong>. Vui l\xf2ng xem th\xf4ng tin b\xean dưới v\xe0 bấm n\xfat <strong>X\xe1c nhận nhận việc</strong> để tiếp nhận nhiệm vụ:
                            </p>
                          </td>
                        </tr>

                        <!-- Task Info Card -->
                        <tr>
                          <td style="padding: 0 30px 20px 30px;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                              <tr>
                                <td style="padding-bottom: 8px; width: 34%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Danh mục:</td>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${f.category||"Công việc"}</td>
                              </tr>
                              <tr>
                                <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Người giao việc:</td>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #1E293B;">${d}</td>
                              </tr>
                              <tr>
                                <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Thời gian thực hiện:</td>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #334155;">${j} đến <strong style="color: #DC2626;">${n}</strong></td>
                              </tr>
                              ${f.description?`
                              <tr>
                                <td style="padding-top: 4px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase; vertical-align: top;">Chi tiết c\xf4ng việc:</td>
                                <td style="padding-top: 4px; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${f.description}</td>
                              </tr>
                              `:""}
                            </table>
                          </td>
                        </tr>

                        <!-- Bulletproof Button -->
                        <tr>
                          <td align="center" style="padding: 0 30px 28px 30px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                              <tr>
                                <td align="center" bgcolor="${f.isImportant?"#DC2626":"#00A19A"}" style="background-color: ${f.isImportant?"#DC2626":"#00A19A"}; border-radius: 10px;">
                                  <a href="${g}/admin/tasks?taskId=${f.id}&action=confirm" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                    ✅ X\xe1c Nhận Nhận Việc Ngay &rarr;
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                              HỆ THỐNG GI\xc1O DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                            </p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                              BAN Đ\xc0O TẠO & KHẢO TH\xcd ĐẢM BẢO CHẤT LƯỢNG GI\xc1O DỤC
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                              Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `;await (0,h.sendEmail)({to:c,subject:`${f.isImportant?"[QUAN TRỌNG] ":""}[Giao việc & Y\xeau cầu x\xe1c nhận] ${f.title}`,html:a})}catch(a){console.error(`Failed to send email to ${c}:`,a)}}for(let b of p)o.some(a=>a.id===b.id)||await e.prisma.notification.create({data:{userId:b.id,title:"[PHỐI HỢP THỰC HIỆN] "+a.title,message:d+" đã thêm bạn là Người phối hợp công việc: '"+a.title+"'",isRead:!1,link:"/admin/tasks?taskId="+f.id}})}return(0,f.revalidatePath)("/admin/tasks"),{success:!0,createdCount:m}}catch(a){return{success:!1,error:a.message}}}async function o(a){try{let b=await (0,g.auth)();if(!b?.user)return{success:!1,error:"Chưa đăng nhập"};let c=b.user.id,d=b.user.fullName||b.user.name||b.user.email||"Nhân viên",i=await e.prisma.workTask.findUnique({where:{id:a},include:{assignedBy:{select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}}}});if(!i)return{success:!1,error:"Không tìm thấy công việc"};let j=b.user.role;if(!(!i.assignedToUserId||i.assignedToUserId===c||i.assignedById===c||"ADMIN"===j||"SUPERADMIN"===j))return{success:!1,error:"Bạn không có quyền xác nhận công việc này"};if(await e.prisma.workTask.update({where:{id:a},data:{acceptanceStatus:"ACCEPTED",acceptedAt:new Date,progress:"PENDING"===i.progress?"IN_PROGRESS":i.progress}}),i.assignedById&&i.assignedById!==c){await e.prisma.notification.create({data:{userId:i.assignedById,title:"[ĐÃ XÁC NHẬN NHẬN VIỆC] "+i.title,message:d+" đã xác nhận tiếp nhận công việc: '"+i.title+"'",isRead:!1,link:"/admin/tasks?taskId="+i.id}});let a=l(i.assignedBy);if(a)try{let b=process.env.NEXTAUTH_URL||"https://skyline-survey.vercel.app",c=`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>X\xe1c nhận tiếp nhận c\xf4ng việc</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                      <!-- Header -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 30px 24px; text-align: center;">
                          <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                            🏫 HỆ THỐNG GI\xc1O DỤC SKY-LINE
                          </div>
                          <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                            ✅ Đ\xc3 TIẾP NHẬN C\xd4NG VIỆC
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                            Hệ thống Điều h\xe0nh & Quản l\xfd C\xf4ng việc Sky-Line
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 26px 28px 14px 28px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin ch\xe0o Thầy/C\xf4 ${i.assignedBy.fullName},</p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Nh\xe2n vi\xean <strong>${d}</strong> đ\xe3 x\xe1c nhận tiếp nhận c\xf4ng việc được giao theo th\xf4ng tin sau:
                          </p>
                        </td>
                      </tr>

                      <!-- Card -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                            <tr>
                              <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">T\xean c\xf4ng việc:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${i.title}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Thời gian x\xe1c nhận:</td>
                              <td style="font-size: 13px; font-weight: 600; color: #334155;">${new Date().toLocaleString("vi-VN")}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Bulletproof Button -->
                      <tr>
                        <td align="center" style="padding: 0 28px 28px 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                                <a href="${b}/admin/tasks?taskId=${i.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                  Xem Chi Tiết C\xf4ng Việc &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GI\xc1O DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                            BAN Đ\xc0O TẠO & KHẢO TH\xcd ĐẢM BẢO CHẤT LƯỢNG GI\xc1O DỤC
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                            Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;await (0,h.sendEmail)({to:a,subject:`[X\xc1C NHẬN NHẬN VIỆC] ${d} đ\xe3 nhận c\xf4ng việc: ${i.title}`,html:c})}catch(a){console.error("Failed to send acceptance notification email:",a)}}return(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function p(a,b){try{let c=await (0,g.auth)();if(!c?.user)return{success:!1,error:"Chưa đăng nhập"};let d=c.user.id,i=c.user.fullName||c.user.name||c.user.email||"Nhân viên";if(!b||!b.trim())return{success:!1,error:"Vui lòng nhập lý do hoặc phản hồi"};let j=await e.prisma.workTask.findUnique({where:{id:a},include:{assignedBy:{select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}}}});if(!j)return{success:!1,error:"Không tìm thấy công việc"};let k=c.user.role;if(!(!j.assignedToUserId||j.assignedToUserId===d||j.assignedById===d||"ADMIN"===k||"SUPERADMIN"===k))return{success:!1,error:"Bạn không có quyền phản hồi công việc này"};if(await e.prisma.workTask.update({where:{id:a},data:{acceptanceStatus:"REJECTED",rejectionReason:b.trim(),staffNote:"Phản hồi/Từ chối: "+b.trim(),staffUpdatedAt:new Date}}),j.assignedById&&j.assignedById!==d){await e.prisma.notification.create({data:{userId:j.assignedById,title:"[TỪ CHỐI / CẦN TRAO ĐỔI] "+j.title,message:i+" đã gửi phản hồi về công việc: '"+j.title+"'. Lý do: "+b.trim(),isRead:!1,link:"/admin/tasks?taskId="+j.id}});let a=l(j.assignedBy);if(a)try{let c=process.env.NEXTAUTH_URL||"https://skyline-survey.vercel.app",d=`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Phản hồi về c\xf4ng việc được giao</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                      <!-- Header -->
                      <tr>
                        <td bgcolor="#881337" style="background-color: #881337; padding: 30px 24px; text-align: center;">
                          <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FECDD3; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                            ⚠️ CẦN TRAO ĐỔI / PHẢN HỒI
                          </div>
                          <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                            PHẢN HỒI VỀ C\xd4NG VIỆC ĐƯỢC GIAO
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #FECDD3; font-size: 13px; font-weight: 500;">
                            Hệ thống Điều h\xe0nh & Quản l\xfd C\xf4ng việc Sky-Line
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 26px 28px 14px 28px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin ch\xe0o Thầy/C\xf4 ${j.assignedBy.fullName},</p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Nh\xe2n vi\xean <strong>${i}</strong> đ\xe3 gửi phản hồi / y\xeau cầu trao đổi lại về c\xf4ng việc được giao:
                          </p>
                        </td>
                      </tr>

                      <!-- Task Details & Reason Card -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF1F2; border-radius: 12px; border: 1px solid #FECDD3; padding: 16px 20px; border-collapse: separate;">
                            <tr>
                              <td style="padding-bottom: 8px; width: 32%; font-size: 12px; font-weight: 700; color: #9F1239; text-transform: uppercase;">T\xean c\xf4ng việc:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #881337;">${j.title}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #9F1239; text-transform: uppercase; vertical-align: top;">\xdd kiến / L\xfd do:</td>
                              <td style="font-size: 13px; font-weight: 600; color: #9F1239; line-height: 1.5; white-space: pre-wrap;">${b.trim()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Bulletproof Button -->
                      <tr>
                        <td align="center" style="padding: 0 28px 28px 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="#BE123C" style="background-color: #BE123C; border-radius: 10px;">
                                <a href="${c}/admin/tasks?taskId=${j.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                  Xem & Trao Đổi Lại &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GI\xc1O DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                            BAN Đ\xc0O TẠO & KHẢO TH\xcd ĐẢM BẢO CHẤT LƯỢNG GI\xc1O DỤC
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                            Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;await (0,h.sendEmail)({to:a,subject:`[PHẢN HỒI C\xd4NG VIỆC] ${i} gửi \xfd kiến về c\xf4ng việc: ${j.title}`,html:d})}catch(a){console.error("Failed to send rejection notification email:",a)}}return(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function q(a,b){try{let c=b.collaborators?"string"==typeof b.collaborators?b.collaborators:JSON.stringify(b.collaborators):null,d={category:b.category,title:b.title,description:b.description||"",assignedToRole:b.assignedToRole,assignedToUserId:b.assignedToUserId||null,startDate:new Date(b.startDate),endDate:new Date(b.endDate),month:b.month?parseInt(b.month):null,academicYearId:b.academicYearId||null,isImportant:b.isImportant||!1,collaborators:c};return void 0!==b.taskGroupId&&(d.taskGroupId=b.taskGroupId||null),void 0!==b.department&&(d.department=b.department||"KT&ĐBCL"),void 0!==b.priority&&(d.priority=b.priority||"MEDIUM"),await e.prisma.workTask.update({where:{id:a},data:d}),(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function r(a,b){try{let c=await (0,g.auth)();if(!c?.user)return{success:!1,error:"Chưa đăng nhập"};let d=c.user.id,h=c.user.role;if(!["PENDING","IN_PROGRESS","COMPLETED","CANCELLED","OVERDUE"].includes(b))return{success:!1,error:"Trạng thái tiến độ không hợp lệ"};let i=await e.prisma.workTask.findUnique({where:{id:a}});if(!i)return{success:!1,error:"Không tìm thấy công việc"};if(!(!i.assignedToUserId||i.assignedToUserId===d||i.assignedById===d||"ADMIN"===h||"SUPERADMIN"===h))return{success:!1,error:"Bạn không có quyền cập nhật tiến độ công việc này"};let j={progress:b,updatedAt:new Date};return"COMPLETED"!==b||i.completedAt||(j.completedAt=new Date),await e.prisma.workTask.update({where:{id:a},data:j}),(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function s(a,b){try{let c=await (0,g.auth)();if(!c?.user)return{success:!1,error:"Chưa đăng nhập"};let d=c.user.id,h=c.user.role;if(b.progress&&!["PENDING","IN_PROGRESS","COMPLETED","CANCELLED","OVERDUE"].includes(b.progress))return{success:!1,error:"Trạng thái tiến độ không hợp lệ"};let i=await e.prisma.workTask.findUnique({where:{id:a}});if(!i)return{success:!1,error:"Không tìm thấy công việc"};if(!(!i.assignedToUserId||i.assignedToUserId===d||i.assignedById===d||"ADMIN"===h||"SUPERADMIN"===h))return{success:!1,error:"Bạn không có quyền phản hồi công việc này"};await e.prisma.workTask.update({where:{id:a},data:{progress:b.progress,staffNote:b.staffNote,staffUpdatedAt:new Date}});let j=await e.prisma.user.findMany({where:{role:"ADMIN"},select:{id:!0}}),k=c.user.fullName||c.user.email||"Nhân viên";for(let a of j)await e.prisma.notification.create({data:{userId:a.id,title:"[Cập nhật CV] "+i.title,message:k+" đã cập nhật tiến độ: "+b.progress+". Nội dung: "+(b.staffNote||"(không có ghi chú)"),isRead:!1,link:"/admin/tasks?taskId="+i.id}});return(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function t(a){try{let b=await e.prisma.workTask.findUnique({where:{id:a},include:{assignedBy:{select:{fullName:!0}},assignedToUser:{select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}}}});if(!b)return{success:!1,error:"Không tìm thấy công việc"};let c=[];if(b.assignedToUserId&&b.assignedToUser)c=[b.assignedToUser];else{let a=b.assignedToRole;c=await e.prisma.user.findMany({where:{status:"ACTIVE",OR:[{role:a},{teacher:{OR:[{departmentRel:{name:a}},{departmentRel:{code:a}},{mainSubjectRel:{subjectName:a}},{mainSubjectRel:{subjectCode:a}}]}}]},select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}})}let d=process.env.NEXTAUTH_URL||"https://skyline-survey.vercel.app",f=new Date(b.endDate).toLocaleDateString("vi-VN"),g=0;for(let a of c){await e.prisma.notification.create({data:{userId:a.id,title:(b.isImportant?"[QUAN TRỌNG] ":"")+"[Nhắc việc] "+b.title,message:"Công việc được giao bởi "+b.assignedBy.fullName+". Hạn chót: "+f,isRead:!1,link:"/admin/tasks?taskId="+b.id}});let c=l(a);if(c)try{let e=`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${b.isImportant?"[QUAN TRỌNG] ":""}Nhắc nhở c\xf4ng việc</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                      <!-- Header -->
                      <tr>
                        <td bgcolor="${b.isImportant?"#881337":"#003B3A"}" style="background-color: ${b.isImportant?"#881337":"#003B3A"}; padding: 30px 24px; text-align: center;">
                          <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                            ${b.isImportant?"⚠️ CÔNG VIỆC KHẨN":"⏰ NHẮC NHỞ TIẾN ĐỘ"}
                          </div>
                          <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                            NHẮC NHỞ TIẾN ĐỘ C\xd4NG VIỆC
                          </h1>
                          <p style="margin: 6px 0 0 0; color: ${b.isImportant?"#FECDD3":"#99F6E4"}; font-size: 13px; font-weight: 500;">
                            Hệ thống Điều h\xe0nh & Quản l\xfd C\xf4ng việc Sky-Line
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 26px 28px 14px 28px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin ch\xe0o Thầy/C\xf4 ${a.fullName},</p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Ban điều h\xe0nh gửi th\xf4ng b\xe1o nhắc nhở tiến độ thực hiện c\xf4ng việc được giao dưới đ\xe2y:
                          </p>
                        </td>
                      </tr>

                      <!-- Card -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                            <tr>
                              <td style="padding-bottom: 8px; width: 30%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">T\xean c\xf4ng việc:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${b.title}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Hạn ch\xf3t:</td>
                              <td style="font-size: 14px; font-weight: 700; color: #DC2626;">${f}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Bulletproof Button -->
                      <tr>
                        <td align="center" style="padding: 0 28px 28px 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="${b.isImportant?"#DC2626":"#00A19A"}" style="background-color: ${b.isImportant?"#DC2626":"#00A19A"}; border-radius: 10px;">
                                <a href="${d}/admin/tasks?taskId=${b.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                  Cập Nhật Tiến Độ Ngay &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GI\xc1O DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                            BAN Đ\xc0O TẠO & KHẢO TH\xcd ĐẢM BẢO CHẤT LƯỢNG GI\xc1O DỤC
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                            Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;await (0,h.sendEmail)({to:c,subject:`${b.isImportant?"[QUAN TRỌNG] ":""}[Nhắc việc] ${b.title}`,html:e})}catch(a){console.error(`Failed to send reminder email to ${c}:`,a)}g++}return{success:!0,sent:g}}catch(a){return{success:!1,error:a.message}}}async function u(){try{let a=new Date,b=await e.prisma.workTask.findMany({where:{progress:{notIn:["COMPLETED","OVERDUE"]},endDate:{gte:a}},include:{assignedBy:{select:{fullName:!0}},assignedToUser:{select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}}}}),c=0;for(let d of b){let b=(d.endDate.getTime()-a.getTime())/864e5;if(b>=0&&b<=1.5){let a=b<=.5?"HÔM NAY":"NGÀY MAI",f=`[Tự động nhắc việc - ${a}] ${d.title}`,g=[];if(d.assignedToUserId&&d.assignedToUser)g=[d.assignedToUser];else{let a=d.assignedToRole;g=await e.prisma.user.findMany({where:{status:"ACTIVE",OR:[{role:a},{teacher:{OR:[{departmentRel:{name:a}},{departmentRel:{code:a}},{mainSubjectRel:{subjectName:a}},{mainSubjectRel:{subjectCode:a}}]}}]},select:{id:!0,fullName:!0,email:!0,teacher:{select:{email:!0}}}})}for(let b of g)if(!await e.prisma.notification.findFirst({where:{userId:b.id,title:f}})){let g=new Date(d.endDate).toLocaleDateString("vi-VN");await e.prisma.notification.create({data:{userId:b.id,title:f,message:`C\xf4ng việc sắp đến hạn ch\xf3t v\xe0o ng\xe0y ${g}. Vui l\xf2ng cập nhật tiến độ!`,isRead:!1,link:`/admin/tasks?taskId=${d.id}`}});let i=l(b);if(i)try{let e=process.env.NEXTAUTH_URL||"https://skyline-survey.vercel.app",f=`
                  <!DOCTYPE html>
                  <html lang="vi">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Th\xf4ng b\xe1o hạn ch\xf3t c\xf4ng việc</title>
                  </head>
                  <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                            <!-- Header -->
                            <tr>
                              <td bgcolor="${d.isImportant?"#881337":"#003B3A"}" style="background-color: ${d.isImportant?"#881337":"#003B3A"}; padding: 30px 24px; text-align: center;">
                                <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                                  ⏰ NHẮC HẠN CH\xd3T
                                </div>
                                <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                                  TH\xd4NG B\xc1O HẠN CH\xd3T ${a.toUpperCase()}
                                </h1>
                                <p style="margin: 6px 0 0 0; color: ${d.isImportant?"#FECDD3":"#99F6E4"}; font-size: 13px; font-weight: 500;">
                                  Hệ thống Điều h\xe0nh & Quản l\xfd C\xf4ng việc Sky-Line
                                </p>
                              </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                              <td style="padding: 26px 28px 14px 28px;">
                                <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin ch\xe0o Thầy/C\xf4 ${b.fullName},</p>
                                <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                                  C\xf4ng việc được giao cho Thầy/C\xf4 sắp đến hạn ch\xf3t v\xe0o ng\xe0y <strong>${g}</strong>:
                                </p>
                              </td>
                            </tr>

                            <!-- Card -->
                            <tr>
                              <td style="padding: 0 28px 20px 28px;">
                                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                                  <tr>
                                    <td style="padding-bottom: 8px; width: 30%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">T\xean c\xf4ng việc:</td>
                                    <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${d.title}</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Hạn ch\xf3t:</td>
                                    <td style="font-size: 14px; font-weight: 700; color: #DC2626;">${g}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Bulletproof Button -->
                            <tr>
                              <td align="center" style="padding: 0 28px 28px 28px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                                  <tr>
                                    <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                                      <a href="${e}/admin/tasks?taskId=${d.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                        Xem Chi Tiết C\xf4ng Việc &rarr;
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                              <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                                <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                                  HỆ THỐNG GI\xc1O DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                                  BAN Đ\xc0O TẠO & KHẢO TH\xcd ĐẢM BẢO CHẤT LƯỢNG GI\xc1O DỤC
                                </p>
                                <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                                  Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                  </html>
                `;await (0,h.sendEmail)({to:i,subject:`[NHẮC HẠN CH\xd3T] ${d.title}`,html:f}),c++}catch(a){console.error(`Failed to send auto email to ${i}:`,a)}}}}return{success:!0,sent:c}}catch(a){return{success:!1,error:a.message}}}async function v(){try{let a=new Date,b=await e.prisma.workTask.findMany({where:{endDate:{lt:a},progress:{notIn:["COMPLETED","OVERDUE"]}}});for(let a of b){await e.prisma.workTask.update({where:{id:a.id},data:{progress:"OVERDUE"}});let b=[];if(a.assignedToUserId)b=[{id:a.assignedToUserId}];else{let c=a.assignedToRole;b=await e.prisma.user.findMany({where:{status:"ACTIVE",OR:[{role:c},{teacher:{OR:[{departmentRel:{name:c}},{departmentRel:{code:c}},{mainSubjectRel:{subjectName:c}},{mainSubjectRel:{subjectCode:c}}]}}]},select:{id:!0}})}for(let c of b)await e.prisma.notification.findFirst({where:{userId:c.id,title:"[TRỄ HẠN] "+a.title}})||await e.prisma.notification.create({data:{userId:c.id,title:"[TRỄ HẠN] "+a.title,message:"Công việc đã quá hạn chót "+new Date(a.endDate).toLocaleDateString("vi-VN")+". Vui lòng cập nhật tiến độ!",isRead:!1,link:"/admin/tasks?taskId="+a.id}});for(let b of(await e.prisma.user.findMany({where:{role:"ADMIN"},select:{id:!0}})))await e.prisma.notification.findFirst({where:{userId:b.id,title:"[TRỄ HẠN ADMIN] "+a.title}})||await e.prisma.notification.create({data:{userId:b.id,title:"[TRỄ HẠN ADMIN] "+a.title,message:"Công việc giao cho "+a.assignedToRole+" đã quá hạn "+new Date(a.endDate).toLocaleDateString("vi-VN"),isRead:!1,link:"/admin/tasks?taskId="+a.id}})}return{success:!0,overdue:b.length}}catch(a){return{success:!1,error:a.message}}}async function w(a){try{let b=await (0,g.auth)();if(!b?.user)return{success:!1,error:"Chưa đăng nhập"};let c=b.user.id,d=b.user.role,h=await e.prisma.workTask.findUnique({where:{id:a}});if(!h)return{success:!1,error:"Không tìm thấy công việc"};if(h.assignedById!==c&&"ADMIN"!==d&&"SUPERADMIN"!==d)return{success:!1,error:"Chỉ người giao việc hoặc Quản trị viên mới có quyền xóa công việc này"};return await e.prisma.workTask.delete({where:{id:a}}),(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function x(a){try{let b=await (0,g.auth)();if(!b?.user)return{success:!1,error:"Chưa đăng nhập"};let c=b.user.id,d=b.user.role;return"ADMIN"===d||"SUPERADMIN"===d?await e.prisma.workTask.deleteMany({where:{id:{in:a}}}):await e.prisma.workTask.deleteMany({where:{id:{in:a},assignedById:c}}),(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function y(){try{let a=await e.prisma.taskCategory.findMany({orderBy:{name:"asc"}});return{success:!0,categories:a}}catch(a){return{success:!1,categories:[],error:a.message}}}async function z(a){try{let b=await (0,g.auth)(),c=await (0,i.getOperationalScope)();if(!b?.user||!c.isManager&&"ADMIN"!==b.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};let d="number"!=typeof a.weight||isNaN(a.weight)?parseFloat(String(a.weight))||1:a.weight;return await e.prisma.taskCategory.create({data:{name:a.name.trim(),assignedToRole:a.assignedToRole,groupName:a.groupName?.trim()||null,weight:d>0?d:1}}),(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function A(a,b){try{let c=await (0,g.auth)(),d=await (0,i.getOperationalScope)();if(!c?.user||!d.isManager&&"ADMIN"!==c.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};let h="number"!=typeof b.weight||isNaN(b.weight)?parseFloat(String(b.weight))||1:b.weight;return await e.prisma.taskCategory.update({where:{id:a},data:{name:b.name.trim(),assignedToRole:b.assignedToRole,groupName:b.groupName?.trim()||null,weight:h>0?h:1}}),(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function B(a){try{let b=await (0,g.auth)(),c=await (0,i.getOperationalScope)();if(!b?.user||!c.isManager&&"ADMIN"!==b.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};return await e.prisma.taskCategory.delete({where:{id:a}}),(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function C(){try{let a=await e.prisma.taskGroup.findMany({orderBy:{name:"asc"}});if(0===a.length){for(let a of["Khảo thí Phổ thông","Khảo thí Tổng hợp","Khảo thí TA&CTQT","ĐBCL Học sinh","ĐBCL"])await e.prisma.taskGroup.create({data:{name:a,department:"KT&ĐBCL"}});a=await e.prisma.taskGroup.findMany({orderBy:{name:"asc"}})}return{success:!0,groups:a.map(a=>({...a,memberUserIdsList:a.memberUserIds?JSON.parse(a.memberUserIds):[]}))}}catch(a){return{success:!1,groups:[],error:a.message}}}async function D(a){try{let b=await (0,g.auth)(),c=await (0,i.getOperationalScope)();if(!b?.user||!c.isManager&&"ADMIN"!==b.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};let d=await e.prisma.taskGroup.create({data:{name:a.name.trim(),department:a.department||"KT&ĐBCL",memberUserIds:a.memberUserIds&&a.memberUserIds.length>0?JSON.stringify(a.memberUserIds):null}});return(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0,group:d}}catch(a){return{success:!1,error:a.message}}}async function E(a,b){try{let c=await (0,g.auth)(),d=await (0,i.getOperationalScope)();if(!c?.user||!d.isManager&&"ADMIN"!==c.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};let h=await e.prisma.taskGroup.update({where:{id:a},data:{name:b.name.trim(),department:b.department||"KT&ĐBCL",memberUserIds:b.memberUserIds?JSON.stringify(b.memberUserIds):null}});return(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0,group:h}}catch(a){return{success:!1,error:a.message}}}async function F(a){try{let b=await (0,g.auth)(),c=await (0,i.getOperationalScope)();if(!b?.user||!c.isManager&&"ADMIN"!==b.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};return await e.prisma.taskGroup.delete({where:{id:a}}),(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function G(a,b){try{let c=await (0,g.auth)(),d=await (0,i.getOperationalScope)();if(!c?.user||!d.isManager&&"ADMIN"!==c.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};return await e.prisma.taskGroup.update({where:{id:a},data:{memberUserIds:JSON.stringify(b)}}),(0,f.revalidatePath)("/admin/tasks"),(0,f.revalidatePath)("/admin/weekly-reports"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function H(a,b){try{let c=await (0,g.auth)(),d=await (0,i.getOperationalScope)();if(!c?.user||!d.isManager&&"ADMIN"!==c.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};return await e.prisma.taskGroup.update({where:{id:a},data:{leaderUserId:b||null}}),(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function I(a="KT&ĐBCL"){try{let b=await e.prisma.department.findFirst({where:{OR:[{code:a},{name:a}]},select:{taskConfig:!0,code:!0,name:!0}}),c={topology:"3_LEVEL",hasTeams:!0,requireAcceptance:!0,requireLeaderApproval:!1,enableActionItems:!0,enableKpiWeights:!0,enableKanban:!0,enableTimeline:!0,syncWeeklyReports:!0,permissions:{leader:{canViewAllBan:!1,canViewOtherTeams:!0,canAssignAcrossTeams:!1,canApproveTeamTasks:!0,canManageBlockers:!0,canExportReports:!0},member:{canSelfAssign:!1,canViewOtherTeams:!1,canCreateActionItems:!0}}};if(b&&b.taskConfig)try{let a=JSON.parse(b.taskConfig);return{success:!0,settings:{...c,...a},department:b}}catch(a){}return{success:!0,settings:c,department:b}}catch(a){return{success:!1,error:a.message,settings:null}}}async function J(a="KT&ĐBCL",b){try{let c=await (0,g.auth)(),d=await (0,i.getOperationalScope)();if(!c?.user||!d.isManager&&"ADMIN"!==c.user.role)return{success:!1,error:"Quyền truy cập bị từ chối"};let h=await e.prisma.department.findFirst({where:{OR:[{code:a},{name:a}]}});if(!h)return{success:!1,error:"Không tìm thấy Ban/Bộ phận"};return await e.prisma.department.update({where:{id:h.id},data:{taskConfig:JSON.stringify(b)}}),(0,f.revalidatePath)("/admin/tasks"),{success:!0}}catch(a){return{success:!1,error:a.message}}}async function K(a="KT&ĐBCL",b){try{let c={};a&&"ALL"!==a&&(c.OR=[{department:a},{assignedToRole:a}]),b&&"ALL"!==b&&(c.academicYearId=b);let d=await e.prisma.workTask.findMany({where:c,include:{assignedToUser:{select:{fullName:!0,email:!0}},assignedBy:{select:{fullName:!0}},taskGroup:{select:{name:!0}},comments:{select:{id:!0,commentType:!0,content:!0,actionStatus:!0}}},orderBy:{createdAt:"desc"}}),f={PENDING:"Chưa thực hiện",IN_PROGRESS:"Đang thực hiện",COMPLETED:"Hoàn thành",OVERDUE:"Trễ hạn"},g={WAITING_CONFIRMATION:"Chờ xác nhận",ACCEPTED:"Đã nhận việc",REJECTED:"Từ chối/Phản hồi lại"},h=d.map((a,b)=>{let c=a.comments.filter(a=>"BLOCKER"===a.commentType).filter(a=>"RESOLVED"!==a.actionStatus);return{STT:b+1,"Nhóm Chuyên Môn":a.taskGroup?.name||"Toàn Ban","Danh Mục":a.category,"Tiêu Đề Công Việc":a.title,"Mô Tả":a.description||"","Mức Độ Ưu Tiên":"URGENT"===a.priority?"Khẩn cấp":"HIGH"===a.priority?"Cao":"Bình thường","Người Phụ Trách":a.assignedToUser?.fullName||a.assignedToRole,"Người Giao Việc":a.assignedBy?.fullName||"Ban Điều Hành","Người Phối Hợp":a.collaborators||"","Ngày Bắt Đầu":new Date(a.startDate).toLocaleDateString("vi-VN"),"Hạn Chót":new Date(a.endDate).toLocaleDateString("vi-VN"),"Tiến Độ":f[a.progress]||a.progress,"Xác Nhận Nhận Việc":g[a.acceptanceStatus]||a.acceptanceStatus,"Vướng Mắc Tồn Đọng":c.length>0?`${c.length} vướng mắc chưa giải quyết`:"Không có"}});return{success:!0,rows:h}}catch(a){return{success:!1,rows:[],error:a.message}}}[e,g,i]=k.then?(await k)():k,(0,j.ensureServerEntryExports)([m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I,J,K]),(0,d.registerServerReference)(m,"409c5036a06426232b507c26008cd69ef264ff6075",null),(0,d.registerServerReference)(n,"40c9565a9556aaa3be9251e988a14f31ac65ed3b7e",null),(0,d.registerServerReference)(o,"40ec17d6b684887a344baca6f771b788c627b94e48",null),(0,d.registerServerReference)(p,"606139baae2ce774f255ce715d858c5a26868c9855",null),(0,d.registerServerReference)(q,"60079458b870402e5463999751476a10d40bdbcc46",null),(0,d.registerServerReference)(r,"6096bc7946c3cbc206e9c12c415e4961e4862d171b",null),(0,d.registerServerReference)(s,"604384acbfa7b7b21f86e0830b7a0137636b4b60d7",null),(0,d.registerServerReference)(t,"407948dad3455a14586deaa2b3051aa043fb9b17bd",null),(0,d.registerServerReference)(u,"00a6b9810bb20831404abdafca0ea6219df0f063aa",null),(0,d.registerServerReference)(v,"00ee09280e9864ec3bb5faadbf14b64ca1a82a3d5d",null),(0,d.registerServerReference)(w,"405fe91dc06da7dd540ab38386e792ada3b559c459",null),(0,d.registerServerReference)(x,"40d01564db996d5e926dbae5ff1e8403fefa7f49af",null),(0,d.registerServerReference)(y,"00d127354957f11a539d1d7f1ded27b6a794ea01e6",null),(0,d.registerServerReference)(z,"404b4b308557a068c679a79eb459b0e1f22842ae1d",null),(0,d.registerServerReference)(A,"60dd3896835d5c7861a98ae334cf2325cdbf93abc6",null),(0,d.registerServerReference)(B,"400f9c8cda82fdaaade2b0c3d3209801c24fe1b417",null),(0,d.registerServerReference)(C,"0042d1030618d37b862edefc710306223bae8b8611",null),(0,d.registerServerReference)(D,"40c87861b7cb3472934b6a57603f38fec2ae38fb22",null),(0,d.registerServerReference)(E,"603ae45495fb69d4b8153a59f71b422e4481ed90f6",null),(0,d.registerServerReference)(F,"40b8f06aba59f20ad79be6042dce779a817d03ab5d",null),(0,d.registerServerReference)(G,"6093e8ae72fad50ff549cb0b56c54ae4da7aff95b5",null),(0,d.registerServerReference)(H,"6044a5f65a502f0f4d7835847b16d0b53ed66243c0",null),(0,d.registerServerReference)(I,"402c23f39453141a6b911f7d6ec81d18a805216411",null),(0,d.registerServerReference)(J,"603a15df519453e5964360679f6388e5384917cf1e",null),(0,d.registerServerReference)(K,"6002060dc08ea51f11cfea41c93fa33a7ceb2ce7cb",null),a.s(["assignStaffToTaskGroup",0,G,"checkAndNotifyOverdueTasks",0,v,"checkAndNotifyUpcomingTasks",0,u,"confirmTaskAssignment",0,o,"createTask",0,n,"createTaskCategory",0,z,"createTaskGroup",0,D,"deleteTask",0,w,"deleteTaskCategory",0,B,"deleteTaskGroup",0,F,"deleteTasks",0,x,"exportTasksData",0,K,"getDepartmentSettings",0,I,"getTaskCategories",0,y,"getTaskGroups",0,C,"getUsersByRole",0,m,"rejectTaskAssignment",0,p,"remindTask",0,t,"respondToTask",0,s,"saveDepartmentSettings",0,J,"setTaskGroupLeader",0,H,"updateTask",0,q,"updateTaskCategory",0,A,"updateTaskGroup",0,E,"updateTaskProgress",0,r]),c()}catch(a){c(a)}},!1)];

//# sourceMappingURL=src_app_admin_tasks_actions_ts_0c~83l.._.js.map