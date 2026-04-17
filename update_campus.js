const fs = require('fs');

// 1. Update Schema
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Ensure no BOM
if(schema.charCodeAt(0) === 0xFEFF) { schema = schema.slice(1); }

if (!schema.includes('inputAssessmentPeriods InputAssessmentPeriod[]')) {
    schema = schema.replace('teachers    Teacher[]', 'teachers    Teacher[]\n  inputAssessmentPeriods InputAssessmentPeriod[]');
}

if (!schema.includes('campusId       String?')) {
    schema = schema.replace('academicYearId String', 'academicYearId String\n  campusId       String?\n  campus         Campus?      @relation(fields: [campusId], references: [id])');
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Schema updated.');

// 2. Update Page
let page = fs.readFileSync('src/app/admin/input-assessments/page.tsx', 'utf8');
if (!page.includes('let campuses =')) {
    page = page.replace(
        'let academicYears = [];',
        'let academicYears = [];\n  let campuses = [];'
    );
    page = page.replace(
        'academicYears = await prisma.academicYear.findMany({',
        'campuses = await prisma.campus.findMany({ orderBy: { campusName: \'asc\' } });\n    academicYears = await prisma.academicYear.findMany({'
    );
    page = page.replace(
        '<InputAssessmentsClient academicYears={academicYears} />',
        '<InputAssessmentsClient academicYears={academicYears} campuses={campuses} />'
    );
    fs.writeFileSync('src/app/admin/input-assessments/page.tsx', page, 'utf8');
    console.log('Page updated.');
}

// 3. Update API route
let api = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');
if (!api.includes('campusId: data.campusId || null')) {
    api = api.replace(
        'description: data.description,',
        'description: data.description,\n           campusId: data.campusId || null,'
    );
    // There are 2 places (CREATE_PERIOD and UPDATE_PERIOD)
    api = api.replace(
        'status: data.status || "ACTIVE",',
        'status: data.status || "ACTIVE",\n           campusId: data.campusId || null,'
    );
    
    // Also include Campus in fetch
    if (!api.includes('include: { batches: true, campus: true }')) {
        api = api.replace('include: { batches: true }', 'include: { batches: { orderBy: { batchNumber: \'asc\' } }, campus: true }');
    }
    
    fs.writeFileSync('src/app/api/input-assessments/route.ts', api, 'utf8');
    console.log('API updated.');
}
