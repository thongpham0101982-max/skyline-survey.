const fs = require('fs');

const mnPath = 'src/app/admin/xet-duyet-ket-qua/mam-non-client.tsx';
let rawContent = fs.readFileSync(mnPath, 'utf8');

const isCRLF = rawContent.includes('\r\n');
let content = rawContent.replace(/\r\n/g, '\n');

console.log('File size:', content.length, 'CRLF detected:', isCRLF);

// 1. Tự động nhận diện cơ sở GĐCS
const search1 = `  const [cCampusFilter, setCCampusFilter] = useState("");
  const [cAgeGroupFilter, setCAgeGroupFilter] = useState("");`;

const replacement1 = `  const [cCampusFilter, setCCampusFilter] = useState("");
  const [cAgeGroupFilter, setCAgeGroupFilter] = useState("");

  // Tự động chọn cơ sở phụ trách của GĐCS khi vào trang Mầm non
  useEffect(() => {
    const userRole = (currentUser?.role || "").toUpperCase();
    const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
    if (isGdcs && currentUser?.campusIds && currentUser.campusIds.length > 0) {
      if (!cCampusFilter) {
        const match = filteredCampuses.find((c: any) => currentUser.campusIds.includes(c.id));
        if (match) {
          setCCampusFilter(match.campusCode || match.campusName);
        }
      }
    }
  }, [currentUser, filteredCampuses, cCampusFilter]);`;

// Check if already applied
if (content.includes("isPreschoolCampusMatch(cCampusFilter, c.campusCode, c.campusName)")) {
  console.log("✅ MAM NON ENHANCEMENTS ARE ALREADY FULLY APPLIED AND ACTIVE!");
  process.exit(0);
}

if (!content.includes(search1)) {
  console.error("MN search1 not found!");
  process.exit(1);
}
content = content.replace(search1, replacement1);
console.log('MN Search 1 replaced.');

if (!content.includes(search2)) {
  console.error("MN search2 not found!");
  process.exit(1);
}
content = content.replace(search2, replacement2);
console.log('MN Search 2 replaced.');

if (!content.includes(search3)) {
  console.error("MN search3 not found!");
  process.exit(1);
}
content = content.replace(search3, replacement3);
console.log('MN Search 3 replaced.');

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(mnPath, content, 'utf8');
console.log('ALL MAM NON UPDATES COMPLETED SUCCESSFULLY!');
