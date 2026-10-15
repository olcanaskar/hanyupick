import {
  ALL_WORDS,
  LEVELS,
  LEVEL_LABELS,
  LEVEL_POOLS,
  getLevelFromWordId,
  getWordPool,
} from '../services/wordRepository';

// Test, veriyi doğrudan okur (kodun kendi eşlemesine güvenmez). Böylece
// wordRepository ile gerçek veri arasındaki ayrışma yakalanır.
import hsk1Data from '../data/hsk1.json';
import hsk2Data from '../data/hsk2.json';
import hsk3Data from '../data/hsk3.json';
import hsk4Data from '../data/hsk4.json';
import hsk5Data from '../data/hsk5.json';

const RAW_POOLS = {
  hsk1: hsk1Data,
  hsk2: hsk2Data,
  hsk3: hsk3Data,
  hsk4: hsk4Data,
  hsk5: hsk5Data,
};

describe('wordRepository - seviye tanımları', () => {
  test('LEVELS beklendiği gibi ve sıralı', () => {
    expect(LEVELS).toEqual(['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5']);
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
    expect(ALL_WORDS.length).toBe(2500);
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

  test("id'ler 1..2500 aralığında kesintisiz ve benzersiz", () => {
    const ids = ALL_WORDS.map((w) => w.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(ids.length).toBe(2500);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(2500);
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
