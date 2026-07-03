(function () {
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const dialog = document.getElementById('detailDialog');
  const dialogBody = document.getElementById('dialogBody');

  const tabs = [
    { id: 'home', icon: '🏠', label: 'Dyżur' },
    { id: 'procedures', icon: '📋', label: 'Procedury' },
    { id: 'levels', icon: '📊', label: 'Stopnie' },
    { id: 'law', icon: '⚖️', label: 'Prawo' },
    { id: 'info', icon: '📣', label: 'Inf.' },
    { id: 'schedule', icon: '📁', label: 'Plan' },
    { id: 'ai', icon: '🤖', label: 'AI' }
  ];

  const categoryNames = {
    crisis: 'Sytuacje kryzysowe',
    safety: 'Bezpieczeństwo',
    other: 'Inne procedury'
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(`newgen:${key}`);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(`newgen:${key}`, JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem(`newgen:${key}`);
    }
  };

  const DEVICE_DATA_KEYS = ['tab', 'currentInfo', 'weeks', 'workerName', 'viewToken', 'scheduleImage', 'chat'];
  const answerIndex = buildAnswerIndex(Array.isArray(window.MOW_ANSWER_BANK) ? window.MOW_ANSWER_BANK : []);
  let currentTab = store.get('tab', 'home');
  let deferredPrompt = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    renderNav();
    render();
    tickClock();
    setInterval(tickClock, 15000);
    bindPwa();
    bindDialog();
    registerServiceWorker();
  }

  function renderNav() {
    nav.innerHTML = tabs.map(tab => `
      <button class="nav-btn ${tab.id === currentTab ? 'active' : ''}" type="button" data-tab="${tab.id}">
        <span class="nav-icon">${tab.icon}</span>
        <span>${tab.label}</span>
      </button>
    `).join('');
    nav.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.tab));
    });
  }

  function navigate(tab) {
    currentTab = tab;
    store.set('tab', tab);
    renderNav();
    render();
    app.focus();
  }

  function render() {
    const views = {
      home: renderHome,
      procedures: renderProcedures,
      levels: renderLevels,
      law: renderLaw,
      info: renderInfo,
      schedule: renderSchedule,
      ai: renderAi
    };
    (views[currentTab] || renderHome)();
  }

  function renderHome() {
    const current = getCurrentScheduleItem();
    app.innerHTML = `
      <section class="hero">
        <div>
          <div id="clock" class="clock">--:--</div>
          <div id="dateLine" class="hero-sub"></div>
        </div>
        <div class="hero-badge">
          <strong>${escapeHtml(current?.l || 'Dyżur')}</strong><br>
          <span>${escapeHtml(current ? 'aktualne zajęcie' : 'tryb pracy')}</span>
        </div>
      </section>

      <h2 class="section-title">Harmonogram dnia</h2>
      <div class="accordion">${SCHEDULE.map((item, index) => scheduleItem(item, index === current?.index)).join('')}</div>

      <h2 class="section-title">Szybkie akcje</h2>
      <div class="grid quick-grid">
        ${QUICK_ACTIONS.map(action => `
          <button class="tile ${action.cls || ''}" type="button" data-quick="${escapeAttr(action.proc || action.screen)}">
            <span class="icon">${action.icon}</span>
            <span class="label">${escapeHtml(action.label)}</span>
          </button>
        `).join('')}
      </div>
    `;
    tickClock();
    bindAccordions();
    app.querySelectorAll('[data-quick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.quick;
        const proc = PROCS.find(p => p.id === id);
        if (proc) openProcedure(proc);
        else if (id === 's-stop') navigate('levels');
        else if (id === 's-ai') navigate('ai');
      });
    });
  }

  function scheduleItem(item, isOpen) {
    return `
      <article class="accordion-item ${isOpen ? 'open' : ''}">
        <button class="accordion-btn" type="button">
          <span>🕒</span>
          <strong>${escapeHtml(item.t)}-${escapeHtml(item.e)} · ${escapeHtml(item.l)}</strong>
          <span>${isOpen ? 'Zwiń' : 'Rozwiń'}</span>
        </button>
        <div class="accordion-body">${escapeHtml(item.tip)}</div>
      </article>
    `;
  }

  function renderProcedures() {
    app.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h1 class="panel-title">Procedury MOW</h1>
          <button class="ghost-btn" type="button" data-ai-context="procedury">Zapytaj AI</button>
        </div>
        <input class="search" id="procedureSearch" placeholder="Szukaj: bójka, ucieczka, narkotyki, pożar...">
      </section>
      <div id="procedureGroups"></div>
    `;
    document.querySelector('[data-ai-context]').addEventListener('click', () => askAiWith('Opisz sytuację proceduralną: '));
    document.getElementById('procedureSearch').addEventListener('input', e => drawProcedures(e.target.value));
    drawProcedures('');
  }

  function drawProcedures(query) {
    const target = document.getElementById('procedureGroups');
    const q = normalize(query);
    const filtered = PROCS.filter(proc => normalize([proc.title, proc.sub, proc.src, proc.steps.join(' ')].join(' ')).includes(q));
    const groups = groupBy(filtered, proc => proc.cat || 'other');
    target.innerHTML = Object.keys(categoryNames).map(key => {
      const items = groups[key] || [];
      if (!items.length) return '';
      return `
        <h2 class="section-title">${categoryIcon(key)} ${categoryNames[key]}</h2>
        <div class="grid card-grid">${items.map(procCard).join('')}</div>
      `;
    }).join('') || `<div class="empty">Brak procedury pasującej do wyszukiwania.</div>`;
    target.querySelectorAll('[data-proc]').forEach(btn => {
      btn.addEventListener('click', () => openProcedure(PROCS.find(p => p.id === btn.dataset.proc)));
    });
  }

  function procCard(proc) {
    return `
      <button class="tile ${proc.sev === 'danger' ? 'qred' : proc.sev === 'warn' ? 'qorn' : 'qblue'}" type="button" data-proc="${escapeAttr(proc.id)}">
        <span class="icon">${proc.icon}</span>
        <span class="label">${escapeHtml(proc.title)}</span>
        <span class="muted">${escapeHtml(proc.sub || '')}</span>
      </button>
    `;
  }

  function openProcedure(proc) {
    if (!proc) return;
    openDialog(`
      <h2>${proc.icon} ${escapeHtml(proc.title)}</h2>
      <p class="muted">${escapeHtml(proc.sub || '')}</p>
      <p><strong>Źródło:</strong> ${escapeHtml(proc.src || 'Dokumenty MOW')}</p>
      <ol class="step-list">${proc.steps.map(step => `<li>${step}</li>`).join('')}</ol>
      ${proc.alert ? `<div class="alert"><strong>Uwaga:</strong> ${escapeHtml(proc.alert.txt)}</div>` : ''}
    `);
  }

  function renderLevels() {
    app.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h1 class="panel-title">Stopnie uspołecznienia</h1>
          <button class="ghost-btn" type="button" data-ai-level>Zapytaj AI</button>
        </div>
        <p class="muted">Karty pokazują kryteria i przywileje. Szczegóły otwierają się po kliknięciu.</p>
      </section>
      <div class="grid card-grid">
        ${STOPNIE.map(level => `
          <button class="level-card" type="button" data-level="${escapeAttr(level.id)}">
            <span class="level-badge">${escapeHtml(level.lvl)}</span>
            <h2>${escapeHtml(level.title)}</h2>
            <p class="muted">Kieszonkowe: ${escapeHtml(level.kies)}</p>
          </button>
        `).join('')}
      </div>
    `;
    document.querySelector('[data-ai-level]').addEventListener('click', () => askAiWith('Opisz zachowanie wychowanka i oceń możliwy stopień: '));
    app.querySelectorAll('[data-level]').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = STOPNIE.find(item => item.id === btn.dataset.level);
        openDialog(`
          <h2>${escapeHtml(level.title)}</h2>
          <p><strong>Kieszonkowe:</strong> ${escapeHtml(level.kies)}</p>
          <h3>Kryteria</h3>
          <ul>${level.crit.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          <h3>Przywileje i skutki</h3>
          <ul>${level.przyw.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        `);
      });
    });
  }

  function renderLaw() {
    const bankCount = Array.isArray(window.MOW_ANSWER_BANK) ? window.MOW_ANSWER_BANK.length : 0;
    app.innerHTML = `
      <section class="panel">
        <h1 class="panel-title">Prawo i baza wiedzy</h1>
        <p class="muted">Najpierw dokumenty MOW, potem akty prawne. Bank lokalny: ${bankCount} odpowiedzi.</p>
        <input class="search" id="lawSearch" placeholder="Szukaj: pensum, urlopowanie, art. 107, Karta Nauczyciela...">
      </section>
      <div id="lawResults"></div>
    `;
    document.getElementById('lawSearch').addEventListener('input', e => drawLaw(e.target.value));
    drawLaw('');
  }

  function drawLaw(query) {
    const q = normalize(query);
    const laws = LAWS.filter(law => normalize(law.t).includes(q));
    const bank = !q ? [] : answerIndex
      .map(item => ({ item: item.entry, score: scoreAnswer(item, q, tokenize(query)) }))
      .filter(hit => hit.score > .25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    document.getElementById('lawResults').innerHTML = `
      <h2 class="section-title">Akty i dokumenty</h2>
      <div class="grid card-grid">
        ${laws.map(law => `<article class="law-card"><strong>${escapeHtml(law.n)}.</strong> ${escapeHtml(law.t)}</article>`).join('') || '<div class="empty">Brak pasujących aktów.</div>'}
      </div>
      ${bank.length ? `
        <h2 class="section-title">Odpowiedzi z banku</h2>
        <div class="grid card-grid">
          ${bank.map(hit => `<button class="answer-card" type="button" data-answer="${escapeAttr(hit.item.id)}">${escapeHtml(hit.item.intent)}<br><span class="muted">${escapeHtml(hit.item.category)}</span></button>`).join('')}
        </div>
      ` : ''}
    `;
    document.querySelectorAll('[data-answer]').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = window.MOW_ANSWER_BANK.find(item => item.id === btn.dataset.answer);
        openDialog(formatBankEntry(entry));
      });
    });
  }

  function renderInfo() {
    const entries = store.get('currentInfo', []);
    app.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h1 class="panel-title">Bieżące informacje</h1>
          <button class="ghost-btn" type="button" id="syncInfo">Pobierz</button>
        </div>
        <p class="muted">Chronologiczne komunikaty dyrekcji i własne notatki organizacyjne.</p>
        <div class="two-col">
          <input class="search" id="infoTitle" placeholder="Tytuł informacji">
          <input class="search" id="infoDate" type="date">
        </div>
        <textarea class="search" id="infoBody" rows="4" placeholder="Treść, ustalenia, termin, miejsce..."></textarea>
        <button class="primary-btn" type="button" id="addInfo">Dodaj informację</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Kopia danych urządzenia</h2>
        <p class="muted">Zapisuje lokalne informacje, plan, screen harmonogramu i historię AI z tego urządzenia. Nie wysyła danych na serwer.</p>
        <div class="two-col">
          <button class="ghost-btn" type="button" id="exportData">Pobierz kopię</button>
          <label class="ghost-btn">
            Wczytaj kopię
            <input id="importData" type="file" accept="application/json" hidden>
          </label>
        </div>
      </section>
      <div id="infoList"></div>
    `;
    document.getElementById('infoDate').value = todayIso();
    document.getElementById('addInfo').addEventListener('click', addInfoEntry);
    document.getElementById('syncInfo').addEventListener('click', syncInfo);
    document.getElementById('exportData').addEventListener('click', exportDeviceData);
    document.getElementById('importData').addEventListener('change', importDeviceData);
    drawInfo(entries);
  }

  function addInfoEntry() {
    const title = document.getElementById('infoTitle').value.trim();
    const body = document.getElementById('infoBody').value.trim();
    const date = document.getElementById('infoDate').value || todayIso();
    if (!title && !body) return;
    const entries = store.get('currentInfo', []);
    entries.unshift({ id: crypto.randomUUID(), date, title: title || 'Informacja', body, source: 'ręcznie' });
    store.set('currentInfo', entries);
    renderInfo();
  }

  async function syncInfo() {
    const btn = document.getElementById('syncInfo');
    btn.disabled = true;
    btn.textContent = 'Pobieram...';
    try {
      const res = await fetch('/api/current-info-mail', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się pobrać poczty.');
      const entries = store.get('currentInfo', []);
      const incoming = (data.items || []).map(item => ({ ...item, id: item.id || crypto.randomUUID(), source: item.source || 'poczta' }));
      const merged = uniqueBy([...incoming, ...entries], item => `${item.date}:${item.title}:${item.body?.slice(0, 60)}`);
      store.set('currentInfo', merged.sort((a, b) => String(b.date).localeCompare(String(a.date))));
      renderInfo();
    } catch (err) {
      openDialog(`<h2>Nie udało się pobrać informacji</h2><p>${escapeHtml(err.message)}</p>`);
    } finally {
      btn.disabled = false;
    }
  }

  function drawInfo(entries) {
    const list = document.getElementById('infoList');
    list.innerHTML = `
      <h2 class="section-title">Archiwum</h2>
      <div class="accordion">
        ${entries.length ? entries.map(entry => `
          <article class="accordion-item">
            <button class="accordion-btn" type="button">
              <span>📌</span>
              <strong>${escapeHtml(entry.date)} · ${escapeHtml(entry.title)}</strong>
              <span>Rozwiń</span>
            </button>
            <div class="accordion-body">
              <p>${escapeHtml(entry.body || 'Brak treści.')}</p>
              <p class="muted">Źródło: ${escapeHtml(entry.source || 'lokalnie')}</p>
              <button class="ghost-btn" type="button" data-delete-info="${escapeAttr(entry.id)}">Usuń</button>
            </div>
          </article>
        `).join('') : '<div class="empty">Brak zapisanych informacji.</div>'}
      </div>
    `;
    bindAccordions();
    list.querySelectorAll('[data-delete-info]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.set('currentInfo', store.get('currentInfo', []).filter(entry => entry.id !== btn.dataset.deleteInfo));
        renderInfo();
      });
    });
  }

  function renderSchedule() {
    const weeks = store.get('weeks', []);
    app.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h1 class="panel-title">Harmonogram</h1>
          <button class="ghost-btn" type="button" id="fetchPlan">Pobierz plan</button>
        </div>
        <p class="muted">Plan z generatora, plik tekstowy albo screen do powiększenia.</p>
        <div class="two-col">
          <input class="search" id="workerName" placeholder="Nazwisko, np. Dymek" value="${escapeAttr(store.get('workerName', 'Dymek'))}">
          <input class="search" id="viewToken" placeholder="VIEW_TOKEN / ADMIN_TOKEN" value="${escapeAttr(store.get('viewToken', ''))}">
        </div>
      </section>
      <div class="grid card-grid">
        <label class="tile qgold">
          <span class="icon">📄</span>
          <span class="label">Wczytaj tekst / CSV</span>
          <input id="scheduleFile" type="file" accept=".txt,.csv,text/plain,text/csv" hidden>
        </label>
        <label class="tile qblue">
          <span class="icon">🖼️</span>
          <span class="label">Wczytaj screen</span>
          <input id="scheduleImage" type="file" accept="image/*" hidden>
        </label>
      </div>
      <div id="weekList"></div>
    `;
    document.getElementById('fetchPlan').addEventListener('click', fetchPlan);
    document.getElementById('scheduleFile').addEventListener('change', readScheduleText);
    document.getElementById('scheduleImage').addEventListener('change', readScheduleImage);
    drawWeeks(weeks);
  }

  async function fetchPlan() {
    const worker = document.getElementById('workerName').value.trim() || 'Dymek';
    const token = document.getElementById('viewToken').value.trim();
    store.set('workerName', worker);
    store.set('viewToken', token);
    const btn = document.getElementById('fetchPlan');
    btn.disabled = true;
    btn.textContent = 'Pobieram...';
    try {
      const res = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker, token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się pobrać planu.');
      const weeks = normalizeWeeks(data);
      store.set('weeks', weeks);
      drawWeeks(weeks);
    } catch (err) {
      openDialog(`<h2>Nie udało się pobrać planu</h2><p>${escapeHtml(err.message)}</p>`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Pobierz plan';
    }
  }

  function drawWeeks(weeks) {
    const list = document.getElementById('weekList');
    const image = store.get('scheduleImage', null);
    list.innerHTML = `
      <h2 class="section-title">Tygodnie</h2>
      <div class="grid card-grid">
        ${weeks.length ? weeks.map((week, index) => `
          <article class="week-card">
            <strong>${escapeHtml(week.label || `Tydzień ${index + 1}`)}</strong>
            <p class="muted">${escapeHtml(week.range || '')}</p>
            <button class="ghost-btn" type="button" data-week="${index}">Otwórz</button>
          </article>
        `).join('') : '<div class="empty">Brak pobranego planu.</div>'}
      </div>
      ${image ? `<h2 class="section-title">Screen</h2><button class="tile qblue" type="button" id="openScheduleImage"><img class="file-preview" src="${image}" alt="Screen harmonogramu"></button>` : ''}
    `;
    list.querySelectorAll('[data-week]').forEach(btn => btn.addEventListener('click', () => openWeek(weeks[Number(btn.dataset.week)])));
    document.getElementById('openScheduleImage')?.addEventListener('click', () => openDialog(`<img class="file-preview" src="${image}" alt="Screen harmonogramu">`));
  }

  function openWeek(week) {
    openDialog(`
      <h2>${escapeHtml(week.label || 'Tydzień')}</h2>
      <p class="muted">${escapeHtml(week.range || '')}</p>
      <div class="accordion">
        ${(week.days || []).map(day => `
          <article class="accordion-item open">
            <button class="accordion-btn" type="button"><span>📅</span><strong>${escapeHtml(day.name || day.date || 'Dzień')}</strong><span></span></button>
            <div class="accordion-body">${escapeHtml(day.text || day.shift || 'Brak dyżuru')}</div>
          </article>
        `).join('')}
      </div>
    `);
  }

  async function readScheduleText(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const days = text.split(/\r?\n/).filter(Boolean).map((line, index) => ({ name: `Wiersz ${index + 1}`, text: line }));
    const weeks = [{ label: file.name, range: 'plik lokalny', days }];
    store.set('weeks', weeks);
    drawWeeks(weeks);
  }

  function readScheduleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      store.set('scheduleImage', reader.result);
      drawWeeks(store.get('weeks', []));
    };
    reader.readAsDataURL(file);
  }

  function renderAi() {
    const history = store.get('chat', []);
    app.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <h1 class="panel-title">Asystent AI</h1>
          <button class="ghost-btn" type="button" id="clearChat">Wyczyść</button>
        </div>
        <p class="muted">Najpierw szukam w lokalnym banku 250 odpowiedzi. Model zewnętrzny jest używany tylko wtedy, gdy bank nie wystarczy.</p>
        <div id="chatWindow" class="chat-window"></div>
        <div class="chat-input-row">
          <textarea id="chatInput" placeholder="Napisz pytanie..."></textarea>
          <button class="primary-btn" type="button" id="sendChat">Wyślij</button>
        </div>
        <div class="pill-row">
          ${CHAT_PILLS.map(pill => `<button type="button" data-pill="${escapeAttr(pill.text)}">${pill.icon} ${escapeHtml(pill.text)}</button>`).join('')}
        </div>
      </section>
    `;
    drawChat(history);
    document.getElementById('sendChat').addEventListener('click', sendChat);
    document.getElementById('chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
    document.getElementById('clearChat').addEventListener('click', () => {
      store.remove('chat');
      drawChat([]);
    });
    app.querySelectorAll('[data-pill]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('chatInput').value = btn.dataset.pill;
        sendChat();
      });
    });
  }

  async function sendChat() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    const history = store.get('chat', []);
    history.push({ role: 'user', text: question });
    drawChat(history);

    const local = resolveLocalAnswer(question);
    if (local) {
      history.push({ role: 'ai', text: local });
      store.set('chat', history.slice(-20));
      drawChat(history);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12), context: buildClientContext() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backend AI nie odpowiedział.');
      history.push({ role: 'ai', text: data.answer || 'Brak odpowiedzi.' });
    } catch (err) {
      history.push({ role: 'err', text: `Nie mogę połączyć się z AI: ${err.message}` });
    }
    store.set('chat', history.slice(-20));
    drawChat(history);
  }

  function drawChat(history) {
    const win = document.getElementById('chatWindow');
    if (!win) return;
    win.innerHTML = history.length
      ? history.map(msg => `<div class="msg ${msg.role === 'user' ? 'user' : msg.role === 'err' ? 'err' : 'ai'}">${formatText(msg.text)}</div>`).join('')
      : '<div class="msg ai">Zadaj pytanie o procedury, stopnie, prawo, harmonogram albo dokumentację MOW.</div>';
    win.scrollTop = win.scrollHeight;
  }

  function resolveLocalAnswer(question) {
    if (typeof window.resolveAnswerBankIntent === 'function') {
      const match = window.resolveAnswerBankIntent(question);
      if (match?.type === 'answer' && typeof window.formatAnswerBankReply === 'function') {
        return window.formatAnswerBankReply(match);
      }
      if (match?.type === 'clarify' && typeof window.formatAnswerBankClarification === 'function') {
        return window.formatAnswerBankClarification(match);
      }
    }

    const query = normalize(question);
    const tokens = tokenize(question);
    if (!tokens.length) return null;
    const hits = answerIndex
      .map(item => ({ entry: item.entry, score: scoreAnswer(item, query, tokens) }))
      .filter(hit => hit.score > .32)
      .sort((a, b) => b.score - a.score);
    if (!hits.length) return null;
    if (hits[0].score >= .62 && (!hits[1] || hits[0].score - hits[1].score > .06)) {
      return textBankEntry(hits[0].entry);
    }
    if (hits[0].score >= .36) {
      return `Dopytam, żeby nie odpowiedzieć na siłę.\n\nNajbliższe tematy:\n${hits.slice(0, 3).map(hit => `- ${hit.entry.intent}`).join('\n')}\n\nDoprecyzuj proszę: o kogo chodzi, jaki jest kontekst, czy jest zagrożenie, jaka data i który dokument MOW ma znaczenie.`;
    }
    return null;
  }

  function textBankEntry(entry) {
    return `Odpowiedź z banku MOW:\n${entry.answer}\n\nCo zrobić praktycznie:\n${entry.action}\n\nGdy brakuje danych:\n${entry.askIfUnclear}\n\nUwaga:\n${entry.doNotAnswer}\n\nŹródła: ${entry.sources.join('; ')}`;
  }

  function formatBankEntry(entry) {
    return `
      <h2>${escapeHtml(entry.intent)}</h2>
      <p>${escapeHtml(entry.answer)}</p>
      <h3>Co zrobić praktycznie</h3>
      <p>${escapeHtml(entry.action)}</p>
      <h3>Gdy brakuje danych</h3>
      <p>${escapeHtml(entry.askIfUnclear)}</p>
      <h3>Źródła</h3>
      <ul>${entry.sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}</ul>
    `;
  }

  function buildAnswerIndex(entries) {
    return entries.map(entry => {
      const text = [
        entry.intent,
        entry.category,
        entry.categoryKey,
        ...(entry.questions || []),
        ...(entry.variants || []),
        ...(entry.keywords || [])
      ].join(' ');
      return { entry, text: normalize(text), tokens: new Set(tokenize(text)) };
    });
  }

  function scoreAnswer(item, query, queryTokens) {
    const tokenHits = queryTokens.filter(token => item.tokens.has(token)).length;
    const tokenScore = tokenHits / Math.max(1, queryTokens.length);
    const phraseScore = item.text.includes(query) && query.length > 8 ? .38 : 0;
    return Math.min(.99, tokenScore * .68 + phraseScore);
  }

  function askAiWith(prefix) {
    navigate('ai');
    setTimeout(() => {
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = prefix;
        input.focus();
      }
    });
  }

  function bindAccordions(root = app) {
    root.querySelectorAll('.accordion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.accordion-item');
        item.classList.toggle('open');
        const last = btn.lastElementChild;
        if (last) last.textContent = item.classList.contains('open') ? 'Zwiń' : 'Rozwiń';
      });
    });
  }

  function openDialog(html) {
    dialogBody.innerHTML = html;
    dialog.showModal();
    bindAccordions(dialogBody);
  }

  function bindDialog() {
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  }

  function bindPwa() {
    const btn = document.getElementById('installBtn');
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      btn.hidden = false;
    });
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.hidden = true;
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(worker);
          });
        });
      })
      .catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  }

  function showUpdateBanner(worker) {
    if (document.getElementById('updateBanner')) return;
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.id = 'updateBanner';
    banner.innerHTML = `
      <span>Dostępna nowa wersja aplikacji.</span>
      <button class="primary-btn" type="button">Odśwież</button>
    `;
    banner.querySelector('button').addEventListener('click', () => worker.postMessage({ type: 'SKIP_WAITING' }));
    document.body.appendChild(banner);
  }

  function exportDeviceData() {
    const payload = {
      app: 'Asystent MOW NewGen',
      version: '2.1',
      exportedAt: new Date().toISOString(),
      data: Object.fromEntries(DEVICE_DATA_KEYS.map(key => [key, store.get(key, null)]))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asystent-mow-newgen-kopia-${todayIso()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function importDeviceData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.app !== 'Asystent MOW NewGen' || !payload.data) throw new Error('To nie wygląda jak kopia danych Asystenta MOW NewGen.');
      if (!confirm('Wczytać kopię danych na tym urządzeniu? Obecne lokalne dane aplikacji zostaną zastąpione.')) return;
      DEVICE_DATA_KEYS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(payload.data, key)) store.set(key, payload.data[key]);
      });
      openDialog('<h2>Kopia wczytana</h2><p>Dane lokalne zostały przywrócone na tym urządzeniu.</p>');
      render();
    } catch (err) {
      openDialog(`<h2>Nie udało się wczytać kopii</h2><p>${escapeHtml(err.message)}</p>`);
    }
  }

  function tickClock() {
    const now = new Date();
    const clock = document.getElementById('clock');
    const dateLine = document.getElementById('dateLine');
    if (clock) clock.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    if (dateLine) dateLine.textContent = now.toLocaleDateString('pl-PL', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getCurrentScheduleItem() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < SCHEDULE.length; i += 1) {
      const item = SCHEDULE[i];
      const start = toMinutes(item.t);
      let end = toMinutes(item.e);
      if (end <= start) end += 1440;
      const m = minutes < start && end > 1440 ? minutes + 1440 : minutes;
      if (m >= start && m < end) return { ...item, index: i };
    }
    return null;
  }

  function normalizeWeeks(data) {
    const raw = data.weeks || data.plan?.weeks || data.items || data.dashboardWeeks || [];
    return raw.map((week, index) => ({
      label: week.label || week.title || week.weekLabel || `Tydzień ${week.week || index + 1}`,
      range: week.range || week.dateRange || [week.start, week.end].filter(Boolean).join(' - '),
      days: normalizeDays(week.days || week.entries || week.rows || [])
    }));
  }

  function normalizeDays(days) {
    if (Array.isArray(days)) {
      return days.map(day => typeof day === 'string'
        ? { name: 'Dzień', text: day }
        : { name: day.name || day.day || day.date, text: day.text || day.shift || day.summary || JSON.stringify(day) });
    }
    return Object.entries(days || {}).map(([name, value]) => ({ name, text: typeof value === 'string' ? value : JSON.stringify(value) }));
  }

  function buildClientContext() {
    return {
      schedule: getCurrentScheduleItem(),
      laws: LAWS.slice(0, 6),
      answerBankCount: window.MOW_ANSWER_BANK?.length || 0
    };
  }

  function toMinutes(value) {
    const [h, m] = String(value).split(':').map(Number);
    return h * 60 + m;
  }

  function groupBy(items, pick) {
    return items.reduce((acc, item) => {
      const key = pick(item);
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }

  function categoryIcon(key) {
    return key === 'crisis' ? '🔴' : key === 'safety' ? '🟡' : '🟢';
  }

  function uniqueBy(items, pick) {
    const seen = new Set();
    return items.filter(item => {
      const key = pick(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(value) {
    const aliases = {
      etatu: 'etat', godzin: 'godzina', godziny: 'godzina', wychowawcy: 'wychowawca',
      urlopu: 'urlop', urlopowanie: 'urlop', przepustki: 'przepustka', ucieczki: 'ucieczka',
      policji: 'policja', sadu: 'sad', opinii: 'opinia', dyzuru: 'dyzur', telefonu: 'telefon'
    };
    const stop = new Set(['oraz', 'albo', 'czyli', 'jest', 'jaki', 'jakie', 'kiedy', 'gdzie', 'moge', 'mozna', 'trzeba', 'prosze', 'mow']);
    const out = new Set();
    normalize(value).split(' ').filter(token => token.length > 2 && !stop.has(token)).forEach(token => {
      out.add(token);
      if (aliases[token]) out.add(aliases[token]);
    });
    return [...out];
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  function formatText(value) {
    return escapeHtml(value)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
})();
