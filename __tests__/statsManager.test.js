import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStats, recordAnswer } from '../services/statsManager';

const STATS_KEY = '@hsk_user_stats';

// statsManager tarihleri UTC üzerinden (toISOString) üretir; testte de aynı yöntemi kullanıyoruz.
const dayKey = (date) => date.toISOString().split('T')[0];
const today = dayKey(new Date());
const yesterday = dayKey(new Date(Date.now() - 86400000));
const fourDaysAgo = dayKey(new Date(Date.now() - 4 * 86400000));

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
          level: 'hsk1',
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
    await recordAnswer({ wordId: 99, level: 'hsk1', mode: 'pinyin-to-hanzi', isCorrect: true });

    const data = await readStats();
    expect(data.wordStats[99].categories.hanzi_pinyin.streak).toBe(1);
  });

  test('anlam modları hanzi_meaning kategorisine yazılır', async () => {
    await recordAnswer({ wordId: 8, level: 'hsk1', mode: 'hanzi-to-meaning', isCorrect: true });

    const data = await readStats();
    expect(data.wordStats[8].categories.hanzi_meaning.streak).toBe(1);
    expect(data.wordStats[8].categories.hanzi_pinyin.streak).toBe(0);
  });

  test('yanlış cevap wrongStreak artırır ve doğru seriyi sıfırlar', async () => {
    await seedStats({
      wordStats: {
        5: {
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

    await recordAnswer({ wordId: 5, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: false });

    const data = await readStats();
    expect(data.wordStats[5].categories.hanzi_pinyin.wrongStreak).toBe(1);
    expect(data.wordStats[5].categories.hanzi_pinyin.streak).toBe(0);
  });
});

describe('recordAnswer — günlük seri (streak)', () => {
  test('ilk cevapta streak 1 olur', async () => {
    await recordAnswer({ wordId: 1, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak).toEqual({ current: 1, lastDate: today });
  });

  test('aynı gün verilen ikinci cevap streak artırmaz', async () => {
    await seedStats(emptyStats({ current: 4, lastDate: today }));

    await recordAnswer({ wordId: 1, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak.current).toBe(4);
  });

  test('ertesi gün verilen cevap streak artırır', async () => {
    await seedStats(emptyStats({ current: 4, lastDate: yesterday }));

    await recordAnswer({ wordId: 1, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak.current).toBe(5);
    expect(data.streak.lastDate).toBe(today);
  });

  test('gün atlanınca streak 1e döner', async () => {
    await seedStats(emptyStats({ current: 9, lastDate: fourDaysAgo }));

    await recordAnswer({ wordId: 1, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: true });

    const data = await readStats();
    expect(data.streak.current).toBe(1);
  });
});

describe('recordAnswer — günlük sayaçlar', () => {
  test('doğru ve yanlış cevaplar ayrı sayaçlara yazılır', async () => {
    await recordAnswer({ wordId: 1, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: true });
    await recordAnswer({ wordId: 2, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: false });
    await recordAnswer({ wordId: 3, level: 'hsk1', mode: 'hanzi-to-pinyin', isCorrect: false });

    const data = await readStats();
    expect(data.dailyStats[today]).toEqual({ correct: 1, wrong: 2 });
  });
});
