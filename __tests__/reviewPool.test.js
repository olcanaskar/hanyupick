import {
  DEFAULT_MODE,
  addEntry,
  countForMode,
  filterByMode,
  getWrongMode,
  isCustomWordId,
  makeReviewEntry,
  normalizeReviewPool,
  removeEntry,
  resolveReviewWord,
  toCanonicalEntry,
} from '../services/reviewPool';
import { ALL_WORDS, LEVEL_POOLS, getWordById } from '../services/wordRepository';

const SAMPLE = LEVEL_POOLS.hsk1[0]; // hsk1 kelimesi (level alanı var)
const SAMPLE5 = LEVEL_POOLS.hsk5[0]; // hsk5 kelimesi (level alanı yok)

// Faz 3.2 ÖNCESİ iki kayıt şekli:
const legacyWithCopy = (word, wrongMode) => ({ ...word, word, wrongMode });
const legacyFlat = (word, wrongMode) => ({ ...word, wrongMode });

const CUSTOM_WORD = {
  id: 'custom_Ders_0',
  hanzi: '你',
  pinyin: 'nǐ',
  meaning: 'you',
  level: 'custom',
};

describe('reviewPool - şekil dönüşümü (toCanonicalEntry)', () => {
  test('kelime kopyalı eski kayıt kanonikleşir ve snapshot taşımaz', () => {
    const entry = toCanonicalEntry(legacyWithCopy(SAMPLE, 'hanzi-to-pinyin'));

    expect(entry).toEqual({ wordId: SAMPLE.id, wrongMode: 'hanzi-to-pinyin' });
    expect(entry).not.toHaveProperty('snapshot');
    expect(entry).not.toHaveProperty('word');
    expect(entry).not.toHaveProperty('hanzi');
  });

  test('kopyasız eski kayıt da aynı kanonik kayda iner', () => {
    expect(toCanonicalEntry(legacyFlat(SAMPLE, 'pinyin-to-hanzi'))).toEqual({
      wordId: SAMPLE.id,
      wrongMode: 'pinyin-to-hanzi',
    });
  });

  test('yeni şekil idempotenttir (üstünde çalışmak zarar vermez)', () => {
    const canonical = { wordId: SAMPLE.id, wrongMode: 'meaning-to-hanzi' };
    expect(toCanonicalEntry(canonical)).toEqual(canonical);
    expect(toCanonicalEntry(toCanonicalEntry(canonical))).toEqual(canonical);
  });

  test('özel deste kaydı anlık görüntü kazanır, metni korunur', () => {
    expect(toCanonicalEntry(legacyFlat(CUSTOM_WORD, 'hanzi-to-pinyin'))).toEqual({
      wordId: 'custom_Ders_0',
      wrongMode: 'hanzi-to-pinyin',
      snapshot: { hanzi: '你', pinyin: 'nǐ', meaning: 'you' },
    });
  });

  test('özel deste kaydında kelime kopyası varsa görüntü ondan alınır', () => {
    const raw = { ...CUSTOM_WORD, word: { ...CUSTOM_WORD, hanzi: '我' } };
    const entry = toCanonicalEntry(raw);

    expect(entry.wordId).toBe('custom_Ders_0');
    expect(entry.snapshot.hanzi).toBe('我'); // `word` alt-nesnesi önceliklidir
  });

  test('sayısal id li kayıtta yabancı snapshot atılır (tek şekil kuralı)', () => {
    const entry = toCanonicalEntry({
      wordId: SAMPLE.id,
      wrongMode: 'hanzi-to-pinyin',
      snapshot: { hanzi: 'x', pinyin: 'y', meaning: 'z' },
    });

    expect(entry).toEqual({ wordId: SAMPLE.id, wrongMode: 'hanzi-to-pinyin' });
  });

  test('bozuk / tanınmayan kayıtlar null döner', () => {
    expect(toCanonicalEntry(null)).toBeNull();
    expect(toCanonicalEntry(undefined)).toBeNull();
    expect(toCanonicalEntry('kelime')).toBeNull();
    expect(toCanonicalEntry(42)).toBeNull();
    expect(toCanonicalEntry({})).toBeNull();
    expect(toCanonicalEntry({ wrongMode: 'hanzi-to-pinyin' })).toBeNull();
    expect(toCanonicalEntry({ id: NaN })).toBeNull();
    expect(toCanonicalEntry({ id: 'bilinmeyen_1' })).toBeNull(); // ne sayı ne custom_
    expect(toCanonicalEntry({ hanzi: '你', pinyin: 'nǐ', meaning: 'you' })).toBeNull();
  });

  test('özel deste kaydında metin eksikse kayıt kullanılamaz sayılır', () => {
    expect(toCanonicalEntry({ id: 'custom_Ders_0', hanzi: '你' })).toBeNull();
    expect(
      toCanonicalEntry({ wordId: 'custom_Ders_0', snapshot: { hanzi: '你' } })
    ).toBeNull();
  });

  test('mod yoksa varsayılana düşer', () => {
    expect(getWrongMode(toCanonicalEntry({ wordId: SAMPLE.id }))).toBe(DEFAULT_MODE);
    expect(getWrongMode({})).toBe(DEFAULT_MODE);
    expect(getWrongMode(undefined)).toBe(DEFAULT_MODE);
  });
});

