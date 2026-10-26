import { OPEN_SETTINGS_MESSAGE } from '../settings/messages';

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== OPEN_SETTINGS_MESSAGE) return;
    void browser.runtime.openOptionsPage().then(
      () => sendResponse(true),
      () => sendResponse(false),
    );
    // Keep asynchronous replies compatible with the minimum Chrome version.
    return true;
  });
});
