export async function fetchWithRetry(url, { retries = 5, baseDelayMs = 400, timeoutMs = 15000 } = {}) {
  let attempt = 0;
  let lastErr;

  while (true) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (res.status === 429) {
        lastErr = new Error('HTTP 429 Too Many Requests');
      } else if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        return await res.json();
      }
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
    }
    if (attempt >= retries) break;
    const delay = baseDelayMs * Math.pow(2, attempt);
    await new Promise(r => setTimeout(r, delay));
    attempt += 1;
  }

  throw lastErr ?? new Error('fetchWithRetry failed without an error');
}