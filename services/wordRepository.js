// HSK kelime verisinin TEK kaynağı (Faz 3.1).
//
// Neden ayrı dosya: `data/hsk1..5.json` import'ları, `ALL_WORDS` birleştirmesi ve
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

// Seviye kimlikleri (sıra korunur; arayüz listeleri bu sıraya göre kurulur).
export const LEVELS = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5'];

// Seviyelerin görünen adları.
export const LEVEL_LABELS = {
  hsk1: 'HSK 1',
  hsk2: 'HSK 2',
  hsk3: 'HSK 3',
  hsk4: 'HSK 4',
  hsk5: 'HSK 5',
};

// Seviye → kelime havuzu.
export const LEVEL_POOLS = {
  hsk1: hsk1Data,
  hsk2: hsk2Data,
  hsk3: hsk3Data,
  hsk4: hsk4Data,
  hsk5: hsk5Data,
};

// Tüm seviyelerin birleşik havuzu ("mixed" modu ve çeldirici tamamlama için).
export const ALL_WORDS = LEVELS.reduce(
  (acc, level) => acc.concat(LEVEL_POOLS[level] || []),
  []
);

// `id` aralıkları kesintisiz ve benzersizdir. `hsk5` kayıtlarında `level` alanı
// olmadığı için seviye tespiti ZORUNLU olarak bu aralıklardan yapılır.
// TEK KAYNAK: değiştirilirse `__tests__/wordRepository.test.js` içindeki
// doğrulamalar da bilinçli olarak güncellenmeli.
const ID_RANGES = [
  { max: 150, level: 'hsk1' },
  { max: 300, level: 'hsk2' },
  { max: 600, level: 'hsk3' },
  { max: 1200, level: 'hsk4' },
  { max: Infinity, level: 'hsk5' },
];

// Bir kelimenin id'sinden seviyesini çıkarır. Sayı olmayan / NaN id için null.
export const getLevelFromWordId = (id) => {
  if (typeof id !== 'number' || Number.isNaN(id)) return null;
  const range = ID_RANGES.find((r) => id <= r.max);
  return range ? range.level : null;
};

// Seviyeye ait kelime havuzu. Bilinmeyen seviye veya "mixed" için tüm havuz döner
// (mezun olmuş davranış: `LEVEL_POOLS[level] || ALL_WORDS`).
export const getWordPool = (level) => LEVEL_POOLS[level] || ALL_WORDS;
