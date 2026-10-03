const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function getSvg({ size, isMaskable = false }) {
  const padding = isMaskable ? size * 0.12 : size * 0.06;
  const contentSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  
  const titleSize = Math.round(size * 0.28);
  const subSize = Math.round(size * 0.08);

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#004D4B" />
        <stop offset="60%" stop-color="#003B3A" />
        <stop offset="100%" stop-color="#002220" />
      </linearGradient>
      <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#5EEAD4" />
        <stop offset="40%" stop-color="#00A19A" />
        <stop offset="100%" stop-color="#00736E" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.02}" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>

    <rect width="${size}" height="${size}" rx="${isMaskable ? 0 : Math.round(size * 0.22)}" fill="url(#bgGrad)"/>
    <circle cx="${cx}" cy="${cy - size * 0.05}" r="${contentSize * 0.46}" fill="#00A19A" opacity="0.08" />

    <g transform="translate(${cx}, ${cy - size * 0.14}) scale(${size / 512})" filter="url(#shadow)">
      <path d="M-90 -10 C-40 -60 60 -70 120 -15 C80 -30 10 -30 -30 -5 C-60 12 -80 5 -90 -10 Z" fill="url(#tealGrad)" />
      <path d="M-110 20 C-60 -20 40 -30 100 15 C60 0 0 0 -40 22 C-70 38 -95 32 -110 20 Z" fill="#FFFFFF" opacity="0.95" />
      <circle cx="126" cy="-22" r="9" fill="#5EEAD4" />
    </g>

    <text 
      x="${cx}" 
      y="${cy + size * 0.18}" 
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
      font-size="${titleSize}" 
      font-weight="900" 
      letter-spacing="${Math.round(size * 0.02)}" 
      fill="#FFFFFF" 
      text-anchor="middle"
      filter="url(#shadow)">
      SSM
    </text>

    <text 
      x="${cx}" 
      y="${cy + size * 0.30}" 
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
      font-size="${subSize}" 
      font-weight="700" 
      letter-spacing="${Math.round(size * 0.03)}" 
      fill="#2DD4BF" 
      text-anchor="middle">
      SKY-LINE
    </text>
  </svg>
  `;
}

async function generate() {
  const configs = [
    { name: 'ssm-192.png', size: 192, isMaskable: false },
    { name: 'ssm-512.png', size: 512, isMaskable: false },
    { name: 'ssm-maskable-192.png', size: 192, isMaskable: true },
    { name: 'ssm-maskable-512.png', size: 512, isMaskable: true },
    { name: 'apple-touch-icon.png', size: 180, isMaskable: false },
    { name: 'ssm-144.png', size: 144, isMaskable: false },
    { name: 'ssm-96.png', size: 96, isMaskable: false },
    { name: 'ssm-48.png', size: 48, isMaskable: false },
  ];

  for (const cfg of configs) {
    const svg = getSvg(cfg);
    const dest = path.join(iconsDir, cfg.name);
    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log(`Generated: ${cfg.name} (${cfg.size}x${cfg.size})`);
  }

  const svgFavicon = getSvg({ size: 192, isMaskable: false });
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgFavicon.trim());
  console.log('Generated: icon.svg');
}

generate().catch(console.error);
