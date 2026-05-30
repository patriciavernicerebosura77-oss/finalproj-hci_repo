/**
 * Language Detection Service
 * Uses character patterns and common word detection
 * No external dependencies - runs client-side
 */

// Character ranges for different scripts
const CHAR_RANGES = {
  latin: /[\u0041-\u005A\u0061-\u007A]/g,
  cyrillic: /[\u0400-\u04FF]/g,
  greek: /[\u0370-\u03FF]/g,
  arabic: /[\u0600-\u06FF]/g,
  hebrew: /[\u0590-\u05FF]/g,
  devanagari: /[\u0900-\u097F]/g,
  thai: /[\u0E00-\u0E7F]/g,
  lao: /[\u0E80-\u0EFF]/g,
  georgian: /[\u10A0-\u10FF]/g,
  hangul: /[\uAC00-\uD7A3\u1100-\u11FF]/g,
  hiragana: /[\u3040-\u309F]/g,
  katakana: /[\u30A0-\u30FF]/g,
  cjk: /[\u4E00-\u9FFF\u3400-\u4DBF]/g,
  vietnamese: /[ạ-ỿ]/gi,
};

// Common words for language detection
const COMMON_WORDS = {
  en: new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at']),
  es: new Set(['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'es', 'o', 'este', 'él']),
  fr: new Set(['le', 'de', 'un', 'et', 'à', 'être', 'en', 'que', 'se', 'pas', 'plus', 'pour', 'je', 'il', 'la', 'vous', 'on', 'ne', 'mon', 'nous']),
  de: new Set(['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als']),
  it: new Set(['il', 'di', 'da', 'e', 'che', 'un', 'in', 'a', 'si', 'del', 'per', 'con', 'io', 'non', 'la', 'lo', 'se', 'le', 'gli', 'su']),
  pt: new Set(['de', 'a', 'e', 'o', 'que', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos']),
  ru: new Set(['в', 'и', 'не', 'на', 'с', 'что', 'это', 'он', 'о', 'из', 'по', 'к', 'у', 'ты', 'я', 'я', 'либо', 'где', 'когда', 'самых']),
  ar: new Set(['في', 'من', 'إلى', 'هو', 'أن', 'هذا', 'على', 'لا', 'كان', 'ما', 'هي', 'هل', 'أو', 'بعد', 'لم', 'إذا', 'التي', 'الذي', 'الذين']),
  ja: new Set(['は', 'を', 'に', 'の', 'が', 'で', 'て', 'た', 'を', 'も', 'から', 'まで', 'として', 'など', 'あり', 'いる', 'した', 'される']),
  zh: new Set(['的', '一', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为', '上', '个', '国', '我', '以', '要', '他']),
  ko: new Set(['은', '이', '를', '을', '가', '와', '하', '되', '있', '않', '다', '는', '어', '으', '말', '것', '등', '한', '좋', '있다']),
  vi: new Set(['là', 'cái', 'của', 'để', 'và', 'được', 'có', 'tôi', 'anh', 'em', 'chúng', 'nó', 'này', 'không', 'thì', 'từ', 'với', 'mà', 'nên']),
  th: new Set(['ที่', 'และ', 'ក្នុង', 'មាន', 'ដល់', 'ប្រ', 'ឹង', 'ពី', 'ក', 'ធ្វើ', 'នេះ', 'វា', 'គ្រប់', 'ត្រូវ', 'លើ', 'ទៅ', 'ចាប់', 'គ']),
};

/**
 * Score text for a specific language
 */
function scoreLanguage(text, langCode) {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const commonWords = COMMON_WORDS[langCode];

  if (!commonWords) return 0;

  let matches = 0;
  for (const word of words) {
    if (commonWords.has(word)) matches++;
  }

  return matches / Math.max(words.length, 1);
}

/**
 * Detect language using character analysis
 */
function detectByCharacter(text) {
  for (const [script, regex] of Object.entries(CHAR_RANGES)) {
    const matches = text.match(regex);
    if (!matches) continue;

    const ratio = matches.length / text.length;

    // Map script to language(s)
    if (script === 'cyrillic' && ratio > 0.4) return 'ru';
    if (script === 'greek' && ratio > 0.4) return 'el';
    if (script === 'arabic' && ratio > 0.3) return 'ar';
    if (script === 'hebrew' && ratio > 0.3) return 'he';
    if (script === 'devanagari' && ratio > 0.3) return 'hi';
    if (script === 'thai' && ratio > 0.3) return 'th';
    if (script === 'lao' && ratio > 0.3) return 'lo';
    if (script === 'georgian' && ratio > 0.3) return 'ka';
    if (script === 'hangul' && ratio > 0.2) return 'ko';
    if (script === 'hiragana' && ratio > 0.1) return 'ja';
    if (script === 'katakana' && ratio > 0.1) return 'ja';
    if (script === 'cjk' && ratio > 0.1) return 'zh';
    if (script === 'vietnamese' && ratio > 0.05) return 'vi';
  }

  return null;
}

/**
 * Main language detection function
 */
export function detectLanguage(text, supportedLanguages = null) {
  if (!text || text.trim().length < 3) return 'en'; // Default

  // First try character-based detection
  const charDetected = detectByCharacter(text);
  if (charDetected) {
    if (!supportedLanguages || supportedLanguages.includes(charDetected)) {
      return charDetected;
    }
  }

  // Then try common word detection
  const scores = {};
  const langList = supportedLanguages || Object.keys(COMMON_WORDS);

  for (const langCode of langList) {
    scores[langCode] = scoreLanguage(text, langCode);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[0][1] > 0.05) {
    return sorted[0][0];
  }

  // If text is mostly Latin and no specific language detected, check for common patterns
  const latinMatches = (text.match(CHAR_RANGES.latin) || []).length;
  const latinRatio = latinMatches / text.length;

  if (latinRatio > 0.5) {
    // Likely a Latin-based language, default to English
    return 'en';
  }

  return 'en'; // Global default
}

/**
 * Batch detect multiple texts
 */
export function detectLanguageBatch(texts, supportedLanguages = null) {
  return texts.map(text => detectLanguage(text, supportedLanguages));
}

/**
 * Get confidence score for a language
 */
export function getLanguageConfidence(text, langCode) {
  if (!text || text.length < 3) return 0;

  const charScore = detectByCharacter(text) === langCode ? 1 : 0;
  const wordScore = scoreLanguage(text, langCode);

  return (charScore + wordScore) / 2;
}
