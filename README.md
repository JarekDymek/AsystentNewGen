# Asystent MOW NewGen

Nowa, czysta wersja aplikacji PWA dla wychowawców MOW nr 1 w Malborku.

## Cel aplikacji

Asystent MOW NewGen ma pomagać wychowawcy w szybkim znalezieniu właściwej drogi prawnej, procedury i praktycznego sposobu działania w codziennej pracy internatu MOW. Aplikacja łączy dyżur, harmonogram pracy, procedury kryzysowe, stopnie uspołecznienia, podstawy prawne, bieżące informacje i lokalny bank odpowiedzi.

Źródłem danych są dokumenty MOW, akty prawne, wyciągi wiedzy, bank 250 odpowiedzi oraz harmonogramy pracy. Projekt nie jest aplikacją sportową ani systemem punktowania rywalizacji.

Założenia:
- mobilny interfejs jako główny widok pracy,
- lokalny bank 250 odpowiedzi przed użyciem zewnętrznego AI,
- czytelne karty zamiast długich list,
- PWA z instalacją na telefonie, tablecie i komputerze,
- backend Render-ready bez ujawniania kluczy API w przeglądarce.
- pierwszeństwo dokumentów MOW przy pytaniach proceduralnych.

## Uruchomienie lokalne

```bash
npm run dev
```

## Testy

```bash
npm run check
```

## Zmienne Render

- `GEMINI_API_KEY` albo `OPENAI_API_KEY`
- `AI_PROVIDER` opcjonalnie: `gemini` albo `openai`
- `HARMONOGRAM_BACKEND_URL` albo `WEEKLY_PLAN_URL`
- `VIEW_TOKEN` lub `ADMIN_TOKEN` dla proxy harmonogramu
