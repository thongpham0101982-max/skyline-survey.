import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { html, fileName } = await req.json();

    if (!html || !fileName) {
      return NextResponse.json({ error: 'Missing html or fileName' }, { status: 400 });
    }

    const exportDir = path.join(process.cwd(), 'public', 'exports', 'pdf');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const filePath = path.join(exportDir, safeFileName);
    const relativePath = `/exports/pdf/${safeFileName}`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Explicitly set the viewport to exactly A4 dimensions at 96 DPI to completely eliminate auto-shrink
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    
    // Provide a base URL so relative images resolve correctly
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const htmlWithBase = `<!DOCTYPE html><html><head><base href="${appUrl}"></head><body>${html}</body></html>`;
    
    await page.emulateMediaType('print');
    await page.setContent(htmlWithBase, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true, // Uses @page { size: A4; margin: 0; } from our CSS
      scale: 1, // 100%
      // Margins are handled by our CSS padding for absolute positioning precision
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }
    });

    await browser.close();

    const stats = fs.statSync(filePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    return NextResponse.json({
      success: true,
      filePath: relativePath,
      fileSize: fileSizeInMB,
      message: 'Export PDF thành công'
    });

  } catch (error: any) {
    console.error('PDF Export Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
