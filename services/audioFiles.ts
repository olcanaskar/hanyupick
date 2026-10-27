// services/audioFiles.ts
//
// Web'de okunan sesin TEK kaynağı: 5.000 kelimenin sesi `tools/generate-audio.py`
// ile BİR KEZ üretilir ve `public/audio/hsk/<id>.mp3` olarak sunulur.
//
// Neden: web'de `expo-speech` tarayıcının `speechSynthesis`'ini kullanır ve o da
// işletim sisteminin KURULU seslerine bağlıdır. Çince ses paketi olmayan bir
// makinede Hanzi sessiz kalıyor (ölçüldü: "你好" 0 ms'lik utterance, "merhaba"
// 1,7 s). Bu yüzden ses, dosyayla birlikte gelir. Native'de bu dosyalar hiç
// kullanılmaz: orada cihazın kendi TTS'i var (bkz. services/speechService.ts).
//
// Dosya adı kelime id'sidir; id'ler kimliktir, yani bir kelime taşınırsa
// (services/wordIdMigrations.ts) o id'nin sesi de o kelimeyi okur.

import { getWordById } from './wordRepository';
import type { WordId } from './wordRepository';

// Yol GÖRECELİDİR: böylece web export'u hem kökte hem de bir alt yol altında
// çalışır (mutlak `/audio/...` alt yol dağıtımında kırılırdı). `public/` klasörü
// `expo export --platform web` sırasında `dist/` köküne kopyalanır.
export const HSK_AUDIO_PATH = 'audio/hsk';

// Önceden üretilmiş sesi olan id mi? HSK kelimeleri sayı id taşır; özel deste
// kelimeleri (`custom_...`) kütüphanede olmadığı için sesleri de yoktur.
export const hasBundledAudio = (wordId: WordId | null | undefined): wordId is number =>
  typeof wordId === 'number' && getWordById(wordId) !== null;

// Tek kelimenin ses dosyası yolu.
export const getBundledAudioUrl = (wordId: number): string => `${HSK_AUDIO_PATH}/${wordId}.mp3`;
