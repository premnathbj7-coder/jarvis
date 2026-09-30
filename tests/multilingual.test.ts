import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  detectLanguageAndStyle,
  parseTranslationRequest,
  executeLocalTranslation,
  normalizeLanguageTarget,
} from '../src/utils/languageEngine';

describe('Multilingual Engine - Language & Style Detection', () => {
  it('detects pure English statements', () => {
    const res = detectLanguageAndStyle('All systems are operating within nominal parameters.');
    assert.strictEqual(res.code, 'en-US');
    assert.strictEqual(res.name, 'English');
    assert.strictEqual(res.isMixed, false);
  });

  it('detects pure Spanish statements', () => {
    const res = detectLanguageAndStyle('Buenos días señor, ¿cuál es el estado de los sistemas?');
    assert.strictEqual(res.code, 'es-ES');
    assert.strictEqual(res.name, 'Spanish');
    assert.strictEqual(res.isMixed, false);
  });

  it('detects pure Tagalog statements', () => {
    const res = detectLanguageAndStyle('Kumusta po, ano ang lagay ng mga sistema natin ngayon?');
    assert.strictEqual(res.code, 'fil-PH');
    assert.strictEqual(res.name, 'Tagalog / Filipino');
    assert.strictEqual(res.isMixed, false);
  });

  it('detects code-switched Taglish (Tagalog-English mix)', () => {
    const res = detectLanguageAndStyle('Kumusta ka, can you check the system status please?');
    assert.strictEqual(res.code, 'fil-PH');
    assert.strictEqual(res.name, 'Taglish (Tagalog-English)');
    assert.strictEqual(res.isMixed, true);
    assert.deepStrictEqual(res.mixedLanguages, ['Tagalog', 'English']);
  });

  it('detects code-switched Spanglish (Spanish-English mix)', () => {
    const res = detectLanguageAndStyle('Hola amigo, can you please help me with este assignment?');
    assert.strictEqual(res.code, 'es-ES');
    assert.strictEqual(res.name, 'Spanglish (Spanish-English)');
    assert.strictEqual(res.isMixed, true);
    assert.deepStrictEqual(res.mixedLanguages, ['Spanish', 'English']);
  });

  it('detects code-switched Hinglish (Hindi-English mix)', () => {
    const res = detectLanguageAndStyle('Bhai, can you check the latest news today please?');
    assert.strictEqual(res.code, 'hi-IN');
    assert.strictEqual(res.name, 'Hinglish (Hindi-English)');
    assert.strictEqual(res.isMixed, true);
    assert.deepStrictEqual(res.mixedLanguages, ['Hindi', 'English']);
  });

  it('detects Japanese script and polite formality', () => {
    const res = detectLanguageAndStyle('こんにちは、システムの状態を教えてください。');
    assert.strictEqual(res.code, 'ja-JP');
    assert.strictEqual(res.name, 'Japanese');
    assert.strictEqual(res.formality, 'formal');
  });

  it('detects formal vs casual tone in Tagalog/Taglish', () => {
    const formal = detectLanguageAndStyle('Magandang araw po sir, pakisuyo naman po ang diagnostics.');
    assert.strictEqual(formal.formality, 'formal');

    const casual = detectLanguageAndStyle('Pre kumusta na ano ba yan.');
    assert.strictEqual(casual.formality, 'casual');
  });

  it('adapts when language switches between turns', () => {
    const turn1 = detectLanguageAndStyle('What is the weather today?');
    assert.strictEqual(turn1.code, 'en-US');

    const turn2 = detectLanguageAndStyle('Pakisuyo naman open the notes for me.');
    assert.strictEqual(turn2.name, 'Taglish (Tagalog-English)');

    const turn3 = detectLanguageAndStyle('Muchísimas gracias por tu ayuda.');
    assert.strictEqual(turn3.code, 'es-ES');
  });
});

