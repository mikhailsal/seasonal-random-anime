import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createContext, Script } from 'vm';

/**
 * Load the application HTML, extract inline scripts, and execute the last inline script
 * inside a VM context with a mocked window/document from JSDOM.
 * - DOMContentLoaded handlers are blocked to avoid auto-running network code during tests.
 * - VM global fetch is intentionally a thrower to encourage mocking.
 */
export async function loadApp({ htmlPath = 'seasonal-random-anime/index.html', domHTML = '<!DOCTYPE html><html><head></head><body></body></html>' } = {}) {
  // Load HTML
  let html;
  try {
    html = await readFile(htmlPath, 'utf8');
  } catch (e) {
    // Fallback to provided minimal DOM HTML if file not found
    html = domHTML;
  }

  // Initialize a JSDOM instance with no automatic script evaluation
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    resources: 'usable',
    // Forward console logs to the host console for visibility during tests
    // Use VirtualConsole to avoid leaking globals
    virtualConsole: new VirtualConsole(),
  });

  // Gather inline scripts in the order they appear and pick the last one
  const scriptNodes = Array.from(dom.window.document.querySelectorAll('script'));
  const inlineScripts = scriptNodes.filter(node => !node.src);
  const appScriptContent = (inlineScripts.length > 0 && inlineScripts[inlineScripts.length - 1].textContent) || '';

  // Block DOMContentLoaded to prevent auto-running app bootstrap during tests
  const originalAddEventListener = dom.window.addEventListener.bind(dom.window);
  dom.window.addEventListener = function(type, listener, ...args) {
    if (type === 'DOMContentLoaded') return;
    return originalAddEventListener(type, listener, ...args);
  };

  // Create a VM context (sandbox) and expose DOM globals
  const sandbox = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    URL: URL,
    setTimeout,
    clearTimeout,
    performance: (typeof performance !== 'undefined' ? performance : undefined),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    fetch: () => { throw new Error('fetch is not mocked in VM'); },
  };

  const context = createContext(sandbox);

  // Execute the last inline script inside the VM context
  if (appScriptContent && appScriptContent.trim().length > 0) {
    const script = new Script(appScriptContent);
    // Intentionally let errors bubble up to test runner for visibility
    script.runInContext(context);
  }

  return { context, window: dom.window, document: dom.window.document };
}
