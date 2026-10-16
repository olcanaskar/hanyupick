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

  // Faz 8: Faz 7'de resmî listeye geçince örneksiz kalan kelimelerin cümleleri
  // yazıldı (hsk1 5, hsk3 8, hsk4 78) -> hsk1-4 artık TAM (1200/1200).
  // hsk5/hsk6 hâlâ kısmi; orada eksik örnek kabul edilir (sıradaki iş).
  test('hsk1-4 örnek kapsamı tamdır (Faz 8)', () => {
    for (const level of ['hsk1', 'hsk2', 'hsk3', 'hsk4']) {
      const poolIds = new Set(LEVEL_POOLS[level].map((word) => word.id));
      const covered = Object.keys(EXAMPLES_BY_LEVEL[level]).filter((id) => poolIds.has(Number(id)));

      expect({ level, missing: poolIds.size - covered.length }).toEqual({ level, missing: 0 });
    }
  });

  test('Faz 8 pinleri: yeni yazılan örnekler doğru kelimeye bağlı', () => {
    expect(getExampleByWordId('hsk1', 150).hanzi).toContain('坐');
    expect(getExampleByWordId('hsk3', 583).hanzi).toContain('只');
    expect(getExampleByWordId('hsk4', 680).hanzi).toContain('倒');
    expect(getExampleByWordId('hsk4', 1184).hanzi).toContain('转');
    // Faz 7 öncesinden gelen örnekler aynen korunur.
    expect(getExampleByWordId('hsk4', 601).hanzi).toBe('他们的爱情故事很美。');
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
