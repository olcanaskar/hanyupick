# ChineseQuizApp — agent guide

An Expo/React Native app (**SDK 57**) for studying HSK 1-6 vocabulary: a fixed library of 5,000 words (ids 1-5000, six levels; **all six levels follow the official Hanban 2012 lists** — 150 + 150 + 300 + 600 + 1300 + 2500 words, see `NOTES.md` §10, §9, §8), 6 quiz directions, a mistake-review pool, custom decks imported from JSON, vocabulary search with handwriting input, a stats screen, and a settings screen (vibration, speech volume, reset progress, GitHub link).

Plain **JavaScript** — JSX lives in `.js` files; there is no TypeScript source, but `tsconfig.json` type-checks the JS itself (`checkJs`). Navigation is **React Navigation (Stack)**, not Expo Router.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently `expo ~57.0.29` → **SDK 57**).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v57.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This project uses npm (`package-lock.json`; there is no `bun.lock`) — use `npx`.

```bash
npx expo install <package>          # ALWAYS use instead of npm/yarn/pnpm add — resolves SDK-compatible versions
npm run lint                        # ESLint over the whole project (flat config) — 0 errors expected
npm test                            # jest (jest-expo preset) — 246 tests, 14 suites
npm run tsc                         # tsc --noEmit over the JS (checkJs) — 0 errors expected
npx expo start --go --clear         # dev server for Expo Go (no native build needed)
npx expo-doctor                     # dependency/config diagnosis — currently 19/21 (see NOTES.md §15); needs git on PATH
npx expo install --fix              # fix incompatible package versions
npx expo export --platform android  # bundle pre-check; writes dist/ (gitignored) — delete afterwards
```

`npm test`, `npm run lint` and `npm run tsc` must all pass before a task is declared done.

> Do **not** use `npx expo lint` here: it only lints `/src`, `/app` and `/components`, while this project keeps its screens in `screens/` and its logic in `services/`, so it silently skips most of the code. Use `npm run lint` (which runs `eslint .`).

## Project layout

| Path | Contents |
| --- | --- |
| `index.js` → `App.js` | entry point; owns the review-pool state and the navigator |
| `screens/` | `HomeScreen`, `QuizScreen`, `VocabularyScreen` |
| `components/` | `Header`, `QuestionCard`, `ScoreBoard`, `StatsModal`, `SettingsModal` (Faz 11), `CustomDeckModal`, `HandwritingModal`, `ExampleBox`, `FloatingBackground` |
| `services/` | all logic: `wordRepository`, `reviewPool`, `quizBuilder`, `statsManager`, `importService`, `exampleService`, `handwritingService`, `floatingParticles`, `dateUtils`, `wordIdMigrations`, `settingsService`, `speechService`, `hapticsService` |
| `data/` | `hsk1..6.json` (5.000 words, ids 1-5000 without gaps; all six levels = the official Hanban 2012 lists, in list order) + `examples/hsk*_examples.js` (keyed by word id; hsk1-4 1200/1200, hsk5 1300/1300, hsk6 2500/2500 — 5000/5000) |
| `__tests__/` | jest tests (services only) |
| `tsconfig.json`, `eslint.config.js` | the `npm run tsc` and `npm run lint` configs |

Single sources of truth — never duplicate these elsewhere:

