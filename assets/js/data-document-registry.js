const DOCUMENT_REGISTRY = [
  {
    id: 'mow-procedury-pierwszenstwo',
    title: 'Pierwszeństwo dokumentów MOW',
    type: 'zasada stała',
    source: 'Dokumenty wewnętrzne MOW nr 1 w Malborku',
    version: '1',
    validFrom: '2026-06-22',
    validTo: '',
    status: 'active',
    summary: 'Przy pytaniach o sposób postępowania wychowawcy pierwszeństwo mają aktualne dokumenty MOW, statut, procedury, regulaminy, standardy ochrony małoletnich oraz zarządzenia dyrektora.'
  },
  {
    id: 'mow-ochrona-danych-ai',
    title: 'Ochrona danych w pytaniach do AI',
    type: 'zasada stała',
    source: 'Polityka bezpieczeństwa aplikacji Asystent MOW',
    version: '1',
    validFrom: '2026-06-22',
    validTo: '',
    status: 'active',
    summary: 'Do AI nie należy wpisywać pełnych danych osobowych, PESEL, adresów, danych medycznych ani szczegółów pozwalających łatwo zidentyfikować wychowanka.'
  },
  {
    id: 'ustawa-resocjalizacja-2026',
    title: 'Ustawa o wspieraniu i resocjalizacji nieletnich - wyciąg MOW',
    type: 'ustawa',
    source: 'Dz.U. 2026 poz. 163',
    version: 'wyciąg aktywny 2026-06-22',
    validFrom: '2026-02-12',
    validTo: '',
    status: 'active',
    summary: 'Podstawowy akt dla spraw nieletnich, pobytu w MOW, praw wychowanka i czasowego opuszczania ośrodka.'
  },
  {
    id: 'rozporzadzenie-placowki-2023',
    title: 'Rozporządzenie MEiN o niektórych publicznych placówkach systemu oświaty - wyciąg MOW',
    type: 'rozporządzenie',
    source: 'Dz.U. 2023 poz. 651',
    version: 'wyciąg aktywny 2026-06-22',
    validFrom: '2023-04-05',
    validTo: '',
    status: 'active',
    summary: 'Organizacja MOW, warunki pobytu, urlopy, przepustki i dokumentacja wychowanka.'
  },
  {
    id: 'prawo-oswiatowe-organizacja',
    title: 'Prawo oświatowe i organizacja placówki',
    type: 'ustawa i akty wykonawcze',
    source: 'Prawo oświatowe Dz.U. 2026 poz. 820',
    version: 'wyciąg aktywny 2026-06-22',
    validFrom: '2026-06-04',
    validTo: '',
    status: 'active',
    summary: 'Ramy działania placówek systemu oświaty, statut, nadzór, bezpieczeństwo i organizacja.'
  },
  {
    id: 'karta-nauczyciela-praca',
    title: 'Praca wychowawcy, czas pracy i awans zawodowy',
    type: 'prawo pracy i awans',
    source: 'Karta Nauczyciela Dz.U. 2026 poz. 515; Kodeks pracy Dz.U. 2025 poz. 277',
    version: 'wyciąg aktywny 2026-06-22.2',
    validFrom: '2026-03-12',
    validTo: '',
    status: 'active',
    summary: 'Kluczowa korekta: pensum wychowawcy MOW wynosi 24 godziny tygodniowo. 40 godzin to limit czasu pracy nauczyciela, nie pensum.'
  },
  {
    id: 'bezpieczenstwo-dokumentacja-pomoc',
    title: 'Bezpieczeństwo, dokumentacja i pomoc psychologiczno-pedagogiczna',
    type: 'bezpieczeństwo i dokumentacja',
    source: 'BHP, środki przymusu, dokumentacja, pomoc psychologiczno-pedagogiczna',
    version: 'wyciąg aktywny 2026-06-22',
    validFrom: '2026-06-22',
    validTo: '',
    status: 'active',
    summary: 'Zasady bezpieczeństwa, dokumentowania zdarzeń, pomocy psychologiczno-pedagogicznej oraz granic interwencji.'
  },
  {
    id: 'odpowiedzi-wzorcowe-testy',
    title: 'Odpowiedzi wzorcowe i pytania kontrolne dla AI',
    type: 'testy regresji',
    source: 'Wewnętrzny test bazy wiedzy Asystenta MOW',
    version: '1',
    validFrom: '2026-06-22',
    validTo: '',
    status: 'active',
    summary: 'Pytania kontrolne pilnujące najważniejszych odpowiedzi, m.in. pensum 24 godziny, urlopy, przepustki, dane osobowe i sytuacje kryzysowe.'
  },
  {
    id: 'bank-250-intencji',
    title: 'Bank 250 odpowiedzi wzorcowych i intencji',
    type: 'bank odpowiedzi',
    source: 'Dokumenty MOW, akty prawne, wyciągi wiedzy',
    version: '1',
    validFrom: '2026-06-30',
    validTo: '',
    status: 'active',
    summary: 'Lokalny bank odpowiedzi ograniczający użycie zewnętrznego AI i ryzyko błędnych odpowiedzi.'
  }
];

if (typeof window !== 'undefined') window.DOCUMENT_REGISTRY = DOCUMENT_REGISTRY;
