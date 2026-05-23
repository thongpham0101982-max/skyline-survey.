const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

// 1. Container padding
c = c.replace(/className="p-6 max-w-\[1400px\] mx-auto space-y-6"/, 'className="p-3 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-6"');

// 2. Fix sticky left For STT Header and Body
c = c.replaceAll(/sticky left-0/g, 'md:sticky md:left-0');
c = c.replaceAll(/sticky left-\[48px\]/g, 'md:sticky md:left-[48px]');

// 3. Fix sticky right for Save button
c = c.replaceAll(/sticky right-0/g, 'md:sticky md:right-0');
c = c.replaceAll(/backdrop-blur-sm/g, 'md:backdrop-blur-sm');

// 4. Adjust Table cell min-widths to be slightly smaller on mobile if needed, though scroll handles it.
// Replace tracking-wider padding etc to make it comfortable on mobile
c = c.replaceAll(/px-4 py-4/g, 'px-2 py-3 md:px-4 md:py-4');
c = c.replaceAll(/px-4 py-3/g, 'px-2 py-2 md:px-4 md:py-3');
c = c.replaceAll(/px-3 py-3/g, 'px-2 py-2 md:px-3 md:py-3');
c = c.replaceAll(/min-w-\[180px\]/g, 'min-w-[150px] md:min-w-[180px]');

// 5. Button text from "Xác nhận" to icon + text on desktop, just icon on mobile maybe? Or just keep it small.
// The button is `Xác nhận` from `Lưu`. We already have `<Save /> / <CheckCircle2 />`. Let's ensure text isn't too wide.
c = c.replace(/\{saveStatus\[st\.id\] === 'saved' \? <><CheckCircle2 className="w-3\.5 h-3\.5"\/> Đã lưu<\/> : <><Save className="w-3\.5 h-3\.5" \/> Lưu<\/>\}/g,
  `{saveStatus[st.id] === 'saved' ? <><CheckCircle2 className="w-4 h-4"/> <span className="hidden md:inline">Đã lưu</span></> : <><Save className="w-4 h-4" /> <span className="hidden md:inline">Lưu</span></>}`);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Mobile responsiveness applied');
