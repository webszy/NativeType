export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });
});
