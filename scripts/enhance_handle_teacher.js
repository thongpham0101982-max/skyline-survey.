const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio-gvnn', 'client.tsx');
let code = fs.readFileSync(target, 'utf8');

const oldHandle = `  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setTeacherId(tid);
    const t = allTeachers.find((x: any) => x.id === tid);
    if (t && t.campusId) {
      setCampusId(t.campusId);
      const matchedClasses = (props.classes || []).filter((c: any) => c.campusId === t.campusId);
      if (matchedClasses.length > 0) {
        setClassId(matchedClasses[0].id);
        setClassName(matchedClasses[0].className);
      } else {
        setClassId("");
        setClassName("");
      }
    }
  };`;

const newHandle = `  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setTeacherId(tid);
    const t = allTeachers.find((x: any) => x.id === tid);
    if (t && t.campusId) {
      setCampusId(t.campusId);
      const matchedClasses = (props.classes || []).filter((c: any) => c.campusId === t.campusId);
      if (matchedClasses.length > 0) {
        const assignedClass = t.classes && t.classes.length > 0
          ? t.classes.find((c: any) => c.class?.campusId === t.campusId)?.class
          : null;
        if (assignedClass) {
          setClassId(assignedClass.id);
          setClassName(assignedClass.className);
        } else {
          setClassId(matchedClasses[0].id);
          setClassName(matchedClasses[0].className);
        }
      } else {
        setClassId("");
        setClassName("");
      }
    }
  };`;

if (code.includes(oldHandle)) {
  code = code.replace(oldHandle, newHandle);
  fs.writeFileSync(target, code, 'utf8');
  console.log('handleTeacherChange enhanced with assignedClass prioritizing');
} else {
  console.log('Already enhanced or pattern not found');
}
