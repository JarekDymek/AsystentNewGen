import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 3000);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const knowledge = loadKnowledge();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/health') return json(res, 200, { ok: true, app: 'Asystent MOW NewGen' });
    if (url.pathname === '/api/chat' && req.method === 'POST') return handleChat(req, res);
    if (url.pathname === '/api/weekly-plan' && req.method === 'POST') return handleWeeklyPlan(req, res);
    if (url.pathname === '/api/current-info-mail' && req.method === 'GET') return handleCurrentInfo(res);
    if (req.method !== 'GET') return json(res, 405, { error: 'Metoda niedozwolona.' });
    return serveStatic(url, res);
  } catch (err) {
    return json(res, 500, { error: err.message || 'Błąd serwera.' });
  }
});

server.listen(port, () => {
  console.log(`Asystent MOW NewGen działa na porcie ${port}`);
});

async function handleChat(req, res) {
  const body = await readJson(req);
  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const provider = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase();
  const prompt = [
    'Jesteś Asystentem MOW dla wychowawcy w Młodzieżowym Ośrodku Wychowawczym nr 1 w Malborku.',
    'Najpierw stosuj dokumenty MOW, potem akty prawne. Gdy pytanie jest zbyt ogólne, dopytaj.',
    'Nie proś o pełne dane osobowe wychowanka. Odpowiadaj konkretnie, praktycznie i ze źródłem.',
    'Ważne: pensum wychowawcy MOW wynosi 24 godziny tygodniowo; 40 godzin dotyczy limitu czasu pracy nauczyciela, nie pensum.',
    '',
    'Aktywna baza wiedzy:',
    knowledge.slice(0, 28000)
  ].join('\n');

  if (provider === 'gemini') return chatGemini(res, prompt, messages);
  return chatOpenAi(res, prompt, messages);
}

async function chatGemini(res, prompt, messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(res, 503, { code: 'GEMINI_KEY_MISSING', error: 'Brakuje GEMINI_API_KEY w ustawieniach Render.' });
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const contents = [
    { role: 'user', parts: [{ text: prompt }] },
    ...messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text || msg.content || '' }] }))
  ];
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { temperature: 0.2, maxOutputTokens: 1400 } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return json(res, response.status, { code: 'GEMINI_ERROR', error: data.error?.message || 'Gemini nie zwrócił odpowiedzi.' });
  const answer = data.candidates?.[0]?.content?.parts?.map(part => part.text).join('\n').trim();
  return json(res, 200, { answer: answer || 'Brak odpowiedzi z modelu.' });
}

async function chatOpenAi(res, prompt, messages) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(res, 503, { code: 'OPENAI_KEY_MISSING', error: 'Brakuje OPENAI_API_KEY albo GEMINI_API_KEY w ustawieniach Render.' });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompt },
        ...messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text || msg.content || '' }))
      ]
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return json(res, response.status, { code: 'OPENAI_ERROR', error: data.error?.message || 'OpenAI nie zwrócił odpowiedzi.' });
  return json(res, 200, { answer: data.choices?.[0]?.message?.content || 'Brak odpowiedzi z modelu.' });
}

async function handleWeeklyPlan(req, res) {
  const body = await readJson(req);
  const target = process.env.HARMONOGRAM_BACKEND_URL || process.env.WEEKLY_PLAN_URL;
  if (!target) return json(res, 503, { error: 'Brakuje HARMONOGRAM_BACKEND_URL lub WEEKLY_PLAN_URL w Renderze.' });
  const token = body.token || process.env.VIEW_TOKEN || process.env.ADMIN_TOKEN || '';
  const payload = {
    worker: body.worker || body.name || 'Dymek',
    name: body.worker || body.name || 'Dymek',
    token,
    viewToken: token
  };
  const response = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000)
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return json(res, 502, { error: 'Backend Harmonogram-MOW nie zwrócił poprawnego JSON.' });
  }
  if (!response.ok || data.error) return json(res, response.status || 502, { error: data.error || data.message || 'Nie udało się pobrać harmonogramu.' });
  return json(res, 200, data);
}

function handleCurrentInfo(res) {
  return json(res, 200, {
    items: [],
    note: 'Automatyczne czytanie poczty można podpiąć później przez bezpieczny connector lub osobny mikroserwis IMAP.'
  });
}

function serveStatic(url, res) {
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) return json(res, 403, { error: 'Brak dostępu.' });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return serveIndex(res);
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

function serveIndex(res) {
  const file = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': mime['.html'] });
  fs.createReadStream(file).pipe(res);
}

function loadKnowledge() {
  const dir = path.join(__dirname, 'knowledge');
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_'))
    .map(entry => fs.readFileSync(path.join(dir, entry.name), 'utf8'))
    .join('\n\n---\n\n');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Zbyt duże zapytanie.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Niepoprawny JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
