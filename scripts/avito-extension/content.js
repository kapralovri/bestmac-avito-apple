// BestMac Avito Collector — content script.
// Каждые ~75с: читает карточки из DOM текущей страницы поиска Avito, дедупит
// (localStorage), шлёт НОВЫЕ на bestmac.ru/api/intake и обновляет страницу.
// Работает на реальном (домашнем) IP в залогиненном Chrome → без капчи/троттла.

const DEFAULT_ENDPOINT = "https://bestmac.ru/api/intake";
const REFRESH_MS = 75000;
const SEEN_KEY = "bm_seen_urls";

function scrapeCards() {
  const out = [];
  document.querySelectorAll('[data-marker="item"]').forEach((it) => {
    const a = it.querySelector('[data-marker="item-title"]');
    if (!a || !a.href) return;
    const url = a.href.split("?")[0];
    const title = a.getAttribute("title") || (a.textContent || "").trim();
    let price = 0;
    const pm = it.querySelector('[itemprop="price"]');
    if (pm && pm.getAttribute("content")) price = parseInt(pm.getAttribute("content"), 10) || 0;
    if (!price) {
      const pe = it.querySelector('[data-marker="item-price"]');
      if (pe) price = parseInt((pe.textContent || "").replace(/[^0-9]/g, ""), 10) || 0;
    }
    const de = it.querySelector('[data-marker="item-date"]');
    const date = de ? (de.textContent || "").trim() : "";
    if (url && price) out.push({ url, title, price, date });
  });
  return out;
}

function scheduleReload() {
  setTimeout(() => location.reload(), REFRESH_MS + Math.floor(Math.random() * 15000));
}

async function tick() {
  try {
    const cfg = await chrome.storage.local.get(["endpoint", "token", "sent"]);
    if (!cfg.token) { scheduleReload(); return; } // не настроено — просто крутимся
    const endpoint = cfg.endpoint || DEFAULT_ENDPOINT;
    const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
    const fresh = scrapeCards().filter((c) => !seen.has(c.url));
    if (fresh.length) {
      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", "x-intake-token": cfg.token },
          body: JSON.stringify({ cards: fresh }),
        });
        if (resp.ok) {
          // помечаем seen ТОЛЬКО при успехе, иначе 403/413 «съест» лоты навсегда
          fresh.forEach((c) => seen.add(c.url));
          localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-4000)));
          chrome.storage.local.set({
            sent: (cfg.sent || 0) + fresh.length, lastSent: fresh.length, lastAt: Date.now(), lastError: "",
          });
        } else {
          // не помечаем seen — повторим в следующий тик; покажем код в попапе
          chrome.storage.local.set({ lastError: "HTTP " + resp.status, lastAt: Date.now() });
        }
      } catch (e) {
        chrome.storage.local.set({ lastError: "сеть", lastAt: Date.now() });
      }
    }
  } catch (e) { /* ignore */ }
  scheduleReload();
}

// небольшой джиттер старта, чтобы 4 вкладки не били синхронно
setTimeout(tick, 1500 + Math.floor(Math.random() * 4000));
