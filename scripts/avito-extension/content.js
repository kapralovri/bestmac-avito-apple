// BestMac Avito Collector — content script.
// Каждые ~75с: читает карточки из DOM страницы поиска Avito, дедупит (localStorage),
// шлёт НОВЫЕ на bestmac.ru/api/intake и обновляет страницу.
// Совместимо со старым Chrome (callback-форма chrome.storage, без await-promise API).

const DEFAULT_ENDPOINT = "https://bestmac.ru/api/intake";
const REFRESH_MS = 75000;
const SEEN_KEY = "bm_seen_urls";

function log(...a) { try { console.log("[BestMac]", ...a); } catch (e) {} }

// callback-форма работает во всех версиях MV3 (promise-форма — только Chrome 95+)
function storageGet(keys) {
  return new Promise((resolve) => {
    try { chrome.storage.local.get(keys, (r) => resolve(r || {})); }
    catch (e) { resolve({}); }
  });
}
function storageSet(obj) {
  try { chrome.storage.local.set(obj); } catch (e) {}
}

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
  setTimeout(() => { try { location.reload(); } catch (e) {} },
            REFRESH_MS + Math.floor(Math.random() * 15000));
}

async function tick() {
  try {
    const cfg = await storageGet(["endpoint", "token", "sent"]);
    const scraped = scrapeCards();
    storageSet({ lastScraped: scraped.length, lastScrapeAt: Date.now() });
    log("найдено карточек:", scraped.length, "| токен задан:", !!cfg.token);

    if (!cfg.token) { storageSet({ lastError: "нет токена (сохрани в попапе)" }); scheduleReload(); return; }
    const endpoint = cfg.endpoint || DEFAULT_ENDPOINT;

    let seen;
    try { seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
    catch (e) { seen = new Set(); }
    const fresh = scraped.filter((c) => !seen.has(c.url));

    if (!fresh.length) { scheduleReload(); return; }

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-intake-token": cfg.token },
        body: JSON.stringify({ cards: fresh }),
      });
      if (resp.ok) {
        fresh.forEach((c) => seen.add(c.url));
        try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-4000))); } catch (e) {}
        storageSet({ sent: (cfg.sent || 0) + fresh.length, lastSent: fresh.length, lastAt: Date.now(), lastError: "" });
        log("отправлено:", fresh.length);
      } else {
        storageSet({ lastError: "HTTP " + resp.status, lastAt: Date.now() });
        log("ошибка отправки HTTP", resp.status);
      }
    } catch (e) {
      storageSet({ lastError: "сеть/CORS", lastAt: Date.now() });
      log("fetch упал:", e && e.message);
    }
  } catch (e) {
    log("tick упал:", e && e.message);
  }
  scheduleReload();
}

// небольшой джиттер старта, чтобы 4 вкладки не били синхронно
setTimeout(tick, 1500 + Math.floor(Math.random() * 4000));
