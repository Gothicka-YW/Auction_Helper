async function enableActionClickPanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error("Auction Helper: unable to configure side panel behavior.", error);
  }
}

chrome.runtime.onInstalled.addListener(enableActionClickPanel);
chrome.runtime.onStartup.addListener(enableActionClickPanel);
enableActionClickPanel();