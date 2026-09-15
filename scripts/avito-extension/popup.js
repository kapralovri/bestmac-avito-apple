// Интерфейс коллектора. Вкладками мониторинга владеет service worker
// (background.js): он их открывает, сторожит и воскрешает. Попап только
// отдаёт команды и показывает состояние — иначе после закрытия попапа
// за вкладками было бы некому следить.
const DEFAULT_ENDPOINT = "https://bestmac.ru/api/intake";
const $ = (id) => document.getElementById(id);

function send(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => { void chrome.runtime.lastError; resolve(r || {}); });
    } catch (e) { resolve({}); }
  });
}

const ago = (ts) => {
  if (!ts) return "молчит";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 90) return s + " с назад";
  return Math.round(s / 60) + " мин назад";
};

function render() {
  chrome.storage.local.get(
    ["endpoint", "token", "sent", "lastAt", "lastError", "lastScraped", "lastScrapeAt"],
    (c) => {
      $("endpoint").value = c.endpoint || DEFAULT_ENDPOINT;
      $("token").value = c.token || "";
      const when = c.lastAt ? new Date(c.lastAt).toLocaleTimeString() : "—";
      const err = c.lastError ? ` <span class="err">⚠️ ${c.lastError}</span>` : "";
      $("status").innerHTML = `<small>Отправлено всего: ${c.sent || 0}. Последняя отправка: ${when}${err}</small>`;
      const sc = (c.lastScraped === undefined) ? "—" : c.lastScraped;
      const scWhen = c.lastScrapeAt ? new Date(c.lastScrapeAt).toLocaleTimeString() : "—";
      $("diag").innerHTML = `<small>На странице найдено карточек: <b>${sc}</b> (${scWhen})</small>`;
    }
  );
  renderTabs();
}

// Возраст пульса по каждой вкладке. Раньше «сбор встал» выглядел ровно так же,
// как «сбор идёт»: попап показывал только последнюю удачную отправку, и
// умершая несколько часов назад вкладка ничем себя не выдавала.
async function renderTabs() {
  const st = await send({ type: "state" });
  if (!st || !st.tabs || !st.tabs.length) {
    $("tabs").innerHTML = "<small>Мониторинг не запущен</small>";
    return;
  }
  const rows = st.tabs.map((t) => {
    const name = decodeURIComponent((t.url.match(/q=([^&]+)/) || [, "?"])[1]).replace(/\+/g, " ");
    let mark = "✅";
    if (!t.alive) mark = "❌";
    else if (t.captcha) mark = "🤖";
    else if (t.discarded) mark = "💤";
    else if (!t.lastBeatAt || Date.now() - t.lastBeatAt > 4 * 60 * 1000) mark = "⚠️";
    const cnt = t.count === null ? "—" : t.count;
    return `${mark} <b>${name}</b> — карточек ${cnt}, пульс ${ago(t.lastBeatAt)}`;
  });
  $("tabs").innerHTML = "<small>" + rows.join("<br>") + "</small>";
}

render();
setInterval(renderTabs, 5000);

$("save").onclick = () => {
  chrome.storage.local.set(
    { endpoint: $("endpoint").value.trim(), token: $("token").value.trim() },
    () => { $("status").innerHTML = '<small class="ok">✅ Сохранено</small>'; }
  );
};

$("open").onclick = async () => {
  await send({ type: "start" });
  $("status").innerHTML = "<small>▶️ Открыто 4 вкладки — мониторинг пошёл, сторож следит</small>";
  renderTabs();
};

$("stop").onclick = async () => {
  await send({ type: "stop" });
  $("status").innerHTML = "<small>⏹ Мониторинг остановлен, вкладки закрыты</small>";
  renderTabs();
};

// Тест: шлём одну синтетическую карточку и показываем точный HTTP-ответ.
// Изолирует токен/сеть/CORS от парсинга страницы.
//
// GST-72: токен — в заголовке x-intake-token, НЕ в теле. bestmac.ru/api/intake
// (P0-3) читает токен только из заголовка; раньше тест слал его в теле и падал
// с 403 при ЛЮБОМ токене, даже верном — тест лгал, что токен неправильный.
// Заголовок делает запрос «непростым» → браузер шлёт CORS-preflight (OPTIONS),
// который и /api/intake, и локальный relay.py уже обслуживают.
$("test").onclick = () => {
  const endpoint = ($("endpoint").value.trim() || DEFAULT_ENDPOINT);
  const token = $("token").value.trim();
  $("status").innerHTML = "<small>🧪 Отправляю тест…</small>";
  fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-intake-token": token },
    body: JSON.stringify({ cards: [{ url: "https://www.avito.ru/__popuptest__", title: "popup test", price: 1 }] }),
  })
    .then((r) => r.text().then((t) => ({ status: r.status, ok: r.ok, body: t })))
    .then((res) => {
      if (res.ok) {
        $("status").innerHTML = `<small class="ok">✅ Тест прошёл: HTTP ${res.status} ${res.body}</small>`;
      } else {
        const hint = res.status === 403 ? " — токен не совпадает с сервером"
          : res.status === 0 ? " — сеть/CORS" : "";
        $("status").innerHTML = `<small class="err">⚠️ HTTP ${res.status}${hint} ${res.body}</small>`;
      }
    })
    .catch((e) => {
      $("status").innerHTML = `<small class="err">⚠️ Сеть/CORS: ${e && e.message}</small>`;
    });
};
