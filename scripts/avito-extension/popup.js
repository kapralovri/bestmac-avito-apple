// 4 вкладки поиска (вся Россия, новые сверху). MacBook Air+Pro — одной вкладкой.
const FAMILIES = [
  "https://www.avito.ru/all/noutbuki?q=macbook&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=imac&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=mac+mini&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=mac+studio&s=104",
];
const DEFAULT_ENDPOINT = "https://bestmac.ru/api/intake";
const $ = (id) => document.getElementById(id);

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
}
render();

$("save").onclick = () => {
  chrome.storage.local.set(
    { endpoint: $("endpoint").value.trim(), token: $("token").value.trim() },
    () => { $("status").innerHTML = '<small class="ok">✅ Сохранено</small>'; }
  );
};

$("open").onclick = () => {
  FAMILIES.forEach((u) => chrome.tabs.create({ url: u, active: false }));
  $("status").innerHTML = "<small>▶️ Открыто 4 вкладки — мониторинг пошёл</small>";
};

// Тест: шлём одну синтетическую карточку и показываем точный HTTP-ответ.
// Изолирует токен/сеть/CORS от парсинга страницы.
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
