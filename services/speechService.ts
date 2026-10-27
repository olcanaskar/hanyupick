// services/speechService.ts
//
// Uygulamanın konuşma (TTS) için TEK noktası. Ses seviyesi kullanıcı ayarından
// (services/settingsService.ts) gelir; çağıran ekranlar `volume` ile uğraşmaz.
// Böylece kart hoparlörü ile sözlük hoparlörü aynı seviyede okur.
//
// İKİ YOL VAR:
//   native -> cihazın kendi TTS motoru (`expo-speech`), dil `zh-CN`
//   web    -> önceden üretilmiş ses dosyası (`services/audioFiles.ts`)
// Web'de `expo-speech` kullanılmaz: tarayıcının `speechSynthesis`'i işletim
// sisteminin kurulu seslerine bağlıdır ve Çince ses paketi olmayan bir makinede
// Hanzi sessiz kalır (ölçüldü: "你好" 0 ms'lik utterance, "merhaba" 1,7 s).
// Ses dosyası yoksa (ör. ses üretilmeden yapılmış bir web export'u) motor
// yoluna düşülür; özellik sessizce kaybolmaz.
//
// TTS bir yardımcı özelliktir: hata quiz akışını bozmamalı, bu yüzden
// çağrılar sessizce yutulur.

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { getBundledAudioUrl, hasBundledAudio } from './audioFiles';
import { getCachedSettings } from './settingsService';
import type { WordId } from './wordRepository';

// Tüm okumalar aynı ses karakterini kullanır (Faz 11'de tek yere toplandı).
const SPEECH_LANGUAGE = 'zh-CN';
const SPEECH_PITCH = 1.0;
const SPEECH_RATE = 0.85;

// Web'de çalan tek ses öğesi: üst üste dokunuşta önceki kesilir (kuyruk birikmez).
let webAudio: HTMLAudioElement | null = null;

const stopWebAudio = () => {
  if (!webAudio) return;
  webAudio.pause();
  webAudio.currentTime = 0;
  webAudio = null;
};

// Cihazın (native) ya da tarayıcının kendi konuşma motoru. Web'de yalnızca
// önceden üretilmiş sesi olmayan metinler için (ör. özel deste kelimesi).
const speakWithDevice = (text: string) => {
  Speech.speak(text, {
    language: SPEECH_LANGUAGE,
    pitch: SPEECH_PITCH,
    rate: SPEECH_RATE,
    volume: getCachedSettings().speechVolume,
  });
};

// Önceden üretilmiş ses dosyasını çalar. Dosya yoksa/açılamazsa motor yoluna düşer.
const playBundledAudio = (wordId: number, text: string) => {
  const audio = new Audio(getBundledAudioUrl(wordId));
  audio.volume = getCachedSettings().speechVolume;
  webAudio = audio;

  void audio.play().catch(() => {
    if (webAudio === audio) webAudio = null;
    speakWithDevice(text);
  });
};

export const stopSpeaking = () => {
  stopWebAudio();
  Speech.stop();
};

// Hanzi metnini mevcut ayarlanmış seviyede okur. Üst üste dokunuşlarda
// kuyruğu temizlemek için önce durdurur.
//
// `wordId` verilirse web'de o kelimenin ses dosyası çalınır (kütüphane kelimesi).
// Verilmezse ya da kelime kütüphanede değilse cihaz/tarayıcı motoru kullanılır.
export const speakHanzi = (text: string | null | undefined, wordId?: WordId) => {
  if (!text) return;

  stopSpeaking();

  if (Platform.OS === 'web' && hasBundledAudio(wordId)) {
    playBundledAudio(wordId, text);
    return;
  }

  speakWithDevice(text);
};

// Motor ısınması: ilk okumadaki gecikmeyi önler. Ses duyulmaz (volume 0),
// bu yüzden kullanıcı ayarından BAĞIMSIZDIR.
export const warmUpSpeech = () => {
  // Web'de ses dosyası doğrudan çalınır; `speechSynthesis`'e hiç dokunulmaz.
  // (0 sesli bir ısınma utterance'ı Chromium'da motoru askıda bırakabiliyor.)
  if (Platform.OS === 'web') return;

  Speech.getAvailableVoicesAsync().catch(() => {});
  Speech.speak(' ', { language: SPEECH_LANGUAGE, volume: 0 });
};
