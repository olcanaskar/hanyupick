import { getExampleByWordId } from '../services/exampleService';
import { LEVEL_POOLS } from '../services/wordRepository';
import hsk1Examples from '../data/examples/hsk1_examples';
import hsk2Examples from '../data/examples/hsk2_examples';
import hsk3Examples from '../data/examples/hsk3_examples';
import hsk4Examples from '../data/examples/hsk4_examples';
import hsk5Examples from '../data/examples/hsk5_examples';
import hsk6Examples from '../data/examples/hsk6_examples';

const EXAMPLES_BY_LEVEL = {
  hsk1: hsk1Examples,
  hsk2: hsk2Examples,
  hsk3: hsk3Examples,
  hsk4: hsk4Examples,
  hsk5: hsk5Examples,
  hsk6: hsk6Examples,
};

describe('getExampleByWordId', () => {
  test('hsk5 kelimesi için örnek döner (Faz 1 düzeltmesi)', () => {
    const example = getExampleByWordId('hsk5', 1201);

    expect(example).toBeTruthy();
    expect(typeof example.hanzi).toBe('string');
    expect(example.hanzi.length).toBeGreaterThan(0);
  });

  test('hsk5 kelimesi için pinyin ve anlam da bulunur', () => {
    const example = getExampleByWordId('hsk5', 1201);

    expect(example).toHaveProperty('pinyin');
    expect(example).toHaveProperty('meaning');
  });

  test('mixed: id 1500 hsk5 aralığına düşer', () => {
    expect(getExampleByWordId('mixed', 1500)).toBeTruthy();
  });

  test('mixed: id 50 hsk1 aralığına düşer', () => {
    expect(getExampleByWordId('mixed', 50)).toBeTruthy();
  });

  test('review: id 50 hsk1 aralığına düşer', () => {
    expect(getExampleByWordId('review', 50)).toBeTruthy();
  });

  test('bilinmeyen seviye için null döner', () => {
    expect(getExampleByWordId('custom_bilinmeyen', 1)).toBeNull();
  });

  test('wordId verilmezse null döner', () => {
    expect(getExampleByWordId('hsk1', null)).toBeNull();
    expect(getExampleByWordId('hsk1', undefined)).toBeNull();
  });

  test('örneği olmayan id için null döner', () => {
    expect(getExampleByWordId('hsk1', 999999)).toBeNull();
  });

  // Faz 6: hsk5 kuyruğu değişti. Taşınan HSK6 kelimelerinin örnekleri hsk6 dosyasına
  // geçti (hsk6 bu yüzden kısmen doludur), kalanlar hsk5 içinde yeni id'lerinde durur.
  test('hsk6 kelimesi için örnek döner (eski hsk5 kuyruğundan taşındı)', () => {
    const example = getExampleByWordId('hsk6', 2501);

    expect(example).toBeTruthy();
    expect(typeof example.hanzi).toBe('string');
  });

  test('mixed: hsk6 aralığındaki id de örnek bulur', () => {
    expect(getExampleByWordId('mixed', 2501)).toBeTruthy();
  });

  // Faz 7: hsk1-4 resmi 2012 listeleriyle hizalandı. Kelimeler sıra/seviye
  // değiştirdi; örnekler HEDEF id'nin kendi seviyesine taşındı (seviye değiştiren
  // kelimenin cümlesi onunla gelir), üst seviyeye taşınanların örneği düşer.
  test('Faz 7 sonrası taşınan kelimelerin örnekleri hedef idde durur', () => {
    // 零 hsk1#57 -> hsk2#214, 笔记本 hsk4#617 -> hsk3#318, 欢迎 hsk2#300 -> hsk3#400.
    expect(getExampleByWordId('hsk2', 214).hanzi).toContain('零');
    expect(getExampleByWordId('hsk3', 318)).toBeTruthy();
    expect(getExampleByWordId('hsk3', 400)).toBeTruthy();
  });

  test('Faz 7\'de eklenen yeni kelime örneksiz olabilir (boşluk null döner)', () => {
    // 坐 resmi L1'de yeni; örneği yoksa ExampleBox hiçbir şey çizmez.
    const example = getExampleByWordId('hsk1', 150);

    expect(example === null || typeof example.hanzi === 'string').toBe(true);
  });

  // Örnek kayıtları id ile anahtarlanır; kelime başka seviyeye taşınırsa "yetim"
  // kayıt kalır ve yanlış kelimenin cümlesi gösterilirdi. Bu test onu yakalar.
  test('her seviyenin örnekleri kendi havuzundaki bir kelimeye çözülür (yetim kayıt yok)', () => {
    for (const [level, examples] of Object.entries(EXAMPLES_BY_LEVEL)) {
      const ids = new Set(LEVEL_POOLS[level].map((word) => word.id));
      const orphans = Object.keys(examples).filter((key) => !ids.has(Number(key)));

      expect({ level, orphans }).toEqual({ level, orphans: [] });
    }
  });
});
