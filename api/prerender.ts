import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const originalPath = (req.query.__path as string) || (req.query.url as string) || '/';

    // Normalize path (remove trailing slash except for root)
    const normalizedPath = originalPath === '/' ? '/' : originalPath.replace(/\/$/, '');

    // Map path to filename (same logic as in prerender.mjs)
    let fileName = normalizedPath === '/' ? 'index.html' : `${normalizedPath.replace(/^\//, '').replace(/\//g, '-')}.html`;

    const filePath = path.join(process.cwd(), 'api', 'prerendered', fileName);

    // Debugging headers
    const debugHeaders = {
        'X-BestMac-Edge': 'v3-local',
        'X-Resolved-Path': fileName
    };

    if (existsSync(filePath)) {
        try {
            const html = readFileSync(filePath, 'utf8');

            // Add custom header to indicate local prerendering
            res.setHeader('X-Prerendered-Local', 'true');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=86400');

            for (const [key, value] of Object.entries(debugHeaders)) {
                res.setHeader(key, value);
            }

            return res.status(200).send(html);
        } catch (error) {
            console.error('Error reading prerendered file:', error);
            return res.status(500).setHeader('Content-Type', 'text/plain').send('Internal Server Error');
        }
    }

    return res.status(404).setHeader('Content-Type', 'text/plain').send(`Not found: ${fileName}`);
}
