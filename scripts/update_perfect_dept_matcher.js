const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');
let actionsCode = fs.readFileSync(actionsPath, 'utf8');

// Update getForeignObservationSlots to accept string or object
actionsCode = actionsCode.replace(
  'export async function getForeignObservationSlots(academicYearId?: string)',
  'export async function getForeignObservationSlots(params?: string | { academicYearId?: string; campusId?: string; deptId?: string; grade?: string; date?: string; month?: string })'
);

actionsCode = actionsCode.replace(
  '    const where: any = {};\n    if (academicYearId) {\n      where.academicYearId = academicYearId;\n    }',
  `    const where: any = {};
    const academicYearId = typeof params === "string" ? params : params?.academicYearId;
    if (academicYearId && academicYearId !== "all") {
      where.academicYearId = academicYearId;
    }`
);

fs.writeFileSync(actionsPath, actionsCode, 'utf8');
console.log('actions.ts updated successfully');
