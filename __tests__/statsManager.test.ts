import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStats, recordAnswer, removeWordStatsByIds, clearAllStats, mergeWordStatsIds, getMastery, isMastered, isProblematic } from '../services/statsManager';
import { getDateKey, addDays } from '../services/dateUtils';

const STATS_KEY = '@hsk_user_stats';

// Gün anahtarları artık yerel saatle ve tek yerden (services/dateUtils.js) üretilir (Faz 2.2).
const today = getDateKey();
const yesterday = getDateKey(addDays(new Date(), -1));
const fourDaysAgo = getDateKey(addDays(new Date(), -4));

const seedStats = (stats) => AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
const readStats = async () => JSON.parse(await AsyncStorage.getItem(STATS_KEY));

const emptyStats = (streak) => ({ wordStats: {}, dailyStats: {}, streak });

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getStats', () => {
  test('boş depoda varsayılan istatistik döner', async () => {
    await expect(getStats()).resolves.toEqual({
      wordStats: {},
      dailyStats: {},
      streak: { current: 0, lastDate: null },
    });
  });
});

describe('recordAnswer — yazma bütünlüğü', () => {
  test('hızlı ardışık cevapların tümü kaydedilir (kayıp/yarış koşulu yok)', async () => {
    const count = 20;

    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        recordAnswer({
          wordId: (i % 4) + 1,
          mode: 'hanzi-to-pinyin',
          isCorrect: i % 2 === 0,
        })
      )
    );

    const data = await readStats();
    const day = data.dailyStats[today];

    expect(day.correct + day.wrong).toBe(count);
    expect(day.correct).toBe(10);
    expect(day.wrong).toBe(10);
    expect(Object.keys(data.wordStats)).toHaveLength(4);
  });
});

