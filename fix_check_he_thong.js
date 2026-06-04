const fs = require('fs');
const apiPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\api\\check-he-thong\\route.ts';
let content = fs.readFileSync(apiPath, 'utf8').replace(/\r\n/g, '\n');

// we'll replace the block:
const target = `    return NextResponse.json({
      totalStudents,
      totalClasses: totalClasses.length,
      transferCount,
      completionRate: 0,
      assessmentGroup,
      admissionGroup
    })
  } catch (error) {`;

const repl = `    let academicYearName = "";
    if (academicYearId) {
      const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
      if (year) academicYearName = year.name;
    }

    return NextResponse.json({
      totalStudents,
      totalClasses: totalClasses.length,
      transferCount,
      completionRate: 0,
      assessmentGroup,
      admissionGroup,
      academicYearName
    })
  } catch (error) {`;

if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(apiPath, content, 'utf8');
    console.log("Replaced!");
} else {
    console.log("NOT FOUND IN CHECK HE THONG");
}
