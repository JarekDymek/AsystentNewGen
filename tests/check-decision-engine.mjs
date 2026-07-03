import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const context = { window: {} };
context.globalThis = context;
vm.createContext(context);

[
  'assets/js/data-procedures.js',
  'assets/js/data-laws.js',
  'assets/js/data-document-registry.js',
  'assets/js/data-answer-bank.js',
  'assets/js/answer-router.js',
  'assets/js/decision-engine.js'
].forEach(file => vm.runInContext(read(file), context, { filename: file }));

const engine = context.window.MOW_DECISION_ENGINE;
if (!engine?.assess || !engine?.format) throw new Error('Brak silnika decyzji MOW.');

assertDecision('Co robić przy ucieczce wychowanka?', ['emergency', 'answer'], /uciecz/i, /Procedury|Statut|MOW/i);
assertDecision('Czy wychowawca MOW ma 40 godzin pensum?', ['answer'], /24/, /Karta Nauczyciela|Kodeks pracy|Statut/i);
assertDecision('Czy mogę wpisać PESEL 12345678901 do AI?', ['blocked'], /anonimiz|PESEL|danych/i, /ochrony danych|Standardy/i);
assertDecision('urlop', ['clarify'], /Doprecyzuj|ogolne|ogólne/i);
assertDecision('Czy chłopaki mogą mieć dodatkowy telefon?', ['clarify', 'answer'], /zrod|źród|doprecyz/i);

console.log('OK: silnik decyzji pilnuje źródeł, pytań ogólnych, danych osobowych i pensum 24 godziny.');

function assertDecision(question, expectedKinds, answerPattern, sourcePattern = /./) {
  const decision = engine.assess(question);
  if (!decision) throw new Error(`Brak decyzji dla pytania: ${question}`);
  if (!expectedKinds.includes(decision.kind)) {
    throw new Error(`Pytanie "${question}" zwróciło ${decision.kind}, oczekiwano: ${expectedKinds.join(', ')}.`);
  }
  const formatted = engine.format(decision);
  if (!answerPattern.test(formatted)) throw new Error(`Odpowiedź dla "${question}" nie zawiera oczekiwanego wzorca: ${answerPattern}`);
  if (!sourcePattern.test((decision.sources || []).join(' ') + formatted)) {
    throw new Error(`Odpowiedź dla "${question}" nie zawiera oczekiwanego źródła: ${sourcePattern}`);
  }
}