describe('reviewPool - çözümleme (resolveReviewWord)', () => {
  test('sayısal id kanonik kelimeyi verir (kopya değil, aynı nesne)', () => {
    const resolved = resolveReviewWord({ wordId: SAMPLE.id, wrongMode: DEFAULT_MODE });

    expect(resolved).toBe(getWordById(SAMPLE.id));
    expect(resolved.hanzi).toBe(SAMPLE.hanzi);
    expect(resolved.id).toBe(SAMPLE.id);
  });

  test('level alanı olmayan (hsk5) kelime de çözülür', () => {
    const resolved = resolveReviewWord({ wordId: SAMPLE5.id, wrongMode: DEFAULT_MODE });
    expect(resolved).toBe(SAMPLE5);
  });

  test('bilinmeyen sayısal id çözülemez', () => {
    expect(resolveReviewWord({ wordId: 999999, wrongMode: DEFAULT_MODE })).toBeNull();
  });

  test('özel deste kaydı DESTE OLMADAN da çözülür (silinmiş deste senaryosu)', () => {
    const entry = toCanonicalEntry(legacyFlat(CUSTOM_WORD, 'hanzi-to-pinyin'));
    const resolved = resolveReviewWord(entry);

    expect(resolved).toEqual({
      id: 'custom_Ders_0',
      hanzi: '你',
      pinyin: 'nǐ',
      meaning: 'you',
    });
  });

  test('anlık görüntüsüz özel kayıt çözülemez', () => {
    expect(resolveReviewWord({ wordId: 'custom_Ders_0', wrongMode: DEFAULT_MODE })).toBeNull();
    expect(resolveReviewWord(null)).toBeNull();
  });

  test('isCustomWordId yalnızca custom_ önekini tanır', () => {
    expect(isCustomWordId('custom_Ders_0')).toBe(true);
    expect(isCustomWordId('Ders_0')).toBe(false);
    expect(isCustomWordId(1201)).toBe(false);
    expect(isCustomWordId(undefined)).toBe(false);
  });
});

