<div align="center">

<img src="assets/icon.png" alt="HanyuPick app icon" width="140" />

# HanyuPick

**Learn the 5,000 words of the official HSK 1–6 lists — one quiz at a time.**

An offline-first Expo/React Native flashcard app for Chinese vocabulary, with a mistake pool that
keeps asking only what you got wrong.

[![CI](https://github.com/olcanaskar/hanyupick/actions/workflows/ci.yml/badge.svg)](https://github.com/olcanaskar/hanyupick/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?logo=react&logoColor=white)](https://reactnative.dev)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey.svg)](#getting-started)

</div>

---

## Why another HSK app?

Because the useful parts are usually behind an account, a download or a paywall. HanyuPick ships the
whole word library inside the app:

- **The complete HSK 1–6 vocabulary, bundled.** 5,000 words with the official Hanban (HSK 2.0) level
  sizes — 150 + 150 + 300 + 600 + 1,300 + 2,500 — in one fixed library with ids 1–5000 and no gaps.
- **No account, no backend, no tracking.** Progress lives on your phone; the app is fully usable in
  aeroplane mode.
- **Every word has an example sentence** that literally contains it (5,000 / 5,000), shown right after
  you answer.
- **A mistake pool, not a "redo everything" button.** Only the words you actually got wrong keep
  coming back, per quiz direction.

## Features

| | |
| --- | --- |
| **6 quiz directions, 3 tabs** | 汉字 ↔ Pinyin, 汉字 ↔ English, Pinyin ↔ English. The third field of every word is shown as a hint after you answer. |
| **Level-scoped questions** | Options are drawn from the same HSK level, never duplicated, so you can't guess by elimination. |
| **Review the Wrongs** | A mistake pool per direction, with a per-mode count. Answer correctly and the word leaves the pool. |
| **Custom word decks** | Import your own vocabulary from a JSON file — useful for HSK 7–9, textbook chapters or your own word list. |
| **Vocabulary & Search** | Search the whole library by hanzi, pinyin or meaning, and look a word up by *writing* it (handwriting pad). |
| **Statistics & Progress** | Mastery per level (streak-based), streaks and an activity calendar, plus your custom decks. |
| **Speak it** | One tap reads the word out loud with the device's text-to-speech engine. |
| **Settings** | Haptics on/off, speech volume, reset progress. |

## Getting started

Requirements: [Node.js LTS](https://nodejs.org) and npm, plus the **Expo Go** app on your phone.

```bash
git clone https://github.com/olcanaskar/hanyupick.git
cd hanyupick
npm install
npx expo start --go
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). No native build is required to run
the app — it has no custom native modules.

### Checks

```bash
npm test        # 247 Jest tests (services only), jest-expo preset
npm run lint    # ESLint (flat config) — expected: 0 errors
npm run tsc     # TypeScript checks the plain JS itself (`checkJs`) — expected: 0 errors
```

### Building with EAS

`eas.json` defines two profiles: `preview` (internal distribution, a shareable **APK**) and
`production` (store build, AAB, with automatic version increments). There is deliberately no
`development` profile — the project has no `expo-dev-client` and the test loop runs in Expo Go.

```bash
npx eas-cli@latest build --profile preview    --platform android
npx eas-cli@latest build --profile production --platform android
```

The app icon, the Android adaptive-icon layers and the splash image are **generated, never
hand-edited**:

```bash
python -m pip install pillow
python tools/generate-icons.py
```

## Project structure

| Path | Contents |
| --- | --- |
| `index.js` → `App.js` | Entry point: navigation, the review-pool state, splash screen, id migrations. |
| `screens/` | `HomeScreen`, `QuizScreen`, `VocabularyScreen`. |
| `components/` | `Header`, `QuestionCard`, `ScoreBoard`, `ExampleBox`, `StatsModal`, `SettingsModal`, `CustomDeckModal`, `HandwritingModal`, `FloatingBackground`. |
| `services/` | All logic: word repository, review pool, quiz builder, stats, import, examples, handwriting, speech, haptics, settings, word-id migrations, date helpers. |
| `data/` | `hsk1..6.json` (5,000 words) and `examples/hsk*_examples.js` (example sentences keyed by word id). |
| `__tests__/` | Jest tests (services only, by design — screens are verified on a device). |
| `tools/generate-icons.py` | The single source of the icons and the splash image. |

Everything that has one source of truth really has one: `services/wordRepository.js` for levels and
word pools, `services/modes.js` for the six quiz directions, `services/statsManager.js` for the
mastery rules, `services/wordIdMigrations.js` for every word-id move, `services/dateUtils.js` for day
keys. Components never re-implement those rules.

## Data notes

**Word ids are permanent identity.** Progress and the mistake pool are stored *by word id*, so
changing the library means writing a migration: `services/wordIdMigrations.js` records every id move
from every phase, and `App.js` applies the pending ones at startup — in ascending order, because 30
ids are both a source and a target across two phases.

**Custom decks** are plain JSON arrays. `id` is optional and only used to keep the generated word ids
stable; a word without one still gets a stable id from its index.

```json
[
  { "id": 1, "hanzi": "你好", "pinyin": "nǐ hǎo", "meaning": "hello" },
  { "hanzi": "谢谢", "pinyin": "xiè xie", "meaning": "thank you" }
]
```

**Examples.** Every HSK word has an example sentence whose hanzi contains the word itself — asserted
by `__tests__/exampleService.test.js` for all six levels. The only exemptions are multi-part pattern
words such as 虽然……但是……, where an ellipsis notation can never appear verbatim in a sentence.

## Privacy

No accounts, no analytics, no server of our own: your progress is stored on the device with
AsyncStorage. Two features leave the device, and both are obvious from the UI:

- **The handwriting pad** (the *Draw* button in Vocabulary) sends the strokes to Google's public
  [Input Tools](https://inputtools.google.com) endpoint to recognise the character. The app works
  fine without it — it is just another way to type into the search box.
- **The 🔊 button** uses the device's built-in text-to-speech engine.

## Contributing

Issues and pull requests are welcome. Before opening a PR, please make sure `npm test`,
`npm run lint` and `npm run tsc` are green, and keep changes focused (one change per commit).

Two documents explain the project in depth — both are written in Turkish, the maintainer's language:

- **`NOTES.md`** — the handoff log: every phase, why it was done that way, and what is still risky.
- **`AGENTS.md`** — the working guide for contributors and AI agents: commands, single sources of
  truth, and the project rules.

## Acknowledgements

- Word levels and sizes follow the official **HSK 2.0** vocabulary lists published by Hanban (2012).
- Built with [Expo](https://expo.dev), [React Native](https://reactnative.dev) and
  [React Navigation](https://reactnavigation.org).
- The 汉 glyph in the icon is rendered from Microsoft YaHei Bold by `tools/generate-icons.py`.
- HanyuPick is an independent project and is not affiliated with Hanban or the HSK organisers.

## License

[MIT](LICENSE) © 2026 Olcan Askar
