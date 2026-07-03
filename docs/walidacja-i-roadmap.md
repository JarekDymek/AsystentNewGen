# Walidacja NewGen i mapa usprawnień

Data: 2026-07-03

## Wynik walidacji bieżącej

Status: aplikacja przechodzi testy techniczne.

Sprawdzone:
- składnia JavaScript,
- komplet zasobów PWA,
- manifest i ikony instalacyjne,
- service worker i cache,
- obecność bazy 250 odpowiedzi,
- obecność backendowej bazy wiedzy,
- poprawna informacja o pensum wychowawcy MOW: 24 godziny,
- router lokalnego banku odpowiedzi: pytania o pensum, ucieczkę, pogotowie, dane w AI oraz pytanie ogólne „urlop”.

## Usunięte lub ograniczone wąskie gardła

1. Limit zewnętrznego AI
   - Dodano osobny router banku odpowiedzi.
   - Czat najpierw odpowiada lokalnie z bazy 250 odpowiedzi.
   - Zewnętrzne AI jest używane dopiero wtedy, gdy lokalna baza nie wystarczy.

2. Zbyt słabe rozumienie naturalnych pytań
   - Dodano odmiany słów: etat/etatu, godziny/godzin, ucieczka/ucieczki, urlop/urlopowanie, sędzia/sąd, telefon/telefonów.
   - Dodano ważne skróty i słowa krótkie, szczególnie „AI” i „112”.
   - Dodano bezpieczniejsze progi dla sytuacji alarmowych i prywatności danych.

3. Ryzyko starej wersji PWA w telefonie
   - Dodano komunikat „Dostępna nowa wersja aplikacji”.
   - Podbito wersję cache service workera.

4. Kruchość localStorage
   - Dodano eksport i import lokalnej kopii danych urządzenia.
   - Kopia obejmuje m.in. bieżące informacje, plan, screen harmonogramu i historię AI.

## Najważniejsze kolejne usprawnienia

1. Centralna baza zatwierdzonych dokumentów
   - Docelowo warto dodać panel administratora z wersjami dokumentów, datą obowiązywania i statusem: projekt / obowiązuje / archiwum.

2. Silnik zmian czasowych
   - Każde zarządzenie powinno mieć `validFrom`, `validTo`, `source`, `priority` i informację, czy zastępuje starszą zmianę.

3. Automatyczny import wiadomości dyrekcji
   - Bezpieczniej jako osobny backendowy moduł z OAuth/Gmail albo IMAP z hasłem aplikacyjnym.
   - Aplikacja powinna wyciągać terminy i proponować wpisy kalendarza, ale nie dodawać ich bez widocznego potwierdzenia.

4. Testy merytoryczne AI
   - Każdy błąd zauważony w praktyce powinien trafić do testu regresji.
   - Szczególnie pilnować: pensum 24 godziny, urlop/przepustka, art. 107, dane osobowe, ucieczka, próba samobójcza, środki przymusu.

5. Tryb dla testerów
   - Link testowy powinien działać bez tokenów administracyjnych.
   - Tester nie powinien widzieć ani zmieniać konfiguracji backendu, kluczy API ani tokenów.

6. Szybka ścieżka kryzysowa
   - Dla sytuacji zagrożenia życia aplikacja powinna od razu pokazywać pierwsze 3 kroki i numer alarmowy, a dopiero niżej pełną procedurę.

7. Lepsza integracja harmonogramu
   - Generator powinien zwracać ustandaryzowany JSON z tygodniami, dniami, dyżurami nocnymi i etykietą: poprzedni / bieżący / następny / kolejny.

8. Audyt prywatności
   - Dodać przełącznik „tryb bez danych osobowych”, który ostrzega przed wpisaniem imienia, nazwiska, PESEL, adresu lub danych medycznych do AI.
