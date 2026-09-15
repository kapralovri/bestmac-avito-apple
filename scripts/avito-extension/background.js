// BestMac Avito Collector — service worker: интерфейс + сторож вкладок.
//
// GST-72: macOS 26 (Tahoe) + Liquid Glass — нативные popup-окна расширений
// у части пользователей не рендерятся вообще (баг подтверждён на форумах
// Apple Developer, не специфичен для этого расширения — воспроизводится
// у многих расширений сразу). Обход: интерфейс открывается ОБЫЧНОЙ вкладкой
// вместо action.default_popup (у вкладок эта проблема не наблюдается).
//
// GST-73: сбор замолкал через несколько часов и молчал об этом. Причина в том,
// что весь цикл жил внутри вкладки (setTimeout + location.reload в content.js),
// а вкладку никто не сторожил. Убивало сбор любое из трёх:
//   1. Chrome Memory Saver выгружает фоновые вкладки после простоя — вместе со
//      скриптом умирает и таймер, перезапустить его изнутри уже некому;
//   2. Avito отдаёт капчу — карточек 0, вкладка бесконечно перезагружает
//      файрвол, при этом в попапе не появляется никакой ошибки;
//   3. редирект уводит вкладку на URL вне masks манифеста — content-скрипт
//      больше не инжектится никогда.
// Лечение: расписание остаётся во вкладке (быстрый путь), но сверху живёт
// сторож на chrome.alarms. Alarms переживают сон service worker'а — в отличие
// от setTimeout внутри SW, который MV3 убивает через ~30 секунд простоя.
// Правило сторожа простое: на каждый URL мониторинга обязана существовать
// живая вкладка, подающая признаки жизни.

const POPUP_URL = chrome.runtime.getURL("popup.html");

// Те же 4 поисковые выдачи, что открывает попап (вся Россия, новые сверху).
const MONITOR_URLS = [
  "https://www.avito.ru/all/noutbuki?q=macbook&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=imac&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=mac+mini&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=mac+studio&s=104",
];

const ALARM = "bm-watchdog";
// Вкладка обязана отчитаться раз в ~75с (REFRESH_MS в content.js). Считаем её
// застрявшей только после 4 минут тишины — это заведомо больше и такта, и
// джиттера, и троттлинга таймеров в фоновых вкладках: лечим реальные смерти,
// а не медленную загрузку.
const STUCK_MS = 4 * 60 * 1000;
const CAPTCHA_NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;

const now = () => Date.now();

function get(keys) {
  return new Promise((resolve) => {
    try { chrome.storage.local.get(keys, (r) => resolve(r || {})); }
    catch (e) { resolve({}); }
  });
}
function set(obj) {
  return new Promise((resolve) => {
    try { chrome.storage.local.set(obj, () => resolve()); }
    catch (e) { resolve(); }
  });
}
function log(...a) { try { console.log("[BestMac SW]", ...a); } catch (e) {} }

async function getTab(tabId) {
  try { return await chrome.tabs.get(tabId); }
  catch (e) { return null; }   // вкладку закрыли
}

function ensureAlarm() {
  // periodInMinutes: 1 — минимально допустимый период для упакованного
  // расширения. Сторож дешёвый: один проход по 4 вкладкам.
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: POPUP_URL });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: POPUP_URL });
  }
});

// ─── Пульс от content-скриптов ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) return sendResponse({ ok: false });

    if (msg.type === "beat") {
      const tabId = sender.tab && sender.tab.id;
      if (!tabId) return sendResponse({ ok: false });
      const { beats = {} } = await get(["beats"]);
      beats[tabId] = { at: now(), count: msg.count | 0, captcha: !!msg.captcha,
                       url: (sender.tab && sender.tab.url) || "" };
      await set({ beats });
      if (msg.captcha) await notifyCaptcha();
      return sendResponse({ ok: true });
    }

    if (msg.type === "start") { await start(); return sendResponse({ ok: true }); }
    if (msg.type === "stop")  { await stop();  return sendResponse({ ok: true }); }
    if (msg.type === "state") return sendResponse(await state());

    return sendResponse({ ok: false });
  })();
  return true;   // ответ асинхронный
});

