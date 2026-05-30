/**
 * Free Translation Service using multiple free APIs
 * - MyMemory API (primary, no key required)
 * - Google Translate API via free endpoint (fallback)
 * - Fallback to source text if all fail
 */

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const REQUEST_TIMEOUT_MS = 7000;

/**
 * Language code mappings for different APIs
 */
const LANG_MAPS = {
  mymemory: {
    en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it',
    pt: 'pt', zh: 'zh', ja: 'ja', ko: 'ko', ar: 'ar',
    hi: 'hi', ru: 'ru', tr: 'tr', th: 'th', vi: 'vi',
    nl: 'nl', pl: 'pl', sv: 'sv', tl: 'tl', fil: 'tl',
  },
  google: {
    en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it',
    pt: 'pt', zh: 'zh-CN', ja: 'ja', ko: 'ko', ar: 'ar',
    hi: 'hi', ru: 'ru', tr: 'tr', th: 'th', vi: 'vi',
    nl: 'nl', pl: 'pl', sv: 'sv', tl: 'tl', fil: 'tl',
  }
};

function createTimeoutSignal(ms) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener('abort', () => window.clearTimeout(timeoutId));
  return controller.signal;
}

function getApiLangCode(langCode, apiName = 'mymemory') {
  const map = LANG_MAPS[apiName];
  return map?.[langCode] || langCode;
}

function parseGoogleTranslateResponse(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return null;
  }

  const translatedText = data[0].map(item => item[0] || '').join('');
  const romanized = (Array.isArray(data[0])
    ? data[0].map(item => typeof item[3] === 'string' ? item[3] : '').filter(Boolean).join('')
    : '') || (Array.isArray(data[1]) ? data[1].join('') : '');

  return { translatedText, romanized };
}

/**
 * Primary translation via MyMemory API
 */
async function translateViaMyMemory(text, sourceCode, targetCode) {
  try {
    const srcLang = getApiLangCode(sourceCode, 'mymemory');
    const tgtLang = getApiLangCode(targetCode, 'mymemory');

    const response = await fetch(
      `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${srcLang}|${tgtLang}`,
      { signal: createTimeoutSignal(REQUEST_TIMEOUT_MS) }
    );

    if (!response.ok) throw new Error('MyMemory API error');

    const data = await response.json();
    if (data.responseStatus !== 200) throw new Error(data.responseDetails);

    return {
      translatedText: data.responseData.translatedText || text,
      source: 'mymemory',
      success: true,
    };
  } catch (err) {
    console.warn('[Translation] MyMemory failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fallback translation via LibreTranslate (free, self-hosted option)
 * Using public instance
 */
async function translateViaLibreTranslate(text, sourceCode, targetCode) {
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: getApiLangCode(sourceCode, 'google'),
        target: getApiLangCode(targetCode, 'google'),
      }),
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error('LibreTranslate API error');

    const data = await response.json();
    return {
      translatedText: data.translatedText || text,
      source: 'libretranslate',
      success: true,
    };
  } catch (err) {
    console.warn('[Translation] LibreTranslate failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Main translation function with fallback chain
 */
export async function translateText(text, sourceCode, targetCode) {
  if (!text || !sourceCode || !targetCode) {
    return { translated_text: text, romanized_text: '', error: 'Invalid parameters' };
  }

  if (sourceCode === targetCode) {
    return { translated_text: text, romanized_text: '', source: 'same-language' };
  }

  const primary = await translateViaGoogleFree(text, sourceCode, targetCode);
  if (primary.success) {
    return {
      translated_text: primary.translatedText,
      romanized_text: primary.romanized || '',
      source: 'google-free',
    };
  }

  const secondary = await translateViaMyMemory(text, sourceCode, targetCode);
  if (secondary.success) {
    return {
      translated_text: secondary.translatedText,
      romanized_text: '',
      source: 'mymemory',
    };
  }

  const fallback = await translateViaLibreTranslate(text, sourceCode, targetCode);
  if (fallback.success) {
    return {
      translated_text: fallback.translatedText,
      romanized_text: '',
      source: 'libretranslate',
    };
  }

  // If all APIs fail, return source text
  console.error('[Translation] All translation APIs failed');
  return {
    translated_text: text,
    romanized_text: '',
    error: 'Translation service unavailable',
    fallback: true,
  };
}

async function translateViaGoogleFree(text, sourceCode, targetCode) {
  try {
    const sourceLang = sourceCode === 'auto' ? 'auto' : getApiLangCode(sourceCode, 'google');
    const targetLang = getApiLangCode(targetCode, 'google');
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=rm&q=${encodedText}`;

    const response = await fetch(url, {
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error('Google Translate service unavailable');
    const data = await response.json();
    const parsed = parseGoogleTranslateResponse(data);
    if (!parsed || !parsed.translatedText) throw new Error('Invalid translation response');

    return {
      translatedText: parsed.translatedText,
      romanized: parsed.romanized || '',
      source: 'google-free',
      success: true,
    };
  } catch (err) {
    console.warn('[Translation] Google Translate failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Cache management
 */
const CACHE_KEY = 'vt_translation_cache_v1';

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getCacheKey(text, src, tgt) {
  return `${src}|${tgt}|${text.toLowerCase().trim()}`;
}

export function getCachedTranslation(text, src, tgt) {
  const cache = getCache();
  const key = getCacheKey(text, src, tgt);
  const entry = cache[key];

  if (entry) {
    return entry;
  }
  return null;
}

export function cacheTranslation(text, src, tgt, result) {
  try {
    const cache = getCache();
    const key = getCacheKey(text, src, tgt);
    cache[key] = {
      ...result,
      timestamp: Date.now(),
    };

    // Keep cache size manageable
    const entries = Object.entries(cache);
    if (entries.length > 500) {
      const trimmed = Object.fromEntries(
        entries
          .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0))
          .slice(-300)
      );
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (err) {
    console.warn('[Cache] Failed to cache translation:', err.message);
  }
}

export function clearTranslationCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('[Cache] Failed to clear cache:', err.message);
  }
}
