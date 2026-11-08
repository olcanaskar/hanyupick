#!/usr/bin/env node
/*
 * F-Droid build preparation.
 *
 * F-Droid compiles the app from source and does not accept the prebuilt AARs
 * that Expo ships in each module's local-maven-repo/ directory. This script
 * opts every Expo module into a source build; the F-Droid recipe then removes
 * those prebuilt artifacts before scanning and building.
 *
 * It also fails early if app.json has no numeric versionCode, because the
 * F-Droid build block pins one and the built APK must match it.
 *
 * Only the F-Droid recipe runs this; EAS builds are untouched.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const packageJson = readJson('package.json');
packageJson.expo = packageJson.expo ?? {};
packageJson.expo.autolinking = packageJson.expo.autolinking ?? {};
packageJson.expo.autolinking.android = packageJson.expo.autolinking.android ?? {};
packageJson.expo.autolinking.android.buildFromSource = ['.*'];
writeJson('package.json', packageJson);

const appJson = readJson('app.json');
const version = appJson?.expo?.version;
const versionCode = appJson?.expo?.android?.versionCode;

if (typeof version !== 'string' || !Number.isInteger(versionCode) || versionCode <= 0) {
  throw new Error(
    'app.json: expo.version and a positive integer expo.android.versionCode are required for the F-Droid build',
  );
}

console.log(`F-Droid: Expo modules build from source; version ${version} (${versionCode})`);
