import {
  ALL_WORDS,
  LEVELS,
  LEVEL_LABELS,
  LEVEL_POOLS,
  getLevelFromWordId,
  getWordPool,
} from '../services/wordRepository';
import { MERGED_WORD_ID_MAP } from '../services/wordIdMigrations';

// Test, veriyi doğrudan okur (kodun kendi eşlemesine güvenmez). Böylece
// wordRepository ile gerçek veri arasındaki ayrışma yakalanır.
import hsk1Data from '../data/hsk1.json';
import hsk2Data from '../data/hsk2.json';
import hsk3Data from '../data/hsk3.json';
import hsk4Data from '../data/hsk4.json';
import hsk5Data from '../data/hsk5.json';
import hsk6Data from '../data/hsk6.json';

const RAW_POOLS = {
  hsk1: hsk1Data,
  hsk2: hsk2Data,
  hsk3: hsk3Data,
  hsk4: hsk4Data,
  hsk5: hsk5Data,
  hsk6: hsk6Data,
};

describe('wordRepository - seviye tanımları', () => {
  test('LEVELS beklendiği gibi ve sıralı', () => {
    expect(LEVELS).toEqual(['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6']);
  });

  test('her seviyenin etiketi ve dolu havuzu var', () => {
    LEVELS.forEach((level) => {
      expect(typeof LEVEL_LABELS[level]).toBe('string');
      expect(LEVEL_LABELS[level].length).toBeGreaterThan(0);
      expect(Array.isArray(LEVEL_POOLS[level])).toBe(true);
      expect(LEVEL_POOLS[level].length).toBeGreaterThan(0);
    });
  });

  test('LEVEL_POOLS ham JSON ile aynı havuzu gösterir', () => {
    LEVELS.forEach((level) => {
      expect(LEVEL_POOLS[level]).toBe(RAW_POOLS[level]);
    });
  });

  test('ALL_WORDS tüm havuzların birleşimidir', () => {
    const expectedLength = LEVELS.reduce((sum, l) => sum + RAW_POOLS[l].length, 0);
    expect(ALL_WORDS.length).toBe(expectedLength);
    // Faz 4 veri temizliği: hsk5'teki 17 ikiz kayıt silindi (2500 → 2483).
    // HSK 6 eklendi: 2483 + 2500 = 4983.
    expect(ALL_WORDS.length).toBe(4983);
  });

  // Faz 4: veri sağlığı — aynı hanzi bir seviyenin içinde iki kez geçmez. (Seviyeler
  // ARASI tekrar bilinçli olarak vardır: HSK listeleri kelimeleri farklı anlamlarla
  // tekrar edebilir, örn. 过.) Bu test, ileride aynı ikiz kayıtların geri gelmesini
  // engeller.
  test('hiçbir seviyede aynı hanzi iki kez geçmez', () => {
    LEVELS.forEach((level) => {
      const counts = new Map();
      RAW_POOLS[level].forEach((w) => counts.set(w.hanzi, (counts.get(w.hanzi) || 0) + 1));
      const duplicated = [...counts.entries()].filter(([, n]) => n > 1);

      expect(duplicated.map(([hanzi, n]) => `${hanzi}x${n}`)).toEqual([]);
    });
  });

  test('her kayıtta hanzi, pinyin ve meaning alanları boş değil', () => {
    const incomplete = ALL_WORDS.filter(
      (w) => !w.hanzi || !w.pinyin || !w.meaning
    );

    expect(incomplete.map((w) => w.id)).toEqual([]);
  });
});

describe('getLevelFromWordId', () => {
  test('aralık sınırları doğru seviyeye düşer', () => {
    expect(getLevelFromWordId(1)).toBe('hsk1');
    expect(getLevelFromWordId(150)).toBe('hsk1');
    expect(getLevelFromWordId(151)).toBe('hsk2');
    expect(getLevelFromWordId(300)).toBe('hsk2');
    expect(getLevelFromWordId(301)).toBe('hsk3');
    expect(getLevelFromWordId(600)).toBe('hsk3');
    expect(getLevelFromWordId(601)).toBe('hsk4');
    expect(getLevelFromWordId(1200)).toBe('hsk4');
    expect(getLevelFromWordId(1201)).toBe('hsk5');
    expect(getLevelFromWordId(2500)).toBe('hsk5');
    expect(getLevelFromWordId(2501)).toBe('hsk6');
    expect(getLevelFromWordId(5000)).toBe('hsk6');
  });

  test('sayı olmayan / NaN id için null döner', () => {
    expect(getLevelFromWordId(null)).toBeNull();
    expect(getLevelFromWordId(undefined)).toBeNull();
    expect(getLevelFromWordId('120')).toBeNull();
    expect(getLevelFromWordId(NaN)).toBeNull();
  });

  // Bu test, kod ile verinin ayrışmasını yakalar: her kelimenin id'si kendi
  // dosyasının seviyesine çözülmelidir. Aralıklar değişirse burada kırılır.
  test('gerçek verideki her kelime kendi seviyesine çözülür', () => {
    LEVELS.forEach((level) => {
      const wronglyPlaced = RAW_POOLS[level].filter(
        (word) => getLevelFromWordId(word.id) !== level
      );
      expect(wronglyPlaced.map((w) => w.id)).toEqual([]);
    });
  });

  test("id'ler 1..5000 aralığında, benzersiz ve yalnızca birleştirilen 17 id eksik", () => {
    const ids = ALL_WORDS.map((w) => w.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(ids.length).toBe(4983);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(5000);

    // Veri temizliğinde silinen id'ler TAM OLARAK göç tablosundakilerdir.
    const missing = [];
    for (let id = 1; id <= 5000; id++) {
      if (!unique.has(id)) missing.push(id);
    }
    expect(missing.sort((a, b) => a - b)).toEqual(
      Object.keys(MERGED_WORD_ID_MAP).map(Number).sort((a, b) => a - b)
    );

    // Göç hedefleri gerçekten veride olmalı; yoksa taşınan kayıt çözülemezdi.
    for (const targetId of Object.values(MERGED_WORD_ID_MAP)) {
      expect(unique.has(targetId)).toBe(true);
      expect(getLevelFromWordId(targetId)).toBe('hsk5');
    }
    // Silinen id'ler artık hiçbir yerde olmamalı.
    for (const removedId of Object.keys(MERGED_WORD_ID_MAP).map(Number)) {
      expect(unique.has(removedId)).toBe(false);
    }
  });
});

describe('getWordPool', () => {
  test('bilinen seviye için kendi havuzunu döner', () => {
    LEVELS.forEach((level) => {
      expect(getWordPool(level)).toBe(LEVEL_POOLS[level]);
    });
  });

  test('"mixed" ve bilinmeyen seviye için tüm havuzu döner', () => {
    expect(getWordPool('mixed')).toBe(ALL_WORDS);
    expect(getWordPool('custom_olmayan_deste')).toBe(ALL_WORDS);
    expect(getWordPool(undefined)).toBe(ALL_WORDS);
  });
});
