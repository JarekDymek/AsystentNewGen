(function () {
  const SOURCE_CONFIRMED = 'potwierdzone w zrodlach aplikacji';
  const MIN_PROCEDURE_SCORE = 0.34;

  const emergencyNeedles = [
    'bojka', 'agresja', 'pobicie', 'samoboj', 'samookalecz', 'ucieczka',
    'oddalenie', 'narkotyk', 'alkohol', 'dopalacz', 'pozar', 'ewakuacja',
    'wybuch', 'zatrucie', 'seksual', 'przemoc', 'noz', 'niebezpieczn'
  ];

  function assessMowDecision(query) {
    const raw = String(query || '').trim();
    const normalized = normalizeDecisionText(raw);
    if (!normalized) {
      return clarify('Opisz krotko sytuacje, np. "ucieczka wychowanka", "pensum wychowawcy" albo "telefon w wakacje".');
    }

    const privacy = detectPrivacyRisk(raw);
    if (privacy) {
      return {
        kind: 'blocked',
        severity: 'privacy',
        title: 'Najpierw anonimizacja',
        answer: [
          privacy,
          'Nie wysylaj do AI pelnych danych wychowanka. Zastap je inicjalami, grupa, wiekiem i opisem zdarzenia bez danych identyfikujacych.',
          'Po anonimizacji moge wskazac procedure albo podstawe prawna.'
        ].join('\n'),
        certainty: 'blokada bezpieczenstwa',
        sources: ['Polityka ochrony danych aplikacji', 'Standardy ochrony maloletnich MOW']
      };
    }

    const urgent = hasEmergencyNeedle(normalized);
    const procedureHit = urgent ? findProcedure(raw) : null;
    if (urgent && procedureHit) {
      return procedureDecision(procedureHit.proc, normalized);
    }

    const bank = resolveBank(raw);
    if (bank?.type === 'answer' && hasSources(bank.entry)) {
      return answerDecision(bank);
    }
    if (bank?.type === 'clarify') {
      return clarifyDecision(bank);
    }

    const nonUrgentProcedureHit = urgent ? procedureHit : findProcedure(raw);
    if (nonUrgentProcedureHit && nonUrgentProcedureHit.score >= MIN_PROCEDURE_SCORE) {
      return procedureDecision(nonUrgentProcedureHit.proc, normalized);
    }

    const practical = findPracticalGuidance(normalized);
    if (practical) return practical;

    const sourceHints = findSourceHints(normalized);
    if (sourceHints.length) {
      return {
        kind: 'clarify',
        severity: 'normal',
        title: 'Mam podobne zrodla, ale brakuje kontekstu',
        answer: [
          'Nie odpowiem na sile, bo pytanie pasuje do dokumentow, ale nie wskazuje jednoznacznej sytuacji.',
          'Dopisz: co sie stalo, kiedy, kogo dotyczy sprawa, czy jest zagrozenie oraz czy chodzi o decyzje wychowawcy, dyrektora, sadu czy dokumentacje.',
          '',
          `Najblizsze zrodla: ${sourceHints.join('; ')}`
        ].join('\n'),
        certainty: 'wymaga doprecyzowania',
        sources: sourceHints
      };
    }

    return clarify('Nie mam wystarczajacego dopasowania do zatwierdzonych zrodel. Doprecyzuj pytanie albo dodaj dokument do bazy wiedzy.');
  }

  function procedureDecision(proc, normalizedQuery) {
    const danger = proc.sev === 'danger' || hasEmergencyNeedle(normalizedQuery);
    const lead = danger
      ? 'Najpierw zabezpiecz zycie, zdrowie i grupe. Jezeli jest bezposrednie zagrozenie, dzialaj natychmiast i dzwon 112.'
      : 'Ponizej jest sciezka postepowania z dokumentow MOW.';
    return {
      kind: danger ? 'emergency' : 'answer',
      severity: danger ? 'danger' : 'normal',
      title: proc.title,
      answer: [
        lead,
        '',
        ...proc.steps.slice(0, danger ? 6 : 8).map((step, index) => `${index + 1}. ${stripHtml(step)}`),
        proc.alert?.txt ? `\nUwaga: ${stripHtml(proc.alert.txt)}` : '',
        '',
        'Gdy opis sytuacji rozni sie od powyzszego albo brakuje daty/osob/miejsca, doprecyzuj przed decyzja dokumentacyjna.'
      ].filter(Boolean).join('\n'),
      certainty: SOURCE_CONFIRMED,
      sources: [proc.src || 'Procedury MOW nr 1 w Malborku']
    };
  }

  function answerDecision(match) {
    const entry = match.entry;
    return {
      kind: 'answer',
      severity: entry.risk === 'safety' ? 'danger' : 'normal',
      title: entry.intent,
      answer: [
        entry.answer,
        '',
        `Co zrobic praktycznie: ${entry.action}`,
        '',
        `Gdy brakuje danych: ${entry.askIfUnclear}`,
        '',
        `Uwaga: ${entry.doNotAnswer}`
      ].join('\n'),
      certainty: SOURCE_CONFIRMED,
      sources: entry.sources || [],
      confidence: match.confidence
    };
  }

  function findPracticalGuidance(normalizedQuery) {
    if (isRoomDutyMotivation(normalizedQuery)) {
      return {
        kind: 'answer',
        severity: 'normal',
        title: 'Motywowanie do dyzuru i porzadku w pokoju',
        answer: [
          'Najlepiej potraktowac to jako krotka interwencje wychowawcza, nie jako spor o miotle czy pokoj.',
          '',
          '1. Nazwij konkretny standard: "Twoim zadaniem jest doprowadzic pokoj do stanu: lozko zaslane, rzeczy na miejscu, podloga bez smieci, blat pusty".',
          '2. Daj wybor w ramach obowiazku, nie wybor czy zrobi: "Zaczynasz od lozka czy od podlogi? Sprawdzam za 10 minut".',
          '3. Zmniejsz opor przez start: wejdz na pierwsza minute, wskaz pierwszy maly krok, potem zostaw odpowiedzialnosc wychowankowi.',
          '4. Polacz dyzur ze stopniem uspołecznienia: realizowanie dyzurow, higiena, porzadek i samodzielnosc sa kryteriami oceny. Powiedz spokojnie, co to znaczy dla jego oceny dnia/tygodnia.',
          '5. Wzmacniaj konkretnie: pochwal nie "jestes grzeczny", tylko "sam poprawiles lozko i doprowadziles pokoj do porzadku".',
          '6. Jezeli dalej odmawia, nie przeciagaj przepychanki. Zapisz odmowe lub nierzetelne wykonanie, wroc do rozmowy po emocjach i ustal sposob naprawienia dyzuru.',
          '',
          'Gotowa formulka: "Nie dyskutujemy, czy pokoj ma byc posprzatany. To jest twoj obowiazek i element stopnia. Masz 10 minut, wybierz od czego zaczynasz. Po sprawdzeniu wpisze, czy wykonales dyzur samodzielnie i rzetelnie".'
        ].join('\n'),
        certainty: SOURCE_CONFIRMED,
        sources: [
          'Poradnik wychowawcy MOW: porzadkowanie i rejony, zeszyt dyzurow, rotacja i sprawiedliwosc',
          'Regulamin stopni uspołecznienia MOW: realizuje dyzury, dba o higiene i mienie, samodzielnie realizuje dyzury',
          'Rozklad dnia MOW: porzadki poranne, zajecia wychowawcze i dyzury wieczorne'
        ]
      };
    }
    return null;
  }

  function isRoomDutyMotivation(normalizedQuery) {
    const motivation = ['motyw', 'zachec', 'przyloz', 'mobiliz', 'nie chce', 'odmawia', 'olew', 'lekcewaz'];
    const duty = ['dyzur', 'sprzatan', 'porzadek', 'pokoj', 'sypialn', 'higien', 'rejon'];
    return motivation.some(item => normalizedQuery.includes(item))
      && duty.some(item => normalizedQuery.includes(item));
  }

  function clarifyDecision(match) {
    const candidates = (match.candidates || [])
      .slice(0, 4)
      .map(candidate => candidate.entry.intent);
    return {
      kind: 'clarify',
      severity: 'normal',
      title: 'Doprecyzuj, zeby nie odpowiedziec blednie',
      answer: [
        'Pytanie jest za ogolne albo pasuje do kilku tematow.',
        candidates.length ? `Najblizsze tematy:\n${candidates.map(item => `- ${item}`).join('\n')}` : '',
        '',
        'Dopisz prosze: data, miejsce, osoby bez danych wrazliwych, czy jest zagrozenie, oraz czy chodzi o procedure, stopien, prawo pracy, dokumentacje czy harmonogram.'
      ].filter(Boolean).join('\n'),
      certainty: 'wymaga doprecyzowania',
      sources: collectCandidateSources(match)
    };
  }

  function clarify(answer) {
    return {
      kind: 'clarify',
      severity: 'normal',
      title: 'Potrzebuje doprecyzowania',
      answer,
      certainty: 'wymaga doprecyzowania',
      sources: ['Zasada aplikacji: brak odpowiedzi bez pewnego zrodla']
    };
  }

  function formatMowDecision(decision) {
    if (!decision) return '';
    const header = decision.kind === 'emergency'
      ? 'Sciezka pilna'
      : decision.kind === 'blocked'
        ? 'Blokada bezpieczenstwa'
        : decision.kind === 'clarify'
          ? 'Dopytanie'
          : 'Odpowiedz zrodlowa';
    const sources = (decision.sources || []).filter(Boolean);
    return [
      `**${header}: ${decision.title}**`,
      '',
      decision.answer,
      '',
      `**Pewnosc:** ${decision.certainty || SOURCE_CONFIRMED}.`,
      sources.length ? `**Zrodla:** ${sources.join('; ')}` : '**Zrodla:** brak jednoznacznego zrodla - dlatego aplikacja dopytuje.'
    ].join('\n');
  }

  function findProcedure(query) {
    const procs = getProcedures();
    const normalized = normalizeDecisionText(query);
    const queryTokens = tokenizeDecisionText(query);
    if (!queryTokens.length) return null;
    return procs
      .map(proc => ({ proc, score: scoreProcedure(proc, normalized, queryTokens) }))
      .filter(hit => hit.score > 0.16)
      .sort((a, b) => b.score - a.score)[0] || null;
  }

  function scoreProcedure(proc, normalized, queryTokens) {
    const haystack = normalizeDecisionText([
      proc.id, proc.title, proc.sub, proc.src, proc.cat, proc.sev,
      ...(proc.steps || []),
      proc.alert?.txt || ''
    ].join(' '));
    const hayTokens = new Set(tokenizeDecisionText(haystack));
    const hits = queryTokens.filter(token => hayTokens.has(token) || haystack.includes(token));
    const phraseBoost = haystack.includes(normalized) && normalized.length > 6 ? 0.36 : 0;
    const dangerBoost = proc.sev === 'danger' && hasEmergencyNeedle(normalized) ? 0.14 : 0;
    return Math.min(0.99, hits.length / Math.max(1, queryTokens.length) * 0.62 + phraseBoost + dangerBoost);
  }

  function resolveBank(query) {
    if (typeof window.resolveAnswerBankIntent !== 'function') return null;
    return window.resolveAnswerBankIntent(query);
  }

  function hasSources(entry) {
    return Array.isArray(entry?.sources) && entry.sources.some(Boolean);
  }

  function collectCandidateSources(match) {
    return [...new Set((match.candidates || [])
      .flatMap(candidate => candidate.entry.sources || [])
      .filter(Boolean))]
      .slice(0, 5);
  }

  function findSourceHints(normalizedQuery) {
    const docs = getDocuments();
    const laws = getLaws();
    const tokens = tokenizeDecisionText(normalizedQuery);
    const docHits = docs
      .map(doc => ({
        label: doc.title,
        score: overlap(tokens, tokenizeDecisionText([doc.title, doc.type, doc.source, doc.summary].join(' ')))
      }))
      .filter(hit => hit.score >= 0.18)
      .sort((a, b) => b.score - a.score)
      .map(hit => hit.label);
    const lawHits = laws
      .map(law => ({
        label: law.t,
        score: overlap(tokens, tokenizeDecisionText(law.t))
      }))
      .filter(hit => hit.score >= 0.22)
      .sort((a, b) => b.score - a.score)
      .map(hit => hit.label);
    return [...new Set([...docHits, ...lawHits])].slice(0, 4);
  }

  function overlap(a, b) {
    if (!a.length || !b.length) return 0;
    const set = new Set(b);
    return a.filter(token => set.has(token)).length / a.length;
  }

  function hasEmergencyNeedle(normalized) {
    return emergencyNeedles.some(needle => normalized.includes(needle));
  }

  function detectPrivacyRisk(value) {
    const text = String(value || '');
    if (/\b\d{11}\b/.test(text)) return 'Wykryto ciag podobny do numeru PESEL.';
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return 'Wykryto adres e-mail.';
    if (/(?:\+48\s*)?(?:\d[\s-]?){9,}/.test(text)) return 'Wykryto numer telefonu.';
    if (/\b(pesel|adres zamieszkania|nazwisko wychowanka|dane medyczne|diagnoza medyczna)\b/i.test(text)) {
      return 'Pytanie wyglada na zawierajace dane identyfikujace lub wrazliwe.';
    }
    return '';
  }

  function normalizeDecisionText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenizeDecisionText(value) {
    const aliases = {
      etatu: 'etat',
      godzin: 'godzina',
      godziny: 'godzina',
      wychowawcy: 'wychowawca',
      wychowanka: 'wychowanek',
      wychowankow: 'wychowanek',
      ucieczki: 'ucieczka',
      uciekl: 'ucieczka',
      policji: 'policja',
      sadu: 'sad',
      telefonu: 'telefon',
      telefonow: 'telefon',
      urlopowania: 'urlop',
      przepustki: 'przepustka',
      dokumentacji: 'dokumentacja',
      stopnia: 'stopien'
    };
    const stop = new Set(['oraz', 'albo', 'czyli', 'jest', 'jaki', 'jakie', 'kiedy', 'gdzie', 'moge', 'mozna', 'trzeba', 'prosze', 'mow', 'mam', 'czy', 'dla']);
    const out = new Set();
    normalizeDecisionText(value).split(' ').filter(token => token.length > 2 && !stop.has(token)).forEach(token => {
      out.add(token);
      if (aliases[token]) out.add(aliases[token]);
    });
    return [...out];
  }

  function stripHtml(value) {
    return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  function getProcedures() {
    if (typeof PROCS !== 'undefined' && Array.isArray(PROCS)) return PROCS;
    return Array.isArray(window.PROCS) ? window.PROCS : [];
  }

  function getDocuments() {
    if (typeof DOCUMENT_REGISTRY !== 'undefined' && Array.isArray(DOCUMENT_REGISTRY)) return DOCUMENT_REGISTRY;
    return Array.isArray(window.DOCUMENT_REGISTRY) ? window.DOCUMENT_REGISTRY : [];
  }

  function getLaws() {
    if (typeof LAWS !== 'undefined' && Array.isArray(LAWS)) return LAWS;
    return Array.isArray(window.LAWS) ? window.LAWS : [];
  }

  window.MOW_DECISION_ENGINE = {
    assess: assessMowDecision,
    format: formatMowDecision,
    normalize: normalizeDecisionText,
    tokenize: tokenizeDecisionText
  };
})();
