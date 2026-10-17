// src/services/settingsService.js
//
// Kullanıcı ayarlarının TEK kaynağı: alan adları, varsayılanlar, doğrulama
// kuralları ve kalıcılık. Yeni bir ayar eklenirse yalnızca burası değişir;
// ekranlar `getSettings()` ile okur, `updateSettings()` ile yazar.
//
// `Speech.speak` SENKRON çağrıldığı için ses seviyesi diskten beklenemez:
// bu yüzden okunan kayıt bellek içinde tutulur ve `getCachedSettings()` ile
// anında verilir. Disk yalnızca açılışta/ayar ekranında okunur.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export const SETTINGS_STORAGE_KEY = '@hsk_settings';

// Ayar değişince yayılan olay (App.js ve SettingsScreen dinler).
export const SETTINGS_CHANGED_EVENT = 'onSettingsChange';

export const SPEECH_VOLUME_MIN = 0;
export const SPEECH_VOLUME_MAX = 1;

export const DEFAULT_SETTINGS = {
  // Doğru/yanlış cevapta dokunsal geri bildirim (services/hapticsService.js).
  haptics: true,
  // Sesli okuma seviyesi (expo-speech `volume`, 0.0–1.0; 0 = sessiz).
  speechVolume: 1,
};

export const clampSpeechVolume = (value) => {
  // "Değer yok" (undefined/null/boş metin) aralık dışı DEĞİLDİR: varsayılana dön.
  if (value === undefined || value === null || value === '') return DEFAULT_SETTINGS.speechVolume;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.speechVolume;
  return Math.min(SPEECH_VOLUME_MAX, Math.max(SPEECH_VOLUME_MIN, parsed));
};

// Diskteki ham kayıt bozuksa alan alan varsayılana düşülür; bilinmeyen
// alanlar atılır (ileri sürümden kalan artıklar buraya sızmasın).
const sanitizeSettings = (raw) => ({
  haptics: typeof raw?.haptics === 'boolean' ? raw.haptics : DEFAULT_SETTINGS.haptics,
  speechVolume: clampSpeechVolume(raw?.speechVolume),
});

let cachedSettings = { ...DEFAULT_SETTINGS };

// Anlık (senkron) okuma — ses/titreşim servisleri bunu kullanır.
export const getCachedSettings = () => cachedSettings;

// Diski okur, önbelleği tazeler ve güncel ayarları döner. Kayıt yoksa
// varsayılanlara döner (testlerde de deterministik davranış sağlar).
export const getSettings = async () => {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    cachedSettings =
      saved === null ? { ...DEFAULT_SETTINGS } : sanitizeSettings(JSON.parse(saved));
  } catch (error) {
    console.error('Ayarlar okunamadı, varsayılanlar kullanılıyor:', error);
    cachedSettings = { ...DEFAULT_SETTINGS };
  }
  return cachedSettings;
};

// Kısmi güncelleme: verilmeyen alanlar korunur. Önce bellekte/olayda yayılır
// (UI anında tepki verir), sonra diske yazılır.
export const updateSettings = async (patch) => {
  const next = sanitizeSettings({ ...cachedSettings, ...patch });
  cachedSettings = next;
  DeviceEventEmitter.emit(SETTINGS_CHANGED_EVENT, next);

  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Ayarlar kaydedilemedi:', error);
  }

  return next;
};
