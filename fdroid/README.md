# F-Droid submission

HanyuPick is prepared for the **main F-Droid repository**. F-Droid builds every app from source and
signs it with its own key; an APK is never uploaded. The build recipe is a single YAML file that lives
in [`fdroiddata`](https://gitlab.com/fdroid/fdroiddata) under `metadata/`, and this directory holds the
draft of that file for review.

## What is here

- `io.github.olcanaskar.hanyupick.yml` — the build recipe. Copy it to
  `metadata/io.github.olcanaskar.hanyupick.yml` in an `fdroiddata` fork. **Do not** add the Fastlane
  text or images: F-Droid reads those from the pinned release commit in this repository
  (`fastlane/metadata/android/en-US/`).
- `scripts/fdroid-prepare.mjs` (in the repository root) — the recipe runs it after `npm ci`; it switches
  Expo autolinking to source builds and checks the pinned `versionCode`.

## Submitting

1. Create a public fork of <https://gitlab.com/fdroid/fdroiddata> and a branch named
   `io.github.olcanaskar.hanyupick` from `master`.
2. Copy the recipe into `metadata/io.github.olcanaskar.hanyupick.yml` (only that file). Use LF line
   endings.
3. Make sure the `commit:` value is the full SHA of the **v1.1.1** release commit
   (`git rev-list -n 1 v1.1.1`). The tag must contain `app.json` version `1.1.1`, `versionCode 10101`
   and the `fastlane/metadata/android/en-US/` tree.
4. Commit with `New App: io.github.olcanaskar.hanyupick`, push the branch and open a merge request
   against `fdroiddata` titled **New app: HanyuPick**.
5. Fill the merge-request checklist. The upstream author is the same person as the MR author, and the
   Fastlane metadata is already in this repository.
6. Wait for the F-Droid CI jobs: `fdroid build`, the source scanner, `fdroid lint`, `rewritemeta`,
   `checkupdates`, and the APK check. All must pass. The first pipeline is the real build test.

There is no F-Droid account besides GitLab, and no token is stored in this repository.

## Review notes

- **Expo SDK 57 / React Native 0.86.3.** `android/` is not committed; `init:` generates it with
  `npx expo prebuild`. The recipe downloads Node 24 (Debian's Node is too old) and uses the bookworm
  JDK 17.
- **Expo modules build from source.** Expo ships prebuilt AARs in `node_modules/expo-*/local-maven-repo`.
  `scripts/fdroid-prepare.mjs` sets `expo.autolinking.android.buildFromSource` to `[".*"]`, and the
  recipe removes those AAR directories before the source scan. iOS-only binaries and XCFramework
  tarballs are removed too.
- **Web-only audio is removed.** `public/audio/hsk/` (5,000 MP3s, ~35 MB) exists only for the web
  build. `public/` is not part of the native bundle; the recipe removes it before scanning.
- **Anti-feature: `NonFreeNet`.** The optional *Draw* search sends the drawn strokes to Google's public
  Input Tools endpoint. Everything else is offline; the app works without the feature.
- **No proprietary dependencies.** No Google Play Services, Firebase, ads, analytics or crash
  reporting. The only third-party network call is the handwriting endpoint above.
- **Signing.** There is no reproducible-build setup yet (Expo prebuild + Hermes output is not
  deterministic today). F-Droid signs the APK with its key, so switching from the GitHub APK requires
  an uninstall; the two signatures cannot update each other.
- **Versioning.** `app.json` `expo.android.versionCode` is the F-Droid build number
  (`major * 10000 + minor * 100 + patch`). EAS uses its own remote `versionCode` for GitHub/Play.

## After the merge

F-Droid publishes new apps in roughly 24-48 hours if the build succeeds. Once
<https://f-droid.org/packages/io.github.olcanaskar.hanyupick/> is live:

- add the F-Droid badge and an install link to `README.md` (Download & install);
- update `NOTES.md` and `AGENTS.md` to say the app is published;
- future releases: tag `vX.Y.Z` with bumped `app.json` version/versionCode and a new
  `fastlane/.../changelogs/<versionCode>.txt`. `AutoUpdateMode: Version` lets F-Droid open its own
  metadata MR from the new tag; review and merge it.
