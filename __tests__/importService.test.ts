import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pickAndParseJSON,
  saveCustomDeck,
  getCustomDecks,
  deleteCustomDeck,
  getDeckIdPrefix,
  isCustomDeckLevel,
} from '../services/importService';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

// jest.mock ile değiştirilen fonksiyon; testte mock API'sine erişmek için jest.Mock'a çeviriyoruz.
// (Faz 22: TS dosyasında JSDoc assert'i çalışmadığı için gerçek bir `as` çevrimi.)
const getDocumentAsyncMock = DocumentPicker.getDocumentAsync as unknown as jest.Mock;

const DECKS_KEY = '@custom_word_decks';

const VALID_WORDS = [
  { id: 1, hanzi: '爱', pinyin: 'ài', meaning: 'to love' },
  { id: 2, hanzi: '', pinyin: 'x', meaning: 'y' }, // geçersiz: hanzi yok
  { id: 3, hanzi: '八', pinyin: 'bā', meaning: 'eight' },
];

const mockPickedFile = (name, content) => {
  getDocumentAsyncMock.mockResolvedValue({
    canceled: false,
    assets: [{ uri: `file:///tmp/${name}`, name }],
  });
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => content,
  });
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pickAndParseJSON', () => {
  test('iptal edilirse canceled döner', async () => {
    getDocumentAsyncMock.mockResolvedValue({ canceled: true });

    await expect(pickAndParseJSON()).resolves.toEqual({ success: false, reason: 'canceled' });
  });

  test('geçersiz kayıtları eler, geçerlileri döndürür', async () => {
    mockPickedFile('kelimeler.json', JSON.stringify(VALID_WORDS));

    const result = await pickAndParseJSON();

    expect(result.success).toBe(true);
    expect(result.validWords).toHaveLength(2);
    expect(result.validWords[0].hanzi).toBe('爱');
  });

  test('bozuk JSON hata döndürür', async () => {
    mockPickedFile('bozuk.json', '{ bu gecerli json degil');

    const result = await pickAndParseJSON();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid JSON/i);
  });

  test('dizi olmayan JSON reddedilir', async () => {
    mockPickedFile('nesne.json', JSON.stringify({ hanzi: '爱' }));

    const result = await pickAndParseJSON();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/array/i);
  });

  test('hiç geçerli kayıt yoksa hata döner', async () => {
    mockPickedFile('bos.json', JSON.stringify([{ hanzi: '' }, { pinyin: 'x' }]));

    const result = await pickAndParseJSON();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No valid word/i);
  });

  test('defaultName dosya uzantısını kırpar', async () => {
    mockPickedFile('kelimeler.json', JSON.stringify(VALID_WORDS));

    const result = await pickAndParseJSON();

    expect(result.defaultName).toBe('kelimeler');
  });

  test('defaultName uzantısız adda olduğu gibi kalır', async () => {
    mockPickedFile('kelimeler', JSON.stringify(VALID_WORDS));

    const result = await pickAndParseJSON();

    expect(result.defaultName).toBe('kelimeler');
  });

  test('defaultName çok noktalı adda yalnızca son uzantıyı kırpar', async () => {
    mockPickedFile('hsk.1.words.json', JSON.stringify(VALID_WORDS));

    const result = await pickAndParseJSON();

    expect(result.defaultName).toBe('hsk.1.words');
  });
});

describe('özel desteler (custom decks)', () => {
  test('deste kaydedilir ve tekrar okunur', async () => {
    const saveResult = await saveCustomDeck('Ders 1', VALID_WORDS.slice(0, 2));

    expect(saveResult).toEqual({ success: true, deckName: 'Ders 1', count: 2 });

    const decks = await getCustomDecks();
    expect(Object.keys(decks)).toEqual(['Ders 1']);
    expect(decks['Ders 1']).toHaveLength(2);
  });

  test('kelime id öneki deste adına göre sanitize edilir', async () => {
    await saveCustomDeck('Ders 1!', [{ hanzi: '爱', pinyin: 'ài', meaning: 'to love' }]);

    const decks = await getCustomDecks();
    expect(decks['Ders 1!'][0].id).toMatch(/^custom_Ders_1__/);
    expect(decks['Ders 1!'][0].level).toBe('custom');
  });

  test('deste silinir, diğerleri korunur ve silinen kelime idleri döner', async () => {
    await saveCustomDeck('A', VALID_WORDS.slice(0, 1));
    await saveCustomDeck('B', VALID_WORDS.slice(0, 1));

    const result = await deleteCustomDeck('A');

    const decks = await getCustomDecks();
    expect(decks.A).toBeUndefined();
    expect(decks.B).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.removedIds).toEqual(['custom_A_1']);
  });

  // Faz 4: silme yalnızca desteyi kaldırmaz; o desteye ait istatistik de temizlenir,
  // aksi halde "sorunlu kelimeler" silinmiş bir kelimeyi göstermeye devam ederdi.
  test('silme, o desteye ait istatistiği de temizler (başkalarınınki kalır)', async () => {
    await saveCustomDeck('A', VALID_WORDS.slice(0, 1));
    await saveCustomDeck('B', VALID_WORDS.slice(0, 1));

    await AsyncStorage.setItem(
      '@hsk_user_stats',
      JSON.stringify({
        wordStats: {
          5: { categories: {} },
          custom_A_1: { categories: {} },
          custom_B_1: { categories: {} },
        },
        dailyStats: {},
        streak: { current: 1, lastDate: null },
      })
    );

    await deleteCustomDeck('A');

    const stats = JSON.parse(await AsyncStorage.getItem('@hsk_user_stats'));
    expect(Object.keys(stats.wordStats).sort()).toEqual(['5', 'custom_B_1']);
  });

  test('bozuk depoda getCustomDecks boş nesne döner', async () => {
    await AsyncStorage.setItem(DECKS_KEY, '{ bozuk');

    await expect(getCustomDecks()).resolves.toEqual({});
  });
});

