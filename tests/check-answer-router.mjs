import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/data-answer-bank.js'), 'utf8'), context, { filename: 'data-answer-bank.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/answer-router.js'), 'utf8'), context, { filename: 'answer-router.js' });

assertMatch('Ile godzin etatu ma wychowawca w MOW?', 'answer', 'pensum-wychowawcy-mow');
assertMatch('Co robić przy ucieczce wychowanka?', 'answer', 'ucieczka');
assertMatch('Kiedy wezwać pogotowie?', 'answer');
assertMatch('Czy do AI mogę wpisać dane wychowanka?', 'answer', 'dane');
assertMatch('urlop', 'clarify');

const pensum = context.window.resolveAnswerBankIntent('Czy wychowawca w MOW ma 40 godzin pensum?');
if (pensum?.type !== 'answer' || !pensum.entry.answer.includes('24')) {
  throw new Error('Router nie obronił poprawnej odpowiedzi o pensum 24 godziny.');
}

console.log('OK: router banku odpowiedzi rozpoznaje intencje i dopytuje przy pytaniach ogólnych.');

function assertMatch(question, expectedType, expectedIdPart = '') {
  const match = context.window.resolveAnswerBankIntent(question);
  if (!match) throw new Error(`Brak dopasowania dla pytania: ${question}`);
  if (match.type !== expectedType) throw new Error(`Pytanie "${question}" powinno zwrócić ${expectedType}, zwróciło ${match.type}.`);
  if (expectedIdPart && !match.entry.id.includes(expectedIdPart)) {
    throw new Error(`Pytanie "${question}" dopasowało ${match.entry.id}, oczekiwano fragmentu ${expectedIdPart}.`);
  }
}
