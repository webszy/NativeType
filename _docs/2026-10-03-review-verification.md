# Review fixes verification — 2026-10-03

## Fixes

- Chrome Translator instances, initialization promises and progress listeners are isolated by source/target language pair.
- Preview heading and translated text `lang` follow the configured language pair.
- Platform replacement errors and provider download messages are owned by their adapters rather than Core.

## Automated checks

- `pnpm typecheck`: passed.
- `node --test tests/translator.test.mjs`: 22 tests passed.
- `pnpm build`: passed; Chrome MV3 build version 0.0.2.
- `git diff --check`: passed.
- Browser fixture at `/tests/browser.html`: 27 assertions passed, ending with `DONE: All local regression checks passed.` This fixture uses a fake Translator.

## Real Chrome / X

Reloaded the existing unpacked extension from `.output/chrome-mv3`; Chrome displayed version 0.0.2. Tested the signed-in X website with the real Chrome translation model.

| Composer | Chinese → English preview | Replace | Continue editing | Publish control |
| --- | --- | --- | --- | --- |
| Home new post | Passed | Passed | Passed | Enabled |
| Reply dialog | Passed | Passed | Passed | Enabled |
| Quote dialog | Passed | Passed | Passed | Enabled |

- New post undo restored the original Chinese after undoing the appended text and replacement.
- Preview disappeared after successful replacement.
- Typing immediately while a reply replacement was still pending preserved the edited source; a subsequent replacement completed successfully.
- All test drafts were cleared or discarded. No posts, replies or quotes were published.

Real-browser scope was Chinese → English with an already available model. Cross-language-pair isolation and Japanese UI metadata were verified by automated tests, not by downloading additional real models. IME composition and stale-result cases were covered by the deterministic browser fixture.