describe('recordAnswer — kategori eşlemesi', () => {
  test('ters yön modları aynı kategoriye yazılır', async () => {
    await recordAnswer({ wordId: 99, mode: 'pinyin-to-hanzi', isCorrect: true });

    const data = await readStats();
    expect(data.wordStats[99].categories.hanzi_pinyin.streak).toBe(1);
  });

  test('anlam modları hanzi_meaning kategorisine yazılır', async () => {
    await recordAnswer({ wordId: 8, mode: 'hanzi-to-meaning', isCorrect: true });

    const data = await readStats();
    expect(data.wordStats[8].categories.hanzi_meaning.streak).toBe(1);
    expect(data.wordStats[8].categories.hanzi_pinyin.streak).toBe(0);
  });

  test('tanınmayan mod: kelime kaydı yazılmaz ama günlük/streak işlenir (Faz 3.3)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await recordAnswer({ wordId: 77, mode: 'hanzi-to-en', isCorrect: true });

      const data = await readStats();
      // Eskiden bu mod sessizce `hanzi_pinyin` sayılıp istatistiği bozuyordu.
      expect(data.wordStats[77]).toBeUndefined();
      // Günlük aktivite ve seri kaybolmamalı.
      expect(data.dailyStats[today].correct).toBe(1);
      expect(data.streak.current).toBe(1);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  test('yanlış cevap wrongStreak artırır ve doğru seriyi sıfırlar', async () => {
    await seedStats({
      wordStats: {
        5: {
          // Eski kayıtlar `level` alanı da taşıyor (Faz 3.3'te yazılması kaldırıldı);
          // kod bu alanı yok saymalı, kategori tablosu yine güncellenmeli.
          level: 'hsk1',
          categories: {
            hanzi_pinyin: { streak: 3, wrongStreak: 0 },
            hanzi_meaning: { streak: 0, wrongStreak: 0 },
            pinyin_meaning: { streak: 0, wrongStreak: 0 },
          },
        },
      },
      dailyStats: {},
      streak: { current: 1, lastDate: today },
    });

    await recordAnswer({ wordId: 5, mode: 'hanzi-to-pinyin', isCorrect: false });

    const data = await readStats();
    expect(data.wordStats[5].categories.hanzi_pinyin.wrongStreak).toBe(1);
    expect(data.wordStats[5].categories.hanzi_pinyin.streak).toBe(0);
  });
});

describe('recordAnswer — günlük seri (streak)', () => {
  test('ilk cevapta streak 1 olur', async () => {
    await recordAnswer({ wordId: 1, mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak).toEqual({ current: 1, lastDate: today });
  });

  test('aynı gün verilen ikinci cevap streak artırmaz', async () => {
    await seedStats(emptyStats({ current: 4, lastDate: today }));

    await recordAnswer({ wordId: 1, mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak.current).toBe(4);
  });

  test('ertesi gün verilen cevap streak artırır', async () => {
    await seedStats(emptyStats({ current: 4, lastDate: yesterday }));

    await recordAnswer({ wordId: 1, mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak.current).toBe(5);
    expect(data.streak.lastDate).toBe(today);
  });

  test('gün atlanınca streak 1e döner', async () => {
    await seedStats(emptyStats({ current: 9, lastDate: fourDaysAgo }));

    await recordAnswer({ wordId: 1, mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak.current).toBe(1);
  });
});

describe('recordAnswer — günlük sayaçlar', () => {
  test('doğru ve yanlış cevaplar ayrı sayaçlara yazılır', async () => {
    await recordAnswer({ wordId: 1, mode: 'hanzi-to-pinyin', isCorrect: true });
    await recordAnswer({ wordId: 2, mode: 'hanzi-to-pinyin', isCorrect: false });
    await recordAnswer({ wordId: 3, mode: 'hanzi-to-pinyin', isCorrect: false });

    const data = await readStats();
    expect(data.dailyStats[today]).toEqual({ correct: 1, wrong: 2 });
  });
});

describe('recordAnswer — yerel gün anahtarı (Faz 2.2)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('yerel gece yarısından sonra verilen cevap o yerel güne yazılır', async () => {
    // Yerel saat 11 Mart 00:30. Eski (UTC) kod UTC+ pozitif dilimlerde bunu 10 Mart'a yazardı.
    jest.useFakeTimers({ now: new Date(2026, 2, 11, 0, 30, 0) });

    await recordAnswer({ wordId: 42, mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(Object.keys(data.dailyStats)).toEqual(['2026-03-11']);
  });
});

// Faz 4: silinen özel destenin izleri — istatistikte hayalet kayıt kalmaz.
describe('removeWordStatsByIds — silinen destenin izleri', () => {
  const seedMixedStats = () =>
    seedStats({
      wordStats: {
        5: { categories: {}, level: 'hsk1' },
        custom_A_0: { categories: {} },
        custom_A_1: { categories: {} },
        custom_B_0: { categories: {} },
      },
      dailyStats: { [today]: { correct: 2, wrong: 1 } },
      streak: { current: 3, lastDate: today },
    });

  test('yalnızca verilen idlerin kelime istatistiği silinir (sayı ve metin id)', async () => {
    await seedMixedStats();

    await removeWordStatsByIds([5, 'custom_A_0', 'custom_A_1']);

    const data = await readStats();
    expect(Object.keys(data.wordStats).sort()).toEqual(['custom_B_0']);
  });

  test('günlük aktivite ve streak KORUNUR (kelimeye değil güne bağlı)', async () => {
    await seedMixedStats();

    await removeWordStatsByIds(['custom_A_0']);

    const data = await readStats();
    expect(data.dailyStats[today]).toEqual({ correct: 2, wrong: 1 });
    expect(data.streak).toEqual({ current: 3, lastDate: today });
  });

  test('eşleşme yoksa diske yazmaz: false döner, eşleşmede true', async () => {
    await seedMixedStats();

    await expect(removeWordStatsByIds(['boyle_bir_id_yok'])).resolves.toBe(false);
    await expect(removeWordStatsByIds(['custom_A_0'])).resolves.toBe(true);
  });

  test('boş liste hiçbir şeyi değiştirmez', async () => {
    await seedMixedStats();

    await removeWordStatsByIds([]);

    const data = await readStats();
    expect(Object.keys(data.wordStats)).toHaveLength(4);
  });

  test('devam eden cevap kaydıyla aynı anda çalışsa bile ikisi de kaybolmaz (kuyruk)', async () => {
    await seedMixedStats();

    await Promise.all([
      recordAnswer({ wordId: 6, mode: 'hanzi-to-pinyin', isCorrect: true }),
      removeWordStatsByIds(['custom_A_0']),
    ]);

    const data = await readStats();
    expect(data.wordStats[6]).toBeDefined();
    expect(data.wordStats.custom_A_0).toBeUndefined();
  });
});

// Faz 4: kalıcı "İlerlemeyi sıfırla" butonu (istatistikler; yanlış havuzu App.js'te).
describe('clearAllStats — tüm ilerlemeyi sıfırla', () => {
  test('kelime istatistikleri, günlük aktivite ve streak birlikte sıfırlanır', async () => {
    await seedStats({
      wordStats: { 5: { categories: {} }, custom_A_0: { categories: {} } },
      dailyStats: { [today]: { correct: 7, wrong: 3 }, [yesterday]: { correct: 1, wrong: 0 } },
      streak: { current: 12, lastDate: today },
    });

    await clearAllStats();

    const data = await readStats();
    expect(data).toEqual({
      wordStats: {},
      dailyStats: {},
      streak: { current: 0, lastDate: null },
    });
    await expect(getStats()).resolves.toEqual({
      wordStats: {},
      dailyStats: {},
      streak: { current: 0, lastDate: null },
    });
  });

  test('sıfırlama KUYRUĞUN sonunda çalışır: sırada bekleyen cevap silinmez, sonra silinir', async () => {
    await seedStats(emptyStats({ current: 0, lastDate: null }));

    // Cevap kaydı ile sıfırlama aynı anda istenirse sıfırlama "en son söz" olur.
    await Promise.all([
      recordAnswer({ wordId: 11, mode: 'hanzi-to-pinyin', isCorrect: true }),
      clearAllStats(),
    ]);

    const data = await readStats();
    expect(data.wordStats[11]).toBeUndefined();
    expect(data.dailyStats).toEqual({});
  });
});

// Faz 4: hsk5'te birleştirilen kelime id'leri (göç tablosu: services/wordIdMigrations.js).
describe('mergeWordStatsIds — birleştirilen kelime id göçü', () => {
  const MAP = { 1889: 1206 };

  test('kayıt hedef idye taşınır; hedefte kayıt varsa kategori serileri TOPLANIR', async () => {
    await seedStats({
      wordStats: {
        1206: { categories: { hanzi_pinyin: { streak: 1, wrongStreak: 0 } } },
        1889: {
          categories: {
            hanzi_pinyin: { streak: 2, wrongStreak: 1 },
            hanzi_meaning: { streak: 0, wrongStreak: 2 },
          },
        },
      },
      dailyStats: {},
      streak: { current: 1, lastDate: today },
    });

    await mergeWordStatsIds(MAP);

    const data = await readStats();
    expect(data.wordStats['1889']).toBeUndefined();
    expect(data.wordStats['1206'].categories.hanzi_pinyin).toEqual({ streak: 3, wrongStreak: 1 });
    // Hedefte olmayan kategori de taşınır.
    expect(data.wordStats['1206'].categories.hanzi_meaning).toEqual({
      streak: 0,
      wrongStreak: 2,
    });
  });

  test('hedefte kayıt yoksa kayıt olduğu gibi taşınır', async () => {
    await seedStats({
      wordStats: { 1889: { categories: { hanzi_pinyin: { streak: 2, wrongStreak: 0 } } } },
      dailyStats: {},
      streak: { current: 1, lastDate: today },
    });

    await mergeWordStatsIds(MAP);

    const data = await readStats();
    expect(data.wordStats['1206']).toEqual({
      categories: { hanzi_pinyin: { streak: 2, wrongStreak: 0 } },
    });
    expect(data.wordStats['1889']).toBeUndefined();
  });

  test('taşınacak kayıt yoksa disk değişmez (idempotent): false döner', async () => {
    await seedStats({
      wordStats: { 5: { categories: {} } },
      dailyStats: {},
      streak: { current: 1, lastDate: today },
    });

    await expect(mergeWordStatsIds(MAP)).resolves.toBe(false);

    const data = await readStats();
    expect(Object.keys(data.wordStats)).toEqual(['5']);
  });

  test('boş/geçersiz harita hiçbir şey yapmaz', async () => {
    await seedStats({
      wordStats: { 1889: { categories: {} } },
      dailyStats: {},
      streak: { current: 0, lastDate: null },
    });

    await mergeWordStatsIds(null);
    await mergeWordStatsIds({});

    const data = await readStats();
    expect(data.wordStats['1889']).toBeDefined();
  });
});

// Faz 3.6b: ustalık kuralları StatsModal'dan servise taşındı; özel deste kelimeleri
// (metin id'ler) de aynı kurala tabidir.
describe('ustalık / sorun kuralları (Faz 3.6b)', () => {
  const mastered = {
    categories: {
      hanzi_pinyin: { streak: 3, wrongStreak: 0 },
      hanzi_meaning: { streak: 3, wrongStreak: 0 },
      pinyin_meaning: { streak: 3, wrongStreak: 0 },
    },
  };

  describe('isMastered', () => {
    test('üç kategoride de 3 doğru seri gerekir', () => {
      expect(isMastered(mastered)).toBe(true);
    });

    test('tek kategori geride kalsa bile ustalaşılmış sayılmaz', () => {
      expect(
        isMastered({
          categories: {
            hanzi_pinyin: { streak: 3 },
            hanzi_meaning: { streak: 3 },
            pinyin_meaning: { streak: 2 },
          },
        })
      ).toBe(false);
    });

    test('kaydı olmayan kelime ya da eksik kategori ustalık saymaz', () => {
      expect(isMastered(undefined)).toBe(false);
      expect(isMastered({})).toBe(false);
      expect(isMastered({ categories: { hanzi_pinyin: { streak: 9 } } })).toBe(false);
    });
  });

  describe('isProblematic', () => {
    test('tek kategoride 3 yanlış seri yeterlidir', () => {
      expect(
        isProblematic({ categories: { hanzi_pinyin: { wrongStreak: 3 } } })
      ).toBe(true);
    });

    test('3 yanlış serinin altında sorunlu sayılmaz', () => {
      expect(
        isProblematic({ categories: { hanzi_pinyin: { wrongStreak: 2 } } })
      ).toBe(false);
      expect(isProblematic(undefined)).toBe(false);
    });
  });

  describe('getMastery', () => {
    test('boş havuzda 0/0 döner (sıfıra bölme yok)', () => {
      expect(getMastery([], {})).toEqual({ count: 0, percent: 0 });
      expect(getMastery(undefined, {})).toEqual({ count: 0, percent: 0 });
    });

    test('yüzde yuvarlanır ve istatistiği olmayan kelimeler sayılmaz', () => {
      const pool = [{ id: 1 }, { id: 2 }, { id: 3 }];

      expect(getMastery(pool, { 1: mastered, 2: mastered })).toEqual({ count: 2, percent: 67 });
      expect(getMastery(pool, {})).toEqual({ count: 0, percent: 0 });
    });

    test('özel deste kelimeleri metin id ile aynı şekilde çalışır', () => {
      const pool = [
        { id: 'custom_Ders_0', hanzi: '爱' },
        { id: 'custom_Ders_1', hanzi: '八' },
      ];

      expect(getMastery(pool, { 'custom_Ders_0': mastered })).toEqual({ count: 1, percent: 50 });
    });
  });
});
