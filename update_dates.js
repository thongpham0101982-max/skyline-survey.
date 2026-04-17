const fs = require('fs');

// Fix Schema
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if(schema.charCodeAt(0) === 0xFEFF) {
  schema = schema.slice(1);
}
if(!schema.includes('  startDate      DateTime?')) {
    schema = schema.replace('academicYearId String\n  description', 'academicYearId String\n  startDate      DateTime?\n  endDate        DateTime?\n  description');
    fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
    console.log('Schema updated');
}

// Update API
let api = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');
if(!api.includes('startDate: data.startDate ? new Date(data.startDate) : null')) {
    api = api.replace(
        'description: data.description,',
        'description: data.description,\n           startDate: data.startDate ? new Date(data.startDate) : null,\n           endDate: data.endDate ? new Date(data.endDate) : null,'
    );
    api = api.replace(
        'status: data.status || "ACTIVE"',
        'status: data.status || "ACTIVE",\n           startDate: data.startDate ? new Date(data.startDate) : null,\n           endDate: data.endDate ? new Date(data.endDate) : null'
    );
    fs.writeFileSync('src/app/api/input-assessments/route.ts', api, 'utf8');
    console.log('API updated');
}
