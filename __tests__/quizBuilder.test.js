import { buildOptions, pickWord, shuffle } from '../services/quizBuilder';
import { ALL_WORDS, LEVEL_POOLS } from '../services/wordRepository';

// Havuzlar artık tek kaynaktan (Faz 3.1) — test kopya tutmaz.
const hsk1Data = LEVEL_POOLS.hsk1;
const FIELDS = ['hanzi', 'pinyin', 'meaning'];

// Şıklar arasında hanzi/pinyin/anlam çakışması var mı? Varsa açıklamasını döndürür.
const findConflicts = (options) => {
  const conflicts = [];
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
    const seen = new Set();

    for (let i = 0; i < 300; i++) seen.add(pickWord(pool).id);

    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  test('havuzda alternatif varsa önceki kelimeyi ASLA seçmez', () => {
    const pool = [{ id: 1 }, { id: 2 }];

    for (let i = 0; i < 100; i++) {
      expect(pickWord(pool, 1).id).toBe(2);
      expect(pickWord(pool, 2).id).toBe(1);
    }
  });

  test('daha büyük havuzda da önceki kelime elenir, diğerleri eşit şanslıdır', () => {
    const pool = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    const seen = new Set();

    for (let i = 0; i < 500; i++) {
      const picked = pickWord(pool, 3);
      expect(picked.id).not.toBe(3);
      seen.add(picked.id);
    }

    expect([...seen].sort()).toEqual([1, 2, 4, 5]);
  });

  test('tek kelimelik havuzda mecburen o kelime döner (sonsuz döngüye girmez)', () => {
    const pool = [{ id: 7 }];

    for (let i = 0; i < 20; i++) expect(pickWord(pool, 7).id).toBe(7);
  });

  test('havuzda olmayan önceki id sonucu kısıtlamaz', () => {
    const pool = [{ id: 1 }, { id: 2 }];

    for (let i = 0; i < 50; i++) expect([1, 2]).toContain(pickWord(pool, 99).id);
  });

  test('özel destenin metin id leri ile de çalışır', () => {
    const pool = [{ id: 'custom_Liste_0' }, { id: 'custom_Liste_1' }];

    expect(pickWord(pool, 'custom_Liste_0').id).toBe('custom_Liste_1');
    expect(pickWord(pool, 'custom_Liste_1').id).toBe('custom_Liste_0');
  });
});
