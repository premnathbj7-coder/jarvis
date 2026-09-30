/**
 * Language Engine for Multilingual Understanding, Code-Switching, and Translation.
 * Supports detection of pure languages, mixed speech (Taglish, Spanglish, Hinglish, etc.),
 * and translation parsing with clarification prompts.
 */

export interface DetectedLanguage {
  code: string; // ISO 639-1 or BCP-47 (e.g. 'en', 'tl-PH', 'es', 'hi', 'ja')
  name: string; // e.g. 'Taglish (Tagalog-English)', 'Spanish', 'English'
  isMixed: boolean;
  mixedLanguages?: string[];
  formality: 'formal' | 'casual' | 'neutral';
  confidence: number;
}

export interface TranslationRequest {
  isTranslation: boolean;
  sourceText?: string;
  targetLanguage?: string;
  targetLanguageCode?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
}

// Markers for common languages and code-switching dialects
const TAGALOG_MARKERS = [
  'ang', 'mga', 'ng', 'sa', 'para', 'na', 'ba', 'po', 'opo', 'kasi',
  'kumusta', 'kamusta', 'salamat', 'ano', 'sino', 'saan', 'kailan', 'bakit',
  'paano', 'meron', 'wala', 'gusto', 'ayaw', 'ko', 'mo', 'niya', 'namin',
  'natin', 'ninyo', 'nila', 'ako', 'ikaw', 'siya', 'kami', 'tayo', 'kayo',
  'sila', 'paki', 'pakisuyo', 'pwede', 'puwede', 'naman', 'talaga', 'nga',
  'dito', 'diyan', 'doon', 'nandito', 'nandiyan', 'nandoon', 'ito', 'iyan', 'iyon',
  'maganda', 'mabuti', 'tulong', 'ayos', 'pre', 'tol', 'pare', 'kuya', 'ate',
  'ano ba', 'sobrang', 'basta', 'lagi', 'ngayon', 'bukas', 'kahapon'
];

const SPANISH_MARKERS = [
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
  'en', 'por', 'para', 'con', 'sin', 'hola', 'buenos', 'buenas', 'dias',
  'tardes', 'noches', 'gracias', 'por favor', 'amigo', 'hermano', 'como',
  'que', 'donde', 'cuando', 'porque', 'quien', 'cual', 'esto', 'esta',
  'este', 'estos', 'estas', 'pero', 'mas', 'muy', 'bien', 'bueno', 'malo',
  'hacer', 'hace', 'tiempo', 'vida', 'mundo', 'casa', 'ahora', 'siempre',
  'nunca', 'claro', 'oye', 'mira', 'saludos', 'usted', 'tu', 'yo', 'nosotros'
];

const HINDI_MARKERS = [
  'hai', 'hain', 'ho', 'hoon', 'ka', 'ke', 'ki', 'ko', 'se', 'mein',
  'par', 'aur', 'kya', 'kaise', 'kyun', 'kaha', 'kab', 'bhai', 'yaar',
  'namaste', 'shukriya', 'dhanyawad', 'mujhe', 'hum', 'tum', 'aap', 'ye',
  'woh', 'accha', 'theek', 'karna', 'karo', 'chahiye', 'batao', 'dost'
];

const FRENCH_MARKERS = [
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'dans', 'en',
  'pour', 'avec', 'sans', 'bonjour', 'bonsoir', 'salut', 'merci', 'oui',
  'non', 's\'il vous plait', 'comment', 'pourquoi', 'qui', 'quoi', 'est',
  'sont', 'c\'est', 'nous', 'vous', 'ils', 'elles', 'tres', 'bien'
];

const GERMAN_MARKERS = [
  'der', 'die', 'das', 'ein', 'eine', 'und', 'in', 'den', 'von', 'zu',
  'mit', 'sich', 'des', 'auf', 'fuer', 'für', 'ist', 'im', 'dem', 'nicht',
  'hallo', 'guten tag', 'danke', 'bitte', 'ja', 'nein', 'wie', 'warum', 'was'
];

