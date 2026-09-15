// BestMac Avito Collector — content script.
// Каждые ~75с: читает карточки из DOM страницы поиска Avito, дедупит (localStorage),
// шлёт НОВЫЕ на bestmac.ru/api/intake и обновляет страницу.
// Совместимо со старым Chrome (callback-форма chrome.storage, без await-promise API).
//
// GST-73: страница по-прежнему сама задаёт такт (быстрый путь), но теперь после
// каждого прохода отправляет пульс в service worker. Если пульс пропал — сторож
// в background.js вернёт вкладку к жизни. Молчаливая смерть вкладки была главной
// причиной того, что сбор «работал час, а потом ничего».

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

// Пульс сторожу: «вкладка жива, прошла круг, вот что видела».
// Ошибку глотаем — если SW спит или расширение перезагружают, это не повод
// ронять сбор: sendMessage без слушателя бросает runtime.lastError.
function beat(count, captcha) {
  try {
    chrome.runtime.sendMessage({ type: "beat", count: count, captcha: captcha }, () => {
      void chrome.runtime.lastError;
    });
  } catch (e) {}
}

// Антибот Avito. div.firewall-container — тот же маркер, по которому капчу
// детектит серверный сканер (scanner_v2.is_captcha_page), плюс текстовые
// формулировки файрвола на случай смены вёрстки.
function isCaptchaPage() {
  try {
    if (document.querySelector("div.firewall-container")) return true;
    if (document.querySelector('[data-marker="captcha"]')) return true;
    const t = (document.body && document.body.innerText || "").toLowerCase();
    return t.includes("подтвердите, что вы не робот") ||
           t.includes("доступ ограничен") ||
           t.includes("похожи на автоматические");
  } catch (e) { return false; }
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
  let scraped = [];
  let captcha = false;
  try {
    const cfg = await storageGet(["endpoint", "token", "sent"]);
    captcha = isCaptchaPage();
    scraped = captcha ? [] : scrapeCards();
    storageSet({ lastScraped: scraped.length, lastScrapeAt: Date.now() });
    log("найдено карточек:", scraped.length, "| капча:", captcha, "| токен задан:", !!cfg.token);

    // Раньше капча выглядела как «просто 0 карточек»: вкладка молча крутила
    // файрвол, а попап не показывал ни одной ошибки.
    if (captcha) {
      storageSet({ lastError: "капча Avito — откройте вкладку и пройдите проверку",
                   lastAt: Date.now() });
      beat(0, true);
      scheduleReload();
      return;
    }

    if (!cfg.token) { storageSet({ lastError: "нет токена (сохрани в попапе)" }); beat(0, false); scheduleReload(); return; }
    const endpoint = cfg.endpoint || DEFAULT_ENDPOINT;

    let seen;
    try { seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
    catch (e) { seen = new Set(); }
    const fresh = scraped.filter((c) => !seen.has(c.url));

    if (!fresh.length) { beat(scraped.length, false); scheduleReload(); return; }

    try {
      // Токен — в заголовке поверх HTTPS (не в теле). Кастомный заголовок делает
      // запрос «непростым» → браузер шлёт CORS-preflight (OPTIONS), фронт его обслуживает.
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
  beat(scraped.length, captcha);
  scheduleReload();
}

// небольшой джиттер старта, чтобы 4 вкладки не били синхронно
setTimeout(tick, 1500 + Math.floor(Math.random() * 4000));
