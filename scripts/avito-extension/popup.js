// 4 вкладки поиска (вся Россия, новые сверху). MacBook Air+Pro — одной вкладкой.
const FAMILIES = [
  "https://www.avito.ru/all/noutbuki?q=macbook&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=imac&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=mac+mini&s=104",
  "https://www.avito.ru/all/nastolnye_kompyutery?q=mac+studio&s=104",
];

const $ = (id) => document.getElementById(id);

chrome.storage.local.get(["endpoint", "token", "sent", "lastAt", "lastError"], (c) => {
  $("endpoint").value = c.endpoint || "https://bestmac.ru/api/intake";
  $("token").value = c.token || "";
  const when = c.lastAt ? new Date(c.lastAt).toLocaleTimeString() : "—";
  const err = c.lastError ? ` <span style="color:#c00">⚠️ ${c.lastError}</span>` : "";
  $("status").innerHTML = `<small>Отправлено всего: ${c.sent || 0}. Последняя отправка: ${when}${err}</small>`;
});

$("save").onclick = () => {
  chrome.storage.local.set(
    { endpoint: $("endpoint").value.trim(), token: $("token").value.trim() },
    () => { $("status").innerHTML = "<small>✅ Сохранено</small>"; }
  );
};

$("open").onclick = () => {
  FAMILIES.forEach((u) => chrome.tabs.create({ url: u, active: false }));
  $("status").innerHTML = "<small>▶️ Открыто 4 вкладки — мониторинг пошёл</small>";
};
