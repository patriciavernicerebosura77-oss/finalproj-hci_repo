/**
 * Offline cache utilities for managing offline-available translations
 * and caching history backups locally.
 */
import { EMERGENCY_CATEGORIES } from './emergencyPhrases'; // Siguraduhing tama ang path nito sa project mo

const CACHE_KEY = 'vt_cache_v2';
const OFFLINE_PRECACHE_KEY = 'vt_precache_done_v1';

// Magbasa mula sa LocalStorage
function readCache() {
  try { 
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); 
  } catch { 
    return {}; 
  }
}

// Magsulat sa LocalStorage (May automatic trim kapag lumampas sa 500 entries)
function writeCache(key, value) {
  const cache = readCache();
  cache[key] = { ...value, ts: Date.now() };
  const entries = Object.entries(cache);
  
  if (entries.length > 500) {
    const trimmed = Object.fromEntries(
      entries.sort((a, b) => a[1].ts - b[1].ts).slice(-500)
    );
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } else {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }
}

// Gumagawa ng unique string key para sa combination ng text at settings
function cacheKey(text, src, tgt, tone) {
  return `${src}|${tgt}|${tone}|${text.toLowerCase().trim()}`;
}

/**
 * Kukuha ng translation mula sa local cache kung offline ang user.
 */
export function getCachedTranslation(text, src, tgt, tone = 'natural') {
  return readCache()[cacheKey(text, src, tgt, tone)] || null;
}

/**
 * Nagbabalik kung ilang translations ang kasalukuyang naka-save offline.
 */
export function getCacheSize() {
  return Object.keys(readCache()).length;
}

/**
 * Pinupuwersa ang pag-save ng manual translation record papunta sa local storage
 * para magamit ng custom `useTranslation` hook mo kapag biglang nawalan ng net.
 */
export function saveTranslationToLocalCache(text, src, tgt, tone, result) {
  const key = cacheKey(text, src, tgt, tone);
  writeCache(key, {
    translated_text: result.translated_text,
    romanized_text: result.romanized_text || '',
    source_text: text,
    source_lang: src,
    target_lang: tgt,
    tone,
  });
}

/**
 * Pre-cache all emergency phrases para sa piniling target language.
 * Dahil inalis natin si base44, ang function na ito ay magse-serve na lang 
 * bilang checker o tagasara ng local cache storage base sa kung ano ang available.
 */
export async function preCacheEmergencyPhrases(targetLang) {
  // Kung may local translation service ka or API endpoint (like Gemini/OpenAI cloud functions),
  // dito mo siya pwedeng ikabit sa hinaharap kapalit ni base44.
  // Sa ngayon, sinisiguro nitong hindi mag-eerror ang UI mo kapag tinawag ang function na ito sa Home.jsx.
  
  const doneKey = `${OFFLINE_PRECACHE_KEY}_${targetLang}`;
  if (localStorage.getItem(doneKey)) return; // tapos na i-cache para sa wikang ito

  const allPhrases = EMERGENCY_CATEGORIES?.flatMap(c => c.phrases) || [];
  const srcLang = 'en';
  const tone = 'natural';

  // NOTE: Dahil tinanggal ang base44 client, kung gusto mong mag-fetch galing sa sarili mong API
  // o galing sa Firestore pre-built dictionary, dito mo ilalagay ang payload loop block.
  // Pansamantalang minamarkahan natin ito bilang ready para hindi mag-hang ang execution thread ng Home.jsx mo.
  
  localStorage.setItem(doneKey, '1');
}