const fs = require('fs');
let s = fs.readFileSync('src/app/layout.tsx', 'utf8');

if (!s.includes('WebPushPrompt')) {
  s = s.replace(
    'import { PwaManager } from "@/components/pwa/PwaManager";',
    'import { PwaManager } from "@/components/pwa/PwaManager";\nimport { WebPushPrompt } from "@/components/pwa/WebPushPrompt";'
  );

  s = s.replace(
    '<PwaManager />',
    '<PwaManager />\n          <WebPushPrompt />'
  );

  fs.writeFileSync('src/app/layout.tsx', s, 'utf8');
  console.log('WebPushPrompt added to layout.tsx');
}
