import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

/**
 * Load the inline application script from seasonal-random-anime/index.html into a jsdom-backed VM context.
 * It intentionally blocks DOMContentLoaded listeners to avoid auto-running network calls during tests.
 * Returns { context, window, document } where context contains globally defined functions.
 */
export async function loadApp({
  htmlPath = 'seasonal-random-anime/index.html',
  domHTML = '<!DOCTYPE html><html><head></head><body></body></html>'
} = {}) {
  const htmlAbs = path.resolve(process.cwd(), htmlPath);
  const html = fs.readFileSync(htmlAbs, 'utf-8');

  const scriptMatches = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/gi)];
  if (scriptMatches.length === 0) {
    throw new Error('No inline <script> found in ' + htmlPath);
  }
  const scriptContent = scriptMatches[scriptMatches.length - 1][1];

  const dom = new JSDOM(domHTML, {
    url: 'https://localhost/',
    pretendToBeVisual: true
  });

  // Prevent app bootstrap from running network calls in tests.
  const originalAddEventListener = dom.window.addEventListener.bind(dom.window);
  dom.window.addEventListener = (type, listener, options) => {
    if (type === 'DOMContentLoaded') return;
    return originalAddEventListener(type, listener, options);
  };

  const context = vm.createContext({
    window: dom.window,
    document: dom.window.document,
    console,
    URL,
    setTimeout,
    clearTimeout,
    performance: dom.window.performance,
    requestAnimationFrame: dom.window.requestAnimationFrame?.bind(dom.window) ?? ((cb) => setTimeout(cb, 16)),
    // Force tests to stub/mocks when they need fetch.
    fetch: () => {
      throw new Error('fetch called during tests; mock or stub it in your test.');
    }
  });

  vm.runInContext(scriptContent, context, { filename: 'app-inline-script.js' });

  return { context, window: dom.window, document: dom.window.document };
}
