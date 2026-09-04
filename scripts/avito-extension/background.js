// GST-72: macOS 26 (Tahoe) + Liquid Glass — нативные popup-окна расширений
// у части пользователей не рендерятся вообще (баг подтверждён на форумах
// Apple Developer, не специфичен для этого расширения — воспроизводится
// у многих расширений сразу). Обход: интерфейс открывается ОБЫЧНОЙ вкладкой
// вместо action.default_popup (у вкладок эта проблема не наблюдается).
const POPUP_URL = chrome.runtime.getURL("popup.html");

chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: POPUP_URL });
  if (tabs.length) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: POPUP_URL });
  }
});
