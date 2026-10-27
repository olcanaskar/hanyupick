import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  DEFAULT_SETTINGS,
  SETTINGS_CHANGED_EVENT,
  SETTINGS_STORAGE_KEY,
  clampSpeechVolume,
  getCachedSettings,
  getSettings,
  updateSettings,
} from '../services/settingsService';
import type { Settings } from '../services/settingsService';

const readRaw = async () =>
  JSON.parse((await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) || '{}');

beforeEach(async () => {
  await AsyncStorage.clear();
  // Önbellek modül içinde yaşadığı için disk temizlendikten sonra bir okuma
  // yapılmalı; yoksa önceki testin değerleri sızabilir.
  await getSettings();
});

describe('getSettings', () => {
  test('boş depoda varsayılan ayarları döner', async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('kayıtlı ayarları okur', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ haptics: false, speechVolume: 0.4 })
    );

    await expect(getSettings()).resolves.toEqual({ haptics: false, speechVolume: 0.4 });
  });

  test('bozuk JSON varsa varsayılana döner', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{bozuk');

    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('geçersiz/eksik alanlar tek tek varsayılana düşer', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      // haptics yanlış tipte, speechVolume aralık dışı, bilinmeyen alan var.
      JSON.stringify({ haptics: 'evet', speechVolume: 7, tema: 'dark' })
    );

    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('disk kaydı yoksa önceki değerler sızmaz', async () => {
    await updateSettings({ haptics: false, speechVolume: 0.2 });
    await AsyncStorage.clear();

    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('updateSettings', () => {
  test('kısmi güncelleme diğer alanları korur ve diske yazar', async () => {
    await updateSettings({ speechVolume: 0.5 });
    const afterFirst = await updateSettings({ haptics: false });

    expect(afterFirst).toEqual({ haptics: false, speechVolume: 0.5 });
    await expect(readRaw()).resolves.toEqual({ haptics: false, speechVolume: 0.5 });
  });

  test('değerleri doğrular (aralık dışı ses seviyesi kırpılır)', async () => {
    await expect(updateSettings({ speechVolume: 2 })).resolves.toEqual({
      haptics: true,
      speechVolume: 1,
    });
    await expect(updateSettings({ speechVolume: -3 })).resolves.toEqual({
      haptics: true,
      speechVolume: 0,
    });
    await expect(updateSettings({ speechVolume: 'abc' })).resolves.toEqual({
      haptics: true,
      speechVolume: DEFAULT_SETTINGS.speechVolume,
    });
  });

  test('bilinmeyen alanlar kaydedilmez', async () => {
    await updateSettings({ dil: 'tr' });

    await expect(readRaw()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  test('anlık okuma (getCachedSettings) hemen güncellenir', async () => {
    await updateSettings({ haptics: false });

    expect(getCachedSettings().haptics).toBe(false);
  });

  test('değişiklik olayı güncel ayarlarla yayılır', async () => {
    const seen: Settings[] = [];
    const sub = DeviceEventEmitter.addListener(SETTINGS_CHANGED_EVENT, (settings: Settings) =>
      seen.push(settings)
    );

    await updateSettings({ speechVolume: 0.3 });

    sub.remove();
    expect(seen).toEqual([{ haptics: true, speechVolume: 0.3 }]);
  });
});

describe('clampSpeechVolume', () => {
  test('aralık içindekini değiştirmez, dışındakini kırpar', () => {
    expect(clampSpeechVolume(0)).toBe(0);
    expect(clampSpeechVolume(0.35)).toBe(0.35);
    expect(clampSpeechVolume(1)).toBe(1);
    expect(clampSpeechVolume(1.5)).toBe(1);
    expect(clampSpeechVolume(-0.5)).toBe(0);
  });

  test('sayıya çevrilemeyen değerde varsayılana döner', () => {
    expect(clampSpeechVolume(undefined)).toBe(DEFAULT_SETTINGS.speechVolume);
    expect(clampSpeechVolume(null)).toBe(DEFAULT_SETTINGS.speechVolume);
    expect(clampSpeechVolume('abc')).toBe(DEFAULT_SETTINGS.speechVolume);
    expect(clampSpeechVolume(NaN)).toBe(DEFAULT_SETTINGS.speechVolume);
  });
});
