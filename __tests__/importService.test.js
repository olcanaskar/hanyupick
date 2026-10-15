import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pickAndParseJSON,
  saveCustomDeck,
  getCustomDecks,
  deleteCustomDeck,
} from '../services/importService';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const DECKS_KEY = '@custom_word_decks';

const VALID_WORDS = [
  { id: 1, hanzi: '爱', pinyin: 'ài', meaning: 'to love' },
  { id: 2, hanzi: '', pinyin: 'x', meaning: 'y' }, // geçersiz: hanzi yok
  { id: 3, hanzi: '八', pinyin: 'bā', meaning: 'eight' },
];

const mockPickedFile = (name, content) => {
  DocumentPicker.getDocumentAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: `file:///tmp/${name}`, name }],
  });
  global.fetch = jest.fn().mockResolvedValue({
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
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true });

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

  test('deste silinir, diğerleri korunur', async () => {
    await saveCustomDeck('A', VALID_WORDS.slice(0, 1));
    await saveCustomDeck('B', VALID_WORDS.slice(0, 1));

    await deleteCustomDeck('A');

    const decks = await getCustomDecks();
    expect(decks.A).toBeUndefined();
    expect(decks.B).toBeDefined();
  });

  test('bozuk depoda getCustomDecks boş nesne döner', async () => {
    await AsyncStorage.setItem(DECKS_KEY, '{ bozuk');

    await expect(getCustomDecks()).resolves.toEqual({});
  });
});
