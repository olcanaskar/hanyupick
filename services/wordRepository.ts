// HSK kelime verisinin TEK kaynağı (Faz 3.1).
//
// Neden ayrı dosya: `data/hsk1..6.json` import'ları, `ALL_WORDS` birleştirmesi ve
// özellikle `id` → seviye eşlemesi (150/300/600/1200 aralıkları) daha önce QuizScreen,
// VocabularyScreen, StatsModal, FloatingBackground ve exampleService içinde tekrar
// ediyordu. Birini güncelleyip diğerini unutmak sessiz hataya yol açıyordu
// (örn. review modunda yanlış seviyenin örnek cümlesi ya da şıkları gelirdi).
//
// UI'dan bağımsız: React import etmez. Tüm tüketiciler yalnızca buradan okur.

import hsk1Data from '../data/hsk1.json';
import hsk2Data from '../data/hsk2.json';
import hsk3Data from '../data/hsk3.json';
import hsk4Data from '../data/hsk4.json';
import hsk5Data from '../data/hsk5.json';
import hsk6Data from '../data/hsk6.json';

// --- Tipler (Faz 22: TS dönüşümü) ---------------------------------------------
//
// Kelime kimliği: HSK kelimeleri sayı (1..5000), özel deste kelimeleri
// 'custom_...' metni (bkz. services/importService.js). Aynı kimlik anlayışı
// istatistik ve review havuzunda da geçerlidir.
export type WordId = number | string;
export type HskLevel = 'hsk1' | 'hsk2' | 'hsk3' | 'hsk4' | 'hsk5' | 'hsk6';
// `data/hsk*.json` içindeki tek kelime kaydı (tek biçim: id/hanzi/pinyin/meaning).
export type Word = { id: number; hanzi: string; pinyin: string; meaning: string };
// Sorularda/şıklarda kullanılan EN GENEL kelime şekli: HSK kaydı da (`Word`), özel
// deste kelimesi de (`custom_...` id) bu şekle uyar. Metin alanları isteğe bağlı:
// havuz seçimi yalnızca `id`e bakar (bkz. quizBuilder.pickWord).
export type WordLike = {
  id: WordId;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
};

// Seviye kimlikleri (sıra korunur; arayüz listeleri bu sıraya göre kurulur).
export const LEVELS: HskLevel[] = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];

// Seviyelerin görünen adları.
export const LEVEL_LABELS: Record<HskLevel, string> = {
  hsk1: 'HSK 1',
  hsk2: 'HSK 2',
  hsk3: 'HSK 3',
  hsk4: 'HSK 4',
  hsk5: 'HSK 5',
  hsk6: 'HSK 6',
};

// Seviye → kelime havuzu.
export const LEVEL_POOLS: Record<HskLevel, Word[]> = {
  hsk1: hsk1Data,
  hsk2: hsk2Data,
  hsk3: hsk3Data,
  hsk4: hsk4Data,
  hsk5: hsk5Data,
  hsk6: hsk6Data,
};

// Tüm seviyelerin birleşik havuzu ("mixed" modu ve çeldirici tamamlama için).
export const ALL_WORDS: Word[] = LEVELS.reduce<Word[]>(
  (acc, level) => acc.concat(LEVEL_POOLS[level] || []),
  []
);

// `id` aralıkları kesintisiz ve benzersizdir. Kelime kayıtlarında `level` alanı
// yoktur (hsk1-6 tek biçim: id/hanzi/pinyin/meaning), bu yüzden seviye tespiti
// ZORUNLU olarak bu aralıklardan yapılır.
// TEK KAYNAK: değiştirilirse `__tests__/wordRepository.test.js` içindeki
// doğrulamalar da bilinçli olarak güncellenmeli.
const ID_RANGES: { max: number; level: HskLevel }[] = [
  { max: 150, level: 'hsk1' },
  { max: 300, level: 'hsk2' },
  { max: 600, level: 'hsk3' },
  { max: 1200, level: 'hsk4' },
  { max: 2500, level: 'hsk5' },
  { max: Infinity, level: 'hsk6' },
];

// Bir kelimenin id'sinden seviyesini çıkarır. Sayı olmayan / NaN id için null.
export const getLevelFromWordId = (id: unknown): HskLevel | null => {
  if (typeof id !== 'number' || Number.isNaN(id)) return null;
  const range = ID_RANGES.find((r) => id <= r.max);
  return range ? range.level : null;
};

// Seviyeye ait kelime havuzu. Bilinmeyen seviye veya "mixed" için tüm havuz döner
// (mezun olmuş davranış: `LEVEL_POOLS[level] || ALL_WORDS`).
export const getWordPool = (level: string | null | undefined): Word[] =>
  (LEVEL_POOLS as Record<string, Word[]>)[String(level)] || ALL_WORDS;

// `id` → kelime (O(1)). Review havuzu artık kelimeyi kopyalamak yerine yalnızca
// id saklıyor (Faz 3.2 → services/reviewPool.js); çözümleme buradan yapılır.
// Bilinmeyen id için null.
const WORD_BY_ID = new Map<number, Word>(ALL_WORDS.map((word) => [word.id, word]));

export const getWordById = (id: WordId | null | undefined): Word | null =>
  (WORD_BY_ID.get(id as number) as Word | undefined) || null;
