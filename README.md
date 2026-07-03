# Asystent MOW NewGen

Nowa, czysta wersja aplikacji PWA dla wychowawców MOW nr 1 w Malborku.

Założenia:
- mobilny interfejs jako główny widok pracy,
- lokalny bank 250 odpowiedzi przed użyciem zewnętrznego AI,
- czytelne karty zamiast długich list,
- PWA z instalacją na telefonie, tablecie i komputerze,
- backend Render-ready bez ujawniania kluczy API w przeglądarce.

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

