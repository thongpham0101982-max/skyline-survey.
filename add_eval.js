const fs = require('fs');
let p = 'src/app/admin/experiential-activities/categories/page.tsx';
let c = fs.readFileSync(p, 'utf8');
if(!c.includes('Đánh giá, nhận xét')) {
    c = c.replace(
        "{ value: 'EVIDENCE_TYPE', label: 'Loại minh chứng' }",
        "{ value: 'EVIDENCE_TYPE', label: 'Loại minh chứng' },\n    { value: 'EVALUATION', label: 'Đánh giá, nhận xét' }"
    );
    fs.writeFileSync(p, c);
}