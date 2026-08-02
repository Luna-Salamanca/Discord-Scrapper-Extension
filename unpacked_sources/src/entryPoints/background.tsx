/**
 * Background Script: Runs silently in the background.
 * Manages extension lifecycle events (install, connect, startup) and acts as a bridge.
 */
import browser from 'webextension-polyfill';
import { onMessage as onBackgroundMessage } from 'webext-bridge/background';

/** Fired when the extension is first installed,
 *  when the extension is updated to a new version,
 *  and when Chrome is updated to a new version. */
browser.runtime.onInstalled.addListener((details) => {
  console.log('[background.js] onInstalled', details);
});

browser.runtime.onConnect.addListener((port) => {
  console.log('[background.js] onConnect', port);
});

browser.runtime.onStartup.addListener(() => {
  console.log('[background.js] onStartup');
});

/**
 *  Sent to the event page just before it is unloaded.
 *  This gives the extension opportunity to do some clean up.
 *  Note that since the page is unloading,
 *  any asynchronous operations started while handling this event
 *  are not guaranteed to complete.
 *  If more activity for the event page occurs before it gets
 *  unloaded the onSuspendCanceled event will
 *  be sent and the page won't be unloaded. */
browser.runtime.onSuspend.addListener(() => {
  console.log('[background.js] onSuspend');
});

// Ensure there is at least one webext-bridge listener so the bundler does not tree-shake it
onBackgroundMessage('__ping__', () => {
  // no-op
});

export {};
