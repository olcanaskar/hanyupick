import { buildOptions, pickWord, shuffle } from '../services/quizBuilder';
import { ALL_WORDS, LEVEL_POOLS } from '../services/wordRepository';
import type { Word, WordId, WordLike } from '../services/wordRepository';

// Havuzlar artık tek kaynaktan (Faz 3.1) — test kopya tutmaz.
const hsk1Data = LEVEL_POOLS.hsk1;
const FIELDS: (keyof WordLike)[] = ['hanzi', 'pinyin', 'meaning'];

// `pickWord` boş havuzda null döner; bu testlerde havuz hep dolu olduğu için
// sonucu daraltan küçük bir yardımcı kullanılır.
const pickOrThrow = <T extends { id: WordId }>(
  pool: readonly T[],
  previousId: WordId | null = null
): T => {
  const word = pickWord(pool, previousId);
  if (!word) throw new Error('pickWord beklenmedik şekilde null döndü');
  return word;
};

// Şıklar arasında hanzi/pinyin/anlam çakışması var mı? Varsa açıklamasını döndürür.
const findConflicts = (options: WordLike[]) => {
  const conflicts: string[] = [];
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      for (const field of FIELDS) {
        const value = options[i][field];
        if (value && value === options[j][field]) {
          conflicts.push(`${field}:"${value}" (id ${options[i].id} / ${options[j].id})`);
        }
      }
    }
  }
  return conflicts;
};

// Bilerek ikiz kayıt içeren küçük havuz (gerçek verideki durumu taklit eder).
const FIXTURE = [
  { id: 1, hanzi: '日', pinyin: 'rì', meaning: 'sun, day' },
  { id: 2, hanzi: '日', pinyin: 'rì', meaning: 'day, sun' }, // ikiz
  { id: 3, hanzi: '月', pinyin: 'yuè', meaning: 'moon' },
  { id: 4, hanzi: '水', pinyin: 'shuǐ', meaning: 'water' },
  { id: 5, hanzi: '火', pinyin: 'huǒ', meaning: 'fire' },
  { id: 6, hanzi: '山', pinyin: 'shān', meaning: 'mountain' },
  { id: 7, hanzi: '木', pinyin: 'mù', meaning: 'tree' },
];