describe('reviewPool - göç (normalizeReviewPool)', () => {
  const legacyPool = [
    legacyWithCopy(SAMPLE, 'hanzi-to-pinyin'),
    legacyFlat(SAMPLE5, 'pinyin-to-meaning'),
    legacyFlat(CUSTOM_WORD, 'hanzi-to-meaning'),
  ];

  test('karma havuz kanonikleşir ve SIRA korunur', () => {
    const migrated = normalizeReviewPool(legacyPool);

    expect(migrated).toEqual([
      { wordId: SAMPLE.id, wrongMode: 'hanzi-to-pinyin' },
      { wordId: SAMPLE5.id, wrongMode: 'pinyin-to-meaning' },
      {
        wordId: 'custom_Ders_0',
        wrongMode: 'hanzi-to-meaning',
        snapshot: { hanzi: '你', pinyin: 'nǐ', meaning: 'you' },
      },
    ]);
  });

  test('göç, veri değişmediyse görünür içeriği DEĞİŞTİRMEZ', () => {
    const migrated = normalizeReviewPool(legacyPool);

    migrated.forEach((entry, index) => {
      const before = legacyPool[index];
      const after = resolveReviewWord(entry);

      expect(after.hanzi).toBe(before.hanzi);
      expect(after.pinyin).toBe(before.pinyin);
      expect(after.meaning).toBe(before.meaning);
    });
  });

  test('bayat kopya yerine KANONİK metin gösterilir (bayatlama düzeltmesi)', () => {
    const stale = legacyWithCopy({ ...SAMPLE, meaning: 'ESKİ ANLAM' }, 'hanzi-to-pinyin');
    const migrated = normalizeReviewPool([stale]);

    expect(migrated).toHaveLength(1);
    expect(resolveReviewWord(migrated[0]).meaning).toBe(SAMPLE.meaning);
    expect(resolveReviewWord(migrated[0]).meaning).not.toBe('ESKİ ANLAM');
  });

  test('aynı (wordId, mod) çifti tekilleşir; ilk kayıt korunur', () => {
    const duplicated = [
      legacyWithCopy(SAMPLE, 'hanzi-to-pinyin'),
      legacyFlat({ ...SAMPLE, meaning: 'İKİNCİ' }, 'hanzi-to-pinyin'),
      legacyFlat(SAMPLE, 'pinyin-to-hanzi'), // farklı mod → ayrı kayıt
    ];
    const migrated = normalizeReviewPool(duplicated);

    expect(migrated).toHaveLength(2);
    expect(migrated[0].wordId).toBe(SAMPLE.id);
    expect(migrated[0].wrongMode).toBe('hanzi-to-pinyin');
    expect(migrated[1].wrongMode).toBe('pinyin-to-hanzi');
  });

  test('çözülemeyen kayıtlar havuza alınmaz', () => {
    const migrated = normalizeReviewPool([
      { wordId: 999999, wrongMode: 'hanzi-to-pinyin' }, // kanonik değil
      { wordId: 'custom_X_0', wrongMode: 'hanzi-to-pinyin' }, // snapshot yok
      null,
      'çöp',
      legacyFlat(SAMPLE, 'hanzi-to-pinyin'),
    ]);

    expect(migrated).toEqual([{ wordId: SAMPLE.id, wrongMode: 'hanzi-to-pinyin' }]);
  });

  test('dizi olmayan girdi boş havuz döner', () => {
    expect(normalizeReviewPool(null)).toEqual([]);
    expect(normalizeReviewPool(undefined)).toEqual([]);
    expect(normalizeReviewPool({})).toEqual([]);
    expect(normalizeReviewPool('[]')).toEqual([]);
  });

  test('göç idempotenttir: tekrar normalize/imzalamak sonucu değiştirmez', () => {
    const migrated = normalizeReviewPool(legacyPool);
    const again = normalizeReviewPool(JSON.parse(JSON.stringify(migrated)));

    expect(again).toEqual(migrated);
    // App.js disk yazımını tam olarak bu eşitliğe bakarak atlıyor (tek seferlik göç).
    expect(JSON.stringify(again)).toBe(JSON.stringify(migrated));
  });

  test('tüm 2.500 satır kopyalı veri kanonikleşir, hepsi çözülür ve snapshot taşımaz', () => {
    const legacy = ALL_WORDS.map((word) => legacyWithCopy(word, 'hanzi-to-pinyin'));
    const migrated = normalizeReviewPool(legacy);

    expect(migrated).toHaveLength(ALL_WORDS.length);
    expect(migrated.filter((entry) => entry.snapshot !== undefined)).toEqual([]);
    expect(migrated.every((entry) => resolveReviewWord(entry))).toBe(true);
  });

  test('göç ham veriyi küçültür (kelime kopyası düşer)', () => {
    const legacy = ALL_WORDS.slice(0, 200).map((word) => legacyWithCopy(word, 'hanzi-to-pinyin'));
    const migrated = normalizeReviewPool(legacy);

    const before = JSON.stringify(legacy).length;
    const after = JSON.stringify(migrated).length;

    expect(migrated).toHaveLength(200);
    expect(after).toBeLessThan(before * 0.5); // ölçüm: ~%75 küçülme
  });
});

