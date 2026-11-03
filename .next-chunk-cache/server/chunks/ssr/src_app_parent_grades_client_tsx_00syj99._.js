module.exports=[454459,a=>{"use strict";var b=a.i(187924),c=a.i(572131),d=a.i(771931),e=a.i(452495),f=a.i(546842),g=a.i(660246),h=a.i(941675),i=a.i(953722),j=a.i(563588),k=a.i(692759),l=a.i(167453),m=a.i(641710),n=a.i(468976),o=a.i(469769),p=a.i(808406),q=a.i(406704);let r=[{code:"KSĐN",label:"Khảo sát đầu năm",short:"KSĐN"},{code:"GK1",label:"Giữa kỳ 1",short:"GK1"},{code:"CK1",label:"Cuối kỳ 1",short:"CK1"},{code:"GK2",label:"Giữa kỳ 2",short:"GK2"},{code:"CK2",label:"Cuối kỳ 2",short:"CK2"}];a.s(["default",0,function({initialChildren:a=[],defaultYear:s}){let t,u,v,w,[x,y]=(0,c.useState)(a),[z,A]=(0,c.useState)(a[0]?.id||""),[B,C]=(0,c.useState)("KSĐN"),[D,E]=(0,c.useState)(s?.id||""),[F,G]=(0,c.useState)(!0),[H,I]=(0,c.useState)(null),[J,K]=(0,c.useState)(""),[L,M]=(0,c.useState)(!1),[N,O]=(0,c.useState)(!1),[P,Q]=(0,c.useState)(!1);(0,c.useEffect)(()=>{let a=()=>{};return window.addEventListener("academicYearChanged",a),()=>{window.removeEventListener("academicYearChanged",a)}},[]);let R=(0,c.useCallback)(async()=>{if(!z)return void G(!1);G(!0);try{let a=`/api/parent/grades?studentId=${z}&evaluationPeriod=${B}&academicYearId=${D}`,b=await fetch(a),c=await b.json();if(c.success){I(c);let a=c.exchange?.parentFeedback||"";K(a),M(!a)}else q.default.error(c.error||"Không thể tải dữ liệu điểm")}catch(a){console.error("Error fetching grades:",a),q.default.error("Lỗi kết nối khi tải dữ liệu điểm")}finally{G(!1)}},[z,B,D]);(0,c.useEffect)(()=>{R()},[R]);let S=(0,c.useMemo)(()=>x.find(a=>a.id===z)||x[0],[x,z]),T=(t=(H?.classInfo?.campusCode||S?.class?.campus?.campusCode||"").toUpperCase(),u=(H?.classInfo?.campusName||S?.class?.campus?.campusName||"").toUpperCase(),v=(H?.classInfo?.className||S?.class?.className||"").toUpperCase(),(w=`${t} ${u} ${v}`).includes("CS4")||w.includes("HILL")?"TRƯỜNG TH, THCS HPT SKY-LINE HILL":"TRƯỜNG TH, THCS HPT SKY-LINE"),U=r.find(a=>a.code===B)?.label||B,V=`B\xc1O C\xc1O KẾT QUẢ ĐIỂM KIỂM TRA - ${U.toUpperCase()}`,W=`NĂM HỌC: ${H?.classInfo?.academicYearName||s?.name||"2024 - 2025"}`,X=async()=>{if(!J.trim())return void q.default.error("Vui lòng nhập nội dung trao đổi trước khi gửi");O(!0);try{let a=await fetch("/api/parent/grades/exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({studentId:z,academicYearId:D,evaluationPeriod:B,parentFeedback:J})}),b=await a.json();b.success?(q.default.success("Đã gửi ý kiến trao đổi đến GVCN thành công!"),M(!1),R()):q.default.error(b.error||"Gửi ý kiến thất bại")}catch(b){let a=b instanceof Error?b.message:"Lỗi không xác định";q.default.error("Lỗi khi gửi ý kiến: "+a)}finally{O(!1)}},Y=()=>{let a=H?.student||S||{},b=a?.dateOfBirth?new Date(a.dateOfBirth).toLocaleDateString("vi-VN"):"-",c=H?.classInfo?.homeroomTeacherName||S?.homeroomTeacherName||"Giáo viên chủ nhiệm",d=H?.classInfo?.className||S?.class?.className||"",e=H?.subjects||[],f=H?.exchange?.teacherRemark||"Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh.",g=J.trim()||H?.exchange?.parentFeedback||"Gia đình đã xem kết quả và sẽ tiếp tục đồng hành cùng con.",h=e.map((a,b)=>{let c=null!==a.score&&void 0!==a.score?Number(a.score):null,d='<span class="score-empty">-</span>';if(null!==c&&!isNaN(c)){let a="score-weak";c>=8?a="score-good":c>=6.5?a="score-fair":c>=5&&(a="score-avg"),d=`<span class="score-badge ${a}">${c.toFixed(1)}</span>`}return`
        <tr>
          <td class="stt">${b+1}</td>
          <td class="subj-name">${a.name} ${a.code?`<span class="subj-code">(${a.code})</span>`:""}</td>
          <td class="score">${d}</td>
        </tr>
      `}).join("");return`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Phieu_Bao_Diem_${a.studentName||"HocSinh"}_${B}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .page-card {
      width: 100%;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #008c82;
      padding-bottom: 7px;
      margin-bottom: 9px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .school-logo-img {
      height: 38px;
      width: auto;
      object-fit: contain;
    }
    .school-divider {
      width: 1.5px;
      height: 30px;
      background: #cbd5e1;
    }
    .school-title {
      font-size: 12.5px;
      font-weight: 900;
      color: #005B58;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      line-height: 1.2;
    }
    .system-info {
      text-align: right;
    }
    .system-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .system-slogan {
      font-size: 8.5px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    .class-badge {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }
    .report-heading {
      text-align: center;
      margin: 6px 0 10px 0;
    }
    .report-title {
      font-size: 14.5px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 3px 0;
    }
    .year-badge {
      display: inline-block;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #008c82;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 9px;
      border-radius: 9999px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #ccfbf1;
      border-radius: 7px;
      padding: 6px 12px;
      margin-bottom: 9px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 18px;
    }
    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 2px;
      font-size: 10px;
    }
    .info-row:nth-last-child(-n+2) {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label { color: #475569; font-weight: 600; }
    .info-val { font-weight: 800; color: #0f172a; }
    .info-val-highlight { font-weight: 900; color: #003B3A; }
    .info-val-blue { font-weight: 900; color: #0284c7; text-transform: uppercase; }
    
    .section-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #003B3A;
      letter-spacing: 0.3px;
    }
    .section-count {
      font-size: 9px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 8px;
      border: 1px solid #94a3b8;
    }
    th {
      background: #005B58;
      color: #ffffff;
      font-weight: 800;
      padding: 4.5px 8px;
      text-align: left;
      border-right: 1px solid #004745;
      font-size: 10px;
    }
    th.text-center { text-align: center; }
    td {
      padding: 4px 8px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      color: #1e293b;
    }
    td.stt { text-align: center; color: #64748b; font-weight: 700; width: 40px; }
    td.subj-name { font-weight: 800; color: #003B3A; }
    .subj-code { font-size: 8.5px; font-weight: 400; color: #64748b; margin-left: 3px; }
    td.score { text-align: center; width: 90px; }
    tr:nth-child(even) td { background: #f8fafc; }
    
    .score-badge {
      display: inline-block;
      padding: 1.5px 8px;
      border-radius: 4px;
      font-weight: 900;
      font-size: 10px;
    }
    .score-good { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .score-fair { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
    .score-avg { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .score-weak { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
    .score-empty { color: #94a3b8; font-weight: 700; }

    .exchange-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 9px;
    }
    .box-card {
      border: 1px solid #ccfbf1;
      border-radius: 6px;
      padding: 6px 10px;
      background: #f0fdfa;
    }
    .box-card.parent-box {
      border-color: #bae6fd;
      background: #f0f9ff;
    }
    .box-header {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .box-header-teacher { color: #005B58; }
    .box-header-parent { color: #0369a1; }
    .box-content {
      font-size: 9.5px;
      color: #334155;
      line-height: 1.35;
      font-style: italic;
    }
    .signature-section {
      margin-top: 6px;
      page-break-inside: avoid;
    }
    .signature-date {
      text-align: right;
      font-style: italic;
      color: #475569;
      font-size: 9.5px;
      margin-bottom: 4px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      gap: 10px;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 8px;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
    }
    .sig-space {
      height: 38px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-name {
      font-weight: 900;
      color: #003B3A;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="page-card">
    <div class="header-row">
      <div class="school-brand">
        <img src="/logo.png" alt="Sky-Line" class="school-logo-img" />
        <div class="school-divider"></div>
        <div>
          <div class="school-title">${T}</div>
        </div>
      </div>
      <div class="system-info">
        <div class="system-title">HỆ THỐNG GI\xc1O DỤC SKY-LINE</div>
        <div class="system-slogan">Nơi Khởi nguồn hạnh ph\xfac</div>
        <div class="class-badge">M\xe3 lớp: <b>${d}</b></div>
      </div>
    </div>

    <div class="report-heading">
      <h1 class="report-title">${V}</h1>
      <div class="year-badge">📅 ${W}</div>
    </div>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Họ v\xe0 t\xean học sinh:</span>
        <span class="info-val-highlight">${a.studentName||"-"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Lớp:</span>
        <span class="info-val">${d}</span>
      </div>
      <div class="info-row">
        <span class="info-label">M\xe3 số học sinh:</span>
        <span class="info-val">${a.studentCode||"-"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Gi\xe1o vi\xean chủ nhiệm (GVCN):</span>
        <span class="info-val">${c}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Ng\xe0y sinh:</span>
        <span class="info-val">${b}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Kỳ khảo s\xe1t:</span>
        <span class="info-val-blue">${U}</span>
      </div>
    </div>

    <div class="section-bar">
      <div class="section-title">CHI TIẾT ĐIỂM KIỂM TRA ĐỊNH KỲ</div>
      <div class="section-count">${e.length} m\xf4n học</div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px;">STT</th>
          <th>M\xf4n học</th>
          <th class="text-center" style="width: 90px;">Điểm KS</th>
        </tr>
      </thead>
      <tbody>
        ${h}
      </tbody>
    </table>

    <div class="exchange-section">
      <div class="box-card">
        <div class="box-header box-header-teacher">\xdd kiến & Nhận x\xe9t của GVCN:</div>
        <div class="box-content">${f}</div>
      </div>
      <div class="box-card parent-box">
        <div class="box-header box-header-parent">\xdd kiến trao đổi của PHHS:</div>
        <div class="box-content">${g}</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-date">Đ\xe0 Nẵng, ng\xe0y ...... th\xe1ng ...... năm 20......</div>
      <div class="signature-grid">
        <div>
          <div class="sig-title">Phụ Huynh Học Sinh</div>
          <div class="sig-sub">(K\xfd v\xe0 ghi r\xf5 họ t\xean)</div>
          <div class="sig-space"></div>
        </div>
        <div>
          <div class="sig-title">Gi\xe1o Vi\xean Chủ Nhiệm</div>
          <div class="sig-sub">(K\xfd v\xe0 ghi r\xf5 họ t\xean)</div>
          <div class="sig-space">
            <span class="sig-name">${c}</span>
          </div>
        </div>
        <div>
          <div class="sig-title">Ban Gi\xe1m Hiệu</div>
          <div class="sig-sub">(K\xfd v\xe0 đ\xf3ng dấu)</div>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`};return(0,b.jsxs)("div",{className:"max-w-5xl mx-auto space-y-6 font-sans text-slate-800 pb-16 pt-2",children:[(0,b.jsx)("div",{className:"relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] p-5 sm:p-7 text-white shadow-xl",children:(0,b.jsxs)("div",{className:"relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4",children:[(0,b.jsxs)("div",{className:"space-y-1.5 max-w-2xl",children:[(0,b.jsxs)("div",{className:"inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-black text-teal-100 uppercase tracking-widest",children:[(0,b.jsx)(p.Sparkles,{className:"w-3.5 h-3.5 text-amber-300"}),(0,b.jsx)("span",{children:"BẢNG ĐIỂM & ĐIỂM KIỂM TRA ĐỊNH KỲ"})]}),(0,b.jsx)("h1",{className:"text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white",children:"Báo Cáo Điểm & Trao Đổi Cùng Thầy Cô GVCN"}),(0,b.jsx)("p",{className:"text-xs sm:text-sm text-teal-100 font-medium",children:"Theo dõi kết quả các kỳ điểm kiểm tra học tập của con em và gửi ý kiến phản hồi, trao đổi trực tiếp với Giáo viên chủ nhiệm."})]}),(0,b.jsxs)("div",{className:"flex items-center gap-2 shrink-0",children:[(0,b.jsxs)("button",{onClick:()=>{Q(!0);let a=Y(),b=document.createElement("iframe");b.style.position="fixed",b.style.right="0",b.style.bottom="0",b.style.width="0",b.style.height="0",b.style.border="0",document.body.appendChild(b);let c=b.contentWindow?.document;c?(c.open(),c.write(a),c.close(),setTimeout(()=>{Q(!1),b.contentWindow?.focus(),b.contentWindow?.print(),setTimeout(()=>{b.remove()},3e3)},250)):Q(!1)},disabled:F||P,className:"inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#003B3A] hover:bg-teal-50 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50",children:[(0,b.jsx)(d.Printer,{className:"w-4 h-4 text-teal-700"}),(0,b.jsx)("span",{children:P?"Đang chuẩn bị in...":"In phiếu điểm (A4)"})]}),(0,b.jsx)("button",{onClick:()=>{let a=Y(),b=window.open("","_blank");b&&(b.document.open(),b.document.write(a),b.document.close())},disabled:F,title:"Mở phiếu điểm trong tab mới",className:"p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all border border-white/20",children:(0,b.jsx)(e.ExternalLink,{className:"w-4 h-4"})})]})]})}),(0,b.jsxs)("div",{className:"bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4",children:[x.length>1&&(0,b.jsxs)("div",{children:[(0,b.jsxs)("div",{className:"text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5",children:[(0,b.jsx)(g.Users,{className:"w-3.5 h-3.5 text-[#008c82]"}),(0,b.jsx)("span",{children:"Chọn con em:"})]}),(0,b.jsx)("div",{className:"flex flex-wrap gap-2",children:x.map(a=>{let c=a.id===z;return(0,b.jsxs)("button",{onClick:()=>A(a.id),className:`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${c?"bg-[#003B3A] border-[#003B3A] text-white shadow-md shadow-teal-900/15":"bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`,children:[(0,b.jsx)("div",{className:`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${c?"bg-white text-[#003B3A]":"bg-teal-100 text-teal-800"}`,children:a.studentName?a.studentName.charAt(0):"H"}),(0,b.jsxs)("div",{className:"text-left leading-tight",children:[(0,b.jsx)("div",{className:"font-extrabold",children:a.studentName}),(0,b.jsxs)("div",{className:`text-[10px] ${c?"text-teal-200":"text-slate-500"}`,children:["Lớp: ",a.class?.className||"N/A"," • MS: ",a.studentCode||"-"]})]})]},a.id)})})]}),(0,b.jsxs)("div",{children:[(0,b.jsxs)("div",{className:"text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5",children:[(0,b.jsx)(h.Calendar,{className:"w-3.5 h-3.5 text-[#008c82]"}),(0,b.jsx)("span",{children:"Kỳ khảo sát / Học kỳ:"})]}),(0,b.jsx)("div",{className:"grid grid-cols-2 sm:grid-cols-5 gap-2",children:r.map(a=>{let c=a.code===B;return(0,b.jsxs)("button",{onClick:()=>C(a.code),className:`py-2.5 px-3 rounded-2xl border text-xs font-extrabold transition-all text-center cursor-pointer ${c?"bg-gradient-to-r from-[#005B58] to-[#008c82] border-[#005B58] text-white shadow-md":"bg-white border-slate-200 text-slate-700 hover:bg-teal-50/50 hover:border-teal-200"}`,children:[(0,b.jsx)("div",{children:a.short}),(0,b.jsx)("div",{className:`text-[10px] font-normal truncate mt-0.5 ${c?"text-teal-100":"text-slate-500"}`,children:a.label})]},a.code)})})]})]}),F?(0,b.jsxs)("div",{className:"bg-white rounded-3xl p-12 border border-slate-200/90 shadow-sm text-center space-y-3",children:[(0,b.jsx)("div",{className:"w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"}),(0,b.jsx)("p",{className:"text-xs font-bold text-slate-500",children:"Đang tải phiếu điểm khảo sát..."})]}):(0,b.jsxs)("div",{className:"bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-md space-y-6",children:[(0,b.jsxs)("div",{className:"flex items-start justify-between border-b-2 border-[#008c82] pb-4 gap-4",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("img",{src:"/logo.png",alt:"Sky-Line",className:"h-10 sm:h-12 w-auto object-contain shrink-0"}),(0,b.jsx)("div",{className:"w-[1.5px] h-9 bg-slate-200 hidden sm:block"}),(0,b.jsx)("div",{children:(0,b.jsx)("div",{className:"text-xs sm:text-sm font-black text-[#005B58] tracking-tight uppercase leading-tight",children:T})})]}),(0,b.jsxs)("div",{className:"text-right hidden sm:block shrink-0",children:[(0,b.jsx)("div",{className:"text-[10px] font-extrabold uppercase text-slate-800 tracking-wider",children:"HỆ THỐNG GIÁO DỤC SKY-LINE"}),(0,b.jsx)("div",{className:"text-[9px] font-bold text-teal-700 italic",children:"Nơi Khởi nguồn hạnh phúc"}),(0,b.jsxs)("div",{className:"text-[10px] text-slate-600 font-medium mt-0.5",children:["Mã lớp: ",(0,b.jsx)("span",{className:"font-bold text-slate-900",children:H?.classInfo?.className})]})]})]}),(0,b.jsxs)("div",{className:"text-center space-y-1",children:[(0,b.jsx)("h2",{className:"text-base sm:text-xl font-black text-[#003B3A] uppercase tracking-tight",children:V}),(0,b.jsxs)("div",{className:"inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-extrabold text-[#008c82]",children:[(0,b.jsx)(h.Calendar,{className:"w-3.5 h-3.5 text-[#008c82]"}),(0,b.jsx)("span",{children:W})]})]}),(0,b.jsx)("div",{className:"bg-gradient-to-r from-teal-50/60 via-sky-50/40 to-teal-50/60 p-4 rounded-2xl border border-teal-200/80 shadow-2xs",children:(0,b.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between border-b border-teal-100/70 pb-1",children:[(0,b.jsxs)("span",{className:"text-slate-600 font-semibold flex items-center gap-1.5",children:[(0,b.jsx)(f.User,{className:"w-3.5 h-3.5 text-teal-600"}),"Họ và tên học sinh:"]}),(0,b.jsx)("strong",{className:"font-black text-[#003B3A] text-sm",children:H?.student?.studentName||S?.studentName})]}),(0,b.jsxs)("div",{className:"flex items-center justify-between border-b border-teal-100/70 pb-1",children:[(0,b.jsxs)("span",{className:"text-slate-600 font-semibold flex items-center gap-1.5",children:[(0,b.jsx)(g.Users,{className:"w-3.5 h-3.5 text-teal-600"}),"Lớp học:"]}),(0,b.jsx)("strong",{className:"font-black text-teal-900",children:H?.classInfo?.className||S?.class?.className})]}),(0,b.jsxs)("div",{className:"flex items-center justify-between border-b border-teal-100/70 pb-1",children:[(0,b.jsx)("span",{className:"text-slate-600 font-semibold",children:"Mã số học sinh:"}),(0,b.jsx)("span",{className:"font-extrabold text-slate-800 tracking-wider",children:H?.student?.studentCode||S?.studentCode||"-"})]}),(0,b.jsxs)("div",{className:"flex items-center justify-between border-b border-teal-100/70 pb-1",children:[(0,b.jsx)("span",{className:"text-slate-600 font-semibold",children:"Giáo viên chủ nhiệm (GVCN):"}),(0,b.jsx)("span",{className:"font-extrabold text-slate-800",children:H?.classInfo?.homeroomTeacherName||S?.homeroomTeacherName})]}),(0,b.jsxs)("div",{className:"flex items-center justify-between border-b border-teal-100/70 pb-1 sm:border-b-0",children:[(0,b.jsx)("span",{className:"text-slate-600 font-semibold",children:"Ngày sinh:"}),(0,b.jsx)("span",{className:"font-bold text-slate-700",children:H?.student?.dateOfBirth?new Date(H.student.dateOfBirth).toLocaleDateString("vi-VN"):"-"})]}),(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsx)("span",{className:"text-slate-600 font-semibold",children:"Kỳ khảo sát:"}),(0,b.jsx)("span",{className:"font-black text-[#0284C7] uppercase",children:U})]})]})}),(0,b.jsxs)("div",{className:"space-y-2.5",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsxs)("h3",{className:"text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2",children:[(0,b.jsx)(i.BookOpen,{className:"w-4 h-4 text-teal-600"}),(0,b.jsx)("span",{children:"Chi Tiết Điểm Số Khảo Sát"})]}),(0,b.jsxs)("span",{className:"text-xs font-bold text-teal-800 italic",children:[H?.subjects?.length||0," môn học"]})]}),(0,b.jsx)("div",{className:"overflow-x-auto rounded-2xl border border-teal-600/30 shadow-xs",children:(0,b.jsxs)("table",{className:"w-full text-left border-collapse text-xs",children:[(0,b.jsx)("thead",{children:(0,b.jsxs)("tr",{className:"bg-gradient-to-r from-[#005B58] to-[#008c82] text-white font-black",children:[(0,b.jsx)("th",{className:"py-2.5 px-3 text-center w-12 border-r border-teal-700",children:"STT"}),(0,b.jsx)("th",{className:"py-2.5 px-4 border-r border-teal-700",children:"Môn học"}),(0,b.jsx)("th",{className:"py-2.5 px-4 text-center w-32",children:"Điểm KS"})]})}),(0,b.jsx)("tbody",{className:"divide-y divide-teal-100",children:H?.subjects&&H.subjects.length>0?H.subjects.map((a,c)=>{let d=null!==a.score&&void 0!==a.score?Number(a.score):null;return(0,b.jsxs)("tr",{className:`transition-colors ${c%2==0?"bg-white":"bg-teal-50/20"} hover:bg-teal-50/50`,children:[(0,b.jsx)("td",{className:"py-2.5 px-3 text-center font-bold text-slate-500 border-r border-teal-100",children:c+1}),(0,b.jsxs)("td",{className:"py-2.5 px-4 font-black text-[#003B3A] border-r border-teal-100",children:[(0,b.jsx)("span",{children:a.name}),a.code&&(0,b.jsxs)("span",{className:"text-[10px] font-normal text-slate-400 ml-1.5",children:["(",a.code,")"]}),a.remark&&(0,b.jsxs)("div",{className:"text-[10px] font-normal text-slate-500 italic mt-0.5",children:["Ghi chú: ",a.remark]})]}),(0,b.jsx)("td",{className:"py-2.5 px-4 text-center font-black",children:null===d||isNaN(d)?(0,b.jsx)("span",{className:"text-slate-400 font-bold text-xs",children:"-"}):(0,b.jsx)("span",{className:`inline-block px-3 py-0.5 rounded-lg border text-xs font-black shadow-2xs ${d>=8?"bg-emerald-50 text-emerald-700 border-emerald-300":d>=6.5?"bg-sky-50 text-sky-700 border-sky-300":d>=5?"bg-amber-50 text-amber-700 border-amber-300":"bg-rose-50 text-rose-700 border-rose-300 font-black"}`,children:d.toFixed(1)})})]},a.id)}):(0,b.jsx)("tr",{children:(0,b.jsx)("td",{colSpan:3,className:"py-8 text-center text-slate-400 font-medium italic",children:"Chưa có danh sách môn học được cấu hình cho kỳ khảo sát này."})})})]})})]}),(0,b.jsxs)("div",{className:"space-y-4 pt-2",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between border-b border-teal-200 pb-2",children:[(0,b.jsxs)("h3",{className:"text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2",children:[(0,b.jsx)(j.MessageSquare,{className:"w-4 h-4 text-teal-600"}),(0,b.jsx)("span",{children:"Trao Đổi Giữa Giáo Viên Chủ Nhiệm & Phụ Huynh"})]}),(0,b.jsx)("span",{className:"text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200",children:"Đồng hành 3 chiều"})]}),(0,b.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[(0,b.jsxs)("div",{className:"bg-gradient-to-br from-teal-50/90 to-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-teal-200 space-y-2",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsxs)("div",{className:"text-xs font-black text-[#005B58] uppercase flex items-center gap-1.5",children:[(0,b.jsx)(o.GraduationCap,{className:"w-4 h-4 text-teal-700"}),(0,b.jsx)("span",{children:"Ý kiến & Nhận xét của GVCN"})]}),(0,b.jsx)("span",{className:"text-[10px] font-extrabold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs",children:H?.classInfo?.homeroomTeacherName||"GVCN"})]}),(0,b.jsx)("p",{className:"text-xs text-slate-700 leading-relaxed font-medium bg-white/70 p-3 rounded-xl border border-teal-100",children:H?.exchange?.teacherRemark||"Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực."}),H?.exchange?.teacherRemarkDate&&(0,b.jsxs)("div",{className:"text-[10px] text-teal-700 font-medium flex items-center gap-1 justify-end",children:[(0,b.jsx)(m.Clock,{className:"w-3 h-3"}),(0,b.jsxs)("span",{children:["Ghi nhận: ",new Date(H.exchange.teacherRemarkDate).toLocaleDateString("vi-VN")]})]})]}),(0,b.jsxs)("div",{className:"bg-gradient-to-br from-sky-50/90 to-blue-50/50 p-4 sm:p-5 rounded-2xl border border-sky-200 space-y-3",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between",children:[(0,b.jsxs)("div",{className:"text-xs font-black text-[#0369a1] uppercase flex items-center gap-1.5",children:[(0,b.jsx)(j.MessageSquare,{className:"w-4 h-4 text-sky-600"}),(0,b.jsx)("span",{children:"Ý kiến phản hồi từ Phụ huynh"})]}),H?.exchange?.parentFeedback&&!L&&(0,b.jsxs)("button",{onClick:()=>M(!0),className:"text-[10px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-sky-200 cursor-pointer shadow-2xs",children:[(0,b.jsx)(n.Edit3,{className:"w-3 h-3"}),(0,b.jsx)("span",{children:"Sửa ý kiến"})]})]}),!L&&H?.exchange?.parentFeedback?(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsxs)("div",{className:"bg-white/90 p-3 rounded-xl border border-sky-200 text-xs text-slate-800 leading-relaxed font-medium",children:["“",H.exchange.parentFeedback,"”"]}),H?.exchange?.parentFeedbackDate&&(0,b.jsxs)("div",{className:"text-[10px] text-sky-700 font-medium flex items-center gap-1 justify-end",children:[(0,b.jsx)(l.CheckCircle2,{className:"w-3 h-3 text-emerald-600"}),(0,b.jsxs)("span",{children:["Đã gửi: ",new Date(H.exchange.parentFeedbackDate).toLocaleDateString("vi-VN")]})]})]}):(0,b.jsxs)("div",{className:"space-y-2.5",children:[(0,b.jsx)("textarea",{value:J,onChange:a=>K(a.target.value),rows:3,placeholder:"Quý Phụ huynh vui lòng nhập ý kiến trao đổi, chia sẻ tình hình học tập của con ở nhà hoặc gửi lời nhắn tới Thầy Cô GVCN...",className:"w-full text-xs p-3 rounded-xl border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white shadow-inner resize-none font-medium leading-relaxed"}),(0,b.jsx)("div",{className:"flex flex-wrap gap-1.5",children:["Gia đình rất vui vì sự tiến bộ của con.","Xin Thầy/Cô hỗ trợ con thêm môn Toán.","Con đang nỗ lực cải thiện môn Tiếng Anh.","Cảm ơn Thầy/Cô đã tận tâm đồng hành cùng con."].map((a,c)=>(0,b.jsxs)("button",{type:"button",onClick:()=>K(b=>b?`${b} ${a}`:a),className:"text-[10px] bg-white hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200 transition-colors cursor-pointer",children:["+ ",a]},c))}),(0,b.jsxs)("div",{className:"flex items-center justify-between pt-1",children:[H?.exchange?.parentFeedback&&L&&(0,b.jsx)("button",{type:"button",onClick:()=>{K(H.exchange.parentFeedback),M(!1)},className:"text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer",children:"Hủy bỏ"}),(0,b.jsxs)("button",{type:"button",onClick:X,disabled:N||!J.trim(),className:"ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50",children:[(0,b.jsx)(k.Send,{className:"w-3.5 h-3.5"}),(0,b.jsx)("span",{children:N?"Đang gửi...":"Gửi trao đổi cho GVCN"})]})]})]})]})]})]}),(0,b.jsxs)("div",{className:"pt-2 text-xs",children:[(0,b.jsx)("div",{className:"text-right text-slate-600 italic mb-3 text-[11px]",children:"Đà Nẵng, ngày ...... tháng ...... năm 20......"}),(0,b.jsxs)("div",{className:"grid grid-cols-3 text-center gap-4",children:[(0,b.jsxs)("div",{className:"space-y-1",children:[(0,b.jsx)("div",{className:"font-black text-slate-900 uppercase text-xs",children:"Phụ Huynh Học Sinh"}),(0,b.jsx)("div",{className:"text-[10px] text-slate-500 italic",children:"(Ký và ghi rõ họ tên)"}),(0,b.jsx)("div",{className:"h-14 flex items-end justify-center",children:(0,b.jsx)("span",{className:"font-bold text-slate-700 text-xs italic",children:H?.exchange?.parentFeedback?"Đã phản hồi trực tuyến":""})})]}),(0,b.jsxs)("div",{className:"space-y-1",children:[(0,b.jsx)("div",{className:"font-black text-slate-900 uppercase text-xs",children:"Giáo Viên Chủ Nhiệm"}),(0,b.jsx)("div",{className:"text-[10px] text-slate-500 italic",children:"(Ký và ghi rõ họ tên)"}),(0,b.jsx)("div",{className:"h-14 flex items-end justify-center",children:(0,b.jsx)("span",{className:"font-black text-slate-900 text-xs",children:H?.classInfo?.homeroomTeacherName||S?.homeroomTeacherName})})]}),(0,b.jsxs)("div",{className:"space-y-1",children:[(0,b.jsx)("div",{className:"font-black text-slate-900 uppercase text-xs",children:"Ban Giám Hiệu"}),(0,b.jsx)("div",{className:"text-[10px] text-slate-500 italic",children:"(Ký và đóng dấu)"}),(0,b.jsx)("div",{className:"h-14"})]})]})]})]})]})}])}];

//# sourceMappingURL=src_app_parent_grades_client_tsx_00syj99._.js.map