describe('shuffle', () => {
  test('girdiyi değiştirmez', () => {
    const input = [1, 2, 3, 4, 5];
    shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  test('aynı elemanları döndürür', () => {
    const input = [1, 2, 3, 4, 5];
    expect([...shuffle(input)].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('buildOptions — temel davranış', () => {
  test('1 doğru + 3 çeldirici döner', () => {
    const options = buildOptions(FIXTURE[0], [FIXTURE]);
    expect(options).toHaveLength(4);
  });

  test('doğru cevap şıklarda tam bir kez bulunur', () => {
    const options = buildOptions(FIXTURE[0], [FIXTURE]);
    expect(options.filter((w) => w.id === FIXTURE[0].id)).toHaveLength(1);
  });

  test('aynı id çeldirici olarak kullanılmaz', () => {
    const options = buildOptions(FIXTURE[0], [[FIXTURE[0]], FIXTURE]);
    const ids = options.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buildOptions — benzersizlik', () => {
  test('hiçbir şık doğru cevabın ikiziyle yan yana gelmez (fixture)', () => {
    const options = buildOptions(FIXTURE[0], [FIXTURE]);

    expect(findConflicts(options)).toEqual([]);
    // "日" (id 1) sorusunda ikizi (id 2) kesinlikle yer almamalı.
    expect(options.some((w) => w.id === 2)).toBe(false);
  });

  test('çeldiriciler kendi aralarında da çakışmaz', () => {
    const options = buildOptions(FIXTURE[0], [FIXTURE]);
    expect(findConflicts(options)).toEqual([]);
  });

  test('sorulan alan çakışmasını da engeller (eş sesli)', () => {
    // hanzi farklı ama pinyin aynı: 八 / 扒
    const pool = [
      { id: 10, hanzi: '八', pinyin: 'bā', meaning: 'eight' },
      { id: 11, hanzi: '扒', pinyin: 'bā', meaning: 'to dig' },
      { id: 12, hanzi: '九', pinyin: 'jiǔ', meaning: 'nine' },
      { id: 13, hanzi: '七', pinyin: 'qī', meaning: 'seven' },
      { id: 14, hanzi: '六', pinyin: 'liù', meaning: 'six' },
      { id: 15, hanzi: '五', pinyin: 'wǔ', meaning: 'five' },
    ];

    const options = buildOptions(pool[0], [pool]);

    expect(findConflicts(options)).toEqual([]);
    expect(options.some((w) => w.id === 11)).toBe(false); // eş sesli ikiz elendi
  });
});

describe('buildOptions — havuz tercih sırası', () => {
  test('tercih edilen havuz yeterliyse yalnızca ondan seçer', () => {
    const options = buildOptions(hsk1Data[0], [hsk1Data, ALL_WORDS]);
    const distractors = options.filter((w) => w.id !== hsk1Data[0].id);

    expect(distractors).toHaveLength(3);
    for (const d of distractors) {
      expect(d.id).toBeLessThanOrEqual(150); // hsk1 aralığı
    }
  });

  test('tercih edilen havuz yetmezse ikinci havuzdan tamamlar', () => {
    const tiny = [FIXTURE[0]]; // yalnızca doğru cevap
    const options = buildOptions(FIXTURE[0], [tiny, FIXTURE]);

    expect(options).toHaveLength(4);
    expect(findConflicts(options)).toEqual([]);
  });

  test('hiçbir havuz yetmezse eldeki kadar şık döner', () => {
    const two = [FIXTURE[0], FIXTURE[2]];
    const options = buildOptions(FIXTURE[0], [two]);

    expect(options).toHaveLength(2);
    expect(findConflicts(options)).toEqual([]);
  });
});

describe('buildOptions — gerçek veri (2.500 kelime)', () => {
  test('hanzisi tekrar eden tüm kayıtlar için şıklar temiz kalır', () => {
    const counts = new Map();
    ALL_WORDS.forEach((w) => counts.set(w.hanzi, (counts.get(w.hanzi) || 0) + 1));
    const duplicated = ALL_WORDS.filter((w) => counts.get(w.hanzi) > 1);

    expect(duplicated.length).toBeGreaterThan(0); // veri gerçekten ikiz içeriyor

    for (const word of duplicated) {
      for (let t = 0; t < 5; t++) {
        const options = buildOptions(word, [ALL_WORDS]);
        expect(findConflicts(options)).toEqual([]);
      }
    }
  });

  test('pinyini tekrar eden tüm kayıtlar için şıklar temiz kalır', () => {
    const counts = new Map();
    ALL_WORDS.forEach((w) => counts.set(w.pinyin, (counts.get(w.pinyin) || 0) + 1));
    const duplicated = ALL_WORDS.filter((w) => counts.get(w.pinyin) > 1);

    expect(duplicated.length).toBeGreaterThan(0);

    for (const word of duplicated) {
      for (let t = 0; t < 3; t++) {
        const options = buildOptions(word, [ALL_WORDS]);
        expect(findConflicts(options)).toEqual([]);
      }
    }
  });

  test('anlamı tekrar eden tüm kayıtlar için şıklar temiz kalır', () => {
    const counts = new Map();
    ALL_WORDS.forEach((w) => counts.set(w.meaning, (counts.get(w.meaning) || 0) + 1));
    const duplicated = ALL_WORDS.filter((w) => counts.get(w.meaning) > 1);

    expect(duplicated.length).toBeGreaterThan(0);

    for (const word of duplicated) {
      for (let t = 0; t < 3; t++) {
        const options = buildOptions(word, [ALL_WORDS]);
        expect(findConflicts(options)).toEqual([]);
      }
    }
  });

  test.each(Object.entries(LEVEL_POOLS))(
    '%s seviyesinde şıklar hiçbir alanda çakışmaz',
    (name, pool) => {
      for (let t = 0; t < 200; t++) {
        const correct = pool[Math.floor(Math.random() * pool.length)];
        const options = buildOptions(correct, [pool, ALL_WORDS]);

        expect(findConflicts(options)).toEqual([]);
        expect(options.filter((w) => w.id === correct.id)).toHaveLength(1);
        expect(options).toHaveLength(4);
      }
    }
  );
});

// Ardışık sorularda aynı kelimenin tekrar gelmesi: 5 kelimelik bir destede
// `Math.random` ile her soruda ~1/5 olasılıkla aynı kart üst üste geliyordu.
describe('pickWord — ardışık tekrar engeli', () => {
  test('boş havuzda null döner', () => {
    expect(pickWord([])).toBeNull();
    expect(pickWord(null)).toBeNull();
    expect(pickWord(undefined)).toBeNull();
  });

  test('önceki kelime verilmezse normal rastgele seçim yapar', () => {
    const pool = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const seen = new Set<WordId>();

    for (let i = 0; i < 300; i++) seen.add(pickOrThrow(pool).id);

    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  test('havuzda alternatif varsa önceki kelimeyi ASLA seçmez', () => {
    const pool = [{ id: 1 }, { id: 2 }];

    for (let i = 0; i < 100; i++) {
      expect(pickOrThrow(pool, 1).id).toBe(2);
      expect(pickOrThrow(pool, 2).id).toBe(1);
    }
  });

  test('daha büyük havuzda da önceki kelime elenir, diğerleri eşit şanslıdır', () => {
    const pool = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    const seen = new Set<WordId>();

    for (let i = 0; i < 500; i++) {
      const picked = pickOrThrow(pool, 3);
      expect(picked.id).not.toBe(3);
      seen.add(picked.id);
    }

    expect([...seen].sort()).toEqual([1, 2, 4, 5]);
  });

  test('tek kelimelik havuzda mecburen o kelime döner (sonsuz döngüye girmez)', () => {
    const pool = [{ id: 7 }];

    for (let i = 0; i < 20; i++) expect(pickOrThrow(pool, 7).id).toBe(7);
  });

  test('havuzda olmayan önceki id sonucu kısıtlamaz', () => {
    const pool = [{ id: 1 }, { id: 2 }];

    for (let i = 0; i < 50; i++) expect([1, 2]).toContain(pickOrThrow(pool, 99).id);
  });

  test('özel destenin metin id leri ile de çalışır', () => {
    const pool = [{ id: 'custom_Liste_0' }, { id: 'custom_Liste_1' }];

    expect(pickOrThrow(pool, 'custom_Liste_0').id).toBe('custom_Liste_1');
    expect(pickOrThrow(pool, 'custom_Liste_1').id).toBe('custom_Liste_0');
  });

  // Faz 4.2: artık `filter` yerine reddetme ile örnekleme var; denemeler hep
  // önceki kelimeye denk gelse bile kopya çıkarmadan yedek yol devreye girmeli.
  test('denemeler hep önceki kelimeye denk gelse de onu döndürmez', () => {
    const pool = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0); // hep 0. indeks (id 1)

    try {
      expect(pickOrThrow(pool, 1).id).not.toBe(1);
      expect(pickOrThrow(pool, 1).id).toBe(2); // ilk farklı kelimeye düşer
    } finally {
      randomSpy.mockRestore();
    }
  });

  test('havuzu kopyalamaz (girdi dizisi değişmez, yeni dizi üretilmez)', () => {
    const pool = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const before = [...pool];

    pickWord(pool, 1);

    expect(pool).toEqual(before);
  });
});

// Faz 4.2: şık toplarken havuz kopyalanmaz (eskiden `shuffle(pool)` tüm havuzu
// kopyalayıp karıştırıyordu → her soruda ~2.500 eleman).
describe('buildOptions — havuz kopyalanmaz (Faz 4.2)', () => {
  // Havuzdan kaç kez indeks okunduğunu sayar. Eski uygulama havuzu `[...items]` ile
  // kopyaladığı için TÜM indeksleri okurdu.
  const countingPool = (words: Word[]) => {
    let reads = 0;
    const proxy = new Proxy(words, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^[0-9]+$/.test(prop)) reads += 1;
        return Reflect.get(target, prop, receiver);
      },
    });

    return { proxy, reads: () => reads };
  };

  const bigPool = (size: number) =>
    Array.from({ length: size }, (_, i) => ({
      id: i + 1,
      hanzi: `字${i}`,
      pinyin: `pin${i}`,
      meaning: `anlam ${i}`,
    }));

  test('2.500 kelimelik havuzda şıklar için tüm havuz okunmaz', () => {
    const pool = bigPool(2500);
    const { proxy, reads } = countingPool(pool);

    for (let t = 0; t < 20; t++) {
      const options = buildOptions(pool[0], [proxy]);

      expect(options).toHaveLength(4);
      expect(options).toContain(pool[0]);
    }

    // 20 soru için toplam okuma, tek bir tam havuz kopyasından (2.500) çok daha az.
    expect(reads()).toBeGreaterThanOrEqual(20 * 3);
    expect(reads()).toBeLessThan(20 * 30);
  });

  test('çakışmalar üst üste olsa da dairesel tarama 4 şık bulur', () => {
    // Doğru cevabın ikizleri art arda dizili: rastgele başlangıç noktası ne olursa
    // olsun tarama sona gelince başa döner ve uygun adayları bulur.
    const pool = [
      { id: 1, hanzi: '日', pinyin: 'rì', meaning: 'sun' },
      { id: 2, hanzi: '日', pinyin: 'rì', meaning: 'day' },
      { id: 3, hanzi: '日', pinyin: 'rì', meaning: 'sunshine' },
      { id: 4, hanzi: '月', pinyin: 'yuè', meaning: 'moon' },
      { id: 5, hanzi: '水', pinyin: 'shuǐ', meaning: 'water' },
      { id: 6, hanzi: '火', pinyin: 'huǒ', meaning: 'fire' },
    ];

    for (let t = 0; t < 100; t++) {
      const options = buildOptions(pool[0], [pool]);

      expect(options).toHaveLength(4);
      expect(findConflicts(options)).toEqual([]);
    }
  });

  test('dar havuzda eskisi gibi mümkün olan tüm şıklar toplanır', () => {
    const pool = [
      { id: 1, hanzi: '一', pinyin: 'yī', meaning: 'one' },
      { id: 2, hanzi: '二', pinyin: 'èr', meaning: 'two' },
      { id: 3, hanzi: '三', pinyin: 'sān', meaning: 'three' },
    ];

    const options = buildOptions(pool[1], [pool]); // 1 doğru + yalnızca 2 aday var

    expect(options).toHaveLength(3);
    expect(findConflicts(options)).toEqual([]);
    expect(options.some((w) => w.id === 2)).toBe(true);
  });

  test('aynı havuz iki kez verilse de şıklar tekrar etmez', () => {
    const options = buildOptions(FIXTURE[0], [FIXTURE, FIXTURE]);
    const ids = options.map((w) => w.id);

    expect(options).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