describe('reviewPool - havuz yardımcıları', () => {
  const pool = [
    { wordId: 1, wrongMode: 'hanzi-to-pinyin' },
    { wordId: 2, wrongMode: 'hanzi-to-pinyin' },
    { wordId: 3, wrongMode: 'pinyin-to-hanzi' },
    { wordId: 4 }, // mod yok → varsayılan
  ];

  test('filterByMode ve countForMode moda göre çalışır (modsuz = varsayılan)', () => {
    expect(countForMode(pool, 'hanzi-to-pinyin')).toBe(3);
    expect(countForMode(pool, 'pinyin-to-hanzi')).toBe(1);
    expect(countForMode(pool, 'yok')).toBe(0);
    expect(filterByMode(pool, 'pinyin-to-hanzi')).toHaveLength(1);
    expect(filterByMode(null, 'hanzi-to-pinyin')).toEqual([]);
  });

  test('addEntry kaydı ekler; kopya eklemez ve gereksiz referans üretmez', () => {
    const added = addEntry(pool, { wordId: 5, wrongMode: 'hanzi-to-pinyin' });
    expect(added).toHaveLength(5);
    expect(added[4]).toEqual({ wordId: 5, wrongMode: 'hanzi-to-pinyin' });

    // Zaten var olan (kelime + mod) çifti için AYNI dizi döner.
    const same = addEntry(pool, { wordId: 1, wrongMode: 'hanzi-to-pinyin' });
    expect(same).toBe(pool);

    // Aynı kelime farklı modda ayrı kayıttır.
    const otherMode = addEntry(pool, { wordId: 1, wrongMode: 'meaning-to-hanzi' });
    expect(otherMode).toHaveLength(5);

    // Geçersiz kayıt havuzu değiştirmez.
    expect(addEntry(pool, null)).toBe(pool);
  });

  test('removeEntry kaydı siler; eşleşme yoksa AYNI diziyi döner', () => {
    const removed = removeEntry(pool, 2, 'hanzi-to-pinyin');
    expect(removed).toHaveLength(3);
    expect(removed.some((entry) => entry.wordId === 2)).toBe(false);

    // Mod eşleşmezse silinmez (aynı kelimenin diğer modu korunur).
    expect(removeEntry(pool, 1, 'pinyin-to-hanzi')).toBe(pool);
    expect(removeEntry(pool, 999, 'hanzi-to-pinyin')).toBe(pool);
  });

  test('makeReviewEntry HSK için snapshot üretmez, özel deste için üretir', () => {
    expect(makeReviewEntry(SAMPLE, 'hanzi-to-pinyin')).toEqual({
      wordId: SAMPLE.id,
      wrongMode: 'hanzi-to-pinyin',
    });

    expect(makeReviewEntry(CUSTOM_WORD, 'hanzi-to-pinyin')).toEqual({
      wordId: 'custom_Ders_0',
      wrongMode: 'hanzi-to-pinyin',
      snapshot: { hanzi: '你', pinyin: 'nǐ', meaning: 'you' },
    });

    expect(makeReviewEntry(null)).toBeNull();
    expect(makeReviewEntry({ id: 'bilinmeyen_1' })).toBeNull();
  });
});
