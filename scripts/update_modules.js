const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'config', 'modules.ts');
let content = fs.readFileSync(file, 'utf8');

const anchor = '{ code: "DU_GIO_MAM_NON", name: "Dự giờ đánh giá Mầm non", icon: Baby, href: "/admin/du-gio-mam-non" },';
const insert = '{ code: "DU_GIO_GVNN", name: "Dự giờ GVNN (ESL)", icon: Globe, href: "/admin/du-gio-gvnn" },';

if (!content.includes('DU_GIO_GVNN')) {
  content = content.replace(anchor, anchor + '\n      ' + insert);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added DU_GIO_GVNN to modules.ts');
}
