import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer-core';

const PAGES = [
    '/',
    '/buy',
    '/sell',
    '/selection',
    '/business',
    '/contact',
    '/blog',
    '/sell/macbook-pro',
    '/sell/macbook-air',
    '/sell/broken',
    '/sell/imac',
    '/sell/mac-pro',
    '/sell/mac-mini'
];

const LOCAL_PORT = 4173;
const LOCAL_BASE_URL = `http://localhost:${LOCAL_PORT}`;
const PROD_BASE_URL = 'https://bestmac.ru';

async function prerender() {
    console.log('Starting local Vite preview server...');
    const server = spawn('npx', ['vite', 'preview', '--port', String(LOCAL_PORT), '--host'], {
        stdio: 'pipe',
        cwd: process.cwd(),
        shell: true
    });

    server.on('error', (err) => {
        console.error('Failed to start server:', err);
    });

    console.log('Waiting for server to start (5s)...');
    await setTimeout(5000);

    const outDir = path.join(process.cwd(), 'api', 'prerendered');
    try {
        await fs.mkdir(outDir, { recursive: true });
    } catch (err) {
        console.error('Error creating output directory:', err);
    }

    console.log(`Starting prerender for ${PAGES.length} pages locally with Puppeteer...`);

    const isMac = process.platform === 'darwin';
    let browserOptions = {
        headless: "new"
    };

    if (isMac && !process.env.CHROME_BIN) {
        browserOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        browserOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
    } else {
        // Vercel / Linux Environment
        console.log("Loading @sparticuz/chromium for serverless environment...");
        const chromium = (await import('@sparticuz/chromium')).default;
        browserOptions.executablePath = await chromium.executablePath();
        browserOptions.args = chromium.args;
        browserOptions.defaultViewport = chromium.defaultViewport;
        browserOptions.headless = chromium.headless;
    }

    let browser;
    try {
        browser = await puppeteer.launch(browserOptions);
    } catch (e) {
        console.error("Puppeteer launch failed:", e);
        process.exit(1);
    }

    const pageObj = await browser.newPage();

    for (const page of PAGES) {
        const url = `${LOCAL_BASE_URL}${page}`;
        try {
            console.log(`Rendering: ${url}`);
            await pageObj.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

            // Ждем 5 секунд, чтобы React точно успел отрендерить весь контент
            await setTimeout(5000);

            await pageObj.waitForSelector('[data-state], details, .faq', { timeout: 8000 }).catch(() => { });
            await pageObj.evaluate(() => {
                document.querySelectorAll('details').forEach(d => d.open = true);
                document.querySelectorAll('[data-state="closed"]').forEach(el => {
                    el.setAttribute('data-state', 'open');
                    el.style.display = 'block';
                });
                // Radix UI accordion
                document.querySelectorAll('[data-radix-collection-item]').forEach(el => el.click());
            });
            await setTimeout(1000);

            let html = await pageObj.content();

            // Rehydrate specific URLs just in case
            const localUrlRegex = new RegExp(`http://localhost:${LOCAL_PORT}`, 'g');
            html = html.replace(localUrlRegex, PROD_BASE_URL);

            let fileName = page === '/' ? 'index.html' : `${page.replace(/^\//, '').replace(/\//g, '-')}.html`;
            const filePath = path.join(outDir, fileName);

            await fs.writeFile(filePath, html, 'utf-8');
            console.log(`Saved: ${filePath}`);
        } catch (err) {
            console.error(`Failed to fetch ${url}:`, err.message);
        }
    }

    await browser.close();

    console.log('Prerender complete! Killing server...');
    server.kill();

    await setTimeout(1000);
    process.exit(0);
}

prerender();