describe('Multilingual Engine - Translation Request Parsing', () => {
  it('parses explicit quoted translation request', () => {
    const req = parseTranslationRequest('Can you translate "Hello world" to Spanish?');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.sourceText, 'Hello world');
    assert.strictEqual(req.targetLanguage, 'Spanish');
    assert.strictEqual(req.targetLanguageCode, 'es-ES');
    assert.strictEqual(req.needsClarification, false);
  });

  it('parses translation with target language and unquoted text', () => {
    const req = parseTranslationRequest('Translate All systems nominal into French');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.sourceText, 'All systems nominal');
    assert.strictEqual(req.targetLanguage, 'French');
    assert.strictEqual(req.targetLanguageCode, 'fr-FR');
    assert.strictEqual(req.needsClarification, false);
  });

  it('parses Tagalog translation command "Pakisalin sa Tagalog:"', () => {
    const req = parseTranslationRequest('Pakisalin sa Tagalog: Welcome to Stark Industries');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.sourceText, 'Welcome to Stark Industries');
    assert.strictEqual(req.targetLanguage, 'Tagalog');
    assert.strictEqual(req.targetLanguageCode, 'fil-PH');
    assert.strictEqual(req.needsClarification, false);
  });

  it('parses "How do you say ... in Japanese?"', () => {
    const req = parseTranslationRequest('How do you say thank you in Japanese?');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.sourceText, 'thank you');
    assert.strictEqual(req.targetLanguage, 'Japanese');
    assert.strictEqual(req.targetLanguageCode, 'ja-JP');
    assert.strictEqual(req.needsClarification, false);
  });

  it('flags translation requests missing a target language and asks for clarification', () => {
    const req = parseTranslationRequest('Can you translate this for me: All systems nominal');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.needsClarification, true);
    assert.ok(req.clarificationPrompt);
    assert.match(req.clarificationPrompt, /target language|wika|idioma/i);
  });

  it('flags Tagalog translation request missing target language and asks in Taglish', () => {
    const req = parseTranslationRequest('Paki translate nito para sa akin: Magandang araw');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.needsClarification, true);
    assert.ok(req.clarificationPrompt);
    assert.match(req.clarificationPrompt, /target language|wika/i);
  });

  it('flags Spanish translation request missing target language and asks in Spanish', () => {
    const req = parseTranslationRequest('Traduce esto por favor: Buenos días a todos');
    assert.strictEqual(req.isTranslation, true);
    assert.strictEqual(req.needsClarification, true);
    assert.ok(req.clarificationPrompt);
    assert.match(req.clarificationPrompt, /idioma/i);
  });

  it('handles spelling variations and slang in translation commands', () => {
    const req1 = parseTranslationRequest('paki translate po "Magandang gabi" to English');
    assert.strictEqual(req1.isTranslation, true);
    assert.strictEqual(req1.sourceText, 'Magandang gabi');
    assert.strictEqual(req1.targetLanguage, 'English');

    const req2 = parseTranslationRequest('Traduce esto al frances: Hola');
    assert.strictEqual(req2.isTranslation, true);
    assert.strictEqual(req2.targetLanguage, 'French');
  });

  it('does not classify regular non-translation conversation as translation', () => {
    const req = parseTranslationRequest('Can you tell me about the history of artificial intelligence?');
    assert.strictEqual(req.isTranslation, false);
  });
});

describe('Multilingual Engine - Translation Execution & Fidelity', () => {
  it('executes direct local translations accurately without explanations', () => {
    const spanish = executeLocalTranslation('Hello world', 'Spanish');
    assert.strictEqual(spanish, 'Hola mundo');
    // Ensure no unsolicited grammar lessons or notes
    assert.strictEqual(spanish.includes('Note:'), false);
    assert.strictEqual(spanish.includes('Explanation'), false);

    const french = executeLocalTranslation('All systems nominal', 'French');
    assert.strictEqual(french, 'Tous les systèmes sont nominaux');

    const tagalog = executeLocalTranslation('Thank you', 'Tagalog');
    assert.strictEqual(tagalog, 'Salamat');

    const german = executeLocalTranslation('Good morning', 'German');
    assert.strictEqual(german, 'Guten Morgen');

    const japanese = executeLocalTranslation('Hello world', 'Japanese');
    assert.strictEqual(japanese, 'こんにちは世界');

    const properNounTagalog = executeLocalTranslation('Welcome to Stark Industries', 'Tagalog');
    assert.strictEqual(properNounTagalog, 'Maligayang pagdating sa Stark Industries');
    assert.strictEqual(properNounTagalog.includes('Stark Industries'), true);

    const filipinoDirect = executeLocalTranslation('Welcome to Stark Industries', 'Filipino');
    assert.strictEqual(filipinoDirect, 'Maligayang pagdating sa Stark Industries');
  });

  it('handles short messages and code-switched slang reliably', () => {
    const res1 = detectLanguageAndStyle('Kamusta po');
    assert.strictEqual(res1.code, 'fil-PH');
    assert.strictEqual(res1.formality, 'formal');

    const res2 = detectLanguageAndStyle('Yo JARVIS check status');
    assert.strictEqual(res2.formality, 'casual');

    const res3 = detectLanguageAndStyle('Pre pakitsek nga');
    assert.strictEqual(res3.code, 'fil-PH');
    assert.strictEqual(res3.formality, 'casual');

    const res4 = detectLanguageAndStyle('Oye hermano can you help me with this?');
    assert.strictEqual(res4.name, 'Spanglish (Spanish-English)');
    assert.strictEqual(res4.isMixed, true);
  });

  it('normalizes target language names correctly', () => {
    const es = normalizeLanguageTarget('espanol');
    assert.strictEqual(es?.name, 'Spanish');
    assert.strictEqual(es?.code, 'es-ES');

    const tag = normalizeLanguageTarget('filipino');
    assert.strictEqual(tag?.name, 'Filipino');
    assert.strictEqual(tag?.code, 'fil-PH');

    const nihon = normalizeLanguageTarget('nihongo');
    assert.strictEqual(nihon?.name, 'Japanese');
    assert.strictEqual(nihon?.code, 'ja-JP');

    const fr = normalizeLanguageTarget('francés');
    assert.strictEqual(fr?.name, 'French');

    const de = normalizeLanguageTarget('alemán');
    assert.strictEqual(de?.name, 'German');
  });
});
