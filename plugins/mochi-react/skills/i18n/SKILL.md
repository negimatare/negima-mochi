---
name: i18n
description: i18next + react-i18next conventions for this stack — keys nested by surface, enum-keyed error copy, what is never translated, and a pinned test language. Use when adding UI text, locale files, or languages.
user-invocable: false
paths:
  - "**/locales/**"
---

# Internationalisation

`i18next` for the engine, `react-i18next` for `useTranslation()`. Locale files
and the i18n config live in the `lib` layer so every layer can import them.

## Rules

- Every piece of UI chrome goes through `t()`; no hard-coded user-facing
  strings in components.
- Keys nest by surface (`sidePanel.*`, `settings.*`, `errors.*`);
  interpolation uses `{{name}}`.
- Error copy is keyed by the error enum (`t('errors.' + reason)`), so the enum
  and the `errors.*` keys stay aligned.
- Pick the language from the platform's authoritative signal (for example the
  host app's locale), not from a browser detector, when one exists.
- Every locale file carries the same keys as the fallback language's file.

## Never translated

- Language autonyms (`日本語`, `English`) — always in their own script.
- Brand and provider names, and the product name.
- User or meeting data, and domain-layer fallback values: localisation stays in
  the presentation layer.

## Tests

`src/test/setup.ts` pins one language (usually English) so behaviour tests
match stable copy whatever the production default is.