- `services/wordRepository.js` — levels and word pools: `LEVELS`, `LEVEL_LABELS`, `LEVEL_POOLS`, `ALL_WORDS`, `getWordPool()`, `getWordById()`, `getLevelFromWordId()`.
- `services/reviewPool.js` — the mistake pool's single record shape (`{ wordId, wrongMode }`; `snapshot` only for custom-deck words) plus its helpers. `normalizeReviewPool(raw, idMap)` remaps merged word ids **before** resolving (an id that no longer exists in the data would otherwise be silently dropped).
- `services/wordIdMigrations.js` — the ONLY record of every word-id move: **Faz 4** `MERGED_WORD_ID_MAP` (the 17 duplicated `hsk5` records: removed id → kept id), **Faz 6** `HSK5_REBALANCE_ID_MAP` (old `hsk5` tail id → the id where that word lives now: another `hsk5` id or its `hsk6` id) + `HSK5_REBALANCE_DROPPED_IDS` (words that left the library), and **Faz 7** `HSK14_REALIGN_ID_MAP` (old `hsk1-4` id → the word's current id: another `hsk1-4` id, an `hsk5`/`hsk6` id for words the official list puts higher, or the pattern entry a lone word was absorbed into) + `HSK14_REALIGN_DROPPED_IDS` (words in no official HSK 2.0 level). Word ids are identity, so deleting an entry (or reshaping the data) without migrating `@hsk_user_stats` and `@hsk_review_pool` loses or misattributes user progress. `WORD_ID_MIGRATIONS_BY_VERSION` maps each phase to its own table and `getPendingWordIdMigrations()` returns only the phases newer than `@hsk_word_id_migration_version`; `App.js` applies them at startup **in ascending order** (`mergeWordStatsIds(map)`, `removeWordStatsByIds(dropped)`, `normalizeReviewPool(pool, map)`) and only then calls `markWordIdMigrationsApplied()`. The ascending order is load-bearing: 30 ids are both a Faz 6 source and a Faz 7 target, so the combined table (or a wrong order) would move a new word's progress to the wrong id. Never call `mergeWordStatsIds`/`normalizeReviewPool` with these tables outside that flow.
- `services/exampleService.js` — the only place that maps a word id to its example sentence (`EXAMPLES_MAP` per level, keyed by word id). When words move or change, their example keys must move with them: an orphan key would show another word's sentence (`__tests__/exampleService.test.js` asserts none exist). Coverage is now complete across all six levels: hsk1-4 1200/1200 (Faz 8 wrote the sentences Faz 7 left out), hsk5 1300/1300 (Faz 9 wrote the 638 missing ones and fixed 22 mis-keyed records), hsk6 2500/2500 (Faz 10 wrote the 1945 missing ones and rewrote the 385 mis-keyed/defective records) — 5000/5000. `getExampleByWordId()` still returns `null` for an id with no entry (e.g. custom-deck words) and `ExampleBox` renders nothing. In the levels whose coverage is complete *and* verified, the example's `hanzi` must contain its word literally (`__tests__/exampleService.test.js` asserts this for hsk5 + hsk6; a few pre-Faz 7 hsk1-4 sentences still do not).
- `services/modes.js` — the 6 quiz directions and their 3 categories. Everything (`MODES`, `CATEGORIES`, `MODE_CATEGORY`, `MODES_BY_CATEGORY`, `MODE_LABELS`, `DEFAULT_MODE`, `getCategory()`, `getCategoryIndex()`, `getPromptType()`, `getAnswerType()`, `getReverseMode()`, `getHintField()`) is derived from ONE table at the top of the file. Never parse a mode name with `startsWith`/`endsWith` and never hardcode a category key elsewhere.
- `services/dateUtils.js` — the only place that builds day keys (local time, never UTC).
- `services/statsManager.js` — the stats record shape plus the mastery rules (`MASTERY_STREAK`, `isMastered`, `isProblematic`, `getMastery`). They apply to HSK ids (numbers) and custom-deck ids (`custom_…` strings) alike; never re-implement them in a component (they lived in `StatsModal` until 3.6b, where they were untestable). Every write goes through ONE queue (`recordAnswer`, `removeWordStatsByIds`, `clearAllStats`, `mergeWordStatsIds`) so concurrent writes cannot clobber each other — never write `@hsk_user_stats` directly.
- `services/handwritingService.js` — the ONLY place that talks to the external handwriting API (`recognizeHandwriting()`, `buildInk()`). It owns the timeout, so callers never `fetch` directly and must handle its `{ candidates, error }` result (`error` is `null | 'timeout' | 'network'`) instead of catching network errors themselves.
- `services/floatingParticles.js` — the floating-Hanzi geometry and motion (`getRandomBoundaryPoint`, `pickTargetPoint`, `createParticle`, `PARTICLE_COUNT`, size/speed bounds). Randomness is injectable and the target search is **bounded** (`MAX_TARGET_ATTEMPTS`) — never put this math back into `FloatingBackground`, and never replace the bounded search with a bare `while` (that was an unguarded loop that could freeze the JS thread). The component supplies the live window size (`useWindowDimensions`), never a module-load snapshot of `Dimensions`.

- `services/settingsService.js` — the user settings record (`{ haptics, speechVolume }`), defaults and validation, under `@hsk_settings`. `getSettings()` reads the disk (missing/corrupt fields fall back per field, unknown fields are dropped), `updateSettings(patch)` merges, emits `SETTINGS_CHANGED_EVENT` and then persists, and `getCachedSettings()` returns the in-memory copy **synchronously** — `Speech.speak` cannot await storage, so every reader (speech/haptics services, the settings screen) goes through this module.
- `services/speechService.js` — the ONLY place that calls `expo-speech` (`speakHanzi`, `stopSpeaking`, `warmUpSpeech`). It attaches the user's `speechVolume`, so the quiz card's 🔊 and the vocabulary 🔊 behave identically; callers never pass `volume` themselves. `warmUpSpeech` deliberately speaks at `volume: 0` (independent of the setting).
- `services/hapticsService.js` — the ONLY place that calls `expo-haptics` (`selectionFeedback`, `failureFeedback`). Both are no-ops while `settings.haptics === false`, so the vibration toggle covers every call site.

AsyncStorage keys: `@hsk_review_pool`, `@hsk_user_stats`, `@custom_word_decks`, `@hsk_word_id_migration_version` (the applied id-migration version, not user progress), `@hsk_settings` (user settings).

## Testing

- `npm test` runs jest with the `jest-expo` preset; AsyncStorage is mocked in `jest.setup.js`.
- Tests cover **`services/` only**. Screens and components are never imported by a test, so a syntax error there still leaves `npm test` green. Before declaring a change to a `.js`/JSX file done, confirm it parses:
  `node -e "require('@babel/parser').parse(require('fs').readFileSync('screens/QuizScreen.js','utf8'),{sourceType:'module',plugins:['jsx']})"`
- UI, touch and animation behaviour still has to be checked on the device, in Expo Go.

## Type checking

- `npm run tsc` runs `tsc --noEmit`. `tsconfig.json` extends `expo/tsconfig.base` and sets `checkJs: true`, so the `.js` files themselves are checked — not just syntax.
- It is deliberately **lenient**: `strict` and `noImplicitAny` are off. On a JS codebase TS 6 turns those on by default and demands JSDoc annotations on every parameter (measured: 161 extra `implicit any` errors on `services/` alone). `types: ["jest"]` is required, otherwise jest globals are unknown in `__tests__/` and `jest.setup.js`.
- `allowJs` and `noEmit` come from `expo/tsconfig.base` — `tsc` **never** writes `.js` output over the sources. Regenerate with `npx expo customize tsconfig.json`.
- It catches real API misuse (wrong React/RN calls, mistyped prop contracts — it found real bugs the day it was added). It does **not** cover runtime/device behaviour, JSON data shape, or anything not reachable from `include`.
- If you add a global type package, add it to `types` too.

## Navigation

React Navigation **Stack** (`@react-navigation/stack` + `@react-navigation/native`), wired up in `App.js`:

- `NavigationContainer` → `Stack.Navigator` with the routes `Home`, `Quiz`, `Vocabulary`; `headerShown: false` everywhere.
- Settings is **not** a route: it is a pop-up (`components/SettingsModal.js`, same shell as `StatsModal`) owned by `HomeScreen` (`visible` / `onClose`) and opened by the ⚙️ button in Home's header row. Anything that needs the same treatment (a second overlay) belongs there too, not in a new route.
- Home passes `{ initialLevel }` to Quiz; `QuizScreen` reads `route.params.initialLevel`.
- Cross-component events go through `DeviceEventEmitter` (`onCustomDeckImported`, `onLevelChange`).

Do not introduce `expo-router`.

## Rules

- Custom-deck word IDs (`custom_<sanitized name>_<item.id ?? index>`, `services/importService.js`) are **identity**: review-pool and stats entries resolve by `wordId`, so never change the prefix rule without writing a migration. `saveCustomDeck` over-writes nothing silently (needs `{ overwrite: true }`) and rejects a name whose word IDs would collide with another deck. Deleting a deck goes through `deleteCustomDeck` only: it reads the deck's word ids **before** removing the deck (they are unreachable afterwards), prunes their stats itself, and returns `removedIds` so the caller can emit `onCustomDeckDeleted` — `App.js` owns `@hsk_review_pool` and drops the matching entries there. Pruning matches **exact ids**, never a prefix (`custom_Ders_` would also match another deck's `custom_Ders_1_5`).
- "Reset progress" (`clearAllStats()` + `onProgressReset`) clears stats **and** the mistake pool but never touches custom decks. Any new written copy of user progress must be cleared by it too. Since Faz 11 the button lives in `components/SettingsModal.js` only (it was in `StatsModal` before) — do not add a second copy.
- Settings are read **synchronously** at speak/vibrate time (`getCachedSettings()`), so `App.js` must keep priming the cache with `getSettings()` at startup, and any new setting must be added to `DEFAULT_SETTINGS` + the sanitizer in `services/settingsService.js` rather than read from AsyncStorage directly.
- Never create or edit `android/` or `ios/` by hand — they are generated (Continuous Native Generation). Configure native behaviour in `app.json` and config plugins. (A stale `android/` folder exists locally; it is gitignored.)
- Expo Go only ships its bundled native modules. Adding a library with native code requires a development build (`npx expo run:*`, or `eas build --profile development`) — unless the SDK docs mark it `inExpoGo: true` (e.g. `@react-native-community/slider`, added in Faz 11 for the speech-volume slider).
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Accessibility: labels are **English** (matching the visible UI text). `TouchableOpacity` is an accessibility element by default (`accessible={this.props.accessible !== false}`) and therefore **hides its children** from screen readers — when a touchable wraps other touchables (the quiz card wrapping the option buttons in `QuestionCard`), keep it `accessible={false}` while those children must stay reachable. The floating-Hanzi background is decorative and must stay out of the accessibility tree (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`). `accessibilityState`/hints/announcements are not implemented yet.
- No emulator or device is attached to the development machine: device verification is done by the user, in Expo Go, on request.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run the EAS CLI as `npx eas-cli@latest <command>` (this project uses npm), substituting it for the bare `eas` in the docs. Docs: https://docs.expo.dev/eas/index.md

## Workflow

- Work directly on `main`; **one commit per fix**, with a descriptive message.
- The `known-good` tag marks the last verified state. Advance it only once `npm test` / `npm run lint` / `npm run tsc` are green and the user has confirmed the device check; roll back with `git reset --hard known-good`.
- `.git/hooks/post-commit` (local only) pushes `main` and the `known-good` tag after every commit.
- `NOTES.md` is the handoff document — read it first, update it when a phase lands.
- Keep exactly one `ChineseQuizApp-backup-*.tar.gz` in `C:\Projects\App`: delete the older archive when taking a new one.
- `eslint.config.js` deliberately relaxes three rules, with the reasons inline: `react-hooks/refs` is off (the code uses React Native's `Animated` ref API, which the rule cannot model), and `react-hooks/set-state-in-effect` / `react-hooks/exhaustive-deps` are warnings rather than errors. `npm run lint` is expected to stay at **0 errors**.
