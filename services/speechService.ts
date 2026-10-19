// src/services/speechService.js
//
// Uygulamanın konuşma (TTS) için TEK noktası. Ses seviyesi kullanıcı ayarından
// (services/settingsService.js) gelir; çağıran ekranlar `volume` ile uğraşmaz.
// Böylece kart hoparlörü ile sözlük hoparlörü aynı seviyede okur.
//
// TTS bir yardımcı özelliktir: hata quiz akışını bozmamalı, bu yüzden
// çağrılar sessizce yutulur.

import * as Speech from 'expo-speech';
import { getCachedSettings } from './settingsService';

// Tüm okumalar aynı ses karakterini kullanır (Faz 11'de tek yere toplandı).
const SPEECH_LANGUAGE = 'zh-CN';
const SPEECH_PITCH = 1.0;
const SPEECH_RATE = 0.85;

export const stopSpeaking = () => Speech.stop();

// Hanzi metnini mevcut ayarlanmış seviyede okur. Üst üste dokunuşlarda
// kuyruğu temizlemek için önce durdurur.
export const speakHanzi = (text) => {
  if (!text) return;

  Speech.stop();
  Speech.speak(text, {
    language: SPEECH_LANGUAGE,
    pitch: SPEECH_PITCH,
    rate: SPEECH_RATE,
    volume: getCachedSettings().speechVolume,
  });
};

// Motor ısınması: ilk okumadaki gecikmeyi önler. Ses duyulmaz (volume 0),
// bu yüzden kullanıcı ayarından BAĞIMSIZDIR.
export const warmUpSpeech = () => {
  Speech.getAvailableVoicesAsync().catch(() => {});
  Speech.speak(' ', { language: SPEECH_LANGUAGE, volume: 0 });
};