// Капча требует живых рук: собирать нечего, пока её не пройдут в браузере.
async function notifyCaptcha() {
  const { lastCaptchaNotify = 0 } = await get(["lastCaptchaNotify"]);
  if (now() - lastCaptchaNotify < CAPTCHA_NOTIFY_COOLDOWN_MS) return;
  await set({ lastCaptchaNotify: now() });
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("popup.html"),   // иконки нет — Chrome подставит свою
      title: "BestMac Collector — капча",
      message: "Avito просит подтвердить, что вы не робот. Откройте вкладку поиска и пройдите проверку, иначе сбор стоит.",
    });
  } catch (e) { log("notification fail", e && e.message); }
}

// ─── Запуск / остановка мониторинга ──────────────────────────────────────────
async function start() {
  const monitors = {};
  for (const url of MONITOR_URLS) {
    const tab = await chrome.tabs.create({ url, active: false });
    monitors[url] = tab.id;
  }
  await set({ monitors, beats: {}, monitoring: true, startedAt: now() });
  ensureAlarm();
  log("мониторинг запущен:", MONITOR_URLS.length, "вкладок");
}

// Без явной остановки сторож воскрешал бы вкладки, которые вы закрыли руками —
// закрыть мониторинг стало бы невозможно.
async function stop() {
  const { monitors = {} } = await get(["monitors"]);
  await set({ monitors: {}, beats: {}, monitoring: false });
  chrome.alarms.clear(ALARM);
  for (const id of Object.values(monitors)) {
    try { await chrome.tabs.remove(id); } catch (e) { /* уже закрыта */ }
  }
  log("мониторинг остановлен");
}

async function state() {
  const { monitors = {}, beats = {}, monitoring = false } = await get(
    ["monitors", "beats", "monitoring"]);
  const tabs = [];
  for (const [url, tabId] of Object.entries(monitors)) {
    const b = beats[tabId] || null;
    const tab = await getTab(tabId);
    tabs.push({
      url,
      alive: !!tab,
      discarded: !!(tab && tab.discarded),
      lastBeatAt: b ? b.at : null,
      count: b ? b.count : null,
      captcha: !!(b && b.captcha),
    });
  }
  return { monitoring, tabs };
}

// ─── Сторож ──────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) watchdog(); });

async function watchdog() {
  const { monitoring = false, monitors = {}, beats = {} } = await get(
    ["monitoring", "monitors", "beats"]);
  if (!monitoring) return;   // мониторинг не запускали или остановили

  let healed = 0;
  for (const url of MONITOR_URLS) {
    const tabId = monitors[url];
    const tab = tabId ? await getTab(tabId) : null;

    // 1. Вкладку закрыли (или её не было) — открываем заново.
    if (!tab) {
      const fresh = await chrome.tabs.create({ url, active: false });
      monitors[url] = fresh.id;
      healed++;
      log("вкладка пересоздана:", url);
      continue;
    }

    // 2. Chrome выгрузил вкладку из памяти — скрипт и таймер мертвы.
    if (tab.discarded) {
      try { await chrome.tabs.reload(tabId); healed++; log("выгруженная вкладка разбужена:", url); }
      catch (e) { log("reload fail", e && e.message); }
      continue;
    }

    // 3. Тишина дольше STUCK_MS — вкладка жива, но не собирает: капча,
    //    редирект вне masks манифеста или сбой скрипта. Возврат на канонический
    //    URL лечит все три разом (reload застрявший редирект не починил бы).
    const b = beats[tabId];
    const silentFor = b ? now() - b.at : Infinity;
    if (silentFor > STUCK_MS) {
      try {
        await chrome.tabs.update(tabId, { url });
        healed++;
        log("молчащая вкладка возвращена на URL мониторинга:", url,
            "тишина:", Math.round(silentFor / 1000), "с");
      } catch (e) { log("update fail", e && e.message); }
    }
  }

  await set({ monitors, lastWatchdogAt: now(), lastHealed: healed });
}
