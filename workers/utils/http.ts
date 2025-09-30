const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY = 400;

export interface FetchOptions extends RequestInit {
  parseJson?: boolean;
}

export interface FetchJsonResult<T = unknown> {
  status: number;
  ok: boolean;
  data: T | null;
  response: Response;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithBackoff<T = unknown>(
  url: string,
  init: FetchOptions = {},
  attempts = DEFAULT_ATTEMPTS,
  baseDelay = DEFAULT_BASE_DELAY
): Promise<FetchJsonResult<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const { status } = response;
      if (status >= 200 && status < 300) {
        const data = init.parseJson === false ? null : await safeParseJson<T>(response);
        return { status, ok: true, data, response };
      }

      lastError = new Error(`HTTP ${status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('HTTP request failed');
}

async function safeParseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('Failed to parse JSON response', error);
    return null;
  }
}
