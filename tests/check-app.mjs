import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

const html = read('index.html');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));

const refs = [];
for (const match of html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (ref.startsWith('assets/') || ref.endsWith('.webmanifest')) refs.push(ref);
}

const missing = refs.filter(ref => !exists(ref));
if (missing.length) throw new Error(`Brak plików wskazanych w index.html: ${missing.join(', ')}`);

const shell = [...sw.matchAll(/'([^']+)'/g)].map(match => match[1].replace(/^\.\//, ''));
const notCached = refs.filter(ref => ref !== 'manifest.webmanifest' && !shell.includes(ref));
if (notCached.length) throw new Error(`Zasoby nie są w cache PWA: ${notCached.join(', ')}`);

if (!manifest.icons?.length) throw new Error('Manifest nie zawiera ikon.');
for (const icon of manifest.icons) {
  if (!exists(icon.src)) throw new Error(`Brak ikony z manifestu: ${icon.src}`);
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('assets/js/data-answer-bank.js'), context, { filename: 'data-answer-bank.js' });
if (!Array.isArray(context.window.MOW_ANSWER_BANK) || context.window.MOW_ANSWER_BANK.length !== 250) {
  throw new Error('Bank odpowiedzi nie ma 250 wpisów.');
}

const dataFiles = ['data-procedures.js', 'data-social-levels.js', 'data-quick-actions.js', 'data-laws.js', 'data-schedule.js'];
for (const file of dataFiles) {
  if (!exists(`assets/js/${file}`)) throw new Error(`Brak pliku danych: ${file}`);
}
if (!exists('assets/js/answer-router.js')) throw new Error('Brak routera lokalnego banku odpowiedzi.');
if (!exists('assets/js/decision-engine.js')) throw new Error('Brak silnika decyzji opartego na źródłach.');

const appSurface = [
  read('index.html'),
  read('manifest.webmanifest'),
  read('assets/js/app.js'),
  read('assets/css/app.css')
].join('\n').toLowerCase();
for (const forbidden of ['strongman', 'zawodnik', 'konkurencja sportowa', 'punktowania rywalizacji']) {
  if (appSurface.includes(forbidden)) throw new Error(`W interfejsie pozostało obce założenie: ${forbidden}`);
}

const knowledgeFiles = fs.readdirSync(path.join(root, 'backend/knowledge')).filter(file => file.endsWith('.md'));
if (knowledgeFiles.length < 7) throw new Error('Backendowa baza wiedzy jest niepełna.');
if (!read('backend/knowledge/04_wyciag_mow_praca_wychowawcy_awans_czas_pracy.md').includes('24 godziny')) {
  throw new Error('Baza wiedzy nie zawiera poprawnej informacji o pensum 24 godziny.');
}

const originalSources = path.join(root, 'backend/knowledge/00_zrodla_oryginalne_mow');
if (!fs.existsSync(path.join(originalSources, 'statut_mow_nr_1_malbork.md'))) {
  throw new Error('Brak wyciągniętego tekstu Statutu MOW w backendowej bazie wiedzy.');
}
if (!fs.existsSync(path.join(originalSources, 'procedury_mow_malbork.md'))) {
  throw new Error('Brak wyciągniętego tekstu procedur MOW w backendowej bazie wiedzy.');
}

console.log('OK: struktura aplikacji, PWA, manifest i bank odpowiedzi są poprawne.');
