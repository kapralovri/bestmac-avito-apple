import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

serve(async (req) => {
  const url = new URL(req.url);
  const model = url.searchParams.get("model") || "MacBook";
  const subtitle = url.searchParams.get("subtitle") || "Узнайте рыночную стоимость за 10 секунд";

  const width = 1200;
  const height = 630;

  // Escape HTML entities
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  
  <!-- Accent line -->
  <rect x="80" y="180" width="120" height="4" rx="2" fill="url(#accent)"/>
  
  <!-- Brand -->
  <text x="80" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#3b82f6">BestMac.ru</text>
  
  <!-- Tagline -->
  <text x="80" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#94a3b8">Выкуп MacBook в Москве</text>
  
  <!-- Model name -->
  <text x="80" y="330" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="800" fill="#f8fafc">${esc(model)}</text>
  
  <!-- Subtitle -->
  <text x="80" y="400" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#cbd5e1">${esc(subtitle)}</text>
  
  <!-- Bottom badges -->
  <rect x="80" y="480" width="240" height="50" rx="25" fill="#1e40af" opacity="0.3"/>
  <text x="200" y="512" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#93c5fd" text-anchor="middle">⚡ Оценка за 10 сек</text>
  
  <rect x="340" y="480" width="260" height="50" rx="25" fill="#1e40af" opacity="0.3"/>
  <text x="470" y="512" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#93c5fd" text-anchor="middle">💰 Деньги в день</text>
  
  <rect x="620" y="480" width="240" height="50" rx="25" fill="#1e40af" opacity="0.3"/>
  <text x="740" y="512" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#93c5fd" text-anchor="middle">🔒 Безопасно</text>

  <!-- Apple icon placeholder -->
  <text x="1020" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="180" fill="#1e293b" opacity="0.5"></text>
</svg>`;

  // Return SVG as PNG-compatible image
  return new Response(svg, {
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
});
