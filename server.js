const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false; // Run in fast production mode if built, or dev mode if needed
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Detect if .next/BUILD_ID exists to decide between dev or prod mode
const fs = require('fs');
const path = require('path');
const isBuilt = fs.existsSync(path.join(__dirname, '.next', 'BUILD_ID'));
const isDev = !isBuilt;

console.log(`[Skyline Server] Starting in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode on ${hostname}:${port}...`);

const app = next({ dev: isDev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
  .once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  })
  .listen(port, hostname, () => {
    console.log(`[Skyline Server] Running 24/7 at http://localhost:${port} and http://192.168.10.239:${port}`);
  });
}).catch((err) => {
  console.error('App prepare error:', err);
  process.exit(1);
});
