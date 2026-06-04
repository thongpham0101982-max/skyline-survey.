const fs = require('fs');

// 1. Update Admin API
const apiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\check-he-thong\\route.ts';
if (fs.existsSync(apiPath)) {
    let apiContent = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n');
    
    // We assume there's a return NextResponse.json({ totalStudents, ... })
    // Let's just find the return object and inject academicYearName
    if (apiContent.includes('totalStudents:')) {
        const fetchStr = `        let academicYearName = "";
        const academicYearId = searchParams.get("academicYearId");
        if (academicYearId) {
            const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
            if (year) academicYearName = year.name;
        }

        return NextResponse.json({`;
        
        apiContent = apiContent.replace(/return NextResponse\.json\(\{/g, fetchStr + '\n            academicYearName,');
        
        fs.writeFileSync(apiPath, apiContent, 'utf8');
        console.log("Updated Admin API");
    }
}

// 2. Update Admin UI
const uiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\admin\\page.tsx';
if (fs.existsSync(uiPath)) {
    let uiContent = fs.readFileSync(uiPath, 'utf8').replace(/\r\n/g, '\n');
    const targetStr = `<p className="text-slate-500 text-sm font-medium mt-0.5">Số liệu thống kê chi tiết theo phạm vi Cơ sở của bạn.</p>`;
    const newStr = `<p className="text-slate-500 text-sm font-medium mt-0.5">Năm học đang hoạt động: <span className="font-bold text-[#00A19A]">{finalMetrics.academicYearName || "---"}</span> | Số liệu thống kê chi tiết theo phạm vi Cơ sở của bạn.</p>`;
    
    if (uiContent.includes(targetStr)) {
        uiContent = uiContent.replace(targetStr, newStr);
        fs.writeFileSync(uiPath, uiContent, 'utf8');
        console.log("Updated Admin UI");
    }
}
