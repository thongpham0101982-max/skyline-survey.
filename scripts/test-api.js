async function test() {
  const r = await fetch('http://localhost:3000/api/learning-resources/textbooks', {
    headers: { Referer: 'https://ssm.skylineschool.edu.vn' }
  });
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Total books in API:', data.textbooks?.length);
  if (data.textbooks?.length > 0) {
    const grades = {};
    data.textbooks.forEach(b => {
      grades[b.grade] = (grades[b.grade] || 0) + 1;
    });
    console.log('Books per grade:', grades);
  }
}
test().catch(console.error);