// Faz 3.6: sessiz üzerine yazma ve kelime id çakışması.
describe('özel deste kaydetme — onay ve id çakışması', () => {
  const WORDS_A = [{ hanzi: '爱', pinyin: 'ài', meaning: 'to love' }];
  const WORDS_B = [{ hanzi: '八', pinyin: 'bā', meaning: 'eight' }];

  test('önek kuralı: alfanümerik olmayan karakterler "_" olur (eski kural korunuyor)', () => {
    expect(getDeckIdPrefix('Ders 1!')).toBe('Ders_1_');
    expect(getDeckIdPrefix('中文')).toBe('__');
  });

  // Faz 4 (boş havuz ekranı): QuizScreen özel deste seviyelerini bu yardımcıyla ayırır.
  test('isCustomDeckLevel: yalnızca custom_ ile başlayan metin seviyeleri özel destedir', () => {
    expect(isCustomDeckLevel('custom_Ders_1')).toBe(true);
    expect(isCustomDeckLevel('custom_')).toBe(true);
    expect(isCustomDeckLevel('review')).toBe(false);
    expect(isCustomDeckLevel('mixed')).toBe(false);
    expect(isCustomDeckLevel('hsk5')).toBe(false);
    expect(isCustomDeckLevel(undefined)).toBe(false);
    expect(isCustomDeckLevel(42)).toBe(false);
  });

  test('aynı adla ikinci kayıt onay olmadan üzerine YAZMAZ', async () => {
    await saveCustomDeck('Ders', WORDS_A);

    const second = await saveCustomDeck('Ders', WORDS_B);

    expect(second).toEqual({ success: false, reason: 'exists', deckName: 'Ders' });

    const decks = await getCustomDecks();
    expect(decks.Ders[0].hanzi).toBe('爱'); // ilk içerik korunur
  });

  test('overwrite: true ile üzerine yazılır; id öneki aynı kaldığı için geçmiş korunur', async () => {
    await saveCustomDeck('Ders', WORDS_A);

    const second = await saveCustomDeck('Ders', WORDS_B, { overwrite: true });

    expect(second).toEqual({ success: true, deckName: 'Ders', count: 1 });

    const decks = await getCustomDecks();
    expect(decks.Ders[0].hanzi).toBe('八');
    expect(decks.Ders[0].id).toBe('custom_Ders_0');
  });

  test('ad boş/yalnızca boşluksa kaydedilmez', async () => {
    await expect(saveCustomDeck('   ', WORDS_A)).resolves.toEqual({
      success: false,
      reason: 'invalid-name',
    });
    await expect(getCustomDecks()).resolves.toEqual({});
  });

  test('farklı ad aynı id önekini üretiyorsa kayıt reddedilir', async () => {
    await saveCustomDeck('Ders 1', WORDS_A);

    const second = await saveCustomDeck('Ders_1', WORDS_B);

    expect(second).toEqual({
      success: false,
      reason: 'id-conflict',
      deckName: 'Ders_1',
      conflictWith: 'Ders 1',
    });
    await expect(getCustomDecks()).resolves.toEqual({ 'Ders 1': [expect.any(Object)] });
  });

  test('aynı önek ama çakışmayan id\'ler birlikte var olabilir', async () => {
    await saveCustomDeck('Ders 1', [{ id: 1, hanzi: '爱', pinyin: 'ài', meaning: 'to love' }]);

    const second = await saveCustomDeck('Ders_1', [
      { id: 99, hanzi: '八', pinyin: 'bā', meaning: 'eight' },
    ]);

    expect(second.success).toBe(true);

    const decks = await getCustomDecks();
    expect(Object.keys(decks).sort()).toEqual(['Ders 1', 'Ders_1']);
    expect(decks['Ders_1'][0].id).toBe('custom_Ders_1_99');
  });

  test('boş/geçersiz id indekse düşer (birden çok kelime aynı id\'yi paylaşmaz)', async () => {
    await saveCustomDeck('Ders', [
      { id: '', hanzi: '爱', pinyin: 'ài', meaning: 'to love' },
      { id: {}, hanzi: '八', pinyin: 'bā', meaning: 'eight' },
    ]);

    const decks = await getCustomDecks();
    expect(decks.Ders[0].id).toBe('custom_Ders_0');
    expect(decks.Ders[1].id).toBe('custom_Ders_1');
  });
});