const JAPANESE_CHARS_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;
const CHINESE_CHARS_REGEX = /[\u4e00-\u9fff]/;
const CYRILLIC_CHARS_REGEX = /[\u0400-\u04ff]/;
const ARABIC_CHARS_REGEX = /[\u0600-\u06ff]/;

/**
 * Detect language, code-switching dialects, and conversational formality
 */
export function detectLanguageAndStyle(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      code: 'en-US',
      name: 'English',
      isMixed: false,
      formality: 'neutral',
      confidence: 1,
    };
  }

  // Script-based detection
  if (JAPANESE_CHARS_REGEX.test(trimmed)) {
    const isPolite = /[\u3067\u3059\u307e\u3059\u304f\u3060\u3055\u3044\u304a\u9858\u3044]|です|ます|ください|お願い/.test(trimmed);
    return {
      code: 'ja-JP',
      name: 'Japanese',
      isMixed: false,
      formality: isPolite ? 'formal' : 'casual',
      confidence: 0.95,
    };
  }

  if (ARABIC_CHARS_REGEX.test(trimmed)) {
    return {
      code: 'ar-SA',
      name: 'Arabic',
      isMixed: false,
      formality: 'formal',
      confidence: 0.95,
    };
  }

  if (CYRILLIC_CHARS_REGEX.test(trimmed)) {
    return {
      code: 'ru-RU',
      name: 'Russian',
      isMixed: false,
      formality: 'neutral',
      confidence: 0.95,
    };
  }

  if (CHINESE_CHARS_REGEX.test(trimmed)) {
    return {
      code: 'zh-CN',
      name: 'Chinese',
      isMixed: false,
      formality: 'neutral',
      confidence: 0.95,
    };
  }

  const words = trimmed.toLowerCase().split(/[\s,.;:!?()"'`-]+/).filter(Boolean);
  const totalWords = words.length;

  // Count language marker occurrences
  const countMatches = (markers: string[]) => {
    return words.filter((w) => markers.includes(w)).length;
  };

  const tagalogCount = countMatches(TAGALOG_MARKERS);
  const spanishCount = countMatches(SPANISH_MARKERS);
  const hindiCount = countMatches(HINDI_MARKERS);
  const frenchCount = countMatches(FRENCH_MARKERS);
  const germanCount = countMatches(GERMAN_MARKERS);

  // Common English markers
  const englishMarkers = ['the', 'is', 'are', 'you', 'can', 'please', 'this', 'that', 'for', 'with', 'about', 'and', 'to', 'in', 'on', 'my', 'your', 'we'];
  const englishCount = countMatches(englishMarkers);

  // Formality detection
  let formality: 'formal' | 'casual' | 'neutral' = 'neutral';
  const hasHonorifics = /\b(po|opo|sir|ma'am|mr|mrs|dr|usted|kindly|please)\b/i.test(trimmed);
  const hasSlang = /\b(pre|tol|pare|bro|dude|sup|yo|bhai|yaar|chilling|wbu|idk|ano na)\b/i.test(trimmed);
  if (hasHonorifics) formality = 'formal';
  else if (hasSlang) formality = 'casual';

  // 1. Taglish Detection (mix of Tagalog and English words)
  if (tagalogCount > 0 && (englishCount > 0 || words.some((w) => /^(help|check|open|system|note|notes|schedule|class|translate|search)$/i.test(w)))) {
    return {
      code: 'fil-PH',
      name: 'Taglish (Tagalog-English)',
      isMixed: true,
      mixedLanguages: ['Tagalog', 'English'],
      formality,
      confidence: 0.9,
    };
  }

  // Pure or predominant Tagalog
  if (tagalogCount >= 2 || (tagalogCount >= 1 && totalWords <= 4 && englishCount === 0)) {
    return {
      code: 'fil-PH',
      name: 'Tagalog / Filipino',
      isMixed: false,
      formality,
      confidence: 0.85,
    };
  }

  // 2. Spanglish Detection (mix of Spanish and English)
  if (spanishCount > 0 && englishCount > 0) {
    return {
      code: 'es-ES',
      name: 'Spanglish (Spanish-English)',
      isMixed: true,
      mixedLanguages: ['Spanish', 'English'],
      formality,
      confidence: 0.9,
    };
  }

  // Pure Spanish
  if (spanishCount >= 2 || (spanishCount >= 1 && totalWords <= 4 && englishCount === 0)) {
    return {
      code: 'es-ES',
      name: 'Spanish',
      isMixed: false,
      formality,
      confidence: 0.88,
    };
  }

  // 3. Hinglish Detection (Hindi + English)
  if (hindiCount > 0 && (englishCount > 0 || totalWords > 2)) {
    return {
      code: 'hi-IN',
      name: 'Hinglish (Hindi-English)',
      isMixed: true,
      mixedLanguages: ['Hindi', 'English'],
      formality,
      confidence: 0.88,
    };
  }

  // French
  if (frenchCount >= 2 || (frenchCount >= 1 && englishCount === 0)) {
    return {
      code: 'fr-FR',
      name: 'French',
      isMixed: false,
      formality,
      confidence: 0.85,
    };
  }

  // German
  if (germanCount >= 2 || (germanCount >= 1 && englishCount === 0)) {
    return {
      code: 'de-DE',
      name: 'German',
      isMixed: false,
      formality,
      confidence: 0.85,
    };
  }

  // Default to English
  return {
    code: 'en-US',
    name: 'English',
    isMixed: false,
    formality,
    confidence: 0.8,
  };
}

/**
 * Cleans extracted source text by stripping polite particles, pronouns, and quotes
 */
export function cleanSourceText(text: string): string {
  let cleaned = text.trim();
  // Strip leading colons, hyphens, or commas
  cleaned = cleaned.replace(/^[:,\-\s]+/, '').trim();
  // Strip common introductory prefixes
  cleaned = cleaned.replace(/^(?:this|the text|the following|nito|ito|esto|ce texte|diesen text)\s*[:,-]?\s*/i, '').trim();
  // Strip leading colons, hyphens again if exposed
  cleaned = cleaned.replace(/^[:,\-\s]+/, '').trim();
  // Strip polite/filler particles from beginning
  cleaned = cleaned.replace(/^(?:po|opo|naman|nga|naman\s+po|nga\s+po|please|kindly|por\s+favor|porfa|para\s+sa\s+akin|for\s+me)\b\s*/i, '').trim();
  // Strip leading colons, hyphens again
  cleaned = cleaned.replace(/^[:,\-\s]+/, '').trim();
  // Strip enclosing quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('“') && cleaned.endsWith('”')) ||
    (cleaned.startsWith('«') && cleaned.endsWith('»'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip polite/filler particles again
  cleaned = cleaned.replace(/^(?:po|opo|naman|nga|naman\s+po|nga\s+po|please|kindly|por\s+favor|porfa|para\s+sa\s+akin|for\s+me)\b\s*/i, '').trim();
  cleaned = cleaned.replace(/\s*\b(?:po|opo|naman|nga|naman\s+po|nga\s+po|please|kindly|por\s+favor|porfa|para\s+sa\s+akin|for\s+me)$/i, '').trim();
  return cleaned;
}

/**
 * Standardizes target language names to readable title and language code
 */
export function normalizeLanguageTarget(rawTarget: string): { name: string; code: string } | null {
  const t = rawTarget.trim().toLowerCase().replace(/[.,!?:;]$/, '');
  const map: Record<string, { name: string; code: string }> = {
    english: { name: 'English', code: 'en-US' },
    ingglis: { name: 'English', code: 'en-US' },
    ingles: { name: 'English', code: 'en-US' },
    inglés: { name: 'English', code: 'en-US' },
    spanish: { name: 'Spanish', code: 'es-ES' },
    espanol: { name: 'Spanish', code: 'es-ES' },
    español: { name: 'Spanish', code: 'es-ES' },
    kastila: { name: 'Spanish', code: 'es-ES' },
    tagalog: { name: 'Tagalog', code: 'fil-PH' },
    filipino: { name: 'Filipino', code: 'fil-PH' },
    taglish: { name: 'Taglish', code: 'fil-PH' },
    pinoy: { name: 'Filipino', code: 'fil-PH' },
    french: { name: 'French', code: 'fr-FR' },
    francais: { name: 'French', code: 'fr-FR' },
    français: { name: 'French', code: 'fr-FR' },
    frances: { name: 'French', code: 'fr-FR' },
    francés: { name: 'French', code: 'fr-FR' },
    pranses: { name: 'French', code: 'fr-FR' },
    german: { name: 'German', code: 'de-DE' },
    deutsch: { name: 'German', code: 'de-DE' },
    aleman: { name: 'German', code: 'de-DE' },
    alemán: { name: 'German', code: 'de-DE' },
    hindi: { name: 'Hindi', code: 'hi-IN' },
    hinglish: { name: 'Hinglish', code: 'hi-IN' },
    japanese: { name: 'Japanese', code: 'ja-JP' },
    nihongo: { name: 'Japanese', code: 'ja-JP' },
    japones: { name: 'Japanese', code: 'ja-JP' },
    japonés: { name: 'Japanese', code: 'ja-JP' },
    hapon: { name: 'Japanese', code: 'ja-JP' },
    chinese: { name: 'Chinese', code: 'zh-CN' },
    mandarin: { name: 'Mandarin Chinese', code: 'zh-CN' },
    chino: { name: 'Chinese', code: 'zh-CN' },
    tsino: { name: 'Chinese', code: 'zh-CN' },
    russian: { name: 'Russian', code: 'ru-RU' },
    ruso: { name: 'Russian', code: 'ru-RU' },
    italian: { name: 'Italian', code: 'it-IT' },
    italiano: { name: 'Italian', code: 'it-IT' },
    portuguese: { name: 'Portuguese', code: 'pt-BR' },
    portugues: { name: 'Portuguese', code: 'pt-BR' },
    português: { name: 'Portuguese', code: 'pt-BR' },
    korean: { name: 'Korean', code: 'ko-KR' },
    hangul: { name: 'Korean', code: 'ko-KR' },
    koreano: { name: 'Korean', code: 'ko-KR' },
    coreano: { name: 'Korean', code: 'ko-KR' },
    arabic: { name: 'Arabic', code: 'ar-SA' },
    arabe: { name: 'Arabic', code: 'ar-SA' },
    árabe: { name: 'Arabic', code: 'ar-SA' },
    dutch: { name: 'Dutch', code: 'nl-NL' },
    holandes: { name: 'Dutch', code: 'nl-NL' },
    holandés: { name: 'Dutch', code: 'nl-NL' },
    latin: { name: 'Latin', code: 'la' },
    tamil: { name: 'Tamil', code: 'ta-IN' },
  };

  return map[t] || null;
}

/**
 * Parses user input to determine if it is an explicit translation request
 */
export function parseTranslationRequest(message: string): TranslationRequest {
  const trimmed = message.trim();

  // 1. Quoted source text pattern: translate [particles] "..." to/into/in/sa/al <language>
  const quotedRegex = /(?:can you |please |kindly )?(?:translate|pakisalin|paki\s+salin|pakitranslate|paki\s+translate|traduce|traducir)(?:\s+(?:po|opo|naman|nga|naman\s+po|nga\s+po|please|por\s+favor|porfa|para\s+sa\s+akin|for\s+me))?\s+["'“«](.+?)["'”»]\s+(?:to|into|in|sa|al|a)\s+([a-zA-Z\u00C0-\u024F]+)/i;
  const quotedMatch = trimmed.match(quotedRegex);
  if (quotedMatch) {
    const rawText = cleanSourceText(quotedMatch[1]);
    const rawTarget = quotedMatch[2].trim();
    const target = normalizeLanguageTarget(rawTarget);
    if (target) {
      return {
        isTranslation: true,
        sourceText: rawText,
        targetLanguage: target.name,
        targetLanguageCode: target.code,
        needsClarification: false,
      };
    }
  }

  // 2. Pattern: "How do you say <text> in <language>?" or "Paano sabihin ang <text> sa <language>?"
  const howDoYouSayRegex = /(?:how do you say|how to say|paano sabihin ang|como se dice)\s+["']?(.+?)["']?\s+(?:in|sa|en|al)\s+([a-zA-Z\u00C0-\u024F]+)\??$/i;
  const howMatch = trimmed.match(howDoYouSayRegex);
  if (howMatch) {
    const rawText = cleanSourceText(howMatch[1]);
    const rawTarget = howMatch[2].trim();
    const target = normalizeLanguageTarget(rawTarget);
    if (target && rawText) {
      return {
        isTranslation: true,
        sourceText: rawText,
        targetLanguage: target.name,
        targetLanguageCode: target.code,
        needsClarification: false,
      };
    }
  }

  // 3. Pattern: "Translate [this] to/into/sa/al <language>[: ] <text>"
  const prefixLangRegex = /(?:can you |please |kindly )?(?:translate|pakisalin|paki\s+salin|pakitranslate|paki\s+translate|traduce|traducir)(?:\s+(?:this|esto|nito|ito|po|naman|por\s+favor))?\s+(?:to|into|in|sa|al|a)\s+([a-zA-Z\u00C0-\u024F]+)\s*[:,-]?\s*(.+)$/i;
  const prefixMatch = trimmed.match(prefixLangRegex);
  if (prefixMatch) {
    const rawTarget = prefixMatch[1].trim();
    const target = normalizeLanguageTarget(rawTarget);
    const rawText = cleanSourceText(prefixMatch[2]);
    if (target && rawText) {
      return {
        isTranslation: true,
        sourceText: rawText,
        targetLanguage: target.name,
        targetLanguageCode: target.code,
        needsClarification: false,
      };
    }
  }

  // 4. Pattern: translate <text> to/into/sa/al <language>
  const toLangRegex = /(?:can you |please |kindly )?(?:translate|pakisalin|paki\s+salin|pakitranslate|paki\s+translate|traduce|traducir)\s+(.+?)\s+(?:to|into|sa|al|a)\s+([a-zA-Z\u00C0-\u024F]+)$/i;
  const toLangMatch = trimmed.match(toLangRegex);
  if (toLangMatch) {
    const candidateText = toLangMatch[1].trim();
    const rawTarget = toLangMatch[2].trim();
    const target = normalizeLanguageTarget(rawTarget);

    if (target && candidateText) {
      const cleanedSource = cleanSourceText(candidateText);
      return {
        isTranslation: true,
        sourceText: cleanedSource,
        targetLanguage: target.name,
        targetLanguageCode: target.code,
        needsClarification: false,
      };
    }
  }

  // 5. Unclear target language: user asked to translate, but did not specify the target language!
  // e.g. "Can you translate this for me: Hello world", "Translate this sentence", "Paki translate nito"
  const missingTargetRegex = /^(?:(?:can you |please |kindly )?(?:translate|pakisalin|paki\s+salin|pakitranslate|paki\s+translate|traduce)(?:\s+(?:this for me|this|nito|ito|the following|the text|esto))?\s*(?:[:,-]|\s+|$)(.*))$/i;
  const missingMatch = trimmed.match(missingTargetRegex);
  if (missingMatch) {
    let potentialText = missingMatch[1]?.trim();
    if (potentialText) {
      potentialText = cleanSourceText(potentialText);
    }
    // Verify it doesn't already have an unparsed valid target language like "to Spanish"
    const langCandidateMatch = trimmed.match(/\b(?:to|into|sa|al|in|a)\s+([a-zA-Z\u00C0-\u024F]+)/i);
    const hasValidTargetLanguage = langCandidateMatch && normalizeLanguageTarget(langCandidateMatch[1]) !== null;

    if (!hasValidTargetLanguage) {
      const userLang = detectLanguageAndStyle(trimmed);
      let clarification = 'Certainly, sir. Which target language would you like me to translate this into?';
      if (userLang.name.includes('Taglish') || userLang.code === 'fil-PH') {
        clarification = 'Sige po sir, sa anong wika (target language) niyo po gustong isalin ito?';
      } else if (userLang.code === 'es-ES') {
        clarification = 'Con gusto, señor. ¿A qué idioma de destino le gustaría que traduzca el texto?';
      }

      return {
        isTranslation: true,
        sourceText: potentialText || undefined,
        needsClarification: true,
        clarificationPrompt: clarification,
      };
    }
  }

  return { isTranslation: false };
}

/**
 * Local translation dictionary for standard phrases when model is in fallback mode.
 * Note: Translations preserve original tone, names, formatting, and never add unrequested commentary.
 */
export function executeLocalTranslation(text: string, targetLanguage: string): string {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const target = targetLanguage.toLowerCase();

  const phraseMap: Record<string, Record<string, string>> = {
    'hello': {
      spanish: 'Hola',
      tagalog: 'Kumusta',
      filipino: 'Kumusta',
      french: 'Bonjour',
      german: 'Hallo',
      japanese: 'こんにちは',
      hindi: 'नमस्ते',
      italian: 'Ciao',
    },
    'hello world': {
      spanish: 'Hola mundo',
      tagalog: 'Kumusta mundo',
      filipino: 'Kumusta mundo',
      french: 'Bonjour le monde',
      german: 'Hallo Welt',
      japanese: 'こんにちは世界',
      hindi: 'नमस्ते दुनिया',
      italian: 'Ciao mondo',
    },
    'good morning': {
      spanish: 'Buenos días',
      tagalog: 'Magandang umaga',
      filipino: 'Magandang umaga',
      french: 'Bonjour',
      german: 'Guten Morgen',
      japanese: 'おはようございます',
      hindi: 'शुभ प्रभात',
      italian: 'Buongiorno',
    },
    'good afternoon': {
      spanish: 'Buenas tardes',
      tagalog: 'Magandang hapon',
      filipino: 'Magandang hapon',
      french: 'Bon après-midi',
      german: 'Guten Tag',
      japanese: 'こんにちは',
      hindi: 'शुभ दोपहर',
      italian: 'Buon pomeriggio',
    },
    'thank you': {
      spanish: 'Gracias',
      tagalog: 'Salamat',
      filipino: 'Salamat',
      french: 'Merci',
      german: 'Danke',
      japanese: 'ありがとうございます',
      hindi: 'धन्यवाद',
      italian: 'Grazie',
    },
    'thanks': {
      spanish: 'Gracias',
      tagalog: 'Salamat',
      filipino: 'Salamat',
      french: 'Merci',
      german: 'Danke',
      japanese: 'ありがとう',
      hindi: 'शुक्रिया',
      italian: 'Grazie',
    },
    'how are you': {
      spanish: '¿Cómo estás?',
      tagalog: 'Kumusta ka?',
      filipino: 'Kumusta ka?',
      french: 'Comment allez-vous ?',
      german: 'Wie geht es dir?',
      japanese: 'お元気ですか？',
      hindi: 'आप कैसे हैं?',
      italian: 'Come stai?',
    },
    'all systems nominal': {
      spanish: 'Todos los sistemas nominales',
      tagalog: 'Lahat ng sistema ay nominal',
      filipino: 'Lahat ng sistema ay nominal',
      french: 'Tous les systèmes sont nominaux',
      german: 'Alle Systeme nominal',
      japanese: 'すべてのシステムは正常です',
      hindi: 'सभी प्रणालियाँ सामान्य हैं',
      italian: 'Tutti i sistemi sono nominali',
    },
  };

  const direct = phraseMap[lower]?.[target];
  if (direct) {
    return direct;
  }

  // Word-by-word substitution dictionary for common conversational words
  const vocab: Record<string, Record<string, string>> = {
    spanish: {
      'system': 'sistema', 'systems': 'sistemas', 'status': 'estado',
      'online': 'en línea', 'ready': 'listo', 'good': 'bueno', 'bad': 'malo',
      'yes': 'sí', 'no': 'no', 'welcome': 'bienvenido', 'help': 'ayuda',
      'friend': 'amigo', 'work': 'trabajo', 'code': 'código', 'note': 'nota',
      'notes': 'notas', 'task': 'tarea', 'tasks': 'tareas', 'memory': 'memoria',
      'to': 'a', 'in': 'en', 'for': 'para', 'the': 'el', 'and': 'y', 'of': 'de',
    },
    tagalog: {
      'system': 'sistema', 'systems': 'mga sistema', 'status': 'katayuan',
      'online': 'online', 'ready': 'handa', 'good': 'mabuti', 'bad': 'masama',
      'yes': 'oo', 'no': 'hindi', 'welcome': 'maligayang pagdating', 'help': 'tulong',
      'friend': 'kaibigan', 'work': 'trabaho', 'code': 'code', 'note': 'tala',
      'notes': 'mga tala', 'task': 'gawain', 'tasks': 'mga gawain', 'memory': 'alaala',
      'to': 'sa', 'in': 'sa', 'for': 'para sa', 'the': 'ang', 'and': 'at', 'of': 'ng',
    },
    french: {
      'system': 'système', 'systems': 'systèmes', 'status': 'statut',
      'online': 'en ligne', 'ready': 'prêt', 'good': 'bon', 'bad': 'mauvais',
      'yes': 'oui', 'no': 'non', 'welcome': 'bienvenue', 'help': 'aide',
      'friend': 'ami', 'work': 'travail', 'code': 'code', 'note': 'note',
      'notes': 'notes', 'task': 'tâche', 'tasks': 'tâches', 'memory': 'mémoire',
      'to': 'à', 'in': 'dans', 'for': 'pour', 'the': 'le', 'and': 'et', 'of': 'de',
    },
    german: {
      'system': 'System', 'systems': 'Systeme', 'status': 'Status',
      'online': 'online', 'ready': 'bereit', 'good': 'gut', 'bad': 'schlecht',
      'yes': 'ja', 'no': 'nein', 'welcome': 'willkommen', 'help': 'Hilfe',
      'friend': 'Freund', 'work': 'Arbeit', 'code': 'Code', 'note': 'Notiz',
      'notes': 'Notizen', 'task': 'Aufgabe', 'tasks': 'Aufgaben', 'memory': 'Speicher',
      'to': 'zu', 'in': 'in', 'for': 'für', 'the': 'das', 'and': 'und', 'of': 'von',
    },
  };

  const targetVocab = vocab[target] || (target === 'filipino' ? vocab.tagalog : undefined);
  if (targetVocab) {
    const translatedWords = clean.split(/(\s+|[,.!?]+)/).map((token) => {
      const match = targetVocab[token.toLowerCase()];
      if (match) {
        if (token[0] === token[0].toUpperCase()) {
          return match.charAt(0).toUpperCase() + match.slice(1);
        }
        return match;
      }
      return token;
    });
    return translatedWords.join('');
  }

  return clean;
}

/**
 * Adapts deterministic command execution strings to match the user's active language and conversational formality
 */
export function adaptCommandResultLanguage(result: string, lang: DetectedLanguage): string {
  if (lang.code === 'en-US' && !lang.isMixed) return result;

  if (lang.name.includes('Taglish') || lang.code === 'fil-PH') {
    if (result.startsWith('System Status: Nominal.')) {
      return result.replace('System Status: Nominal.', 'All protocols nominal po, sir. Katayuan ng sistema:');
    }
    if (result.startsWith('Added task to your list:')) {
      return result.replace('Added task to your list:', 'Naidagdag ko na po ang task sa inyong list:');
    }
    if (result.startsWith('Note saved:')) {
      return result.replace('Note saved:', 'Na-save ko na po ang note:');
    }
    if (result.startsWith('Timer started for')) {
      return result.replace('Timer started for', 'Nagsimula na po ang timer para sa');
    }
  } else if (lang.name.includes('Spanglish') || lang.code === 'es-ES') {
    if (result.startsWith('System Status: Nominal.')) {
      return result.replace('System Status: Nominal.', 'Estado del sistema nominal, señor.');
    }
    if (result.startsWith('Added task to your list:')) {
      return result.replace('Added task to your list:', 'Tarea agregada a su lista:');
    }
    if (result.startsWith('Note saved:')) {
      return result.replace('Note saved:', 'Nota guardada exitosamente:');
    }
    if (result.startsWith('Timer started for')) {
      return result.replace('Timer started for', 'Temporizador iniciado por');
    }
  }

  return result;
}
