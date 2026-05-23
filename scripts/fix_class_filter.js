const fs = require("fs");
let content = fs.readFileSync("src/app/admin/teachers/client.tsx", "utf8");

// Fix the class filter to use academicYearId direct field
const oldFilter = `  // Filter classes by selected year (for form dropdown)
  const filterYearForForm = newForm.academicYearId || defaultYearId || ""
  const classesForForm = filterYearForForm
    ? classes.filter(c => c.academicYear?.id === filterYearForForm)
    : classes

  // Filter classes by edit year
  const classesForEdit = editForm.academicYearId
    ? classes.filter(c => c.academicYear?.id === editForm.academicYearId)
    : classes`;

const newFilter = `  // Filter classes by selected year - use direct academicYearId field OR nested object
  const getClassYearId = (c) => c.academicYearId || c.academicYear?.id || ""
  const filterYearForForm = newForm.academicYearId || defaultYearId || ""
  const classesForForm = filterYearForForm
    ? classes.filter(c => getClassYearId(c) === filterYearForForm)
    : classes

  // Filter classes by edit year
  const classesForEdit = editForm.academicYearId
    ? classes.filter(c => getClassYearId(c) === editForm.academicYearId)
    : classes`;

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  fs.writeFileSync("src/app/admin/teachers/client.tsx", content, "utf8");
  console.log("Class filter fixed OK");
} else {
  console.log("Pattern not found exactly, trying partial...");
  // Just add the helper function at line ~30 area
  content = content.replace(
    "  const filterYearForForm = newForm.academicYearId || defaultYearId || \"\"",
    "  const getClassYearId = (c) => c.academicYearId || c.academicYear?.id || \"\"\n  const filterYearForForm = newForm.academicYearId || defaultYearId || \"\""
  );
  content = content.replace(
    /classes\.filter\(c => c\.academicYear\?\.id === filterYearForForm\)/g,
    "classes.filter(c => getClassYearId(c) === filterYearForForm)"
  );
  content = content.replace(
    /classes\.filter\(c => c\.academicYear\?\.id === editForm\.academicYearId\)/g,
    "classes.filter(c => getClassYearId(c) === editForm.academicYearId)"
  );
  fs.writeFileSync("src/app/admin/teachers/client.tsx", content, "utf8");
  console.log("Class filter fixed via fallback");
}
