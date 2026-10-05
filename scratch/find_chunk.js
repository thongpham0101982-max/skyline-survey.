const fs = require('fs');
const path = require('path');

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.js')) {
      const str = fs.readFileSync(p, 'utf8');
      if (str.includes('MA TRẬN DỰ GIỜ TỔ TRƯỞNG CHUYÊN MÔN')) {
        console.log('Found chunk:', p, 'Size:', str.length);
        const matches = str.match(/.{0,50}before initialization.{0,50}/g);
        if (matches) console.log('Matches:', matches);
        
        // Find definitions of "th" or where "th" is used
        const thMatches = str.match(/\bth\.[a-zA-Z0-9_$]+|\bth\(|\(th\)/g);
        console.log('Sample th usages:', thMatches ? thMatches.slice(0, 10) : 'none');
      }
    }
  }
}

walk('.next');
