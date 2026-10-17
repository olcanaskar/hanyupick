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
  // Faz 9: hsk5'in eksik 638 örneği yazıldı -> hsk5 de TAM (1300/1300).
  // Faz 10: hsk6'nın eksik 1945 örneği yazıldı, 385 kaymış kayıt doğru
  // cümlelerle değiştirildi (170 doğru kayıt korundu) -> hsk6 da TAM (2500/2500).
  test('hsk1-6 örnek kapsamı tamdır (Faz 8 + Faz 9 + Faz 10)', () => {
    for (const level of ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6']) {
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

  // Faz 9: hsk5'in eksik 638 örneği yazıldı. Ayrıca Faz 6 öncesi sıralamadan
  // kalan ve başka kelimeye ait 22 "kaymış" kayıt doğru cümlelerle değiştirildi,
  // 2 bozuk pinyin (按照 -> "ànz照") düzeltildi. Dokunulmayanlar aynen durur.
  test('Faz 9 pinleri: yeni hsk5 örnekleri doğru kelimeye bağlı', () => {
    expect(getExampleByWordId('hsk5', 1201).hanzi).toBe('唉，我真的不知道该怎么办。');
    expect(getExampleByWordId('hsk5', 1803).hanzi).toContain('制定');
    expect(getExampleByWordId('hsk5', 2227).hanzi).toContain('权利');
    expect(getExampleByWordId('hsk5', 2491).hanzi).toContain('总统');
    expect(getExampleByWordId('hsk5', 1256).pinyin).toContain('ànzhào');
    expect(getExampleByWordId('hsk5', 1748).pinyin).toContain('yízhì');
  });

  // Faz 10: hsk6'nın eksik 1945 örneği yazıldı, 385 kaymış kayıt doğru
  // cümlelerle değiştirildi (555 mevcut kaydın 170'i zaten doğruydu ve korundu).
  test('Faz 10 pinleri: yeni hsk6 örnekleri doğru kelimeye bağlı', () => {
    expect(getExampleByWordId('hsk6', 3585).hanzi).toBe('他说话的口气很客气。');
    expect(getExampleByWordId('hsk6', 3615).hanzi).toContain('啦');
    expect(getExampleByWordId('hsk6', 3705).hanzi).toContain('络绎不绝');
    expect(getExampleByWordId('hsk6', 3714).hanzi).toContain('嘛');
    // Faz 2/3'ten kalma eğri tırnaklı kayıt Faz 10'da yeniden yazıldı.
    expect(getExampleByWordId('hsk6', 3999).hanzi).toContain('全力以赴');
    expect(getExampleByWordId('hsk6', 5000).hanzi).toContain('作息');
  });

  // hsk5 tamamlandıktan sonra kapsam kontrolü yetmez: kaymış bir kayıt da
  // "dolu" görünür. Bu yüzden her hsk5 örneğinin cümlesi kendi kelimesini
  // birebir içermelidir (Faz 9'da 1300/1300 sağlandı). Faz 10'da hsk6 da
  // tamamlandı, aynı kural orada da geçerlidir (2500/2500). hsk1-4'te eski
  // (Faz 7 öncesi) birkaç kayıt bu kuralı tutmaz; kapsamları tamdır ama
  // cümle-kelime eşleşmesi yalnız hsk5-6 için garanti edilir.
  test('hsk5 + hsk6: her örneğin cümlesi kendi kelimesini içerir (Faz 9 + Faz 10)', () => {
    const broken = [];
    for (const level of ['hsk5', 'hsk6']) {
      for (const word of LEVEL_POOLS[level]) {
        const example = EXAMPLES_BY_LEVEL[level][word.id];
        if (!example || !example.hanzi.includes(word.hanzi)) broken.push(word.id);
      }
    }

    expect(broken).toEqual([]);
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
