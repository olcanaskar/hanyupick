import { getExampleByWordId } from '../services/exampleService';

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
});
