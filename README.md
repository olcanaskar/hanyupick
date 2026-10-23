<div align="center">

<img src="assets/icon.png" alt="HanyuPick app icon" width="140" />

# HanyuPick

**Learn the 5,000 words of the official HSK 1–6 lists**

An offline-first flashcard app for Chinese vocabulary, with a mistake pool that keeps asking only
what you got wrong.

[![Download APK](https://img.shields.io/badge/Download-APK%20(release)-3DDC84.svg?logo=android&logoColor=white)](https://github.com/olcanaskar/hanyupick/releases/latest)
[![CI](https://github.com/olcanaskar/hanyupick/actions/workflows/ci.yml/badge.svg)](https://github.com/olcanaskar/hanyupick/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo&logoColor=white)](https://expo.dev)

</div>

---

## Download & install

The app is published as an APK on the **[Releases page](https://github.com/olcanaskar/hanyupick/releases/latest)**.

1. Open the latest release on your **Android phone** (Android 7.0 or newer) and download the
   `hanyupick-*.apk` file.
2. Tap the downloaded file. Android will ask you to allow "install unknown apps" for your browser or
   file manager the first time — allow it, then install.
3. That's it. No account, no sign-up, no download inside the app: the full 5,000-word library is
   already inside the APK and everything except search by draw works offline.

> **Play Protect note.** Android shows *"Play Protect hasn't seen this app before"* for every APK that
> does not come from Google Play. It means Google has not scanned this file yet — **not** that something
> harmful was found. Tap **Scan app** (it takes a few seconds and then says *No harmful apps found*) and
> install; on some versions the button is behind **More details → Install anyway**. HanyuPick asks for no
> sensitive permissions (no SMS, no accessibility, no notification access) and its whole source is in
> this repository.

Prefer not to install anything at all? The same app runs in a browser at **https://hanyupick.expo.app**
— everything works there except search by drawing, which needs the phone.

There is no iOS build yet; on iPhone the app has to be built from source — see
[Building from source](#building-from-source).

## Web version

The same app also runs in a browser: **https://hanyupick.expo.app**

It is the same codebase, exported with `npx expo export --platform web` (React Native Web) and served
from EAS Hosting. On a desktop browser the layout stays the phone layout, centred in a phone-width
frame.

- **Everything works** — all six quiz directions, the mistake pool, custom decks, vocabulary search,
  statistics, speak-aloud through the browser's text-to-speech engine, and every setting.
- **Except search by drawing.** The handwriting pad sends strokes to Google's public Input Tools
  endpoint, which does not allow cross-origin calls from a page, so a browser cannot use it; drawing
  stays a phone feature (the button is hidden on web on purpose — it is not broken).
- **Progress stays in the browser.** The same records as on the phone, stored in that site's local
  storage: still no account and no sync, so another browser or device starts empty.

It is published by exporting the bundle and deploying it (see [Web deployment](#web-deployment)).

## Screenshots

<table>
  <tr>
    <td align="center" width="25%"><img src="docs/screenshots/home.jpg" width="200" alt="Home screen with the level picker and the review, decks, vocabulary and statistics cards" /><br /><sub><b>Home</b> — level, review pool, decks, search, stats</sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/quiz-hanzi-to-pinyin.jpg" width="200" alt="Quiz asking for the correct pinyin of a character" /><br /><sub><b>Hanzi → Pinyin</b></sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/quiz-pinyin-to-hanzi.jpg" width="200" alt="Quiz asking for the correct character of a pinyin" /><br /><sub><b>Pinyin → Hanzi</b></sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/quiz-hanzi-to-english.jpg" width="200" alt="Quiz asking for the correct English meaning of a character" /><br /><sub><b>Hanzi → English</b></sub></td>
  </tr>
  <tr>
    <td align="center" width="25%"><img src="docs/screenshots/quiz-english-to-hanzi.jpg" width="200" alt="Quiz asking for the correct character of an English meaning" /><br /><sub><b>English → Hanzi</b></sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/quiz-pinyin-to-english.jpg" width="200" alt="Quiz asking for the correct English meaning of a pinyin" /><br /><sub><b>Pinyin → English</b></sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/quiz-english-to-pinyin.jpg" width="200" alt="Quiz asking for the correct pinyin of an English meaning" /><br /><sub><b>English → Pinyin</b></sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/vocabulary.jpg" width="200" alt="Vocabulary list with search bar, level filter chips and speaker buttons" /><br /><sub><b>Vocabulary</b> — 5,000 words, level filters, 🔊</sub></td>
  </tr>
  <tr>
    <td align="center" width="25%"><img src="docs/screenshots/handwriting.jpg" width="200" alt="Handwriting pad with the character 你 drawn by hand and five candidates" /><br /><sub><b>Handwriting</b> — look a word up by drawing it</sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/statistics-mastery.jpg" width="200" alt="Statistics pop-up with the streak banner and the mastery bars for HSK 1-6" /><br /><sub><b>Statistics</b> — streak &amp; mastery</sub></td>
    <td align="center" width="25%"><img src="docs/screenshots/statistics-calendar.jpg" width="200" alt="Statistics pop-up with the seven-day strip, the activity calendar and the heat legend" /><br /><sub><b>Activity calendar</b> — practice history</sub></td>
    <td align="center" width="25%"></td>
  </tr>
</table>

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
| **Settings** | Haptics on/off, speech volume, reset progress, and an **About** card with the app version, the license and the GitHub link. |

## Building from source

Only needed for development, contributing, or an iOS build — the APK above is enough to use the app.

Requirements: [Node.js LTS](https://nodejs.org) and npm. For the quickest development loop, install
**Expo Go** on your phone; the project has no custom native modules, so the app runs in Expo Go
without a native build.

```bash
git clone https://github.com/olcanaskar/hanyupick.git
cd hanyupick
npm install
npx expo start --go
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Checks

```bash
npm test        # 247 Jest tests (services only), jest-expo preset
npm run lint    # ESLint (flat config) — expected: 0 errors
npm run tsc     # TypeScript — logic `.ts`, screens `.js` via `checkJs` — expected: 0 errors
```

The same three commands run in CI on every push and pull request.

### Releasing

`eas.json` defines two profiles: `preview` (internal distribution — this is the build published as
the **APK on the Releases page**) and `production` (store build, AAB, with automatic version
increments). There is deliberately no `development` profile — the project has no `expo-dev-client`
and the test loop runs in Expo Go.

```bash
npx eas-cli@latest build --profile preview    --platform android
npx eas-cli@latest build --profile production --platform android
```

### Web deployment

```bash
npx expo export --platform web    # static bundle into dist/ (gitignored)
npx eas-cli@latest deploy --prod  # publishes it to https://hanyupick.expo.app
```

The web build is the same tree as the native app: `App.js` only wraps the content in a centred
phone-width frame when `Platform.OS === 'web'`, and the pop-up cards are capped to the same width.

The app icon, the Android adaptive-icon layers and the splash image are **generated, never
hand-edited**:

```bash
python -m pip install pillow
python tools/generate-icons.py
```

The **README gallery is generated the same way**, from the raw device captures under `docs/screenshots/raw/`:

```bash
python tools/generate-store-screenshots.py
```

It strips the phone's system bars, adds the frame and captions, and draws the sample progress used in the two Statistics images — see the note under [Screenshots](#screenshots). The gallery is **README-only**: nothing under `docs/` is bundled into the app (the app's own assets live in `assets/`), so these files exist purely to promote the app here.

## Project structure

| Path | Contents |
| --- | --- |
| `index.js` → `App.js` | Entry point: navigation, the review-pool state, splash screen, id migrations. |
| `screens/` | `HomeScreen`, `QuizScreen`, `VocabularyScreen`. |
| `components/` | `Header`, `QuestionCard`, `ScoreBoard`, `ExampleBox`, `StatsModal`, `SettingsModal`, `CustomDeckModal`, `HandwritingModal`, `FloatingBackground`. |
| `services/` | All logic, in **TypeScript** (`.ts`): word repository, review pool, quiz builder, stats, import, examples, handwriting, speech, haptics, settings, word-id migrations, date helpers. |
| `data/` | `hsk1..6.json` (5,000 words) and `examples/hsk*_examples.ts` (example sentences keyed by word id). |
| `__tests__/` | Jest tests, in TypeScript (services only, by design — screens are verified on a device). |
| `tools/generate-icons.py` | The single source of the icons and the splash image. |
| `tools/generate-store-screenshots.py` | The single source of the store-style README gallery (from `docs/screenshots/raw/`). |

Everything that has one source of truth really has one: `services/wordRepository.ts` for levels and
word pools, `services/modes.ts` for the six quiz directions, `services/statsManager.ts` for the
mastery rules, `services/wordIdMigrations.ts` for every word-id move, `services/dateUtils.ts` for day
keys. Components never re-implement those rules.

Screens and components are still JavaScript, type-checked through `checkJs`; the logic modules
(`services/`), the tests and the example-sentence data are TypeScript, so their types are real and
checked at build time.

## Data notes

**Word ids are permanent identity.** Progress and the mistake pool are stored *by word id*, so
changing the library means writing a migration: `services/wordIdMigrations.ts` records every id move
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
by `__tests__/exampleService.test.ts` for all six levels. The only exemptions are multi-part pattern
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
